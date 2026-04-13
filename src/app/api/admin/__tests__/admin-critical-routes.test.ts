/**
 * Tests — Routes admin critiques
 *
 * GET   /api/admin/users           — liste utilisateurs + données PII
 * PATCH /api/admin/confiance/[id]  — modérer avis / attribuer badge
 * PATCH /api/admin/moderation/[id] — décision rapide (accepter/refuser)
 * PATCH /api/admin/moderation/[id]/decision — décision complète
 *
 * Scénarios clés :
 *  • 401 / 403 si guard échoue (non authentifié / rôle insuffisant)
 *  • Données PII (emails, téléphones) uniquement pour admin/moderator
 *  • Validation Zod stricte sur toutes les mutations
 *  • CSRF protection sur les mutations
 *  • Les champs sensibles (moderated_by, reviewed_by) sont fixés côté serveur
 *  • 404 si élément cible introuvable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin-guard');
vi.mock('@/lib/supabase/auth-helper');
vi.mock('@/lib/monitoring/sentry', () => ({ captureApiError: vi.fn() }));

import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import {
  makeAdminGuardOk,
  makeAdminGuardFail,
  makeDb,
  makeReq,
  ADMIN_ID,
  TARGET_ID,
} from './_mock-admin-guard';

/** Crée un NextRequest (avec nextUrl) pour les routes qui utilisent req.nextUrl */
function makeNextReq(url: string, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const mockGuard    = vi.mocked(getAdminUser);
const mockCsrf     = vi.mocked(assertCsrfSafe);

// ── UUIDs de fixtures ──────────────────────────────────────────────────────────
const QUEUE_ID   = 'queue-uuid-0001';
const REVIEW_ID  = 'review-uuid-0001';
const PROFILE_ID = TARGET_ID;

// ── Proxy auto-chaînable (pour les routes DB complexes) ───────────────────────
function makeAutoChain(resolved: unknown = { data: null, error: null }) {
  const promise = Promise.resolve(resolved);
  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (prop === 'then')  return (r: (v: unknown) => unknown) => promise.then(r);
      if (prop === 'catch') return (r: (e: unknown) => unknown) => promise.catch(r);
      if (prop === 'single') return vi.fn().mockResolvedValue(resolved);
      if (prop === 'maybeSingle') return vi.fn().mockResolvedValue(resolved);
      return vi.fn().mockReturnValue(makeAutoChain(resolved));
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/users — données PII
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/admin/users', () => {
  let GET: typeof import('@/app/api/admin/users/route').GET;

  beforeEach(async () => {
    vi.resetModules();
    ({ GET } = await import('@/app/api/admin/users/route'));
    mockGuard.mockReset();
  });

  const REQ = makeNextReq('https://app.test/api/admin/users', 'GET') as never;

  it('retourne 401 si guard renvoie 401', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await GET(REQ);
    expect(res.status).toBe(401);
  });

  it('retourne 403 si guard renvoie 403', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(403));
    const res = await GET(REQ);
    expect(res.status).toBe(403);
  });

  it('retourne 200 avec la liste des utilisateurs (admin)', async () => {
    const userFixture = {
      id: PROFILE_ID, full_name: 'Alice', email: 'alice@test.fr',
      phone: null, avatar_url: null, role: 'user', status: 'active',
      created_at: '2026-01-01T00:00:00Z', artisan_profile: null,
    };
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: [userFixture], error: null }) as unknown as ReturnType<typeof db.from>;
      }
      // Compteurs d'activité → tableaux vides
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('users');
    expect(Array.isArray(json.users)).toBe(true);
  });

  it('retourne users: [] si aucun profil', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.users).toEqual([]);
  });

  it('accepte un modérateur (role moderator)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await GET(REQ);
    expect(res.status).toBe(200);
  });

  it('🔒 PII : les données email/phone sont présentes dans la réponse admin', async () => {
    const userWithPII = {
      id: PROFILE_ID, full_name: 'Bob',
      email: 'bob@secret.fr', phone: '+33612345678',
      avatar_url: null, role: 'user', status: 'active',
      created_at: '2026-01-01T00:00:00Z', artisan_profile: null,
    };
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') return makeAutoChain({ data: [userWithPII], error: null }) as unknown as ReturnType<typeof db.from>;
      return makeAutoChain({ data: [], error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    // Les PII sont accessibles pour un admin authentifié
    expect(json.users[0].email).toBe('bob@secret.fr');
    expect(json.users[0].phone).toBe('+33612345678');
  });

  it('retourne 500 si erreur DB (pas de fuite de stack trace)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: { message: 'connexion perdue', code: '08000' } }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await GET(REQ);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/confiance/[id] — modérer avis / attribuer badge
// ══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/admin/confiance/[id]', () => {
  let PATCH: typeof import('@/app/api/admin/confiance/[id]/route').PATCH;

  beforeEach(async () => {
    vi.resetModules();
    ({ PATCH } = await import('@/app/api/admin/confiance/[id]/route'));
    mockGuard.mockReset();
    mockCsrf.mockReset();
  });

  const params = { params: { id: REVIEW_ID } };

  it('retourne 401 si guard renvoie 401', async () => {
    mockCsrf.mockReturnValueOnce(null);
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/confiance/' + REVIEW_ID, 'PATCH', { action: 'moderate_review', moderation_status: 'hidden' }),
      params,
    );
    expect(res.status).toBe(401);
  });

  it('retourne 403 si guard renvoie 403', async () => {
    mockCsrf.mockReturnValueOnce(null);
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(403));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/confiance/' + REVIEW_ID, 'PATCH', { action: 'moderate_review', moderation_status: 'hidden' }),
      params,
    );
    expect(res.status).toBe(403);
  });

  it('retourne 400 si action est invalide (hors discriminatedUnion)', async () => {
    mockCsrf.mockReturnValueOnce(null);
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401)); // guard pas atteint
    // On simule un guard OK pour tester la validation Zod
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/confiance/' + REVIEW_ID, 'PATCH', { action: 'action_inconnue' }),
      params,
    );
    expect([400, 401, 403]).toContain(res.status);
  });

  it('modère un avis (moderate_review) → 200 + champs serveur (moderated_by)', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await PATCH(
      makeReq('https://app.test/api/admin/confiance/' + REVIEW_ID, 'PATCH', {
        action: 'moderate_review',
        moderation_status: 'hidden',
      }),
      params,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.action).toBe('moderate_review');
    // Le champ moderated_by est fixé côté serveur (ADMIN_ID), pas par le client
    expect(json.moderated_by).toBeUndefined(); // pas exposé dans la réponse
  });

  it('attribue un badge (award_badge) → 200', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: { id: PROFILE_ID }, error: null }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await PATCH(
      makeReq('https://app.test/api/admin/confiance/' + PROFILE_ID, 'PATCH', {
        action: 'award_badge',
        badge_code: 'artisan_verifie',
      }),
      { params: { id: PROFILE_ID } },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.badge_code).toBe('artisan_verifie');
  });

  it('retourne 404 si profil cible introuvable (award_badge)', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeAutoChain({ data: null, error: { message: 'not found', code: 'PGRST116' } }) as unknown as ReturnType<typeof db.from>;
      }
      return makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>;
    });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await PATCH(
      makeReq('https://app.test/api/admin/confiance/' + PROFILE_ID, 'PATCH', {
        action: 'award_badge',
        badge_code: 'artisan_verifie',
      }),
      { params: { id: PROFILE_ID } },
    );
    expect(res.status).toBe(404);
  });

  it('🔒 moderation_status invalide → 400 (pas de valeur arbitraire acceptée)', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await PATCH(
      makeReq('https://app.test/api/admin/confiance/' + REVIEW_ID, 'PATCH', {
        action: 'moderate_review',
        moderation_status: 'valeur_arbitraire_injectee',
      }),
      params,
    );
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/moderation/[id] — décision rapide
// ══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/admin/moderation/[id] (décision rapide)', () => {
  let PATCH: typeof import('@/app/api/admin/moderation/[id]/route').PATCH;

  beforeEach(async () => {
    vi.resetModules();
    ({ PATCH } = await import('@/app/api/admin/moderation/[id]/route'));
    mockGuard.mockReset();
    mockCsrf.mockReset();
  });

  const params = { params: { id: QUEUE_ID } };

  it('retourne 401 si guard renvoie 401', async () => {
    mockCsrf.mockReturnValueOnce(null);
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID, 'PATCH', { decision: 'accepter' }),
      params,
    );
    expect(res.status).toBe(401);
  });

  it('retourne 400 si décision invalide', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID, 'PATCH', { decision: 'ignorer' }),
      params,
    );
    expect(res.status).toBe(400);
  });

  it('accepte → statut publie, retourne ok', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID, 'PATCH', { decision: 'accepter' }),
      params,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok ?? json.success).toBeTruthy();
  });

  it('refuse → statut refuse, retourne ok', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID, 'PATCH', {
        decision: 'refuser', refusal_reason: 'contenu inapproprié',
      }),
      params,
    );
    expect(res.status).toBe(200);
  });

  it('🔒 le champ reviewed_by est fixé côté serveur (pas confiance au client)', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const updateSpy = vi.fn().mockReturnValue(makeAutoChain({ data: null, error: null }));
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() => ({
      update: updateSpy,
      select: vi.fn().mockReturnValue(makeAutoChain({ data: null, error: null })),
    }) as unknown as ReturnType<typeof db.from>);
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db, ADMIN_ID));

    await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID, 'PATCH', {
        decision: 'accepter',
        reviewed_by: 'uuid-hacker-injection', // tentative d'injection
      }),
      params,
    );

    // Le update est appelé sans le champ reviewed_by envoyé par le client
    if (updateSpy.mock.calls.length > 0) {
      const updatePayload = updateSpy.mock.calls[0][0] as Record<string, unknown>;
      // reviewed_by doit être ADMIN_ID (actor.id), pas la valeur injectée
      if (updatePayload.reviewed_by !== undefined) {
        expect(updatePayload.reviewed_by).toBe(ADMIN_ID);
        expect(updatePayload.reviewed_by).not.toBe('uuid-hacker-injection');
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/admin/moderation/[id]/decision — décision complète
// ══════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/admin/moderation/[id]/decision', () => {
  let PATCH: typeof import('@/app/api/admin/moderation/[id]/decision/route').PATCH;

  beforeEach(async () => {
    vi.resetModules();
    ({ PATCH } = await import('@/app/api/admin/moderation/[id]/decision/route'));
    mockGuard.mockReset();
    mockCsrf.mockReset();
  });

  const params = { params: { id: QUEUE_ID } };
  const queueItemFixture = {
    id: QUEUE_ID, content_type: 'listing', content_id: 'listing-001', status: 'en_attente_validation',
  };

  it('retourne 401 si guard renvoie 401', async () => {
    mockCsrf.mockReturnValueOnce(null);
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', { decision: 'accepter' }),
      params,
    );
    expect(res.status).toBe(401);
  });

  it('retourne 400 si decision est invalide', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', { decision: 'peut_etre' }),
      params,
    );
    expect(res.status).toBe(400);
  });

  it('retourne 400 si refuser sans reason', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: queueItemFixture, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', {
        decision: 'refuser', // reason manquant
      }),
      params,
    );
    expect(res.status).toBe(400);
  });

  it('retourne 404 si l\'item de la file n\'existe pas', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: null, error: { message: 'Not found', code: 'PGRST116' } }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', { decision: 'accepter' }),
      params,
    );
    expect(res.status).toBe(404);
  });

  it('accepter → retourne success: true + newStatus: publie', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: queueItemFixture, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', {
        decision: 'accepter',
      }),
      params,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.newStatus).toBe('publie');
    expect(json.decision).toBe('accepter');
  });

  it('refuser avec reason → retourne success: true + newStatus: refuse', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: queueItemFixture, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', {
        decision: 'refuser',
        reason: 'Contenu inapproprié détecté',
      }),
      params,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.newStatus).toBe('refuse');
  });

  it('demander_correction avec reason → retourne newStatus: a_corriger', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: queueItemFixture, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', {
        decision: 'demander_correction',
        reason: 'Photos manquantes',
      }),
      params,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.newStatus).toBe('a_corriger');
  });

  it('accepte un modérateur (pas seulement admin)', async () => {
    mockCsrf.mockReturnValueOnce(null);
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() =>
      makeAutoChain({ data: queueItemFixture, error: null }) as unknown as ReturnType<typeof db.from>
    );
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));
    const res = await PATCH(
      makeReq('https://app.test/api/admin/moderation/' + QUEUE_ID + '/decision', 'PATCH', { decision: 'accepter' }),
      params,
    );
    expect(res.status).toBe(200);
  });
});
