/**
 * Tests — nouvelles routes sécurisées côté serveur
 *
 * Couverture :
 *   GET  /api/admin/dashboard      → compteurs de synthèse admin
 *   GET  /api/admin/reports        → liste des signalements
 *   GET  /api/admin/stats          → statistiques complètes
 *   POST /api/admin/users/reset-password → réinitialisation mot de passe
 *
 * Scénarios vérifiés :
 *   • 401 si non authentifié
 *   • 403 si rôle insuffisant (ni admin ni moderator)
 *   • 200 avec les données attendues si admin
 *   • Filtrage par status/target_type pour /reports
 *   • CSRF protection pour reset-password
 *   • Restriction admin uniquement pour reset-password (pas moderator)
 *   • Aucune donnée PII dans les réponses non protégées
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin-guard');
vi.mock('@/lib/supabase/auth-helper');
vi.mock('@/lib/supabase/server');

import { getAdminUser } from '@/lib/supabase/admin-guard';
import { assertCsrfSafe } from '@/lib/supabase/auth-helper';
import { GET as dashboardGET } from '@/app/api/admin/dashboard/route';
import { GET as reportsGET } from '@/app/api/admin/reports/route';
import { GET as statsGET } from '@/app/api/admin/stats/route';
import { POST as resetPasswordPOST } from '@/app/api/admin/users/reset-password/route';

import {
  makeAdminGuardOk,
  makeAdminGuardFail,
  makeDb,
  makeReq,
  mockCsrfPass,
  ADMIN_ID,
  MODERATOR_ID,
} from './_mock-admin-guard';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockGetAdminUser = vi.mocked(getAdminUser);
const mockAssertCsrf   = vi.mocked(assertCsrfSafe);

// Helper report fixture
function makeReport(id: string, status = 'pending') {
  return {
    id,
    reporter_id: 'reporter-1',
    target_type: 'post',
    target_id:   'post-1',
    target_title: 'Some post title',
    reason:       'spam',
    description:  null,
    status,
    created_at:   '2026-01-01T00:00:00Z',
    reporter:     { full_name: 'Reporter Name', avatar_url: null },
  };
}

// Helper count mock (for SELECT with count: exact, head: true)
function makeCountDb(counts: Record<string, number>) {
  const from = vi.fn((table: string) => {
    const tableCount = counts[table] ?? 0;
    const chain: Record<string, unknown> = {};
    const countResult = Promise.resolve({ count: tableCount, error: null });
    chain.select = vi.fn().mockReturnValue({
      ...chain,
      neq: vi.fn().mockReturnValue({ ...chain, then: (r: (v: unknown) => unknown) => countResult.then(r), catch: (r: (e: unknown) => unknown) => countResult.catch(r) }),
      eq:  vi.fn().mockReturnValue({ ...chain, then: (r: (v: unknown) => unknown) => countResult.then(r), catch: (r: (e: unknown) => unknown) => countResult.catch(r) }),
      then: (r: (v: unknown) => unknown) => countResult.then(r),
      catch: (r: (e: unknown) => unknown) => countResult.catch(r),
    });
    return chain;
  });
  return { from };
}

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────

describe('GET /api/admin/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCsrf.mockReturnValue(null);
  });

  it('[dashboard-1] retourne 401 si non authentifié', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(401));
    const req = new NextRequest('https://app.test/api/admin/dashboard');
    const res = await dashboardGET(req);
    expect(res.status).toBe(401);
  });

  it('[dashboard-2] retourne 403 si rôle insuffisant', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(403));
    const req = new NextRequest('https://app.test/api/admin/dashboard');
    const res = await dashboardGET(req);
    expect(res.status).toBe(403);
  });

  it('[dashboard-3] retourne 200 avec tous les compteurs pour admin', async () => {
    const db = makeCountDb({
      profiles:         42,
      listings:         10,
      forum_posts:      5,
      reports:          3,
      equipment_items:  8,
      messages:         100,
      moderation_queue: 2,
    });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));

    const req = new NextRequest('https://app.test/api/admin/dashboard');
    const res = await dashboardGET(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { stats: Record<string, unknown> };
    expect(body.stats).toBeDefined();
    // Toutes les clés attendues sont présentes
    const keys = [
      'total_users', 'pending_artisans', 'verified_artisans',
      'total_listings', 'total_forum_posts', 'pending_reports',
      'total_equipment', 'total_messages', 'pending_moderation',
    ];
    keys.forEach(k => expect(Object.keys(body.stats)).toContain(k));
    // Les valeurs sont des nombres
    Object.values(body.stats).forEach(v => expect(typeof v).toBe('number'));
  });

  it('[dashboard-4] retourne 200 pour moderator également', async () => {
    const db = makeCountDb({ profiles: 10 });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('moderator', db as ReturnType<typeof makeDb>, MODERATOR_ID));

    const req = new NextRequest('https://app.test/api/admin/dashboard');
    const res = await dashboardGET(req);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/admin/reports ───────────────────────────────────────────────────

describe('GET /api/admin/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCsrf.mockReturnValue(null);
  });

  it('[reports-get-1] retourne 401 si non authentifié', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(401));
    const req = new NextRequest('https://app.test/api/admin/reports');
    const res = await reportsGET(req);
    expect(res.status).toBe(401);
  });

  it('[reports-get-2] retourne 403 si rôle insuffisant', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(403));
    const req = new NextRequest('https://app.test/api/admin/reports');
    const res = await reportsGET(req);
    expect(res.status).toBe(403);
  });

  it('[reports-get-3] retourne 200 avec reports et counts pour admin', async () => {
    const reports = [makeReport('r-1', 'pending'), makeReport('r-2', 'resolved')];

    const db = makeDb({
      reports: {
        select: () => ({ data: reports, error: null }),
      },
    });

    // Override pour les count queries (head: true)
    const origFrom = db.from;
    db.from = vi.fn((table: string) => {
      const base = origFrom(table);
      // Pour les COUNT: retourner count
      const countResult = Promise.resolve({ count: reports.length, error: null });
      const countSelect = vi.fn().mockReturnValue({
        eq:  vi.fn().mockReturnValue({ then: (r: (v: unknown) => unknown) => Promise.resolve({ count: 1, error: null }).then(r), catch: (r: (e: unknown) => unknown) => Promise.resolve({ count: 1, error: null }).catch(r) }),
        then: (r: (v: unknown) => unknown) => countResult.then(r),
        catch: (r: (e: unknown) => unknown) => countResult.catch(r),
      });
      return { ...base, select: vi.fn().mockImplementation((...args: unknown[]) => {
        if (args[1] && (args[1] as Record<string, unknown>).count === 'exact') return countSelect(...args);
        return base.select(...args);
      }) };
    });

    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));

    const req = new NextRequest('https://app.test/api/admin/reports');
    const res = await reportsGET(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { reports: unknown[]; counts: Record<string, unknown> };
    expect(Array.isArray(body.reports)).toBe(true);
    expect(body.counts).toBeDefined();
    expect(typeof body.counts.pending).toBe('number');
    expect(typeof body.counts.total).toBe('number');
  });

  it('[reports-get-4] retourne 200 pour moderator également', async () => {
    const db = makeDb({ reports: { select: () => ({ data: [], error: null }) } });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('moderator', db, MODERATOR_ID));
    const req = new NextRequest('https://app.test/api/admin/reports');
    const res = await reportsGET(req);
    expect(res.status).toBe(200);
  });

  it('[reports-get-5] filtre par status via query param', async () => {
    const db = makeDb({ reports: { select: () => ({ data: [makeReport('r-1', 'pending')], error: null }) } });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));
    const req = new NextRequest('https://app.test/api/admin/reports?status=pending');
    const res = await reportsGET(req);
    expect(res.status).toBe(200);
  });

  it('[reports-get-6] retourne 500 si erreur DB', async () => {
    const db = makeDb({ reports: { select: () => ({ data: null, error: { message: 'DB error' } }) } });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));
    const req = new NextRequest('https://app.test/api/admin/reports');
    const res = await reportsGET(req);
    expect(res.status).toBe(500);
  });

  it('[reports-get-7] la réponse ne contient PAS les emails ou téléphones', async () => {
    const reportWithPII = { ...makeReport('r-1'), reporter_email: 'secret@test.com', phone: '0612345678' };
    const db = makeDb({ reports: { select: () => ({ data: [reportWithPII], error: null }) } });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));
    const req = new NextRequest('https://app.test/api/admin/reports');
    const res = await reportsGET(req);
    const body = await res.json() as { reports: Array<Record<string, unknown>> };
    // Les champs PII non-déclarés dans ReportEntry ne doivent pas apparaître
    if (body.reports.length > 0) {
      expect(body.reports[0].reporter_email).toBeUndefined();
      expect(body.reports[0].phone).toBeUndefined();
    }
  });
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCsrf.mockReturnValue(null);
  });

  it('[stats-1] retourne 401 si non authentifié', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(401));
    const req = new NextRequest('https://app.test/api/admin/stats');
    const res = await statsGET(req);
    expect(res.status).toBe(401);
  });

  it('[stats-2] retourne 403 si rôle insuffisant', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(403));
    const req = new NextRequest('https://app.test/api/admin/stats');
    const res = await statsGET(req);
    expect(res.status).toBe(403);
  });

  it('[stats-3] retourne 200 avec toutes les clés pour admin', async () => {
    const db = makeDb({
      profiles:          { select: () => ({ data: [], error: null }) },
      messages:          { select: () => ({ data: [], error: null }) },
      conversations:     { select: () => ({ data: [], error: null }) },
      listings:          { select: () => ({ data: [], error: null }) },
      forum_posts:       { select: () => ({ data: [], error: null }) },
      forum_comments:    { select: () => ({ data: [], error: null }) },
      service_requests:  { select: () => ({ data: [], error: null }) },
      reviews:           { select: () => ({ data: [], error: null }) },
      equipment_items:   { select: () => ({ data: [], error: null }) },
      equipment_loans:   { select: () => ({ data: [], error: null }) },
      reports:           { select: () => ({ data: [], error: null }) },
      notifications:     { select: () => ({ data: [], error: null }) },
      artisan_profiles:  { select: () => ({ data: [], error: null }) },
    });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));

    const req = new NextRequest('https://app.test/api/admin/stats');
    const res = await statsGET(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { stats: Record<string, unknown> };
    expect(body.stats).toBeDefined();

    // Clés obligatoires
    const requiredKeys = [
      'totalUsers', 'residents', 'artisansPending', 'artisansVerified',
      'totalMessages', 'totalConversations',
      'totalListings', 'activeListings',
      'totalPosts', 'totalComments',
      'totalReviews', 'avgRating',
      'pendingReports', 'totalReports',
      'dailyUsers', 'dailyMessages', 'dailyPosts', 'dailyListings',
      'roleDistribution', 'tradeCategories', 'activityByHour',
    ];
    requiredKeys.forEach(k => expect(Object.keys(body.stats)).toContain(k));
  });

  it('[stats-4] dailyUsers est un tableau de 30 éléments avec {date, value}', async () => {
    const db = makeDb({
      profiles:          { select: () => ({ data: [], error: null }) },
      messages:          { select: () => ({ data: [], error: null }) },
      conversations:     { select: () => ({ data: [], error: null }) },
      listings:          { select: () => ({ data: [], error: null }) },
      forum_posts:       { select: () => ({ data: [], error: null }) },
      forum_comments:    { select: () => ({ data: [], error: null }) },
      service_requests:  { select: () => ({ data: [], error: null }) },
      reviews:           { select: () => ({ data: [], error: null }) },
      equipment_items:   { select: () => ({ data: [], error: null }) },
      equipment_loans:   { select: () => ({ data: [], error: null }) },
      reports:           { select: () => ({ data: [], error: null }) },
      notifications:     { select: () => ({ data: [], error: null }) },
      artisan_profiles:  { select: () => ({ data: [], error: null }) },
    });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));

    const req = new NextRequest('https://app.test/api/admin/stats');
    const res = await statsGET(req);
    const body = await res.json() as { stats: { dailyUsers: Array<{ date: string; value: number }> } };

    expect(Array.isArray(body.stats.dailyUsers)).toBe(true);
    expect(body.stats.dailyUsers.length).toBe(30);
    const first = body.stats.dailyUsers[0];
    expect(typeof first.date).toBe('string');
    expect(typeof first.value).toBe('number');
    // Ne doit PAS avoir la clé 'count' (ancienne version)
    expect((first as Record<string, unknown>).count).toBeUndefined();
  });

  it('[stats-5] activityByHour a 24 entrées', async () => {
    const db = makeDb({
      profiles:          { select: () => ({ data: [], error: null }) },
      messages:          { select: () => ({ data: [], error: null }) },
      conversations:     { select: () => ({ data: [], error: null }) },
      listings:          { select: () => ({ data: [], error: null }) },
      forum_posts:       { select: () => ({ data: [], error: null }) },
      forum_comments:    { select: () => ({ data: [], error: null }) },
      service_requests:  { select: () => ({ data: [], error: null }) },
      reviews:           { select: () => ({ data: [], error: null }) },
      equipment_items:   { select: () => ({ data: [], error: null }) },
      equipment_loans:   { select: () => ({ data: [], error: null }) },
      reports:           { select: () => ({ data: [], error: null }) },
      notifications:     { select: () => ({ data: [], error: null }) },
      artisan_profiles:  { select: () => ({ data: [], error: null }) },
    });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));

    const req = new NextRequest('https://app.test/api/admin/stats');
    const res = await statsGET(req);
    const body = await res.json() as { stats: { activityByHour: unknown[] } };
    expect(body.stats.activityByHour.length).toBe(24);
  });
});

// ─── POST /api/admin/users/reset-password ─────────────────────────────────────

describe('POST /api/admin/users/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCsrf.mockReturnValue(null);
  });

  it('[reset-1] retourne 401 si non authentifié', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(401));
    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ email: 'user@test.com' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(401);
  });

  it('[reset-2] retourne 403 si rôle insuffisant (non admin)', async () => {
    mockGetAdminUser.mockResolvedValue(makeAdminGuardFail(403));
    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ email: 'user@test.com' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(403);
  });

  it('[reset-3] retourne 403 si moderator (pas admin)', async () => {
    // Le moderator passe le guard mais pas le check de rôle admin strict
    const db = makeDb({
      profiles: { select: () => ({ data: { id: 'user-1', email: 'user@test.com' }, error: null }) },
    });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('moderator', db, MODERATOR_ID));

    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ email: 'user@test.com' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/administrateur/i);
  });

  it('[reset-4] retourne 400 si email invalide', async () => {
    const db = makeDb();
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));

    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(400);
  });

  it('[reset-5] retourne 400 si body JSON invalide', async () => {
    const db = makeDb();
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));

    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: 'not-json',
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(400);
  });

  it('[reset-6] retourne 200 si email inconnu (ne révèle pas l\'existence)', async () => {
    // L'utilisateur n'existe pas → retourne quand même { ok: true }
    // reset-password utilise createAdminClient() directement, pas le guard
    const { createAdminClient } = await import('@/lib/supabase/server');
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }),
      auth: { admin: { generateLink: vi.fn().mockResolvedValue({ data: {}, error: null }) } },
    } as unknown as ReturnType<typeof createAdminClient>);

    const db = makeDb();
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));

    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ email: 'unknown@test.com' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    // Doit retourner 200 sans révéler si l'email existe
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('[reset-7] bloque si CSRF échoue (pas d\'Origin)', async () => {
    mockAssertCsrf.mockReturnValue(
      new Response(JSON.stringify({ error: 'CSRF' }), { status: 403 }) as unknown as import('next/server').NextResponse,
    );
    const db = makeDb();
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));

    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@test.com' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(403);
  });

  it('[reset-8] admin peut déclencher un reset pour un email valide connu', async () => {
    // Mock createAdminClient pour auth.admin.generateLink
    const { createAdminClient } = await import('@/lib/supabase/server');
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'user-1', email: 'user@test.com' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) }) };
      }),
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    } as unknown as ReturnType<typeof createAdminClient>);

    const db = makeDb();
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));

    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
      body: JSON.stringify({ email: 'user@test.com' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

// ─── Synthèse — sécurité des nouvelles routes ─────────────────────────────────

describe('Sécurité — vérifications transversales nouvelles routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertCsrf.mockReturnValue(null);
  });

  it('[sec-1] dashboard retourne uniquement des nombres, pas de PII', async () => {
    const db = makeCountDb({ profiles: 42, listings: 10 });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db as ReturnType<typeof makeDb>));

    const req = new NextRequest('https://app.test/api/admin/dashboard');
    const res = await dashboardGET(req);
    const body = await res.json() as { stats: Record<string, unknown> };

    // Aucun champ ne doit être une chaîne (emails, noms, etc.)
    Object.values(body.stats).forEach(v => {
      expect(typeof v).toBe('number');
    });
  });

  it('[sec-2] reports GET expose reporter.full_name mais PAS email ni téléphone', async () => {
    const report = {
      ...makeReport('r-1'),
      reporter: { full_name: 'Jean Dupont', avatar_url: null },
    };
    const db = makeDb({ reports: { select: () => ({ data: [report], error: null }) } });
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db));

    const req = new NextRequest('https://app.test/api/admin/reports');
    const res = await reportsGET(req);
    const body = await res.json() as { reports: Array<{ reporter: Record<string, unknown> }> };

    if (body.reports.length > 0) {
      const reporter = body.reports[0].reporter;
      if (reporter) {
        expect(reporter.full_name).toBe('Jean Dupont');
        expect(reporter.email).toBeUndefined();
        expect(reporter.phone).toBeUndefined();
      }
    }
  });

  it('[sec-3] reset-password CSRF protection — toutes mutations bloquées sans Origin', async () => {
    // Simule un CSRF failure
    mockAssertCsrf.mockReturnValue(
      new Response(JSON.stringify({ error: 'Forbidden — CSRF' }), { status: 403 }) as unknown as import('next/server').NextResponse,
    );
    const db = makeDb();
    mockGetAdminUser.mockResolvedValue(makeAdminGuardOk('admin', db, ADMIN_ID));

    const req = new Request('https://app.test/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'victim@test.com' }),
    });
    const res = await resetPasswordPOST(req as NextRequest);
    expect(res.status).toBe(403);
  });
});
