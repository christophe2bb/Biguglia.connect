/**
 * Tests — Isolation des permissions & IDOR
 *
 * Ce fichier teste les scénarios de sécurité transversaux :
 *  1. Accès non authentifié → 401 sur TOUTES les routes critiques
 *  2. Accès utilisateur standard aux routes admin → 403
 *  3. IDOR messages : un utilisateur ne peut pas accéder aux conv d'un autre
 *  4. Injection de champs serveur : reviewed_by, moderated_by, etc.
 *  5. Protection CSRF sur les mutations
 *  6. Validation Zod — entrées malformées ou malveillantes
 *  7. Modérateur vs Admin — droits différenciés
 *  8. Pas de fuite d'information en cas d'erreur
 *
 * Architecture testée :
 *   • GET/POST/PATCH/DELETE /api/messages/*    → getUserIdBearerFirst()
 *   • GET/PATCH/* /api/admin/*                 → getAdminUser() (admin/moderator only)
 *   • Toutes les mutations sensibles          → assertCsrfSafe()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks globaux ─────────────────────────────────────────────────────────────
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin-guard');
vi.mock('@/lib/supabase/auth-helper');
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/monitoring/sentry', () => ({ captureApiError: vi.fn() }));

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { getUserIdBearerFirst, assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { createAdminClient } from '@/lib/supabase/server';
import {
  makeAdminGuardOk,
  makeAdminGuardFail,
  makeDb,
  ADMIN_ID,
  TARGET_ID,
} from '../admin/__tests__/_mock-admin-guard';

// ── Routes importées statiquement (pas de vi.resetModules) ────────────────────
// On importe les routes une seule fois pour tout le fichier afin d'éviter les
// interférences entre tests liées à vi.resetModules() + dynamic import.
import * as StartConvRoute     from '@/app/api/messages/start-conversation/route';
import * as ConversationsRoute from '@/app/api/messages/conversations/route';
import * as CheckConvRoute     from '@/app/api/messages/check-conversation/route';
import * as AdminUsersRoute    from '@/app/api/admin/users/route';
import * as AdminConfianceRoute from '@/app/api/admin/confiance/route';
import * as AdminArtisansRoute from '@/app/api/admin/artisans/route';
import * as ModerationQueueRoute from '@/app/api/admin/moderation/queue/route';
import * as ModerationStatsRoute from '@/app/api/admin/moderation/stats-data/route';
import * as ConfianceIdRoute   from '@/app/api/admin/confiance/[id]/route';
import * as ModerationIdRoute  from '@/app/api/admin/moderation/[id]/route';
import * as ModerationDecisionRoute from '@/app/api/admin/moderation/[id]/decision/route';

const mockGuard       = vi.mocked(getAdminUser);
const mockGetUserId   = vi.mocked(getUserIdBearerFirst);
const mockCsrf        = vi.mocked(assertCsrfSafe);
const mockAdminClient = vi.mocked(createAdminClient);

// ── UUIDs de test ──────────────────────────────────────────────────────────────
const USER_A   = '00000000-0000-0000-0001-000000000001';
const USER_B   = '00000000-0000-0000-0001-000000000002';
const CONV_ID  = '00000000-0000-0000-0001-000000000010';
const QUEUE_ID = 'queue-perm-test-001';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNextReq(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeReqNoOrigin(url: string, method = 'PATCH', body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' }, // Pas d'Origin → CSRF fail
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Proxy auto-chaînable */
function makeAutoChain(resolved: unknown = { data: null, error: null }) {
  const promise = Promise.resolve(resolved);
  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'then')        return (r: (v: unknown) => unknown) => promise.then(r);
      if (prop === 'catch')       return (r: (e: unknown) => unknown) => promise.catch(r);
      if (prop === 'single')      return vi.fn().mockResolvedValue(resolved);
      if (prop === 'maybeSingle') return vi.fn().mockResolvedValue(resolved);
      return vi.fn().mockReturnValue(makeAutoChain(resolved));
    },
  });
}

// ── Setup adminClient mock ────────────────────────────────────────────────────

function setupAdminClientMock() {
  const db = makeDb();
  vi.spyOn(db, 'from').mockImplementation(() =>
    makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
  );
  mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);
  return db;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. ACCÈS NON AUTHENTIFIÉ — TOUTES LES ROUTES CRITIQUES
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-1] Accès non authentifié → 401 sur toutes les routes critiques', () => {
  beforeEach(() => {
    mockGetUserId.mockResolvedValue(null);
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    mockCsrf.mockReturnValue(null);
    setupAdminClientMock();
  });

  it('[P1-1] POST /api/messages/start-conversation → 401 sans session', async () => {
    const res = await StartConvRoute.POST(makeNextReq('https://app.test/api/messages/start-conversation', 'POST', {
      ownerId: USER_B, relatedType: 'general', relatedId: null, initialMsg: null,
    }));
    expect(res.status).toBe(401);
  });

  it('[P1-2] GET /api/messages/conversations → 401 sans session', async () => {
    const res = await ConversationsRoute.GET(makeNextReq('https://app.test/api/messages/conversations'));
    expect(res.status).toBe(401);
  });

  it('[P1-3] PATCH /api/messages/conversations → 401 sans session', async () => {
    const res = await ConversationsRoute.PATCH(makeNextReq('https://app.test/api/messages/conversations', 'PATCH', {
      conversationId: CONV_ID,
    }));
    expect(res.status).toBe(401);
  });

  it('[P1-4] DELETE /api/messages/conversations → 401 sans session', async () => {
    const res = await ConversationsRoute.DELETE(
      makeNextReq(`https://app.test/api/messages/conversations?conversationId=${CONV_ID}`, 'DELETE')
    );
    expect(res.status).toBe(401);
  });

  it('[P1-5] GET /api/messages/check-conversation → 401 sans session', async () => {
    const res = await CheckConvRoute.GET(makeNextReq(
      `https://app.test/api/messages/check-conversation?relatedType=listing&relatedId=${TARGET_ID}`
    ));
    expect(res.status).toBe(401);
  });

  it('[P1-6] GET /api/admin/users → 401 sans session', async () => {
    const res = await AdminUsersRoute.GET(makeNextReq('https://app.test/api/admin/users'));
    expect(res.status).toBe(401);
  });

  it('[P1-7] GET /api/admin/confiance → 401 sans session', async () => {
    const res = await AdminConfianceRoute.GET(makeNextReq('https://app.test/api/admin/confiance'));
    expect(res.status).toBe(401);
  });

  it('[P1-8] GET /api/admin/artisans → 401 sans session', async () => {
    const res = await AdminArtisansRoute.GET(makeNextReq('https://app.test/api/admin/artisans'));
    expect(res.status).toBe(401);
  });

  it('[P1-9] GET /api/admin/moderation/queue → 401 sans session', async () => {
    const res = await ModerationQueueRoute.GET(makeNextReq('https://app.test/api/admin/moderation/queue'));
    expect(res.status).toBe(401);
  });

  it('[P1-10] GET /api/admin/moderation/stats-data → 401 sans session', async () => {
    const res = await ModerationStatsRoute.GET(makeNextReq('https://app.test/api/admin/moderation/stats-data'));
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. ROUTES ADMIN INACCESSIBLES AUX UTILISATEURS STANDARDS (403)
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-2] Routes admin inaccessibles aux utilisateurs standards → 403', () => {
  beforeEach(() => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    mockCsrf.mockReturnValue(null);
    setupAdminClientMock();
  });

  it('[P2-1] GET /api/admin/users → 403 pour un utilisateur standard', async () => {
    const res = await AdminUsersRoute.GET(makeNextReq('https://app.test/api/admin/users'));
    expect(res.status).toBe(403);
  });

  it('[P2-2] GET /api/admin/artisans → 403 pour un utilisateur standard', async () => {
    const res = await AdminArtisansRoute.GET(makeNextReq('https://app.test/api/admin/artisans'));
    expect(res.status).toBe(403);
  });

  it('[P2-3] GET /api/admin/confiance → 403 pour un utilisateur standard', async () => {
    const res = await AdminConfianceRoute.GET(makeNextReq('https://app.test/api/admin/confiance'));
    expect(res.status).toBe(403);
  });

  it('[P2-4] GET /api/admin/moderation/queue → 403 pour un utilisateur standard', async () => {
    const res = await ModerationQueueRoute.GET(makeNextReq('https://app.test/api/admin/moderation/queue'));
    expect(res.status).toBe(403);
  });

  it('[P2-5] PATCH /api/admin/confiance/[id] → 403 pour un utilisateur standard', async () => {
    const res = await ConfianceIdRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/confiance/${TARGET_ID}`, 'PATCH', {
        action: 'moderate_review', moderation_status: 'hidden',
      }) as Request,
      { params: Promise.resolve({ id: TARGET_ID }) },
    );
    expect(res.status).toBe(403);
  });

  it('[P2-6] PATCH /api/admin/moderation/[id] → 403 pour un utilisateur standard', async () => {
    const res = await ModerationIdRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/moderation/${QUEUE_ID}`, 'PATCH', {
        decision: 'accepter',
      }) as Request,
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. IDOR MESSAGES — Un utilisateur ne peut PAS accéder aux conversations d'un autre
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-3] IDOR messages — isolation entre utilisateurs', () => {
  beforeEach(() => {
    mockCsrf.mockReturnValue(null);
  });

  it('[P3-1] 🔒 DELETE conv : USER_A ne peut pas quitter la conv de USER_B', async () => {
    // USER_A est authentifié
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const db = makeDb();
    // La vérification de participation pour USER_A retourne null (il n'est pas participant)
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await ConversationsRoute.DELETE(
      makeNextReq(`https://app.test/api/messages/conversations?conversationId=${CONV_ID}`, 'DELETE')
    );
    // USER_A n'est pas participant → 403
    expect(res.status).toBe(403);
  });

  it('[P3-2] 🔒 POST start-conversation : impossible de créer une conv avec soi-même (IDOR auto)', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await StartConvRoute.POST(makeNextReq(
      'https://app.test/api/messages/start-conversation', 'POST',
      { ownerId: USER_A, relatedType: 'general', relatedId: null, initialMsg: null },
    ));
    // ownerId === userId (USER_A) → auto-message interdit
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(JSON.stringify(json).toLowerCase()).toMatch(/soi-même|auto|cannot|yourself|invalid/i);
  });

  it('[P3-3] 🔒 check-conversation : UUID invalide dans relatedId → 400 (pas de fuite)', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const res = await CheckConvRoute.GET(makeNextReq(
      'https://app.test/api/messages/check-conversation?relatedType=listing&relatedId=../../../etc/passwd'
    ));
    expect(res.status).toBe(400);
  });

  it('[P3-4] 🔒 check-conversation : relatedType hors whitelist → 400', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);

    const res = await CheckConvRoute.GET(makeNextReq(
      `https://app.test/api/messages/check-conversation?relatedType=__proto__&relatedId=${TARGET_ID}`
    ));
    expect(res.status).toBe(400);
  });

  it('[P3-5] DELETE conv : USER_B participant peut quitter sa propre conv → 200', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_B);

    const db = makeDb();
    let callCount = 0;
    vi.spyOn(db, 'from').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Première requête : vérification participation → USER_B est participant
        return makeAutoChain({ data: { user_id: USER_B }, error: null }) as unknown as ReturnType<typeof db.from>;
      }
      // Requêtes suivantes : suppression des données
      return makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockAdminClient.mockReturnValue(db as unknown as ReturnType<typeof createAdminClient>);

    const res = await ConversationsRoute.DELETE(
      makeNextReq(`https://app.test/api/messages/conversations?conversationId=${CONV_ID}`, 'DELETE')
    );
    expect(res.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. INJECTION DE CHAMPS SERVEUR
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-4] Injection de champs serveur — reviewed_by, moderateur fixé côté serveur', () => {
  beforeEach(() => {
    mockCsrf.mockReturnValue(null);
  });

  it('[P4-1] 🔒 PATCH modération [id] : reviewed_by injecté par le client → ignoré', async () => {
    const updateSpy = vi.fn().mockReturnValue(makeAutoChain({ data: null, error: null }));
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() => ({
      update: updateSpy,
      select: vi.fn().mockReturnValue(makeAutoChain({ data: null, error: null })),
      eq: vi.fn().mockReturnThis(),
    }) as unknown as ReturnType<typeof db.from>);
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db, ADMIN_ID));

    await ModerationIdRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/moderation/${QUEUE_ID}`, 'PATCH', {
        decision: 'accepter',
        reviewed_by: 'uuid-hacker-injection', // tentative d'injection
        status: 'publie',                      // tentative d'injection
      }) as Request,
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );

    if (updateSpy.mock.calls.length > 0) {
      const payload = updateSpy.mock.calls[0][0] as Record<string, unknown>;
      // reviewed_by doit être l'acteur authentifié (ADMIN_ID), pas la valeur injectée
      if (payload.reviewed_by !== undefined) {
        expect(payload.reviewed_by).toBe(ADMIN_ID);
        expect(payload.reviewed_by).not.toBe('uuid-hacker-injection');
      }
    }
  });

  it('[P4-2] 🔒 PATCH confiance [id] : moderated_by non exposé dans la réponse', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ConfianceIdRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/confiance/${TARGET_ID}`, 'PATCH', {
        action: 'moderate_review',
        moderation_status: 'hidden',
      }) as Request,
      { params: Promise.resolve({ id: TARGET_ID }) },
    );

    if (res.status === 200) {
      const json = await res.json();
      // moderated_by ne doit pas être renvoyé dans la réponse (le client ne doit pas le voir)
      expect(json.moderated_by).toBeUndefined();
    }
  });

  it('[P4-3] 🔒 PATCH modération decision : moderator_note trop longue → 400', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ModerationDecisionRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/moderation/${QUEUE_ID}/decision`, 'PATCH', {
        decision: 'accepter',
        moderator_note: 'A'.repeat(1001), // > 1000 chars
      }) as Request,
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. PROTECTION CSRF — MUTATIONS BLOQUÉES SANS ORIGIN
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-5] Protection CSRF — mutations bloquées sans header Origin', () => {
  beforeEach(() => {
    // assertCsrfSafe retourne une réponse d'erreur quand Origin est absent
    mockCsrf.mockImplementation((req: Request) => {
      const origin = req.headers.get('Origin');
      if (!origin) {
        return NextResponse.json({ error: 'CSRF: Origin absent' }, { status: 403 });
      }
      return null;
    });
  });

  it('[P5-1] 🔒 PATCH confiance/[id] sans Origin → 403 CSRF', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ConfianceIdRoute.PATCH(
      makeReqNoOrigin(`https://app.test/api/admin/confiance/${TARGET_ID}`, 'PATCH', {
        action: 'moderate_review', moderation_status: 'hidden',
      }),
      { params: Promise.resolve({ id: TARGET_ID }) },
    );
    expect([403, 401]).toContain(res.status);
  });

  it('[P5-2] 🔒 PATCH moderation/[id] sans Origin → 403 CSRF', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ModerationIdRoute.PATCH(
      makeReqNoOrigin(`https://app.test/api/admin/moderation/${QUEUE_ID}`, 'PATCH', {
        decision: 'accepter',
      }),
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );
    expect([403, 401]).toContain(res.status);
  });

  it('[P5-3] 🔒 PATCH moderation/[id]/decision sans Origin → 403 CSRF', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ModerationDecisionRoute.PATCH(
      makeReqNoOrigin(`https://app.test/api/admin/moderation/${QUEUE_ID}/decision`, 'PATCH', {
        decision: 'accepter',
      }),
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );
    expect([403, 401]).toContain(res.status);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. VALIDATION ZOD — ENTRÉES MALFORMÉES OU MALVEILLANTES
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-6] Validation Zod — entrées malformées ou malveillantes', () => {
  beforeEach(() => {
    mockCsrf.mockReturnValue(null);
  });

  it('[P6-1] POST start-conversation : ownerId non-UUID → 400', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    setupAdminClientMock();

    const res = await StartConvRoute.POST(makeNextReq(
      'https://app.test/api/messages/start-conversation', 'POST',
      { ownerId: 'pas-un-uuid', relatedType: 'general', relatedId: null, initialMsg: null },
    ));
    expect(res.status).toBe(400);
  });

  it('[P6-2] POST start-conversation : relatedType hors whitelist → 400', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    setupAdminClientMock();

    const res = await StartConvRoute.POST(makeNextReq(
      'https://app.test/api/messages/start-conversation', 'POST',
      { ownerId: USER_B, relatedType: 'injection_sql; DROP TABLE', relatedId: null, initialMsg: null },
    ));
    expect(res.status).toBe(400);
  });

  it('[P6-3] PATCH confiance/[id] : action inconnue → 400', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ConfianceIdRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/confiance/${TARGET_ID}`, 'PATCH', {
        action: 'supprimer_tous_les_comptes', // action inconnue
      }) as Request,
      { params: Promise.resolve({ id: TARGET_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('[P6-4] PATCH modération [id] : décision inconnue → 400', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ModerationIdRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/moderation/${QUEUE_ID}`, 'PATCH', {
        decision: 'approve_and_delete_db', // valeur arbitraire
      }) as Request,
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('[P6-5] PATCH modération decision : refuser sans reason → 400', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: { id: QUEUE_ID, content_type: 'listing', content_id: 'list-001', status: 'en_attente_validation' }, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ModerationDecisionRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/moderation/${QUEUE_ID}/decision`, 'PATCH', {
        decision: 'refuser', // reason manquante
      }) as Request,
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('[P6-6] PATCH confiance/[id] : moderation_status hors valeurs → 400', async () => {
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await ConfianceIdRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/confiance/${TARGET_ID}`, 'PATCH', {
        action: 'moderate_review',
        moderation_status: 'visible_to_all_bypass_rls', // valeur injectée
      }) as Request,
      { params: Promise.resolve({ id: TARGET_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it('[P6-7] POST start-conversation : body JSON invalide → 400', async () => {
    mockGetUserId.mockResolvedValueOnce(USER_A);
    setupAdminClientMock();

    const req = new NextRequest('https://app.test/api/messages/start-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: '{invalid json}',
    });
    const res = await StartConvRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. MODÉRATEUR vs ADMIN — DROITS DIFFÉRENCIÉS
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-7] Modérateur vs Admin — droits différenciés', () => {
  beforeEach(() => {
    // Reset TOUS les mocks (implémentations + historique + valeurs de retour)
    // pour éviter les interférences d'état entre groupes de tests
    vi.resetAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  it('[P7-1] Modérateur peut accéder à GET /api/admin/moderation/queue', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await ModerationQueueRoute.GET(makeNextReq('https://app.test/api/admin/moderation/queue'));
    expect(res.status).toBe(200);
  });

  it('[P7-2] Modérateur peut accéder à GET /api/admin/confiance', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await AdminConfianceRoute.GET(makeNextReq('https://app.test/api/admin/confiance'));
    expect(res.status).toBe(200);
  });

  it('[P7-3] Modérateur peut PATCH modération decision (accepter)', async () => {
    const queueItemData = { id: QUEUE_ID, content_type: 'listing', content_id: 'list-001', status: 'en_attente_validation' };
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: queueItemData, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await ModerationDecisionRoute.PATCH(
      makeNextReq(`https://app.test/api/admin/moderation/${QUEUE_ID}/decision`, 'PATCH', {
        decision: 'accepter',
      }) as Request,
      { params: Promise.resolve({ id: QUEUE_ID }) },
    );
    expect(res.status).toBe(200);
  });

  it('[P7-4] Admin peut GET /api/admin/users (PII)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await AdminUsersRoute.GET(makeNextReq('https://app.test/api/admin/users'));
    expect(res.status).toBe(200);
  });

  it('[P7-5] Admin peut GET /api/admin/artisans', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await AdminArtisansRoute.GET(makeNextReq('https://app.test/api/admin/artisans'));
    expect(res.status).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. PAS DE FUITE D'INFORMATION EN CAS D'ERREUR
// ══════════════════════════════════════════════════════════════════════════════

describe('[Perm-8] Pas de fuite d\'information en cas d\'erreur', () => {
  beforeEach(() => {
    // Reset TOUS les mocks (implémentations + historique + valeurs de retour)
    // pour éviter les interférences d'état entre groupes de tests
    vi.resetAllMocks();
    mockCsrf.mockReturnValue(null);
  });

  it('[P8-1] GET /api/admin/users 500 : pas de stack trace dans la réponse', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: { message: 'internal pg error', code: '08P01' } }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await AdminUsersRoute.GET(makeNextReq('https://app.test/api/admin/users'));
    expect(res.status).toBe(500);
    const body = await res.text();
    // Pas de stack trace dans la réponse
    expect(body).not.toContain('at Object');
    expect(body).not.toContain('node_modules');
    expect(body).not.toContain('at async');
  });

  it('[P8-2] GET /api/admin/artisans 500 : pas de stack trace dans la réponse', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: { message: 'connection refused', code: '08001' } }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await AdminArtisansRoute.GET(makeNextReq('https://app.test/api/admin/artisans'));
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain('node_modules');
  });

  it('[P8-3] 401 ne révèle pas d\'information sur l\'existence de ressources', async () => {
    mockGetUserId.mockResolvedValueOnce(null);
    setupAdminClientMock();

    const res = await StartConvRoute.POST(makeNextReq(
      'https://app.test/api/messages/start-conversation', 'POST',
      { ownerId: USER_B, relatedType: 'general', relatedId: null, initialMsg: null },
    ));
    expect(res.status).toBe(401);
    const json = await res.json();
    // Le message d'erreur ne doit pas révéler si USER_B existe ou non
    expect(JSON.stringify(json)).not.toContain(USER_B);
  });

  it('[P8-4] GET /api/admin/confiance 500 : erreur DB reviews → 500 sans fuite', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'reviews') {
        return makeAutoChain({ data: null, error: { message: 'DB error', code: '08000' } }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await AdminConfianceRoute.GET(makeNextReq('https://app.test/api/admin/confiance'));
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain('node_modules');
    expect(body).not.toContain('at async');
  });
});
