/**
 * Tests — src/lib/rate-limit-redis.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Couverture :
 *
 *  resolveRouteGroupRedis()
 *    1.  POST /api/auth/login                    → login
 *    2.  POST /api/auth/reset-password           → login
 *    3.  GET  /api/auth/callback                 → api (GET exclus du groupe login)
 *    4.  POST /api/messages/start-conversation   → messages-write
 *    5.  GET  /api/messages/start-conversation   → api (GET non spécialisé)
 *    6.  POST /api/emploi/contact                → contact
 *    7.  GET  /api/emploi/contact                → emploi-read (GET non spécialisé)
 *    8.  POST /api/emploi/offres                 → publications-write
 *    9.  POST /api/emploi/demandes               → publications-write
 *   10.  PATCH /api/emploi/offres/<slug>         → emploi-write
 *   11.  DELETE /api/emploi/offres/<slug>        → emploi-write
 *   12.  PATCH /api/emploi/demandes/<slug>       → emploi-write
 *   13.  DELETE /api/emploi/demandes/<slug>      → emploi-write
 *   14.  GET /api/emploi/offres/<slug>           → emploi-read
 *   15.  GET /api/emploi/ownership               → emploi-read
 *   16.  GET /api/admin/users                    → admin-api
 *   17.  PATCH /api/admin/users/<id>             → admin-api
 *   18.  GET /api/messages/conversations         → api (fallback)
 *   19.  GET /dashboard/artisan                  → default
 *   20.  GET /                                   → default
 *   21.  POST /api/autre                         → api
 *
 *  shouldBypassRateLimit()
 *   22.  IP 127.0.0.1 → bypass
 *   23.  IP ::1        → bypass
 *   24.  IP unknown    → bypass
 *   25.  /api/_next    → bypass
 *   26.  /api/monitoring → bypass
 *   27.  IP normale, /api/messages → pas de bypass
 *
 *  isRedisConfigured()
 *   28.  Variables absentes → false
 *   29.  Variables présentes → true
 *   29b. URL présente mais token absent → false
 *
 *  checkRateLimitRedis() — mode fallback mémoire (Redis non configuré)
 *   30.  IP locale → always allowed
 *   31.  Première requête → allowed, retryAfterSecs=0
 *   32.  Groupe login → limit=200 (fallback api)
 *   33.  Groupe contact → limit=10 (fallback messages-write)
 *   34.  Groupe publications-write → limit=10 (fallback messages-write)
 *   35.  Dépassement limite messages-write → blocked
 *   36.  retryAfterSecs > 0 quand bloqué
 *   37.  retryAfterSecs = 0 quand autorisé
 *
 *  checkRateLimitRedis() — mode Redis (mock Upstash)
 *   38.  Redis success=true → allowed, retryAfterSecs=0
 *   39.  Redis success=false → blocked avec retryAfterSecs calculé
 *   40.  Redis throw → fallback mémoire (fail open)
 *   40b. IP locale avec Redis configuré → allowed sans appel Redis
 *
 *  Limites par groupe — valeurs de configuration
 *   41.  login              → 5 req/min
 *   42.  messages-write     → 10 req/min
 *   43.  publications-write → 10 req/min
 *   44.  contact            → 5 req/min
 *   45.  emploi-write       → 20 req/min
 *   46.  admin-api          → 100 req/min
 *   47.  default            → 300 req/min
 *   48.  login plus restrictif que contact et messages-write
 *   49.  tous les groupes ont windowSecs = 60
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _buckets } from './rate-limit';

// ── Mock Upstash ──────────────────────────────────────────────────────────────
// On crée un mock stable de limit() qu'on contrôle dans les tests Redis.
const mockLimitFn = vi.fn();

vi.mock('@upstash/ratelimit', () => {
  // Ratelimit est un constructeur qui expose { limit } sur l'instance
  function MockRatelimit() {
    return { limit: mockLimitFn };
  }
  MockRatelimit.slidingWindow = vi.fn().mockReturnValue('sw-config');
  return { Ratelimit: MockRatelimit };
});

vi.mock('@upstash/redis', () => {
  function MockRedis() { return {}; }
  return { Redis: MockRedis };
});

// ── Imports après mocks ────────────────────────────────────────────────────────
import {
  resolveRouteGroupRedis,
  shouldBypassRateLimit,
  isRedisConfigured,
  checkRateLimitRedis,
  REDIS_RATE_CONFIGS,
  _limiterCache,
} from './rate-limit-redis';

// ── Helpers ───────────────────────────────────────────────────────────────────
const origUrl   = process.env.UPSTASH_REDIS_REST_URL;
const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function setRedisEnv(on: boolean) {
  if (on) {
    process.env.UPSTASH_REDIS_REST_URL   = 'https://test.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  } else {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  }
}

function restoreRedisEnv() {
  if (origUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = origUrl;
  if (origToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveRouteGroupRedis
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveRouteGroupRedis', () => {
  it('[RG-1] POST /api/auth/login → login', () => {
    expect(resolveRouteGroupRedis('/api/auth/login', 'POST')).toBe('login');
  });

  it('[RG-2] POST /api/auth/reset-password → login', () => {
    expect(resolveRouteGroupRedis('/api/auth/reset-password', 'POST')).toBe('login');
  });

  it('[RG-3] GET /api/auth/callback → api (GET exclu du groupe login)', () => {
    expect(resolveRouteGroupRedis('/api/auth/callback', 'GET')).toBe('api');
  });

  it('[RG-4] POST /api/messages/start-conversation → messages-write', () => {
    expect(resolveRouteGroupRedis('/api/messages/start-conversation', 'POST')).toBe('messages-write');
  });

  it('[RG-5] GET /api/messages/start-conversation → api (GET non spécialisé)', () => {
    expect(resolveRouteGroupRedis('/api/messages/start-conversation', 'GET')).toBe('api');
  });

  it('[RG-6] POST /api/emploi/contact → contact', () => {
    expect(resolveRouteGroupRedis('/api/emploi/contact', 'POST')).toBe('contact');
  });

  it('[RG-7] GET /api/emploi/contact → emploi-read', () => {
    expect(resolveRouteGroupRedis('/api/emploi/contact', 'GET')).toBe('emploi-read');
  });

  it('[RG-8] POST /api/emploi/offres → publications-write', () => {
    expect(resolveRouteGroupRedis('/api/emploi/offres', 'POST')).toBe('publications-write');
  });

  it('[RG-9] POST /api/emploi/demandes → publications-write', () => {
    expect(resolveRouteGroupRedis('/api/emploi/demandes', 'POST')).toBe('publications-write');
  });

  it('[RG-10] PATCH /api/emploi/offres/<slug> → emploi-write', () => {
    expect(resolveRouteGroupRedis('/api/emploi/offres/mon-annonce-123', 'PATCH')).toBe('emploi-write');
  });

  it('[RG-11] DELETE /api/emploi/offres/<slug> → emploi-write', () => {
    expect(resolveRouteGroupRedis('/api/emploi/offres/mon-annonce-123', 'DELETE')).toBe('emploi-write');
  });

  it('[RG-12] PATCH /api/emploi/demandes/<slug> → emploi-write', () => {
    expect(resolveRouteGroupRedis('/api/emploi/demandes/ma-demande-456', 'PATCH')).toBe('emploi-write');
  });

  it('[RG-13] DELETE /api/emploi/demandes/<slug> → emploi-write', () => {
    expect(resolveRouteGroupRedis('/api/emploi/demandes/ma-demande-456', 'DELETE')).toBe('emploi-write');
  });

  it('[RG-14] GET /api/emploi/offres/<slug> → emploi-read', () => {
    expect(resolveRouteGroupRedis('/api/emploi/offres/mon-annonce-123', 'GET')).toBe('emploi-read');
  });

  it('[RG-15] GET /api/emploi/ownership → emploi-read', () => {
    expect(resolveRouteGroupRedis('/api/emploi/ownership', 'GET')).toBe('emploi-read');
  });

  it('[RG-16] GET /api/admin/users → admin-api', () => {
    expect(resolveRouteGroupRedis('/api/admin/users', 'GET')).toBe('admin-api');
  });

  it('[RG-17] PATCH /api/admin/users/<id> → admin-api', () => {
    expect(resolveRouteGroupRedis('/api/admin/users/abc-123', 'PATCH')).toBe('admin-api');
  });

  it('[RG-18] GET /api/messages/conversations → api (fallback)', () => {
    expect(resolveRouteGroupRedis('/api/messages/conversations', 'GET')).toBe('api');
  });

  it('[RG-19] GET /dashboard/artisan → default', () => {
    expect(resolveRouteGroupRedis('/dashboard/artisan', 'GET')).toBe('default');
  });

  it('[RG-20] GET / → default', () => {
    expect(resolveRouteGroupRedis('/', 'GET')).toBe('default');
  });

  it('[RG-21] POST /api/autre → api', () => {
    expect(resolveRouteGroupRedis('/api/autre', 'POST')).toBe('api');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// shouldBypassRateLimit
// ─────────────────────────────────────────────────────────────────────────────

describe('shouldBypassRateLimit', () => {
  it('[BP-22] IP 127.0.0.1 → bypass', () => {
    expect(shouldBypassRateLimit('127.0.0.1', '/api/messages/start-conversation')).toBe(true);
  });

  it('[BP-23] IP ::1 → bypass', () => {
    expect(shouldBypassRateLimit('::1', '/api/admin/users')).toBe(true);
  });

  it('[BP-24] IP unknown → bypass', () => {
    expect(shouldBypassRateLimit('unknown', '/api/emploi/contact')).toBe(true);
  });

  it('[BP-25] /api/_next → bypass', () => {
    expect(shouldBypassRateLimit('1.2.3.4', '/api/_next/webpack-hmr')).toBe(true);
  });

  it('[BP-26] /api/sentry-tunnel → bypass (tunnel Sentry, bursts légitimes)', () => {
    expect(shouldBypassRateLimit('1.2.3.4', '/api/sentry-tunnel')).toBe(true);
  });

  it('[BP-26b] /api/monitoring → pas de bypass (health-check, rate-limit conservé)', () => {
    expect(shouldBypassRateLimit('1.2.3.4', '/api/monitoring')).toBe(false);
  });

  it('[BP-27] IP normale, /api/messages → pas de bypass', () => {
    expect(shouldBypassRateLimit('1.2.3.4', '/api/messages/start-conversation')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isRedisConfigured
// ─────────────────────────────────────────────────────────────────────────────

describe('isRedisConfigured', () => {
  afterEach(restoreRedisEnv);

  it('[RC-28] Variables absentes → false', () => {
    setRedisEnv(false);
    expect(isRedisConfigured()).toBe(false);
  });

  it('[RC-29] Variables présentes → true', () => {
    setRedisEnv(true);
    expect(isRedisConfigured()).toBe(true);
  });

  it('[RC-29b] URL présente mais token absent → false', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isRedisConfigured()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkRateLimitRedis — mode fallback mémoire (Redis non configuré)
// ─────────────────────────────────────────────────────────────────────────────

describe('checkRateLimitRedis — fallback mémoire (pas de Redis)', () => {
  beforeEach(() => {
    setRedisEnv(false);
    _limiterCache.clear();
    _buckets.clear();
    mockLimitFn.mockReset();
  });

  afterEach(() => {
    restoreRedisEnv();
    _limiterCache.clear();
    _buckets.clear();
  });

  it('[FB-30] IP locale → always allowed', async () => {
    const result = await checkRateLimitRedis('127.0.0.1', 'login');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSecs).toBe(0);
  });

  it('[FB-31] Première requête → allowed, retryAfterSecs=0', async () => {
    const result = await checkRateLimitRedis('5.5.5.5', 'default');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSecs).toBe(0);
  });

  it('[FB-32] Groupe login → fallback api, limit=200', async () => {
    const result = await checkRateLimitRedis('5.5.5.5', 'login');
    // login n'existe pas en mémoire → fallback 'api' → limite 200
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(200);
  });

  it('[FB-33] Groupe contact → fallback messages-write, limit=10', async () => {
    const result = await checkRateLimitRedis('5.5.5.5', 'contact');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
  });

  it('[FB-34] Groupe publications-write → fallback messages-write, limit=10', async () => {
    const result = await checkRateLimitRedis('5.5.5.5', 'publications-write');
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
  });

  it('[FB-35] Dépassement messages-write (11 req) → blocked', async () => {
    const ip = '6.6.6.6';
    let last: Awaited<ReturnType<typeof checkRateLimitRedis>> | null = null;
    for (let i = 0; i < 11; i++) {
      last = await checkRateLimitRedis(ip, 'messages-write');
    }
    expect(last?.allowed).toBe(false);
  });

  it('[FB-36] retryAfterSecs > 0 quand bloqué', async () => {
    const ip = '7.7.7.7';
    let last: Awaited<ReturnType<typeof checkRateLimitRedis>> | null = null;
    for (let i = 0; i < 11; i++) {
      last = await checkRateLimitRedis(ip, 'messages-write');
    }
    expect(last?.retryAfterSecs).toBeGreaterThan(0);
  });

  it('[FB-37] retryAfterSecs = 0 quand autorisé', async () => {
    const result = await checkRateLimitRedis('8.8.8.8', 'api');
    expect(result.retryAfterSecs).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkRateLimitRedis — mode Redis (mock Upstash)
// ─────────────────────────────────────────────────────────────────────────────

describe('checkRateLimitRedis — mode Redis (mock)', () => {
  beforeEach(() => {
    setRedisEnv(true);
    _limiterCache.clear();
    _buckets.clear();
    mockLimitFn.mockReset();
  });

  afterEach(() => {
    restoreRedisEnv();
    _limiterCache.clear();
    _buckets.clear();
  });

  it('[RD-38] Redis success=true → allowed, retryAfterSecs=0', async () => {
    mockLimitFn.mockResolvedValueOnce({
      success:   true,
      limit:     5,
      reset:     Date.now() + 60_000,
      remaining: 4,
    });

    const result = await checkRateLimitRedis('9.9.9.9', 'login');
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSecs).toBe(0);
    expect(result.limit).toBe(5);
  });

  it('[RD-39] Redis success=false → blocked avec retryAfterSecs calculé', async () => {
    const resetAt = Date.now() + 30_000; // 30s restantes
    mockLimitFn.mockResolvedValueOnce({
      success:   false,
      limit:     5,
      reset:     resetAt,
      remaining: 0,
    });

    const result = await checkRateLimitRedis('9.9.9.9', 'contact');
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(5);
    expect(result.retryAfterSecs).toBeGreaterThanOrEqual(1);
    expect(result.retryAfterSecs).toBeLessThanOrEqual(31);
  });

  it('[RD-40] Redis throw → fallback mémoire (fail open, allowed)', async () => {
    mockLimitFn.mockRejectedValueOnce(new Error('Redis timeout'));
    // Première requête après erreur Redis → fail open (mémoire fraîche)
    const result = await checkRateLimitRedis('10.10.10.10', 'login');
    expect(result.allowed).toBe(true);
  });

  it('[RD-40b] IP locale avec Redis → allowed sans appel Redis', async () => {
    const result = await checkRateLimitRedis('127.0.0.1', 'login');
    expect(result.allowed).toBe(true);
    expect(mockLimitFn).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REDIS_RATE_CONFIGS — Valeurs de configuration par groupe
// ─────────────────────────────────────────────────────────────────────────────

describe('REDIS_RATE_CONFIGS — limites par groupe', () => {
  it('[CFG-41] login → 5 req/min (anti brute-force)', () => {
    expect(REDIS_RATE_CONFIGS['login'].maxRequests).toBe(5);
    expect(REDIS_RATE_CONFIGS['login'].windowSecs).toBe(60);
  });

  it('[CFG-42] messages-write → 10 req/min', () => {
    expect(REDIS_RATE_CONFIGS['messages-write'].maxRequests).toBe(10);
  });

  it('[CFG-43] publications-write → 10 req/min', () => {
    expect(REDIS_RATE_CONFIGS['publications-write'].maxRequests).toBe(10);
  });

  it('[CFG-44] contact → 5 req/min (anti-scraping)', () => {
    expect(REDIS_RATE_CONFIGS['contact'].maxRequests).toBe(5);
    expect(REDIS_RATE_CONFIGS['contact'].windowSecs).toBe(60);
  });

  it('[CFG-45] emploi-write → 20 req/min', () => {
    expect(REDIS_RATE_CONFIGS['emploi-write'].maxRequests).toBe(20);
  });

  it('[CFG-46] admin-api → 100 req/min', () => {
    expect(REDIS_RATE_CONFIGS['admin-api'].maxRequests).toBe(100);
  });

  it('[CFG-47] default → 300 req/min', () => {
    expect(REDIS_RATE_CONFIGS['default'].maxRequests).toBe(300);
  });

  it('[CFG-48] login et contact sont les plus restrictifs (5 req/min)', () => {
    expect(REDIS_RATE_CONFIGS['login'].maxRequests).toBe(5);
    expect(REDIS_RATE_CONFIGS['contact'].maxRequests).toBe(5);
    // Les deux groupes les plus dangereux ont la même limite
    expect(REDIS_RATE_CONFIGS['login'].maxRequests).toBe(
      REDIS_RATE_CONFIGS['contact'].maxRequests,
    );
  });

  it('[CFG-49] tous les groupes ont windowSecs = 60', () => {
    for (const config of Object.values(REDIS_RATE_CONFIGS)) {
      expect(config.windowSecs).toBe(60);
    }
  });
});
