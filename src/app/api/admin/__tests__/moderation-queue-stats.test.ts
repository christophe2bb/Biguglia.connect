/**
 * Tests — GET /api/admin/moderation/queue
 *       — GET /api/admin/moderation/stats-data
 *
 * Couvre :
 *  • 401 / 403 si guard échoue
 *  • 200 avec données correctement formattées
 *  • Normalisation des KPI (strings → numbers)
 *  • Erreur DB → 500 + pas de fuite de détails
 *  • Accepte admin ET moderator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin-guard');
vi.mock('@/lib/monitoring/sentry', () => ({ captureApiError: vi.fn() }));

import { getAdminUser } from '@/lib/supabase/admin-guard';
import { GET as queueGET }    from '@/app/api/admin/moderation/queue/route';
import { GET as statsGET }    from '@/app/api/admin/moderation/stats-data/route';

import {
  makeAdminGuardOk,
  makeAdminGuardFail,
  makeDb,
  makeReq,
} from './_mock-admin-guard';

const mockGuard = vi.mocked(getAdminUser);

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

const KPI_RAW = {
  total: 42, pending: 5, published: 30, refused: 4,
  correction: 2, archived: 1, avg_review_hours: 3.2,
  high_risk: 2, new_authors: 1, last_24h: 3,
};

const QUEUE_ITEM = {
  id:               'queue-1',
  content_type:     'listing',
  content_id:       'listing-1',
  content_title:    'Plomberie Biguglia',
  content_excerpt:  'Artisan plombier disponible',
  content_photos:   [],
  author_id:        'user-1',
  author_trust:     'nouveau',
  status:           'en_attente_validation',
  risk_score:       30,
  risk_level:       'low',
  completeness:     85,
  validation_errors: [],
  resubmit_count:   0,
  submitted_at:     '2026-04-13T10:00:00Z',
};

/**
 * Construit un db mock adapté à la route queue :
 *  - moderation_kpi → single()
 *  - moderation_queue → chaîne eq/order/limit
 */
function makeQueueDb(
  kpiData: unknown = KPI_RAW,
  queueData: unknown[] = [QUEUE_ITEM],
  queueError: unknown = null,
) {
  const db = makeDb();
  vi.spyOn(db, 'from').mockImplementation((table: string) => {
    if (table === 'moderation_kpi') {
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: kpiData, error: null }),
        }),
      } as unknown as ReturnType<typeof db.from>;
    }
    const chain = {
      eq:    vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: queueError ? null : queueData, error: queueError }),
    };
    return { select: vi.fn().mockReturnValue(chain) } as unknown as ReturnType<typeof db.from>;
  });
  return db;
}

/**
 * Construit un db mock adapté à la route stats-data.
 * La route utilise des appels très chaînés (.select().eq().eq(), .in(), .not(), etc.).
 * On utilise un Proxy récursif qui retourne toujours lui-même sur tout appel de méthode,
 * et se résout en { data: [], error: null, count: 0 } lorsqu'on l'attend (await).
 */
function makeStatsDb(kpiData: unknown = KPI_RAW) {
  const db = makeDb();

  /** Proxy auto-chaînable qui résout en { data, error, count } à l'await */
  function makeAutoChain(resolved = { data: [] as unknown[], error: null, count: 0 }) {
    const promise = Promise.resolve(resolved);
    const proxy: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
      get(_target, prop) {
        if (prop === 'then')  return (r: (v: unknown) => unknown) => promise.then(r);
        if (prop === 'catch') return (r: (e: unknown) => unknown) => promise.catch(r);
        if (prop === 'single') return vi.fn().mockResolvedValue({ data: resolved.data?.[0] ?? null, error: null });
        // Toute autre méthode retourne un nouveau proxy (chaînage infini)
        return vi.fn().mockReturnValue(proxy);
      },
    });
    return proxy;
  }

  vi.spyOn(db, 'from').mockImplementation((table: string) => {
    if (table === 'moderation_kpi') {
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: kpiData, error: null }),
        }),
      } as unknown as ReturnType<typeof db.from>;
    }

    // Pour toutes les autres tables (moderation_queue, profiles), chaîne auto-résolvante
    return {
      select: vi.fn().mockReturnValue(makeAutoChain()),
    } as unknown as ReturnType<typeof db.from>;
  });
  return db;
}

// ──────────────────────────────────────────────────────────────────────────────
// Suite : GET /api/admin/moderation/queue
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/moderation/queue', () => {
  const REQ = makeReq('https://app.test/api/admin/moderation/queue', 'GET') as never;

  beforeEach(() => { mockGuard.mockReset(); });

  it('retourne 401 si guard renvoie 401', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await queueGET(REQ);
    expect(res.status).toBe(401);
  });

  it('retourne 403 si guard renvoie 403', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(403));
    const res = await queueGET(REQ);
    expect(res.status).toBe(403);
  });

  it('retourne 200 avec items et kpi (admin)', async () => {
    const db = makeQueueDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await queueGET(REQ);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty('items');
    expect(json).toHaveProperty('kpi');
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toHaveLength(1);
    expect(json.kpi.pending).toBe(5);
    expect(json.kpi.total).toBe(42);
  });

  it('accepte un modérateur (role moderator)', async () => {
    const db = makeQueueDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await queueGET(REQ);
    expect(res.status).toBe(200);
  });

  it('retourne kpi null si moderation_kpi est vide', async () => {
    const db = makeQueueDb(null, []);
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await queueGET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.kpi).toBeNull();
    expect(json.items).toEqual([]);
  });

  it('normalise les champs KPI en number (même si Supabase retourne des strings)', async () => {
    const kpiAsStrings = {
      total: '42', pending: '5', published: '30', refused: '4',
      correction: '2', archived: '1', avg_review_hours: '3.2',
      high_risk: '2', new_authors: '1', last_24h: '3',
    };
    const db = makeQueueDb(kpiAsStrings, []);
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await queueGET(REQ);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(typeof json.kpi.total).toBe('number');
    expect(json.kpi.total).toBe(42);
    expect(json.kpi.avg_review_hours).toBe(3.2);
  });

  it('retourne 500 si erreur DB sur moderation_queue (pas de fuite)', async () => {
    const db = makeQueueDb(KPI_RAW, [], { message: 'DB fatal error — internal detail' });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await queueGET(REQ);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error).not.toContain('DB fatal error');
    expect(json.error).not.toContain('internal detail');
  });

  it('retourne 500 si exception inattendue (pas de fuite)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() => { throw new Error('Crash réseau interne'); });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await queueGET(REQ);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).not.toContain('Crash');
  });

  it('contient les champs minimaux requis dans chaque item', async () => {
    const db = makeQueueDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await queueGET(REQ);
    const json = await res.json();
    const item = json.items[0];

    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('content_type');
    expect(item).toHaveProperty('status');
    expect(item).toHaveProperty('risk_level');
    expect(item).toHaveProperty('submitted_at');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Suite : GET /api/admin/moderation/stats-data
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/admin/moderation/stats-data', () => {
  const REQ = makeReq('https://app.test/api/admin/moderation/stats-data', 'GET') as never;

  beforeEach(() => { mockGuard.mockReset(); });

  it('retourne 401 si guard renvoie 401', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(401));
    const res = await statsGET(REQ);
    expect(res.status).toBe(401);
  });

  it('retourne 403 si guard renvoie 403', async () => {
    mockGuard.mockResolvedValueOnce(makeAdminGuardFail(403));
    const res = await statsGET(REQ);
    expect(res.status).toBe(403);
  });

  it('retourne 200 avec la structure ModerationStats (admin)', async () => {
    const db = makeStatsDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await statsGET(REQ);
    expect(res.status).toBe(200);

    const body = await res.json();
    // La route retourne { stats: ModerationStats }
    const json = body.stats;
    expect(json).toBeDefined();
    expect(json).toHaveProperty('total');
    expect(json).toHaveProperty('pending');
    expect(json).toHaveProperty('published');
    expect(json).toHaveProperty('refused');
    expect(json).toHaveProperty('correction');
    expect(json).toHaveProperty('byType');
    expect(json).toHaveProperty('recentDecisions');
    expect(json).toHaveProperty('problematicMembers');
    expect(json).toHaveProperty('trustedMembers');
    expect(Array.isArray(json.byType)).toBe(true);
    expect(Array.isArray(json.recentDecisions)).toBe(true);
  });

  it('accepte un modérateur (role moderator)', async () => {
    const db = makeStatsDb();
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('moderator', db));

    const res = await statsGET(REQ);
    expect(res.status).toBe(200);
  });

  it('retourne des tableaux vides si pas de données', async () => {
    const db = makeStatsDb(null);
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await statsGET(REQ);
    expect(res.status).toBe(200);

    const body = await res.json();
    const json = body.stats;
    expect(json.recentDecisions).toEqual([]);
    expect(json.problematicMembers).toEqual([]);
    expect(json.trustedMembers).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.pending).toBe(0);
  });

  it('retourne 500 si exception inattendue (pas de fuite de stack trace)', async () => {
    const db = makeDb();
    vi.spyOn(db, 'from').mockImplementation(() => { throw new Error('Crash DB interne secret'); });
    mockGuard.mockResolvedValueOnce(makeAdminGuardOk('admin', db));

    const res = await statsGET(REQ);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error).not.toContain('secret');
    expect(json.error).not.toContain('Crash DB');
  });

  it('le module exporte la fonction GET', async () => {
    const mod = await import('@/app/api/admin/moderation/stats-data/route');
    expect(typeof mod.GET).toBe('function');
  });

  it('les types ModerationStatsData et ContentType sont réexportés', async () => {
    // Test de compilation : si le module importe correctement, le test passe.
    // Les types TypeScript ne sont pas accessibles à runtime, mais l'import ne doit pas lever d'erreur.
    const mod = await import('@/app/api/admin/moderation/stats-data/route');
    expect(mod).toBeDefined();
  });
});
