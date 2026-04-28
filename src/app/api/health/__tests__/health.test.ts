/**
 * Tests unitaires pour GET /api/health
 * ──────────────────────────────────────────────────────────────────────────────
 * Vérifie la structure de la réponse et les comportements de dégradation.
 * Inclut les vérifications du check rate_limit (Redis / mémoire).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ error: null, count: 1 })),
    })),
  })),
}));

// Mock rate-limit-redis — isRedisConfigured contrôlé par les tests
const mockIsRedisConfigured = vi.fn<() => boolean>();
vi.mock('@/lib/rate-limit-redis', () => ({
  isRedisConfigured: mockIsRedisConfigured,
}));

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL     = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    // Par défaut : Redis non configuré (fallback mémoire) — pas de vraie requête réseau
    mockIsRedisConfigured.mockReturnValue(false);
    // NODE_ENV est read-only en TypeScript strict — on l'ignore dans les tests
  });

  it('retourne un objet avec les champs obligatoires', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('env');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime_s');
    expect(body).toHaveProperty('checks');
    expect(Array.isArray(body.checks)).toBe(true);
  });

  it('status est "ok", "degraded" ou "error"', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(['ok', 'degraded', 'error']).toContain(body.status);
  });

  it('checks contient au moins une entrée "supabase"', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    const supabaseCheck = body.checks.find((c: { name: string }) => c.name === 'supabase');
    expect(supabaseCheck).toBeDefined();
    // 'down' est aussi un statut valide (checkDatabase retourne 'down' si catch)
    expect(['ok', 'degraded', 'error', 'down']).toContain(supabaseCheck.status);
  });

  it('le timestamp est un ISO 8601 valide', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    const ts = new Date(body.timestamp);
    expect(ts.toString()).not.toBe('Invalid Date');
  });

  it('HTTP status est 200', async () => {
    const { GET } = await import('../route');
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it('Cache-Control est no-store', async () => {
    const { GET } = await import('../route');
    const response = await GET();

    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('uptime_s est un nombre ≥ 0', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(typeof body.uptime_s).toBe('number');
    expect(body.uptime_s).toBeGreaterThanOrEqual(0);
  });

  it('version est "local" si VERCEL_GIT_COMMIT_SHA est absent', async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(body.version).toBe('local');
  });

  it('version est tronquée à 8 chars si VERCEL_GIT_COMMIT_SHA est défini', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123def456789';
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(body.version).toBe('abc123de');
  });

  it('retourne "degraded" si SUPABASE_URL est manquante', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    const supabaseCheck = body.checks.find((c: { name: string }) => c.name === 'supabase');
    expect(supabaseCheck?.status).not.toBe('ok');
  });

  // ── rate_limit checks ────────────────────────────────────────────────────────

  it('checks contient rate_limit avec mode="memory" quand Redis absent', async () => {
    mockIsRedisConfigured.mockReturnValue(false);
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    const rlCheck = body.checks.find((c: { name: string }) => c.name === 'rate_limit');
    expect(rlCheck).toBeDefined();
    expect(rlCheck.status).toBe('degraded');
    expect(rlCheck.mode).toBe('memory');
    expect(typeof rlCheck.error).toBe('string');
  });

  it('checks contient rate_limit avec mode="redis" et status="ok" quand Redis répond PONG', async () => {
    mockIsRedisConfigured.mockReturnValue(true);
    process.env.UPSTASH_REDIS_REST_URL   = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: 'PONG' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    const rlCheck = body.checks.find((c: { name: string }) => c.name === 'rate_limit');
    expect(rlCheck).toBeDefined();
    expect(rlCheck.status).toBe('ok');
    expect(rlCheck.mode).toBe('redis');
    expect(typeof rlCheck.latency_ms).toBe('number');

    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('rate_limit degraded si Redis configuré mais HTTP 401', async () => {
    mockIsRedisConfigured.mockReturnValue(true);
    process.env.UPSTASH_REDIS_REST_URL   = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'bad-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('Unauthorized', { status: 401 }),
    ));

    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    const rlCheck = body.checks.find((c: { name: string }) => c.name === 'rate_limit');
    expect(rlCheck.status).toBe('degraded');
    expect(rlCheck.error).toContain('401');

    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('rate_limit degraded si fetch throw (timeout ou réseau)', async () => {
    mockIsRedisConfigured.mockReturnValue(true);
    process.env.UPSTASH_REDIS_REST_URL   = 'https://redis.example.com';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    const rlCheck = body.checks.find((c: { name: string }) => c.name === 'rate_limit');
    expect(rlCheck.status).toBe('degraded');

    vi.unstubAllGlobals();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('overall status est "degraded" quand rate_limit est "degraded" (pas de Redis)', async () => {
    mockIsRedisConfigured.mockReturnValue(false);
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe('degraded');
  });
});
