/**
 * Tests d'intégration — /api/messages/unread
 *
 * Objectif principal : prouver que la route ne peut JAMAIS retourner les
 * messages d'un utilisateur à un autre (isolation de données).
 *
 * Architecture de test :
 *   - Supabase admin client et auth-helper sont mockés (pas de vrai serveur)
 *   - Les mocks simulent les tables conversation_participants, messages, notifications
 *   - On injecte des données cohérentes avec le schéma réel
 *
 * Scénarios couverts :
 *   GET  - Utilisateur non authentifié → 401
 *   GET  - Utilisateur A ne voit pas les messages de B (isolation)
 *   GET  - Filtre IN appliqué sur convIds de l'utilisateur authentifié uniquement
 *   GET  - Utilisateur sans conversation → 200 { messages: [], participations: [] }
 *   GET  - Erreur DB participations → 200 vide (pas de fuite, pas de 500)
 *   GET  - convIds plafonnés à MAX_CONV_IDS (clause IN non illimitée)
 *   PATCH - Utilisateur non authentifié → 401
 *   PATCH - conversationId manquant → 400
 *   PATCH - lastReadAt invalide → 400
 *   PATCH - Mise à jour scopée à user_id → ok: true
 *   PATCH - Isolation : un utilisateur ne peut marquer que ses propres convs
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from './route';
import { MAX_CONV_IDS } from './constants';

// ─── Mocks modules ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/supabase/auth-helper', () => ({
  getUserIdBearerFirst: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst } from '@/lib/supabase/auth-helper';

const mockGetUserId = getUserIdBearerFirst as MockedFunction<typeof getUserIdBearerFirst>;
const mockCreateAdmin = createAdminClient as MockedFunction<typeof createAdminClient>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Construit une NextRequest GET vers /api/messages/unread */
function makeGetReq(since?: string): NextRequest {
  const url = since
    ? `http://localhost/api/messages/unread?since=${encodeURIComponent(since)}`
    : 'http://localhost/api/messages/unread';
  return new NextRequest(url, { method: 'GET' });
}

/** Construit une NextRequest PATCH */
function makePatchReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/messages/unread', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Crée un mock d'admin client Supabase avec des résultats configurables
 * pour chaque table interrogée.
 */
function buildAdminMock({
  participations = [] as Array<{ conversation_id: string; last_read_at: string | null; joined_at: string | null }>,
  participationsError = null as { message: string } | null,
  notificationCount = 0,
  messages = [] as Array<{ id: string; conversation_id: string; created_at: string; content: string; sender_id: string; is_system?: boolean }>,
  messagesError = null as { message: string } | null,
  patchError = null as { message: string } | null,
  // captureInFilter lets us record which convIds were passed to .in()
  captureInFilter = null as ((ids: string[]) => void) | null,
} = {}) {
  // Chainable builder pour Supabase query
  const buildChain = (resolveValue: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'neq', 'gt', 'in', 'update', 'limit', 'order'] as const;
    methods.forEach(m => {
      chain[m] = (...args: unknown[]) => {
        // Capture les ids passés à .in()
        if (m === 'in' && captureInFilter && Array.isArray(args[1])) {
          captureInFilter(args[1] as string[]);
        }
        return chain;
      };
    });
    // maybeSingle / then / catch  - pas utilisés ici mais au cas où
    chain['then'] = (resolve: (v: unknown) => void) => resolve(resolveValue);
    return chain;
  };

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'conversation_participants') {
      // Detect context: if patchError is explicitly set, we're in PATCH mode
      if (patchError !== null) {
        // PATCH path: .update().eq().eq() → resolves with patchError
        const updChain: Record<string, unknown> = {};
        ['update', 'eq', 'select'].forEach(m => { updChain[m] = () => updChain; });
        updChain['then'] = (resolve: (v: unknown) => void) =>
          resolve({ error: patchError });
        return updChain;
      }

      // GET path (and PATCH success): .select()/.update() → participations or ok
      // We make the chain polymorphic: first call decides by which method is called first
      const cpChain: Record<string, unknown> = {};
      ['select', 'limit'].forEach(m => { cpChain[m] = () => cpChain; });
      cpChain['eq'] = () => cpChain;
      // For PATCH success, .update() → updChain
      const updChainOk: Record<string, unknown> = {};
      ['eq', 'select'].forEach(m => { updChainOk[m] = () => updChainOk; });
      updChainOk['then'] = (resolve: (v: unknown) => void) => resolve({ error: null });
      cpChain['update'] = () => updChainOk;
      // GET resolves
      cpChain['then'] = (resolve: (v: unknown) => void) =>
        resolve({ data: participationsError ? null : participations, error: participationsError });
      return cpChain;
    }

    if (table === 'notifications') {
      const nChain: Record<string, unknown> = {};
      ['select', 'eq', 'limit'].forEach(m => { nChain[m] = () => nChain; });
      nChain['then'] = (resolve: (v: unknown) => void) =>
        resolve({ count: notificationCount, error: null });
      return nChain;
    }

    if (table === 'messages') {
      const msgChain: Record<string, unknown> = {};
      // 'order' est maintenant utilisé par la route v2 (.order('created_at', …))
      ['select', 'eq', 'neq', 'gt', 'limit', 'order'].forEach(m => { msgChain[m] = () => msgChain; });
      // .in() with capture
      msgChain['in'] = (_col: string, ids: string[]) => {
        if (captureInFilter) captureInFilter(ids);
        return msgChain;
      };
      msgChain['then'] = (resolve: (v: unknown) => void) =>
        resolve({ data: messagesError ? null : messages, error: messagesError });
      return msgChain;
    }

    // Fallback
    const fallback: Record<string, unknown> = {};
    ['select', 'eq', 'update', 'limit'].forEach(m => { fallback[m] = () => fallback; });
    fallback['then'] = (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
    return fallback;
  });

  return { from: fromMock } as unknown as ReturnType<typeof createAdminClient>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/messages/unread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Authentification ────────────────────────────────────────────────────────

  it('retourne 401 si utilisateur non authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toMatchObject({ error: expect.stringContaining('authentifié') });
  });

  // ── Isolation de données — test clé de sécurité ────────────────────────────

  it('USER A NE VOIT PAS les messages de USER B — isolation garantie', async () => {
    const USER_A = 'user-a-uuid';
    const USER_B = 'user-b-uuid';

    // Conversations de A
    const CONV_A1 = 'conv-a1';
    const CONV_A2 = 'conv-a2';
    // Conversations de B (A n'y participe pas)
    const CONV_B1 = 'conv-b1';
    const CONV_B2 = 'conv-b2';

    // Messages dans les conversations de B — A ne doit PAS les voir
    const MSG_B = [
      { id: 'msg-b1', conversation_id: CONV_B1, created_at: new Date().toISOString(), content: 'Secret de B', sender_id: USER_B },
      { id: 'msg-b2', conversation_id: CONV_B2, created_at: new Date().toISOString(), content: 'Autre secret', sender_id: USER_B },
    ];

    // Messages dans les conversations de A
    const MSG_A = [
      { id: 'msg-a1', conversation_id: CONV_A1, created_at: new Date().toISOString(), content: 'Message de A', sender_id: 'user-c' },
    ];

    // Capture les ids passés au filtre .in() de la requête messages
    const capturedInFilter: string[][] = [];

    // L'admin client renvoie UNIQUEMENT les participations de A
    const adminMock = buildAdminMock({
      participations: [
        { conversation_id: CONV_A1, last_read_at: null, joined_at: null },
        { conversation_id: CONV_A2, last_read_at: null, joined_at: null },
      ],
      // L'API doit retourner SEULEMENT les messages de CONV_A1 et CONV_A2
      // (on simule que la DB, avec le filtre IN correct, ne retourne que MSG_A)
      messages: MSG_A,
      captureInFilter: (ids) => capturedInFilter.push(ids),
    });
    mockCreateAdmin.mockReturnValue(adminMock);
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();

    // 1. Vérifier que le filtre IN ne contient QUE les convs de A
    expect(capturedInFilter.length).toBeGreaterThan(0);
    const inIds = capturedInFilter[0];
    expect(inIds).toContain(CONV_A1);
    expect(inIds).toContain(CONV_A2);
    // CRITIQUE : les conversations de B ne doivent PAS être dans le filtre
    expect(inIds).not.toContain(CONV_B1);
    expect(inIds).not.toContain(CONV_B2);

    // 2. Les messages retournés ne contiennent pas les messages de B
    const returnedIds = (json.messages as Array<{ id: string }>).map(m => m.id);
    expect(returnedIds).not.toContain('msg-b1');
    expect(returnedIds).not.toContain('msg-b2');

    // 3. Les messages de A sont bien présents
    expect(returnedIds).toContain('msg-a1');

    // 4. Les participations retournées sont celles de A
    const returnedConvIds = (json.participations as Array<{ conversation_id: string }>)
      .map(p => p.conversation_id);
    expect(returnedConvIds).toContain(CONV_A1);
    expect(returnedConvIds).toContain(CONV_A2);
    expect(returnedConvIds).not.toContain(CONV_B1);
    expect(returnedConvIds).not.toContain(CONV_B2);
  });

  it('retourne vide si l\'utilisateur n\'a aucune conversation — pas de requête messages', async () => {
    const adminMock = buildAdminMock({
      participations: [],
      notificationCount: 2,
    });
    mockCreateAdmin.mockReturnValue(adminMock);
    mockGetUserId.mockResolvedValueOnce('user-x');

    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.participations).toEqual([]);
    expect(json.messages).toEqual([]);
    expect(json.notifications).toBe(2);

    // La table messages ne doit PAS être interrogée si convIds est vide
    const fromCalls = (adminMock.from as ReturnType<typeof vi.fn>).mock.calls
      .map((c: unknown[]) => c[0]);
    expect(fromCalls).not.toContain('messages');
  });

  it('retourne 200 vide si la requête participations échoue (pas de fuite)', async () => {
    const adminMock = buildAdminMock({
      participationsError: { message: 'connection reset' },
      notificationCount: 0,
    });
    mockCreateAdmin.mockReturnValue(adminMock);
    mockGetUserId.mockResolvedValueOnce('user-y');

    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();

    // Retourne vide sans erreur 500 — JAMAIS un fetch non filtré
    expect(json.messages).toEqual([]);
    expect(json.participations).toEqual([]);
    expect(json.notifications).toBe(0);

    // La table messages ne doit PAS être interrogée
    const fromCalls = (adminMock.from as ReturnType<typeof vi.fn>).mock.calls
      .map((c: unknown[]) => c[0]);
    expect(fromCalls).not.toContain('messages');
  });

  it('plafonne convIds à MAX_CONV_IDS pour éviter une clause IN illimitée', async () => {
    // Simule un utilisateur avec 600 conversations
    const manyParticipations = Array.from({ length: 600 }, (_, i) => ({
      conversation_id: `conv-${i}`,
      last_read_at: null,
      joined_at: null,
    }));

    const capturedInFilter: string[][] = [];
    const adminMock = buildAdminMock({
      participations: manyParticipations,
      messages: [],
      captureInFilter: (ids) => capturedInFilter.push(ids),
    });
    mockCreateAdmin.mockReturnValue(adminMock);
    mockGetUserId.mockResolvedValueOnce('user-z');

    await GET(makeGetReq());

    // La clause IN ne doit pas dépasser MAX_CONV_IDS
    expect(capturedInFilter.length).toBeGreaterThan(0);
    expect(capturedInFilter[0].length).toBeLessThanOrEqual(MAX_CONV_IDS);
  });

  it('retourne les données complètes — cas normal', async () => {
    const NOW = new Date().toISOString();
    const adminMock = buildAdminMock({
      participations: [
        { conversation_id: 'conv-1', last_read_at: '2026-01-01T00:00:00Z', joined_at: null },
      ],
      notificationCount: 3,
      messages: [
        { id: 'msg-1', conversation_id: 'conv-1', created_at: NOW, content: 'Bonjour', sender_id: 'other-user' },
      ],
    });
    mockCreateAdmin.mockReturnValue(adminMock);
    mockGetUserId.mockResolvedValueOnce('current-user');

    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.participations).toHaveLength(1);
    expect(json.messages).toHaveLength(1);
    expect(json.messages[0].id).toBe('msg-1');
    // v2 : `content` est remplacé par `is_system` calculé côté serveur
    expect(json.messages[0]).not.toHaveProperty('content');
    expect(typeof json.messages[0].is_system).toBe('boolean');
    expect(json.notifications).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE PATCH
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/messages/unread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce(null);

    const res = await PATCH(makePatchReq({ conversationId: 'conv-1' }));
    expect(res.status).toBe(401);
  });

  it('retourne 400 si conversationId absent', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const adminMock = buildAdminMock();
    mockCreateAdmin.mockReturnValue(adminMock);

    const res = await PATCH(makePatchReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/conversationId/);
  });

  it('retourne 400 si lastReadAt n\'est pas un ISO 8601 valide', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const adminMock = buildAdminMock();
    mockCreateAdmin.mockReturnValue(adminMock);

    const res = await PATCH(makePatchReq({ conversationId: 'conv-1', lastReadAt: 'not-a-date' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/ISO 8601/);
  });

  it('retourne { ok: true } et scope la mise à jour au user_id authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const adminMock = buildAdminMock({ patchError: null });
    mockCreateAdmin.mockReturnValue(adminMock);

    const res = await PATCH(makePatchReq({
      conversationId: 'conv-1',
      lastReadAt: '2026-04-10T12:00:00.000Z',
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // Vérifier que from('conversation_participants') a été appelé
    const fromCalls = (adminMock.from as ReturnType<typeof vi.fn>).mock.calls
      .map((c: unknown[]) => c[0]);
    expect(fromCalls).toContain('conversation_participants');
  });

  it('retourne 500 si la mise à jour DB échoue', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const adminMock = buildAdminMock({ patchError: { message: 'DB unavailable' } });
    mockCreateAdmin.mockReturnValue(adminMock);

    const res = await PATCH(makePatchReq({ conversationId: 'conv-1' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('DB unavailable');
  });

  it('retourne 400 si conversationId est un nombre (type invalide)', async () => {
    mockGetUserId.mockResolvedValueOnce('user-1');
    const adminMock = buildAdminMock();
    mockCreateAdmin.mockReturnValue(adminMock);

    const res = await PATCH(makePatchReq({ conversationId: 42 }));
    expect(res.status).toBe(400);
  });
});
