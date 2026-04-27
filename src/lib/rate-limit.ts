/**
 * src/lib/rate-limit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Module de rate-limiting en mémoire pour l'Edge Runtime Next.js.
 *
 * ── Architecture générale ────────────────────────────────────────────────────
 *
 *  Ce module extrait la logique de rate-limiting hors de src/middleware.ts pour
 *  la rendre : (a) testable indépendamment, (b) configurable par groupe de routes,
 *  (c) facilement remplaçable par une implémentation distribuée (Upstash Redis).
 *
 * ── Limites de l'implémentation actuelle ─────────────────────────────────────
 *
 *  ⚠️  MÉMOIRE LOCALE — PAS DE DISTRIBUTION
 *
 *  La Map `_buckets` est locale à l'instance Edge/Node qui traite la requête.
 *  Sur Vercel (serverless/Edge Functions), plusieurs instances peuvent coexister
 *  sur différents PoPs ou être multipliées horizontalement sous charge.
 *  → Une IP qui attaque 10 instances simultanées cumule 10× les limites.
 *
 *  Efficacité réelle :
 *    ✅ Protection contre les rafales simples d'une seule IP (navigateur, bot basique)
 *    ✅ Zéro latence (pas de réseau)
 *    ✅ Zéro coût infrastructure
 *    ❌ Pas de protection contre les attaques distribuées (DDoS, botnets)
 *    ❌ Pas de persistance entre redémarrages
 *
 * ── Upgrade vers Upstash Redis ───────────────────────────────────────────────
 *
 *  Pour une protection robuste en production à fort trafic, remplacer ce module
 *  par @upstash/ratelimit + @upstash/redis. L'interface publique est identique :
 *
 *  ```ts
 *  // src/lib/rate-limit.ts (version distribuée — drop-in replacement)
 *  import { Ratelimit } from '@upstash/ratelimit';
 *  import { Redis }     from '@upstash/redis';
 *
 *  const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 *  const limiters = new Map<RouteGroup, Ratelimit>([
 *    ['default', new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, '1 m') })],
 *    ['api',     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, '1 m') })],
 *    ['messages-write', new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') })],
 *    ['emploi-write',   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m') })],
 *    ['emploi-read',    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m') })],
 *    ['admin-api',      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m') })],
 *  ]);
 *
 *  export async function checkRateLimit(ip: string, group: RouteGroup): Promise<boolean> {
 *    const limiter = limiters.get(group) ?? limiters.get('default')!;
 *    const { success } = await limiter.limit(ip);
 *    return success;
 *  }
 *  ```
 *
 *  Variables d'env à ajouter dans .env.local et Vercel :
 *    UPSTASH_REDIS_REST_URL=https://...upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=...
 *
 * ── Groupes de routes et limites ─────────────────────────────────────────────
 *
 *  Groupe             | Routes                               | Max/min | Raison
 *  ───────────────────┼──────────────────────────────────────┼─────────┼────────────────────
 *  default            | pages HTML, autres                   |   300   | navigation normale
 *  api                | /api/* (fallback)                    |   200   | API génériques
 *  messages-write     | POST start-conversation              |    10   | création messages (spam)
 *  emploi-write       | PATCH/DELETE offres, demandes        |    20   | mutations emploi
 *  emploi-read        | GET offres, demandes, ownership,     |    60   | lecture emploi
 *                     | contact                              |         |
 *  admin-api          | /api/admin/**                        |   100   | actions admin
 *
 *  La clé de bucket est `ip:group` pour isoler les compteurs par groupe de routes.
 *
 * ── Fenêtre glissante approximative ──────────────────────────────────────────
 *
 *  L'algorithme utilisé est un compteur à fenêtre fixe (reset sur expiration)
 *  et non une vraie fenêtre glissante. C'est intentionnel : la complexité d'une
 *  vraie fenêtre glissante (circular buffer) n'est pas justifiée pour une Map
 *  locale non-distribuée. L'upgrade vers Upstash apportera une vraie fenêtre.
 */

// ─── Types publics ────────────────────────────────────────────────────────────

/**
 * Groupes de routes pour lesquels des limites distinctes s'appliquent.
 * Chaque groupe correspond à un ensemble de routes avec un profil d'usage similaire.
 */
export type RouteGroup =
  | 'default'        // pages HTML, routes non-API
  | 'api'            // /api/* fallback
  | 'messages-write' // POST /api/messages/start-conversation
  | 'emploi-write'   // PATCH/DELETE /api/emploi/offres/*, demandes/*
  | 'emploi-read'    // GET /api/emploi/**
  | 'admin-api';     // /api/admin/**

/** Configuration d'un groupe de routes. */
export interface RouteGroupConfig {
  /** Nombre maximal de requêtes par fenêtre. */
  maxRequests: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
  /** Durée du blocage après dépassement en millisecondes. */
  blockMs: number;
}

/** Résultat de `checkRateLimit`. */
export interface RateLimitResult {
  /** true = requête autorisée, false = bloquée (429). */
  allowed: boolean;
  /** Limite maximale pour ce groupe. */
  limit: number;
  /** Durée du blocage en secondes (pour Retry-After). */
  retryAfterSecs: number;
}

// ─── Configuration des groupes ────────────────────────────────────────────────

/**
 * RATE_CONFIGS — Limites par groupe de routes.
 *
 * Valeurs calibrées pour un usage humain normal, non punitives pour un
 * utilisateur légitime même actif.
 */
export const RATE_CONFIGS: Record<RouteGroup, RouteGroupConfig> = {
  'default':        { maxRequests: 300, windowMs: 60_000, blockMs: 60_000 },
  'api':            { maxRequests: 200, windowMs: 60_000, blockMs: 60_000 },
  'messages-write': { maxRequests:  10, windowMs: 60_000, blockMs: 60_000 },
  'emploi-write':   { maxRequests:  20, windowMs: 60_000, blockMs: 60_000 },
  'emploi-read':    { maxRequests:  60, windowMs: 60_000, blockMs: 60_000 },
  'admin-api':      { maxRequests: 100, windowMs: 60_000, blockMs: 60_000 },
};

// ─── État interne ─────────────────────────────────────────────────────────────

interface RateBucket {
  count:        number;
  firstReq:     number;
  blockedUntil: number; // 0 = non bloqué
}

/** Map interne — exportée uniquement pour les tests (reset entre cas). */
export const _buckets = new Map<string, RateBucket>();

/** Timestamp du dernier nettoyage — exporté pour reset dans les tests. */
export let _lastCleanup = Date.now();

/** Réinitialise le timer de nettoyage — usage tests uniquement. */
export function _resetCleanupTimer(now = 0): void {
  _lastCleanup = now;
}

// ─── Routes de bypass ─────────────────────────────────────────────────────────

/**
 * Prefixes de routes exemptées du rate-limiting.
 * - /api/auth         : callbacks OAuth Supabase (volume imprévisible)
 * - /api/_next        : endpoints internes Next.js
 * - /api/sentry-tunnel: tunnel Sentry (bursts légitimes d'événements JS)
 */
const BYPASS_PREFIXES = ['/api/auth', '/api/_next', '/api/sentry-tunnel'] as const;

/** IPs locales exemptées (dev, tests, Vercel preview interne). */
const LOCAL_IPS = new Set(['127.0.0.1', '::1', 'unknown', 'localhost']);

// ─── Nettoyage périodique ─────────────────────────────────────────────────────

/**
 * cleanBuckets — purge les entrées expirées de la Map.
 * Exécutée au plus une fois toutes les 5 minutes pour limiter l'overhead.
 * Non critique : les entrées périmées sont simplement ignorées à la prochaine lecture.
 */
export function cleanBuckets(now = Date.now()): void {
  if (now - _lastCleanup < 5 * 60_000) return;
  _lastCleanup = now;
  _buckets.forEach((b, key) => {
    if (now > b.blockedUntil && now - b.firstReq > 10 * 60_000) {
      _buckets.delete(key);
    }
  });
}

// ─── Classification des routes ────────────────────────────────────────────────

/**
 * resolveRouteGroup — Détermine le groupe de rate-limiting d'une route.
 *
 * L'ordre des conditions est important : les groupes spécialisés (restrictifs)
 * sont évalués avant les groupes généraux (permissifs).
 *
 * @param pathname  Chemin de la requête (ex: '/api/messages/start-conversation')
 * @param method    Méthode HTTP (ex: 'POST', 'GET')
 * @returns Le RouteGroup correspondant.
 */
export function resolveRouteGroup(pathname: string, method: string): RouteGroup {
  // Routes exemptées → bypass total (ne devrait pas arriver ici, vérification défensive)
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) return 'api';

  // Messages écriture : création de conversation (route la plus exposée au spam)
  if (pathname === '/api/messages/start-conversation' && method === 'POST') {
    return 'messages-write';
  }

  // Emploi écriture : mutations offres/demandes
  if (
    pathname.startsWith('/api/emploi/offres/') &&
    (method === 'PATCH' || method === 'DELETE')
  ) return 'emploi-write';

  if (
    pathname.startsWith('/api/emploi/demandes/') &&
    (method === 'PATCH' || method === 'DELETE')
  ) return 'emploi-write';

  // Emploi lecture + contact : plus permissif mais séparé du fallback API
  if (pathname.startsWith('/api/emploi/')) return 'emploi-read';

  // Admin API
  if (pathname.startsWith('/api/admin/')) return 'admin-api';

  // Fallback API
  if (pathname.startsWith('/api/')) return 'api';

  // Pages HTML (dashboard, profil, etc.)
  return 'default';
}

// ─── Vérification du rate-limit ───────────────────────────────────────────────

/**
 * checkRateLimit — Vérifie si la requête est autorisée selon les limites du groupe.
 *
 * @param ip        Adresse IP du client (ex-header x-forwarded-for)
 * @param group     Groupe de routes résolu par resolveRouteGroup()
 * @param now       Timestamp courant (injectable pour les tests)
 * @returns RateLimitResult avec `allowed`, `limit` et `retryAfterSecs`
 */
export function checkRateLimit(
  ip: string,
  group: RouteGroup,
  now = Date.now(),
): RateLimitResult {
  const config = RATE_CONFIGS[group];

  // Bypass : IPs locales
  if (LOCAL_IPS.has(ip)) {
    return { allowed: true, limit: config.maxRequests, retryAfterSecs: 0 };
  }

  cleanBuckets(now);

  // Clé unique par IP × groupe (isolation des compteurs)
  const key    = `${ip}:${group}`;
  const bucket = _buckets.get(key);

  if (!bucket) {
    _buckets.set(key, { count: 1, firstReq: now, blockedUntil: 0 });
    return { allowed: true, limit: config.maxRequests, retryAfterSecs: 0 };
  }

  // Encore en période de blocage
  if (bucket.blockedUntil > 0 && now < bucket.blockedUntil) {
    const retrySecs = Math.ceil((bucket.blockedUntil - now) / 1000);
    return { allowed: false, limit: config.maxRequests, retryAfterSecs: retrySecs };
  }

  // Fenêtre expirée ou blocage levé → reset
  if (now - bucket.firstReq > config.windowMs || bucket.blockedUntil > 0) {
    bucket.count        = 1;
    bucket.firstReq     = now;
    bucket.blockedUntil = 0;
    return { allowed: true, limit: config.maxRequests, retryAfterSecs: 0 };
  }

  // Incrément dans la fenêtre courante
  bucket.count++;
  if (bucket.count > config.maxRequests) {
    bucket.blockedUntil = now + config.blockMs;
    const retrySecs = Math.ceil(config.blockMs / 1000);
    return { allowed: false, limit: config.maxRequests, retryAfterSecs: retrySecs };
  }

  return { allowed: true, limit: config.maxRequests, retryAfterSecs: 0 };
}

// ─── Helper middleware ────────────────────────────────────────────────────────

/**
 * shouldBypassRateLimit — Vérifie si la route doit contourner le rate-limit.
 * Utilisé par src/middleware.ts avant d'appeler resolveRouteGroup().
 */
export function shouldBypassRateLimit(ip: string, pathname: string): boolean {
  if (LOCAL_IPS.has(ip)) return true;
  if (BYPASS_PREFIXES.some(p => pathname.startsWith(p))) return true;
  return false;
}
