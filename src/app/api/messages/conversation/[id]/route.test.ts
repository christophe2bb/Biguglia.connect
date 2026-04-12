/**
 * Tests d'intégration — GET /api/messages/conversation/[id]
 *
 * Objectifs :
 *  1. Contrat d'authentification (401, 403)
 *  2. display_name calculé côté serveur (full_name → email local → fallback)
 *  3. other_user_id résolu côté serveur
 *  4. Fallback fetch quand le profil de l'autre participant est absent de la réponse
 *  5. Dégradation gracieuse sur erreur messages (conv retournée, messages=[])
 *  6. Isolation : un non-participant obtient 403 même avec un token valide
 *
 * Architecture :
 *  - createAdminClient et getUserIdBearerFirst entièrement mockés (pas de serveur réel)
 *  - Supabase chainable simulé table par table
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, POST, DELETE } from './route';

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

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const CONV_ID   = 'conv-aaa-111';
const USER_A    = 'user-aaa-000';
const USER_B    = 'user-bbb-000';
const MSG_ID    = 'msg-ccc-111';

const PARTICIPATION = {
  user_id: USER_A,
  last_read_at: '2024-01-01T10:00:00Z',
  joined_at: '2024-01-01T09:00:00Z',
};

const CONVERSATION = {
  id: CONV_ID,
  subject: 'Test conv',
  related_type: 'listing',
  related_id: 'listing-111',
  exchange_status: null,
  exchange_confirmed_by: null,
  exchange_confirmed_at: null,
  owner_id: USER_A,
  created_by: USER_A,
  updated_at: '2024-01-01T10:00:00Z',
};

const MESSAGES = [
  { id: MSG_ID, conversation_id: CONV_ID, sender_id: USER_B, content: 'Hello', created_at: '2024-01-01T10:01:00Z' },
];

// ─── Builder de mock admin ────────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface AdminMockOptions {
  participationRow?: typeof PARTICIPATION | null;
  participationError?: { message: string } | null;
  participantRows?: Array<{ user_id: string }>;
  participantsError?: { message: string } | null;
  conversation?: typeof CONVERSATION | null;
  convError?: { message: string } | null;
  messages?: typeof MESSAGES;
  messagesError?: { message: string } | null;
  profiles?: ProfileRow[];
  profileError?: { message: string } | null;
  fallbackProfile?: ProfileRow | null;
  patchError?: { message: string } | null;
  insertMsgResult?: { data: unknown; error: unknown };
  deleteError?: { message: string } | null;
  msgForDelete?: { id: string; sender_id: string; conversation_id: string } | null;
}

/**
 * Construit un mock d'admin client Supabase simulant les requêtes chaînées.
 * Chaque table retourne des données configurables.
 */
function buildAdminMock(opts: AdminMockOptions = {}) {
  const {
    participationRow    = PARTICIPATION,
    participationError  = null,
    participantRows     = [{ user_id: USER_A }, { user_id: USER_B }],
    participantsError   = null,
    conversation        = CONVERSATION,
    convError           = null,
    messages            = MESSAGES,
    messagesError       = null,
    profiles            = [
      { id: USER_A, full_name: 'Alice', avatar_url: null, email: 'alice@example.com' },
      { id: USER_B, full_name: null, avatar_url: null, email: 'bob@example.com' },
    ],
    profileError        = null,
    fallbackProfile     = null,
    patchError          = null,
    insertMsgResult     = { data: { id: MSG_ID, conversation_id: CONV_ID, sender_id: USER_A, content: 'Hi', created_at: '2024-01-01T11:00:00Z' }, error: null },
    deleteError         = null,
    msgForDelete        = { id: MSG_ID, sender_id: USER_A, conversation_id: CONV_ID },
  } = opts;

  // ── Compteur d'appels sur conversation_participants ────────────────────────
  // La route fait jusqu'à 2 queries sur cette table :
  //   1. Vérification de participation (maybeSingle)
  //   2. Récupération de tous les participants (select user_id)
  let cpCallCount = 0;

  const fromMock = vi.fn().mockImplementation((table: string) => {
    // ── conversation_participants ──────────────────────────────────────────
    if (table === 'conversation_participants') {
      cpCallCount++;
      const callNum = cpCallCount;

      // Helper pour créer une chaîne avec un résultat terminal configurable
      const makeChain = (resolve: unknown) => {
        const chain: Record<string, unknown> = {};
        const methods = ['select', 'eq', 'neq', 'update'] as const;
        methods.forEach(m => { chain[m] = () => chain; });
        chain['maybeSingle'] = () => Promise.resolve(resolve);
        chain['then'] = (cb: (v: unknown) => void) => cb(resolve);
        return chain;
      };

      if (callNum === 1) {
        // 1ère query : vérification participation (maybeSingle)
        return makeChain({ data: participationError ? null : participationRow, error: participationError });
      }

      if (callNum === 2) {
        // 2ème query : liste tous les participants
        return makeChain({ data: participantsError ? null : participantRows, error: participantsError });
      }

      // Queries PATCH (update) ou POST (neq) — chaîne générique sans erreur
      const generic = makeChain({ data: patchError ? null : [], error: patchError });
      return generic;
    }

    // ── conversations ──────────────────────────────────────────────────────
    if (table === 'conversations') {
      const chain: Record<string, unknown> = {};
      ['select', 'eq', 'update'].forEach(m => { chain[m] = () => chain; });
      chain['single'] = () => Promise.resolve({ data: convError ? null : conversation, error: convError });
      chain['then'] = (cb: (v: unknown) => void) => cb({ data: conversation, error: null });
      return chain;
    }

    // ── messages ──────────────────────────────────────────────────────────
    if (table === 'messages') {
      const chain: Record<string, unknown> = {};
      ['select', 'eq', 'order', 'delete', 'insert'].forEach(m => { chain[m] = () => chain; });
      // .maybeSingle pour DELETE vérification auteur
      chain['maybeSingle'] = () => Promise.resolve({ data: msgForDelete, error: null });
      // .single pour POST insert
      chain['single'] = () => Promise.resolve(insertMsgResult);
      chain['then'] = (cb: (v: unknown) => void) => {
        if (deleteError) {
          cb({ data: null, error: deleteError });
        } else {
          cb({ data: messagesError ? null : messages, error: messagesError });
        }
      };
      return chain;
    }

    // ── profiles ──────────────────────────────────────────────────────────
    if (table === 'profiles') {
      const chain: Record<string, unknown> = {};
      ['select', 'eq', 'in'].forEach(m => { chain[m] = () => chain; });
      // .maybeSingle pour la requête de fallback (profil absent)
      chain['maybeSingle'] = () => Promise.resolve({ data: fallbackProfile, error: null });
      chain['then'] = (cb: (v: unknown) => void) =>
        cb({ data: profileError ? null : profiles, error: profileError });
      return chain;
    }

    // ── notifications ─────────────────────────────────────────────────────
    if (table === 'notifications') {
      const chain: Record<string, unknown> = {};
      ['insert'].forEach(m => { chain[m] = () => chain; });
      chain['then'] = (cb: (v: unknown) => void) => cb({ data: null, error: null });
      return chain;
    }

    // ── user_favorites / user_blocks (non utilisés par GET) ───────────────
    const generic: Record<string, unknown> = {};
    ['select', 'eq', 'delete', 'insert'].forEach(m => { generic[m] = () => generic; });
    generic['maybeSingle'] = () => Promise.resolve({ data: null, error: null });
    generic['then'] = (cb: (v: unknown) => void) => cb({ data: null, error: null });
    return generic;
  });

  return { from: fromMock };
}

// ─── Helper de requête ────────────────────────────────────────────────────────

function makeGetReq(convId = CONV_ID): NextRequest {
  return new NextRequest(`http://localhost/api/messages/conversation/${convId}`, {
    method: 'GET',
    headers: { Authorization: 'Bearer tok-test' },
  });
}

function makePatchReq(body: unknown, convId = CONV_ID): NextRequest {
  return new NextRequest(`http://localhost/api/messages/conversation/${convId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-test' },
    body: JSON.stringify(body),
  });
}

function makePostReq(body: unknown, convId = CONV_ID): NextRequest {
  return new NextRequest(`http://localhost/api/messages/conversation/${convId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-test' },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq(msgId: string, convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/messages/conversation/${convId}?messageId=${msgId}`,
    { method: 'DELETE', headers: { Authorization: 'Bearer tok-test' } }
  );
}

const routeParams = (convId = CONV_ID) => ({ params: { id: convId } });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockCreateAdmin.mockReturnValue(buildAdminMock() as ReturnType<typeof createAdminClient>);
  });

  // ── Authentification ──────────────────────────────────────────────────────

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Non authentifi/);
  });

  it('retourne 403 si l\'utilisateur n\'est pas participant', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      participationRow: null,
    }) as ReturnType<typeof createAdminClient>);
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Acc[eè]s refus/);
  });

  it('retourne 500 si la vérification de participation échoue côté DB', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      participationError: { message: 'db connection reset' },
    }) as ReturnType<typeof createAdminClient>);
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(500);
  });

  // ── Contrat de réponse ────────────────────────────────────────────────────

  it('retourne 200 avec la forme ConversationApiResponse complète', async () => {
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(200);

    const body = await res.json();
    // Champs obligatoires du contrat
    expect(body).toHaveProperty('conversation');
    expect(body).toHaveProperty('participants');
    expect(body).toHaveProperty('profiles');
    expect(body).toHaveProperty('other_user_id');
    expect(body).toHaveProperty('messages');
    expect(body).toHaveProperty('myParticipation');
  });

  it('myParticipation contient les champs de lecture', async () => {
    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();
    expect(body.myParticipation.user_id).toBe(USER_A);
    expect(body.myParticipation).toHaveProperty('last_read_at');
    expect(body.myParticipation).toHaveProperty('joined_at');
  });

  // ── display_name calculé serveur ──────────────────────────────────────────

  it('calcule display_name depuis full_name quand disponible', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: 'Alice Martin', avatar_url: null, email: 'alice@example.com' },
        { id: USER_B, full_name: 'Bob Dupont',   avatar_url: null, email: 'bob@example.com' },
      ],
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();

    const alice = body.profiles.find((p: { id: string }) => p.id === USER_A);
    const bob   = body.profiles.find((p: { id: string }) => p.id === USER_B);
    expect(alice?.display_name).toBe('Alice Martin');
    expect(bob?.display_name).toBe('Bob Dupont');
  });

  it('calcule display_name depuis la partie locale de l\'email quand full_name est null', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: null, avatar_url: null, email: 'alice.dupont@example.com' },
        { id: USER_B, full_name: '',   avatar_url: null, email: 'bob123@example.com' },
      ],
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();

    const alice = body.profiles.find((p: { id: string }) => p.id === USER_A);
    const bob   = body.profiles.find((p: { id: string }) => p.id === USER_B);
    // Partie locale avant @
    expect(alice?.display_name).toBe('alice.dupont');
    expect(bob?.display_name).toBe('bob123');
  });

  it('utilise le fallback "Utilisateur" quand full_name et email sont tous les deux nuls', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: null, avatar_url: null, email: null },
        { id: USER_B, full_name: null, avatar_url: null, email: null },
      ],
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();

    body.profiles.forEach((p: { display_name: string }) => {
      expect(p.display_name).toBe('Utilisateur');
    });
  });

  it('display_name n\'est jamais null ou vide dans les profils retournés', async () => {
    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();

    for (const p of body.profiles) {
      expect(p.display_name).toBeTruthy();
      expect(typeof p.display_name).toBe('string');
    }
  });

  // ── other_user_id résolu serveur ──────────────────────────────────────────

  it('retourne other_user_id = UUID de l\'autre participant', async () => {
    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();
    // USER_A est l'authentifié — l'autre est USER_B
    expect(body.other_user_id).toBe(USER_B);
  });

  it('retourne other_user_id = null si seul l\'utilisateur courant est participant', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      participantRows: [{ user_id: USER_A }],
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();
    expect(body.other_user_id).toBeNull();
  });

  // ── Fallback profil manquant ──────────────────────────────────────────────

  it('effectue un fallback fetch si le profil de l\'autre participant est absent de la réponse', async () => {
    // Seul USER_A est dans profiles → USER_B manquant → déclenchement du fallback
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: 'Alice', avatar_url: null, email: 'alice@example.com' },
        // USER_B intentionnellement absent
      ],
      fallbackProfile: { id: USER_B, full_name: 'Bob Fallback', avatar_url: null, email: 'bob@example.com' },
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();

    const bob = body.profiles.find((p: { id: string }) => p.id === USER_B);
    expect(bob).toBeDefined();
    expect(bob?.display_name).toBe('Bob Fallback');
  });

  it('retourne quand même la conversation si le profil fallback est null', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      profiles: [
        { id: USER_A, full_name: 'Alice', avatar_url: null, email: 'alice@example.com' },
      ],
      fallbackProfile: null, // fallback échoue aussi
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    // La conv est retournée malgré le profil manquant
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversation.id).toBe(CONV_ID);
  });

  // ── Dégradation gracieuse ─────────────────────────────────────────────────

  it('retourne messages=[] et status 200 si la requête messages échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      messages: [],
      messagesError: { message: 'relation messages does not exist' },
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBe(0);
    // Le client peut distinguer "conversation vide" de "erreur de chargement"
    expect(body.messages_fetch_error).toBe('relation messages does not exist');
  });

  it('messages_fetch_error est null quand le chargement réussit', async () => {
    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages_fetch_error).toBeNull();
  });

  it('retourne 500 si la requête conversations échoue', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      convError: { message: 'table conversations is locked' },
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    expect(res.status).toBe(500);
  });

  // ── Isolation ─────────────────────────────────────────────────────────────

  it('userId courant est toujours inclus dans participants même si participantsError', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      participantsError: { message: 'RLS recursion' },
    }) as ReturnType<typeof createAdminClient>);

    const res = await GET(makeGetReq(), routeParams());
    const body = await res.json();
    expect(body.participants).toContain(USER_A);
  });
});

// ─── PATCH ────────────────────────────────────────────────────────────────────

describe('PATCH /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockCreateAdmin.mockReturnValue(buildAdminMock() as ReturnType<typeof createAdminClient>);
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await PATCH(makePatchReq({ action: 'mark_read' }), routeParams());
    expect(res.status).toBe(401);
  });

  it('retourne 400 si action inconnue', async () => {
    const res = await PATCH(makePatchReq({ action: 'unknown' }), routeParams());
    expect(res.status).toBe(400);
  });

  it('retourne 400 si lastReadAt invalide', async () => {
    const res = await PATCH(makePatchReq({ action: 'mark_read', lastReadAt: 'not-a-date' }), routeParams());
    expect(res.status).toBe(400);
  });

  it('mark_read accepte un datetime ISO valide', async () => {
    const res = await PATCH(
      makePatchReq({ action: 'mark_read', lastReadAt: '2024-01-01T10:00:00.000Z' }),
      routeParams()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('mark_read sans lastReadAt utilise now()', async () => {
    const res = await PATCH(makePatchReq({ action: 'mark_read' }), routeParams());
    expect(res.status).toBe(200);
  });

  it('retourne 400 si exchangeStatus invalide', async () => {
    const res = await PATCH(
      makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'invalid_status' }),
      routeParams()
    );
    expect(res.status).toBe(400);
  });

  it('update_exchange_status → done retourne ok', async () => {
    const res = await PATCH(
      makePatchReq({ action: 'update_exchange_status', exchangeStatus: 'done' }),
      routeParams()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockCreateAdmin.mockReturnValue(buildAdminMock() as ReturnType<typeof createAdminClient>);
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await POST(makePostReq({ content: 'Hi' }), routeParams());
    expect(res.status).toBe(401);
  });

  it('retourne 400 si content est vide', async () => {
    const res = await POST(makePostReq({ content: '   ' }), routeParams());
    expect(res.status).toBe(400);
  });

  it('retourne 400 si content est trop long', async () => {
    const res = await POST(makePostReq({ content: 'a'.repeat(10_001) }), routeParams());
    expect(res.status).toBe(400);
  });

  it('retourne 200 avec le message inséré', async () => {
    const res = await POST(makePostReq({ content: 'Bonjour' }), routeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBeDefined();
    expect(body.message.conversation_id).toBe(CONV_ID);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/messages/conversation/[id]', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserId.mockResolvedValue(USER_A);
    mockCreateAdmin.mockReturnValue(buildAdminMock() as ReturnType<typeof createAdminClient>);
  });

  it('retourne 400 si messageId absent', async () => {
    const req = new NextRequest(`http://localhost/api/messages/conversation/${CONV_ID}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer tok-test' },
    });
    const res = await DELETE(req, routeParams());
    expect(res.status).toBe(400);
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(401);
  });

  it('retourne 403 si l\'utilisateur n\'est pas l\'auteur', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      // Le message appartient à USER_B, l'authentifié est USER_A
      msgForDelete: { id: MSG_ID, sender_id: USER_B, conversation_id: CONV_ID },
    }) as ReturnType<typeof createAdminClient>);

    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(403);
  });

  it('retourne 200 si l\'auteur supprime son message', async () => {
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('retourne 404 si le message est introuvable', async () => {
    mockCreateAdmin.mockReturnValue(buildAdminMock({
      msgForDelete: null,
    }) as ReturnType<typeof createAdminClient>);
    const res = await DELETE(makeDeleteReq(MSG_ID), routeParams());
    expect(res.status).toBe(404);
  });
});
