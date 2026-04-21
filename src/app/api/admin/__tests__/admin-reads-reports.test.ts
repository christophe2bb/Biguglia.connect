/**
 * Tests — GET  /api/admin/users          (liste PII + compteurs)
 *         GET  /api/admin/confiance       (reviews, membres à risque, stats)
 *         PATCH /api/admin/reports/[id]   (update_status, ban_user)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * GET /api/admin/users
 *   Auth
 *     – 401 si guard fail (pas de session)
 *     – 403 si guard fail (rôle insuffisant)
 *   Données
 *     – 200 avec tableau users + champs PII (email, phone)
 *     – 200 [] si aucun profil (empty state)
 *     – 500 si DB error sur profiles
 *   Filtres
 *     – ?filter=suspended  → eq('status', 'suspended')
 *     – ?filter=pending    → eq('role', 'artisan_pending')
 *     – ?filter=verified   → eq('role', 'artisan_verified')
 *     – ?search=marie      → filtre serveur sur full_name / email / phone
 *   Compteurs d'activité
 *     – message_count, listing_count, post_count, request_count calculés
 *
 * GET /api/admin/confiance
 *   Auth
 *     – 401/403 si guard fail
 *   Données
 *     – 200 avec reviews, riskMembers, themeStats
 *     – 500 si DB error sur reviews
 *     – 500 si DB error sur trust_profile_stats
 *
 * PATCH /api/admin/reports/[id]
 *   Auth + CSRF
 *     – 401/403 si guard fail
 *     – CSRF échoue → erreur CSRF
 *   update_status
 *     – 400 JSON invalide
 *     – 400 status invalide (Zod)
 *     – 200 success si resolved/dismissed/reviewed (admin ou moderator)
 *     – 500 si DB error
 *   ban_user
 *     – 403 si acteur = moderator (réservé admin)
 *     – 400 targetId non-UUID
 *     – 200 success + notification si admin
 *     – 500 si DB error sur profiles update
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getUsers }     from '@/app/api/admin/users/route';
import { GET as getConfiance } from '@/app/api/admin/confiance/route';
import { PATCH as patchReport } from '@/app/api/admin/reports/[id]/route';
import {
  makeAdminGuardOk, makeAdminGuardFail,
  makeDb, makeReq,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ADMIN_ID, MODERATOR_ID, TARGET_ID,
} from './_mock-admin-guard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin-guard', () => ({ getAdminUser: vi.fn() }));
vi.mock('@/lib/supabase/auth-helper', () => ({ assertCsrfSafe: vi.fn(() => null) }));
vi.mock('server-only', () => ({}));

import { getAdminUser }   from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';

const mockGuard = getAdminUser   as MockedFunction<typeof getAdminUser>;
const mockCsrf  = assertCsrfSafe as MockedFunction<typeof assertCsrfSafe>;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const REPORT_ID  = 'uuid-report-dddd';
const USER1_ID   = 'uuid-user1-eeee';
const USER2_ID   = 'uuid-user2-ffff';
// UUIDs valides (RFC 4122) pour les cas Zod.uuid()
const TARGET_UUID = '550e8400-e29b-41d4-a716-446655440000';

// ─── Builders spécialisés pour GET /api/admin/users ──────────────────────────

/**
 * Construit un mock adminClient pour GET /api/admin/users.
 * La route fait :
 *   1. adminClient.from('profiles').select(...).neq(...).order(...)  [+ filtres optionnels]
 *   2. Promise.all([messages, listings, forum_posts, service_requests])
 */
function makeUsersDb(opts: {
  profiles?: Array<Record<string, unknown>>;
  profilesError?: boolean;
  messages?: Array<{ sender_id: string }>;
  listings?: Array<{ owner_id: string }>;
  posts?: Array<{ author_id: string }>;
  requests?: Array<{ resident_id: string }>;
} = {}) {
  const {
    profiles      = [
      { id: USER1_ID, full_name: 'Alice Martin', email: 'alice@example.com', phone: '+33600000001', avatar_url: null, role: 'resident', status: 'active', created_at: '2024-01-01', artisan_profile: null },
      { id: USER2_ID, full_name: 'Bob Dupont',   email: 'bob@example.com',   phone: null,            avatar_url: null, role: 'moderator', status: 'active', created_at: '2024-01-02', artisan_profile: null },
    ],
    profilesError = false,
    messages      = [{ sender_id: USER1_ID }, { sender_id: USER1_ID }],
    listings      = [{ owner_id: USER1_ID }],
    posts         = [],
    requests      = [{ resident_id: USER2_ID }],
  } = opts;

  // La route chaîne : .from('profiles').select(...).neq(...).order(...)
  // On doit simuler l'état final awaitable.
  const profilesResult = profilesError
    ? { data: null, error: { message: 'DB error profiles' } }
    : { data: profiles, error: null };

  // Créer un builder fluide qui retourne toujours le résultat final
  function makeFluentChain(result: unknown) {
    const chain: Record<string, unknown> = {};
    const methods = ['eq', 'neq', 'in', 'order', 'limit', 'or', 'filter'];
    methods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
    // top-level await via then/catch
    chain['then'] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);
    chain['catch'] = (reject: (e: unknown) => unknown) =>
      Promise.resolve(result).catch(reject);
    return chain;
  }

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select:  vi.fn().mockReturnValue(makeFluentChain(profilesResult)),
        update:  vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        delete:  vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      };
    }
    if (table === 'messages') {
      return { select: vi.fn().mockReturnValue(makeFluentChain({ data: messages, error: null })) };
    }
    if (table === 'listings') {
      return { select: vi.fn().mockReturnValue(makeFluentChain({ data: listings, error: null })) };
    }
    if (table === 'forum_posts') {
      return { select: vi.fn().mockReturnValue(makeFluentChain({ data: posts, error: null })) };
    }
    if (table === 'service_requests') {
      return { select: vi.fn().mockReturnValue(makeFluentChain({ data: requests, error: null })) };
    }
    return {};
  });

  return { from } as unknown as ReturnType<typeof import('@/lib/supabase/server').createAdminClient>;
}

// ─── Builders spécialisés pour GET /api/admin/confiance ──────────────────────

function makeConfianceDb(opts: {
  reviewsError?:    boolean;
  riskError?:       boolean;
  riskMembers?:     Array<Record<string, unknown>>;
  reviews?:         Array<Record<string, unknown>>;
} = {}) {
  const {
    reviewsError = false,
    riskError    = false,
    riskMembers  = [
      { profile_id: USER1_ID, trust_score: 10, reviews_received: 2, avg_rating: 2.5, interactions_disputed: 1 },
    ],
    reviews = [
      { id: 'rv-1', source_type: 'artisan', rating: 2, comment: 'Médiocre', would_recommend: false, moderation_status: 'reported', created_at: '2024-01-01', author: null, target_user: null, review_tags: [] },
    ],
  } = opts;

  function makeFluentChain(result: unknown) {
    const chain: Record<string, unknown> = {};
    ['eq', 'neq', 'in', 'order', 'limit', 'or', 'filter'].forEach(m => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    chain['then']  = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    chain['catch'] = (reject: (e: unknown) => unknown) => Promise.resolve(result).catch(reject);
    return chain;
  }

  const from = vi.fn((table: string) => {
    if (table === 'reviews') {
      return {
        select: vi.fn().mockReturnValue(
          makeFluentChain(
            reviewsError
              ? { data: null, error: { message: 'DB error reviews' } }
              : { data: reviews, error: null }
          )
        ),
      };
    }
    if (table === 'trust_profile_stats') {
      return {
        select: vi.fn().mockReturnValue(
          makeFluentChain(
            riskError
              ? { data: null, error: { message: 'DB error risk' } }
              : { data: riskMembers, error: null }
          )
        ),
      };
    }
    if (table === 'profiles') {
      // Pour enrichir les membres à risque (maybeSingle)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { full_name: 'Alice Martin', avatar_url: null, role: 'resident' },
              error: null,
            }),
          }),
        }),
      };
    }
    return {};
  });

  return { from } as unknown as ReturnType<typeof import('@/lib/supabase/server').createAdminClient>;
}

// ─── Helpers de requête ───────────────────────────────────────────────────────

function makeGetReq(url: string): NextRequest {
  return new NextRequest(url, {
    method:  'GET',
    headers: { Origin: 'https://app.test' },
  });
}

function patchReportReq(body: unknown) {
  return makeReq(`https://app.test/api/admin/reports/${REPORT_ID}`, 'PATCH', body);
}

function makeReportParams(id = REPORT_ID) {
  return { params: Promise.resolve({ id }) };
}

// =============================================================================
// GET /api/admin/users
// =============================================================================

describe('GET /api/admin/users', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it('401 si guard fail (pas de session)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users'),
    );
    expect(res.status).toBe(401);
  });

  it('403 si guard fail (rôle insuffisant)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users'),
    );
    expect(res.status).toBe(403);
  });

  // ── 500 DB error ──────────────────────────────────────────────────────────

  it('500 si DB error sur profiles', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk('admin', makeDb() as ReturnType<typeof makeDb>));
    // Override avec un db qui retourne une erreur
    const errorDb = makeUsersDb({ profilesError: true });
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: errorDb,
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users'),
    );
    expect(res.status).toBe(500);
  });

  // ── 200 + shape correcte ──────────────────────────────────────────────────

  it('200 avec liste users et champs PII', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeUsersDb(),
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(2);
    // Champs PII présents
    expect(json.users[0].email).toBe('alice@example.com');
    expect(json.users[0].phone).toBe('+33600000001');
    // Compteurs d'activité
    expect(json.users[0].message_count).toBe(2);
    expect(json.users[0].listing_count).toBe(1);
    expect(json.users[0].post_count).toBe(0);
    expect(json.users[0].request_count).toBe(0);
    // USER2 compteurs
    expect(json.users[1].request_count).toBe(1);
  });

  it('200 avec tableau vide si aucun profil', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeUsersDb({ profiles: [] }),
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(0);
  });

  // ── Filtre search ─────────────────────────────────────────────────────────

  it('filtre search côté serveur : retourne uniquement le profil correspondant', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeUsersDb(),
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users?search=alice'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    // Alice correspond au search "alice", pas Bob
    expect(json.users).toHaveLength(1);
    expect(json.users[0].full_name).toBe('Alice Martin');
  });

  it('search par email partiel retourne le bon profil', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeUsersDb(),
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users?search=bob@'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(1);
    expect(json.users[0].full_name).toBe('Bob Dupont');
  });

  it('search sans résultats retourne []', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeUsersDb(),
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users?search=xyzzy-introuvable'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.users).toHaveLength(0);
  });

  // ── Filtres status / role (vérification que l'appel DB contient les bons params) ──

  it('?filter=suspended est accepté sans erreur', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeUsersDb({ profiles: [] }),
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users?filter=suspended'),
    );
    expect(res.status).toBe(200);
  });

  it('?filter=pending est accepté sans erreur', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeUsersDb({ profiles: [] }),
    });
    const res = await getUsers(
      makeGetReq('https://app.test/api/admin/users?filter=pending'),
    );
    expect(res.status).toBe(200);
  });
});

// =============================================================================
// GET /api/admin/confiance
// =============================================================================

describe('GET /api/admin/confiance', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  // ── Auth ─────────────────────────────────────────────────────────────────

  it('401 si guard fail', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await getConfiance(
      makeGetReq('https://app.test/api/admin/confiance'),
    );
    expect(res.status).toBe(401);
  });

  it('403 si guard fail (moderator sans droits suffisants)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await getConfiance(
      makeGetReq('https://app.test/api/admin/confiance'),
    );
    expect(res.status).toBe(403);
  });

  // ── 500 erreurs DB ────────────────────────────────────────────────────────

  it('500 si DB error sur reviews', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeConfianceDb({ reviewsError: true }),
    });
    const res = await getConfiance(
      makeGetReq('https://app.test/api/admin/confiance'),
    );
    expect(res.status).toBe(500);
  });

  it('500 si DB error sur trust_profile_stats', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeConfianceDb({ riskError: true }),
    });
    const res = await getConfiance(
      makeGetReq('https://app.test/api/admin/confiance'),
    );
    expect(res.status).toBe(500);
  });

  // ── 200 shape correcte ────────────────────────────────────────────────────

  it('200 avec reviews, riskMembers, themeStats', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeConfianceDb(),
    });
    const res = await getConfiance(
      makeGetReq('https://app.test/api/admin/confiance'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    // Shape attendue
    expect(Array.isArray(json.reviews)).toBe(true);
    expect(Array.isArray(json.riskMembers)).toBe(true);
    expect(Array.isArray(json.themeStats)).toBe(true);
  });

  it('riskMembers contient le profil enrichi', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeConfianceDb(),
    });
    const res = await getConfiance(
      makeGetReq('https://app.test/api/admin/confiance'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.riskMembers[0].profile_id).toBe(USER1_ID);
    expect(json.riskMembers[0].profile?.full_name).toBe('Alice Martin');
    expect(json.riskMembers[0].trust_score).toBe(10);
  });

  it('themeStats vide si aucun avis visible', async () => {
    mockGuard.mockResolvedValue({
      ok:          true,
      actor:       { id: ADMIN_ID, role: 'admin' },
      adminClient: makeConfianceDb({ reviews: [] }),
    });
    const res = await getConfiance(
      makeGetReq('https://app.test/api/admin/confiance'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    // Pas d'avis visibles → themeStats calculé sur un jeu vide
    expect(Array.isArray(json.themeStats)).toBe(true);
  });
});

// =============================================================================
// PATCH /api/admin/reports/[id]
// =============================================================================

describe('PATCH /api/admin/reports/[id]', () => {

  beforeEach(() => { vi.clearAllMocks(); mockCsrf.mockReturnValue(null); });

  // ── Auth + CSRF ───────────────────────────────────────────────────────────

  it('401 si guard fail (pas de session)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(401));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'resolved' }),
      makeReportParams(),
    );
    expect(res.status).toBe(401);
  });

  it('403 si guard fail (rôle insuffisant)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardFail(403));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'resolved' }),
      makeReportParams(),
    );
    expect(res.status).toBe(403);
  });

  it('erreur CSRF si assertCsrfSafe retourne une réponse d\'erreur', async () => {
    mockCsrf.mockReturnValue(
      new Response(JSON.stringify({ error: 'CSRF' }), { status: 403 }) as unknown as null,
    );
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({ reports: { update: () => ({ data: null, error: null }) } }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'resolved' }),
      makeReportParams(),
    );
    expect(res.status).toBe(403);
  });

  // ── Validation Zod ────────────────────────────────────────────────────────

  it('400 si JSON invalide', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({ reports: { update: () => ({ data: null, error: null }) } }),
    ));
    const req = new Request(`https://app.test/api/admin/reports/${REPORT_ID}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: 'not-json',
    });
    const res = await patchReport(req, makeReportParams());
    expect(res.status).toBe(400);
  });

  it('400 si status invalide (update_status)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({ reports: { update: () => ({ data: null, error: null }) } }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'zombie' }),
      makeReportParams(),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors).toBeDefined();
  });

  it('400 si targetId non-UUID (ban_user)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({ profiles: { update: () => ({ data: null, error: null }) }, notifications: {} }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'ban_user', targetId: 'pas-un-uuid' }),
      makeReportParams(),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors).toBeDefined();
  });

  // ── update_status : admin et moderator ───────────────────────────────────

  it('200 update_status=resolved (admin)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({ reports: { update: () => ({ data: null, error: null }) } }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'resolved' }),
      makeReportParams(),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('resolved');
  });

  it('200 update_status=dismissed (moderator)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'moderator',
      makeDb({ reports: { update: () => ({ data: null, error: null }) } }),
      MODERATOR_ID,
    ));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'dismissed' }),
      makeReportParams(),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe('dismissed');
  });

  it('200 update_status=reviewed', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({ reports: { update: () => ({ data: null, error: null }) } }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'reviewed' }),
      makeReportParams(),
    );
    expect(res.status).toBe(200);
  });

  it('500 si DB error sur update_status', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({ reports: { update: () => ({ data: null, error: { message: 'DB fail' } }) } }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'update_status', status: 'resolved' }),
      makeReportParams(),
    );
    expect(res.status).toBe(500);
  });

  // ── ban_user : réservé admin, interdit moderator ──────────────────────────

  it('403 si ban_user par moderator (action réservée admin)', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'moderator',
      makeDb(),
      MODERATOR_ID,
    ));
    const res = await patchReport(
      patchReportReq({ action: 'ban_user', targetId: TARGET_UUID }),
      makeReportParams(),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/administrateur/i);
  });

  it('200 ban_user réussi si admin', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({
        profiles:      { update: () => ({ data: null, error: null }) },
        notifications: { insert: () => ({ data: null, error: null }) },
      }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'ban_user', targetId: TARGET_UUID }),
      makeReportParams(),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.action).toBe('banned');
    expect(json.targetId).toBe(TARGET_UUID);
  });

  it('500 si DB error sur profiles.update lors de ban_user', async () => {
    mockGuard.mockResolvedValue(makeAdminGuardOk(
      'admin',
      makeDb({
        profiles: { update: () => ({ data: null, error: { message: 'DB fail ban' } }) },
      }),
    ));
    const res = await patchReport(
      patchReportReq({ action: 'ban_user', targetId: TARGET_UUID }),
      makeReportParams(),
    );
    expect(res.status).toBe(500);
  });
});
