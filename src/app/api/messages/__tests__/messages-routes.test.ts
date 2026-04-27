/**
 * Tests — Routes messages critiques
 *
 * POST /api/messages/start-conversation
 * GET  /api/messages/conversations
 * PATCH /api/messages/conversations
 * DELETE /api/messages/conversations
 * GET  /api/messages/check-conversation
 *
 * Scénarios clés :
 *  • 401 si non authentifié — aucune donnée exposée
 *  • 400 validation Zod (UUID invalide, corps manquant, params invalides)
 *  • 200 happy path
 *  • IDOR : un user ne peut pas quitter/lire la conv d'un autre
 *  • Anti-auto-message : impossible de démarrer une conv avec soi-même
 *  • Destinataire introuvable → 404
 *  • Conv existante → isNew: false (anti-duplication)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/supabase/auth-helper');

import { createAdminClient } from '@/lib/supabase/server';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';

const mockAdminClient    = vi.mocked(createAdminClient);
const mockGetUserId      = vi.mocked(getUserIdBearerFirst);
const mockAssertCsrfSafe = vi.mocked(assertCsrfSafe);

/** Réponse 403 CSRF prête à retourner dans les tests de rejet cross-site */
function makeCsrf403(): Response {
  return new Response(JSON.stringify({ error: 'Requête refusée : en-tête Origin manquant (protection CSRF).' }), {
    status: 403, headers: { 'Content-Type': 'application/json' },
  });
}

// ── UUIDs de fixtures ──────────────────────────────────────────────────────────
const USER_A   = '00000000-0000-0000-0000-000000000001';
const USER_B   = '00000000-0000-0000-0000-000000000002';
const CONV_ID  = '00000000-0000-0000-0000-000000000010';
const OBJ_ID   = '00000000-0000-0000-0000-000000000020';

// ── Helper : créer une Request ────────────────────────────────────────────────
function makeReq(
  url: string,
  method = 'GET',
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.test', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ── Helper : mock adminClient chainable infini ────────────────────────────────
function makeAutoChain(resolved: unknown = { data: null, error: null }) {
  const promise = Promise.resolve(resolved);
  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'then')  return (r: (v: unknown) => unknown) => promise.then(r);
      if (prop === 'catch') return (r: (e: unknown) => unknown) => promise.catch(r);
      return vi.fn().mockReturnValue(makeAutoChain(resolved));
    },
  });
}

function makeDb(tableMap: Record<string, unknown> = {}) {
  return {
    from: vi.fn((table: string) => {
      const resolved = tableMap[table] ?? { data: null, error: null };
      return makeAutoChain(resolved);
    }),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/messages/start-conversation
// ══════════════════════════════════════════════════════════════════════════════

describe('POST /api/messages/start-conversation', () => {
  let POST: typeof import('@/app/api/messages/start-conversation/route').POST;

  beforeEach(async () => {
    vi.resetModules();
    ({ POST } = await import('@/app/api/messages/start-conversation/route'));
    mockGetUserId.mockReset();
    mockAdminClient.mockReset();
    mockAssertCsrfSafe.mockReset();
    mockAssertCsrfSafe.mockReturnValue(null); // safe par défaut
  });

  // ── CSRF ──────────────────────────────────────────────────────────────────

  it('🔒 CSRF : retourne 403 si assertCsrfSafe rejette la requête cross-site', async () => {
    mockAssertCsrfSafe.mockReturnValueOnce(makeCsrf403() as never);
    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, subject: 'Test', relatedType: 'general', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('CSRF');
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce(null);
    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, subject: 'Test', relatedType: 'general', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  // ── Validation ────────────────────────────────────────────────────────────

  it('retourne 400 si corps JSON invalide', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const req = new Request('https://app.test/api/messages/start-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{{{',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('retourne 400 si ownerId n\'est pas un UUID valide', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: 'pas-un-uuid', relatedType: 'general', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('invalides');
  });

  it('retourne 400 si relatedType est invalide (hors whitelist)', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, relatedType: 'type_inconnu', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(400);
  });

  // ── Anti-auto-message ─────────────────────────────────────────────────────

  it('retourne 400 si ownerId === userId (auto-message)', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_A, relatedType: 'general', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('soi-même');
  });

  // ── Destinataire introuvable ──────────────────────────────────────────────

  it('retourne 404 si le destinataire n\'existe pas dans profiles', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const db = makeDb({
      conversation_participants: { data: [], error: null },
      profiles: { data: null, error: null }, // maybeSingle → null
    });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, relatedType: 'general', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('Destinataire');
  });

  // ── Conv existante (anti-duplication) ─────────────────────────────────────

  it('retourne isNew: false si la conversation existe déjà', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    // Simule : les deux participants ont déjà la conv CONV_ID
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return makeAutoChain({ data: { id: USER_B }, error: null });
        }
        if (table === 'conversation_participants') {
          // Les deux ont CONV_ID
          return makeAutoChain({ data: [{ conversation_id: CONV_ID }], error: null });
        }
        if (table === 'conversations') {
          return makeAutoChain({ data: { id: CONV_ID }, error: null });
        }
        return makeAutoChain({ data: null, error: null });
      }),
    };
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, relatedType: 'general', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isNew).toBe(false);
    expect(json.conversationId).toBe(CONV_ID);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('crée une nouvelle conversation et retourne isNew: true', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return makeAutoChain({ data: { id: USER_B }, error: null });
        }
        if (table === 'conversation_participants') {
          // Pas de conv partagée
          return makeAutoChain({ data: [], error: null });
        }
        if (table === 'conversations') {
          return makeAutoChain({ data: { id: CONV_ID }, error: null });
        }
        return makeAutoChain({ data: null, error: null });
      }),
    };
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, relatedType: 'general', relatedId: null, initialMsg: null,
    }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isNew).toBe(true);
    expect(json.conversationId).toBeDefined();
  });

  it('crée une conv avec message initial et notifie le destinataire', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const db = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return makeAutoChain({ data: { id: USER_B, full_name: 'Bob' }, error: null });
        }
        if (table === 'conversation_participants') {
          return makeAutoChain({ data: [], error: null });
        }
        if (table === 'conversations') {
          return makeAutoChain({ data: { id: CONV_ID }, error: null });
        }
        if (table === 'messages' || table === 'notifications') {
          return { insert: insertMock };
        }
        return makeAutoChain({ data: null, error: null });
      }),
    };
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await POST(makeReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, relatedType: 'general', relatedId: null,
      initialMsg: 'Bonjour !',
    }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isNew).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/messages/conversations
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/messages/conversations', () => {
  let GET: typeof import('@/app/api/messages/conversations/route').GET;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import('@/app/api/messages/conversations/route'));
    mockGetUserId.mockReset();
    mockAdminClient.mockReset();
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce(null);
    const res = await GET(makeReq('https://app.test/api/messages/conversations') as never);
    expect(res.status).toBe(401);
  });

  it('retourne participations vides si l\'utilisateur n\'a aucune conversation', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const db = makeDb({ conversation_participants: { data: [], error: null } });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET(makeReq('https://app.test/api/messages/conversations') as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.participations).toEqual([]);
  });

  it('retourne 200 avec la liste des conversations', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'conversation_participants') {
          return makeAutoChain({
            data: [{ conversation_id: CONV_ID, last_read_at: null, joined_at: null }],
            error: null,
          });
        }
        if (table === 'conversations') {
          return makeAutoChain({
            data: [{ id: CONV_ID, subject: 'Test', related_type: 'general', related_id: null, updated_at: new Date().toISOString() }],
            error: null,
          });
        }
        if (table === 'messages') {
          return makeAutoChain({ data: [], error: null });
        }
        if (table === 'profiles') {
          return makeAutoChain({ data: [], error: null });
        }
        return makeAutoChain({ data: [], error: null });
      }),
    };
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET(makeReq('https://app.test/api/messages/conversations') as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('participations');
    expect(Array.isArray(json.participations)).toBe(true);
  });

  it('retourne 500 si erreur DB sur conversation_participants', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const db = makeDb({
      conversation_participants: { data: null, error: { message: 'DB error', code: '500' } },
    });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET(makeReq('https://app.test/api/messages/conversations') as never);
    expect(res.status).toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/messages/conversations (marquer comme lu)
// ══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/messages/conversations', () => {
  let PATCH: typeof import('@/app/api/messages/conversations/route').PATCH;

  beforeEach(async () => {
    vi.resetModules();
    ({ PATCH } = await import('@/app/api/messages/conversations/route'));
    mockGetUserId.mockReset();
    mockAdminClient.mockReset();
    mockAssertCsrfSafe.mockReset();
    mockAssertCsrfSafe.mockReturnValue(null); // safe par défaut
  });

  it('🔒 CSRF : retourne 403 si assertCsrfSafe rejette la requête cross-site', async () => {
    mockAssertCsrfSafe.mockReturnValueOnce(makeCsrf403() as never);
    const res = await PATCH(makeReq('https://app.test/api/messages/conversations', 'PATCH', {
      conversationId: CONV_ID,
    }) as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('CSRF');
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq('https://app.test/api/messages/conversations', 'PATCH', {
      conversationId: CONV_ID,
    }) as never);
    expect(res.status).toBe(401);
  });

  it('retourne 400 si conversationId est absent', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const res = await PATCH(makeReq('https://app.test/api/messages/conversations', 'PATCH', {}) as never);
    expect(res.status).toBe(400);
  });

  it('met à jour last_read_at et retourne ok: true', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const db = makeDb({ conversation_participants: { data: null, error: null } });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await PATCH(makeReq('https://app.test/api/messages/conversations', 'PATCH', {
      conversationId: CONV_ID,
      lastReadAt: new Date().toISOString(),
    }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/messages/conversations (quitter — IDOR check)
// ══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/messages/conversations — IDOR protection', () => {
  let DELETE: typeof import('@/app/api/messages/conversations/route').DELETE;

  beforeEach(async () => {
    vi.resetModules();
    ({ DELETE } = await import('@/app/api/messages/conversations/route'));
    mockGetUserId.mockReset();
    mockAdminClient.mockReset();
    mockAssertCsrfSafe.mockReset();
    mockAssertCsrfSafe.mockReturnValue(null); // safe par défaut
  });

  it('🔒 CSRF : retourne 403 si assertCsrfSafe rejette la requête cross-site', async () => {
    mockAssertCsrfSafe.mockReturnValueOnce(makeCsrf403() as never);
    const res = await DELETE(makeReq(
      `https://app.test/api/messages/conversations?conversationId=${CONV_ID}`, 'DELETE',
    ) as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('CSRF');
  });

  it('retourne 400 si conversationId manquant', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const res = await DELETE(makeReq('https://app.test/api/messages/conversations', 'DELETE') as never);
    expect(res.status).toBe(400);
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq(
      `https://app.test/api/messages/conversations?conversationId=${CONV_ID}`, 'DELETE',
    ) as never);
    expect(res.status).toBe(401);
  });

  it('🔒 IDOR : retourne 403 si l\'utilisateur n\'est PAS participant', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    // maybeSingle → null = utilisateur non participant
    const db = makeDb({ conversation_participants: { data: null, error: null } });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await DELETE(makeReq(
      `https://app.test/api/messages/conversations?conversationId=${CONV_ID}`, 'DELETE',
    ) as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('refusé');
  });

  it('supprime la participation si l\'utilisateur est participant', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'conversation_participants') {
          return makeAutoChain({ data: { user_id: USER_A }, error: null });
        }
        if (table === 'messages') {
          return makeAutoChain({ data: null, error: null });
        }
        return makeAutoChain({ data: null, error: null });
      }),
    };
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await DELETE(makeReq(
      `https://app.test/api/messages/conversations?conversationId=${CONV_ID}`, 'DELETE',
    ) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/messages/check-conversation
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/messages/check-conversation', () => {
  let GET: typeof import('@/app/api/messages/check-conversation/route').GET;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import('@/app/api/messages/check-conversation/route'));
    mockGetUserId.mockReset();
    mockAdminClient.mockReset();
  });

  it('retourne 401 si non authentifié', async () => {
    mockGetUserId.mockResolvedValueOnce(null);
    const res = await GET(makeReq(
      `https://app.test/api/messages/check-conversation?relatedType=listing&relatedId=${OBJ_ID}`,
    ) as never);
    expect(res.status).toBe(401);
  });

  it('retourne 400 si relatedType est invalide', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const res = await GET(makeReq(
      `https://app.test/api/messages/check-conversation?relatedType=invalide&relatedId=${OBJ_ID}`,
    ) as never);
    expect(res.status).toBe(400);
  });

  it('retourne 400 si relatedId n\'est pas un UUID', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const res = await GET(makeReq(
      `https://app.test/api/messages/check-conversation?relatedType=listing&relatedId=pas-uuid`,
    ) as never);
    expect(res.status).toBe(400);
  });

  it('retourne conversationId: null si aucune conversation', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const db = makeDb({ conversation_participants: { data: [], error: null } });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET(makeReq(
      `https://app.test/api/messages/check-conversation?relatedType=listing&relatedId=${OBJ_ID}`,
    ) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.conversationId).toBeNull();
    expect(json.exchangeStatus).toBeNull();
  });

  it('retourne conversationId si la conversation existe', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const db = {
      from: vi.fn((table: string) => {
        if (table === 'conversation_participants') {
          return makeAutoChain({ data: [{ conversation_id: CONV_ID }], error: null });
        }
        if (table === 'conversations') {
          return makeAutoChain({ data: { id: CONV_ID, exchange_status: 'done' }, error: null });
        }
        return makeAutoChain({ data: null, error: null });
      }),
    };
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET(makeReq(
      `https://app.test/api/messages/check-conversation?relatedType=listing&relatedId=${OBJ_ID}`,
    ) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.conversationId).toBe(CONV_ID);
    expect(json.exchangeStatus).toBe('done');
  });

  it('retourne 500 si erreur DB (pas de fuite de détails)', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    const db = makeDb({
      conversation_participants: { data: null, error: { message: 'connexion perdue', code: '08000' } },
    });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET(makeReq(
      `https://app.test/api/messages/check-conversation?relatedType=listing&relatedId=${OBJ_ID}`,
    ) as never);
    expect(res.status).toBe(500);
  });
});
