/**
 * Tests unitaires pour GET /api/health
 * ──────────────────────────────────────────────────────────────────────────────
 * Vérifie la structure de la réponse et les comportements de dégradation.
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL     = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
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
});
