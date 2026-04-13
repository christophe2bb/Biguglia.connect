/**
 * src/lib/rate-limit-redis.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rate-limiting distribué via Upstash Redis — protection robuste multi-instances.
 *
 * ── Pourquoi Upstash Redis ? ─────────────────────────────────────────────────
 *
 *  L'ancienne implémentation (src/lib/rate-limit.ts) utilisait une Map en mémoire
 *  locale à chaque instance Edge/serverless. Sur Vercel, plusieurs instances peuvent
 *  coexister simultanément → une IP qui attaque 10 instances cumule 10× les limites.
 *
 *  Upstash Redis est un store Redis serverless HTTP (pas de WebSocket, compatible
 *  Edge Runtime) qui centralise tous les compteurs :
 *    ✅ Protection réelle contre les attaques distribuées (DDoS, botnets)
 *    ✅ Persistance entre redémarrages d'instances
 *    ✅ Fenêtre glissante réelle (sliding window via Lua script atomique)
 *    ✅ Latence ~1–5 ms (région EU-WEST la plus proche de Vercel Frankfurt)
 *    ✅ Tier gratuit = 10 000 req/jour gratuit → suffisant pour démarrer
 *
 * ── Groupes de routes et limites ─────────────────────────────────────────────
 *
 *  Groupe              │ Routes                                  │ /min  │ Raison
 *  ────────────────────┼─────────────────────────────────────────┼───────┼──────────────────────
 *  default             │ Pages HTML, autres                      │  300  │ Navigation normale
 *  api                 │ /api/* (fallback)                       │  200  │ API génériques
 *  login               │ POST /api/auth/login,                   │    5  │ Anti brute-force auth
 *                      │ POST /api/auth/callback,                │       │
 *                      │ POST /api/auth/reset-password           │       │
 *  messages-write      │ POST /api/messages/start-conversation   │   10  │ Spam messages
 *  publications-write  │ POST /api/emploi/offres,                │   10  │ Spam publications
 *                      │ POST /api/emploi/demandes               │       │
 *  contact             │ POST /api/emploi/contact                │    5  │ Anti-scraping contacts
 *  emploi-write        │ PATCH/DELETE /api/emploi/**             │   20  │ Mutations emploi
 *  emploi-read         │ GET /api/emploi/**                      │   60  │ Lecture emploi
 *  admin-api           │ /api/admin/**                           │  100  │ Actions admin
 *
 * ── Fallback mémoire ─────────────────────────────────────────────────────────
 *
 *  Si les variables d'env UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 *  sont absentes (dev local, CI), le module bascule automatiquement sur
 *  l'ancienne implémentation mémoire — aucun crash, aucune config requise.
 *
 * ── Variables d'environnement requises ───────────────────────────────────────
 *
 *  UPSTASH_REDIS_REST_URL   — URL REST Upstash (ex: https://xxx.upstash.io)
 *  UPSTASH_REDIS_REST_TOKEN — Token Bearer Upstash
 *
 *  À ajouter dans :
 *    1. .env.local (dev local)
 *    2. Vercel → Settings → Environment Variables (Production + Preview)
 *
 * ── Architecture ─────────────────────────────────────────────────────────────
 *
 *  middleware.ts
 *    └─ checkRateLimitRedis(ip, group)   ← async (await Redis)
 *         ├─ Si Redis dispo → @upstash/ratelimit (sliding window)
 *         └─ Si Redis absent → fallback vers checkRateLimit() mémoire
 *
 * ── Utilisation dans le middleware ───────────────────────────────────────────
 *
 *  ```ts
 *  import { shouldBypassRateLimit, resolveRouteGroupRedis, checkRateLimitRedis } from '@/lib/rate-limit-redis';
 *
 *  if (!shouldBypassRateLimit(ip, pathname)) {
 *    const group  = resolveRouteGroupRedis(pathname, method);
 *    const result = await checkRateLimitRedis(ip, group);
 *    if (!result.allowed) return response429(result);
 *  }
 *  ```
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis }     from '@upstash/redis';

// Fallback mémoire si Redis non configuré
import {
  checkRateLimit  as checkRateLimitMemory,
  RouteGroup      as MemoryRouteGroup,
  RateLimitResult,
} from '@/lib/rate-limit';

// ─── Types publics ────────────────────────────────────────────────────────────

/**
 * Groupes de routes avec les nouveaux groupes à grain fin.
 * Étend les groupes mémoire avec : login, publications-write, contact.
 */
export type RouteGroupRedis =
  | 'default'             // Pages HTML, routes non-API
  | 'api'                 // /api/* fallback
  | 'login'               // POST auth (login, reset-password) — anti brute-force
  | 'messages-write'      // POST /api/messages/start-conversation
  | 'publications-write'  // POST /api/emploi/offres|demandes (création)
  | 'contact'             // POST /api/emploi/contact — anti-scraping
  | 'emploi-write'        // PATCH/DELETE /api/emploi/**
  | 'emploi-read'         // GET /api/emploi/**
  | 'admin-api';          // /api/admin/**

/** Résultat identique à RateLimitResult pour compatibilité avec le middleware. */
export type { RateLimitResult };

// ─── Configuration des limites par groupe ────────────────────────────────────

interface GroupConfig {
  /** Fenêtre glissante en secondes. */
  windowSecs: number;
  /** Nombre maximum de requêtes dans la fenêtre. */
  maxRequests: number;
}

export const REDIS_RATE_CONFIGS: Record<RouteGroupRedis, GroupConfig> = {
  'default':            { windowSecs: 60, maxRequests: 300 },
  'api':                { windowSecs: 60, maxRequests: 200 },
  'login':              { windowSecs: 60, maxRequests:   5 }, // Anti brute-force
  'messages-write':     { windowSecs: 60, maxRequests:  10 }, // Spam messages
  'publications-write': { windowSecs: 60, maxRequests:  10 }, // Spam publications
  'contact':            { windowSecs: 60, maxRequests:   5 }, // Anti-scraping contacts
  'emploi-write':       { windowSecs: 60, maxRequests:  20 }, // Mutations emploi
  'emploi-read':        { windowSecs: 60, maxRequests:  60 }, // Lecture emploi
  'admin-api':          { windowSecs: 60, maxRequests: 100 }, // Actions admin
};

// ─── IPs et routes bypassées ─────────────────────────────────────────────────

/** IPs locales exemptées (dev, tests, Vercel preview interne). */
const LOCAL_IPS = new Set(['127.0.0.1', '::1', 'unknown', 'localhost']);

/**
 * Prefixes de routes exemptées du rate-limiting.
 * /api/auth/callback est géré par Supabase OAuth — volume imprévisible.
 */
const BYPASS_PREFIXES = ['/api/_next', '/api/monitoring'] as const;

// ─── Initialisation Redis (lazy, avec fallback) ───────────────────────────────

/**
 * Indique si Redis Upstash est correctement configuré.
 * Faux en dev local si les variables d'env sont absentes.
 */
export function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Cache des instances Ratelimit par groupe.
 * Initialisé une seule fois (singleton par instance Edge/serverless).
 *
 * Exporté pour les tests (permet de forcer le recréation).
 */
export const _limiterCache = new Map<RouteGroupRedis, Ratelimit>();

/**
 * getRedisLimiter — Retourne ou crée le Ratelimit pour un groupe.
 * Utilise une fenêtre glissante (sliding window) via Lua script atomique
 * côté Redis pour une précision maximale.
 *
 * @param group  Groupe de routes
 * @returns Instance Ratelimit ou null si Redis non configuré
 */
export function getRedisLimiter(group: RouteGroupRedis): Ratelimit | null {
  if (!isRedisConfigured()) return null;

  if (_limiterCache.has(group)) return _limiterCache.get(group)!;

  const config = REDIS_RATE_CONFIGS[group];

  try {
    const redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.maxRequests,
        `${config.windowSecs} s`,
      ),
      // Préfixe pour namespace les clés par groupe et éviter les collisions
      prefix: `rl:biguglia:${group}`,
      // En cas de timeout Redis → fail open (autoriser) pour ne pas bloquer les users
      ephemeralCache: new Map(),
    });

    _limiterCache.set(group, limiter);
    return limiter;
  } catch {
    // Erreur d'instanciation → fallback mémoire
    return null;
  }
}

// ─── Classification des routes ────────────────────────────────────────────────

/**
 * resolveRouteGroupRedis — Détermine le groupe de rate-limiting d'une route.
 *
 * Ordre important : groupes spécialisés (restrictifs) évalués avant les généraux.
 * Nouveaux groupes par rapport à resolveRouteGroup() mémoire :
 *   - 'login'              → POST auth
 *   - 'publications-write' → POST /api/emploi/offres|demandes
 *   - 'contact'            → POST /api/emploi/contact
 *
 * @param pathname  Chemin de la requête (ex: '/api/messages/start-conversation')
 * @param method    Méthode HTTP (ex: 'POST', 'GET')
 */
export function resolveRouteGroupRedis(
  pathname: string,
  method: string,
): RouteGroupRedis {
  // ── Auth — anti brute-force login ──────────────────────────────────────────
  // Supabase OAuth callbacks (GET) sont bypassés — on ne rate-limite que les
  // actions d'authentification qui peuvent faire l'objet de brute-force.
  if (
    pathname.startsWith('/api/auth/') &&
    (method === 'POST' || method === 'PUT')
  ) return 'login';

  // ── Messages — création de conversation (spam) ─────────────────────────────
  if (
    pathname === '/api/messages/start-conversation' &&
    method === 'POST'
  ) return 'messages-write';

  // ── Emploi contact — anti-scraping coordonnées ─────────────────────────────
  if (pathname === '/api/emploi/contact' && method === 'POST') {
    return 'contact';
  }

  // ── Emploi publications — création d'offres/demandes ──────────────────────
  if (
    (pathname === '/api/emploi/offres' || pathname === '/api/emploi/demandes') &&
    method === 'POST'
  ) return 'publications-write';

  // ── Emploi écriture — mutations sur offres/demandes existantes ─────────────
  if (
    (pathname.startsWith('/api/emploi/offres/') ||
     pathname.startsWith('/api/emploi/demandes/')) &&
    (method === 'PATCH' || method === 'DELETE')
  ) return 'emploi-write';

  // ── Emploi lecture — plus permissif mais séparé du fallback API ────────────
  if (pathname.startsWith('/api/emploi/')) return 'emploi-read';

  // ── Admin API ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin/')) return 'admin-api';

  // ── Fallback API ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) return 'api';

  // ── Pages HTML ────────────────────────────────────────────────────────────
  return 'default';
}

// ─── Helper bypass ────────────────────────────────────────────────────────────

/**
 * shouldBypassRateLimit — Vérifie si la route doit contourner le rate-limit.
 * Identique à l'ancienne version mémoire pour compatibilité avec le middleware.
 */
export function shouldBypassRateLimit(ip: string, pathname: string): boolean {
  if (LOCAL_IPS.has(ip)) return true;
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) return true;
  return false;
}

// ─── Vérification principale ──────────────────────────────────────────────────

/**
 * checkRateLimitRedis — Vérifie si la requête est autorisée (Redis ou fallback).
 *
 * ① Si Redis est configuré → utilise @upstash/ratelimit (sliding window distribué)
 * ② Si Redis absent ou erreur → fallback sur l'implémentation mémoire
 *
 * La clé Redis est `ip` suffixé par le préfixe du groupe (voir `prefix` dans
 * getRedisLimiter). Upstash génère automatiquement : `rl:biguglia:{group}:{ip}`.
 *
 * @param ip     Adresse IP du client
 * @param group  Groupe résolu par resolveRouteGroupRedis()
 */
export async function checkRateLimitRedis(
  ip: string,
  group: RouteGroupRedis,
): Promise<RateLimitResult> {
  const config = REDIS_RATE_CONFIGS[group];

  // Bypass IPs locales
  if (LOCAL_IPS.has(ip)) {
    return { allowed: true, limit: config.maxRequests, retryAfterSecs: 0 };
  }

  const limiter = getRedisLimiter(group);

  // ── Chemin Redis ──────────────────────────────────────────────────────────
  if (limiter) {
    try {
      const { success, limit, reset } = await limiter.limit(ip);

      if (success) {
        return { allowed: true, limit, retryAfterSecs: 0 };
      }

      // `reset` = timestamp Unix en ms de la prochaine fenêtre disponible
      const retryAfterSecs = Math.max(
        1,
        Math.ceil((reset - Date.now()) / 1000),
      );
      return { allowed: false, limit, retryAfterSecs };

    } catch {
      // Timeout ou erreur Redis → fail open (ne pas bloquer les utilisateurs)
      // Le fallback mémoire prend le relais
      console.error('[rate-limit-redis] Redis error, falling back to memory');
    }
  }

  // ── Fallback mémoire ──────────────────────────────────────────────────────
  // Mapping des groupes Redis vers les groupes mémoire compatibles
  const memoryGroup = mapToMemoryGroup(group);
  return checkRateLimitMemory(ip, memoryGroup);
}

/**
 * mapToMemoryGroup — Mappe les nouveaux groupes Redis vers les groupes mémoire.
 * Les groupes 'login', 'publications-write', 'contact' n'existent pas en mémoire
 * → on les mappe vers le groupe mémoire le plus restrictif équivalent.
 */
function mapToMemoryGroup(group: RouteGroupRedis): MemoryRouteGroup {
  switch (group) {
    case 'login':              return 'api';           // 200/min fallback
    case 'publications-write': return 'messages-write'; // 10/min fallback
    case 'contact':            return 'messages-write'; // 10/min fallback
    default:                   return group as MemoryRouteGroup;
  }
}
