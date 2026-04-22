/**
 * src/middleware.ts — SEUL middleware actif du projet.
 *
 * ─── Unicité garantie ──────────────────────────────────────────────────────────
 *
 *   Next.js 14 App Router résout le middleware dans cet ordre de priorité :
 *     1. src/middleware.ts   ← CE FICHIER (actif)
 *     2. middleware.ts       ← racine (ignoré si src/ existe — NE PAS CRÉER)
 *
 *   Le doublon racine middleware.ts a été supprimé dans le commit b4d737f.
 *   Ne jamais recréer un middleware.ts à la racine du projet.
 *
 * ─── Ordre d'exécution sur chaque requête ─────────────────────────────────────
 *
 *   1. Filtre anti-bot (UA blacklist : sqlmap, nikto, gobuster, hydra…)
 *   2. Rate-limit distribué Upstash Redis (avec fallback mémoire si non configuré)
 *        Limites par groupe de routes (req/min) :
 *          default             → 300  (pages HTML)
 *          api                 → 200  (API fallback)
 *          login               →   5  (POST auth — anti brute-force)
 *          messages-write      →  10  (POST /api/messages/start-conversation)
 *          publications-write  →  10  (POST /api/emploi/offres|demandes)
 *          contact             →   5  (POST /api/emploi/contact — anti-scraping)
 *          emploi-write        →  20  (PATCH/DELETE /api/emploi/**)
 *          emploi-read         →  60  (GET /api/emploi/**)
 *          admin-api           → 100  (/api/admin/**)
 *   3. Refresh de session Supabase + guards d'authentification :
 *        /admin/**     → /connexion si non authentifié
 *        /dashboard/** → /connexion si non authentifié
 *        /profil       → /connexion si non authentifié
 *        /messages/**  → /connexion si non authentifié
 *
 * ─── Rate-limit Redis (Upstash) ───────────────────────────────────────────────
 *
 *   Protection distribuée via @upstash/ratelimit + @upstash/redis.
 *   Contrairement au mode mémoire précédent, les compteurs sont partagés
 *   entre toutes les instances Vercel Edge → protection réelle multi-instances.
 *
 *   Variables d'env requises :
 *     UPSTASH_REDIS_REST_URL   — ex: https://xxx.upstash.io
 *     UPSTASH_REDIS_REST_TOKEN — Token Bearer Upstash
 *
 *   Si absentes → fallback automatique sur le rate-limit mémoire local.
 *
 * ─── Headers de sécurité ──────────────────────────────────────────────────────
 *
 *   La Content-Security-Policy est générée ici (middleware) avec un nonce
 *   unique par requête. Elle n'est PAS définie dans next.config.js (headers
 *   statiques). C'est ce middleware qui pose le header CSP sur la réponse.
 *
 *   Cela permet d'utiliser 'nonce-{nonce}' + 'strict-dynamic' à la place de
 *   'unsafe-inline', éliminant 80% du risque XSS.
 *
 * ─── Ordre d'exécution CSP ───────────────────────────────────────────────────
 *
 *   3. Génération du nonce CSP par requête (128 bits, base64url)
 *        Voir src/lib/csp-nonce.ts — generateNonce().
 *        Flux :
 *          a. nonce = generateNonce()
 *          b. x-nonce = nonce (request header → Server Components)
 *          c. Content-Security-Policy response header avec nonce-{nonce} + strict-dynamic
 *          d. Next.js 15 lit automatiquement le nonce depuis le header CSP
 *             et l'applique à ses scripts SSR inline (hydratation, RSC, etc.)
 *             Ref: next/dist/server/app-render/get-script-nonce-from-header.js
 *
 * ─── Matcher ──────────────────────────────────────────────────────────────────
 *
 *   Le matcher exclut les assets statiques Next.js et les fichiers publics.
 *   Le middleware ne court donc que sur les vraies pages et routes API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  shouldBypassRateLimit,
  resolveRouteGroupRedis,
  checkRateLimitRedis,
  isRedisConfigured,
} from '@/lib/rate-limit-redis';
import { generateNonce } from '@/lib/csp-nonce';

// ─────────────────────────────────────────────────────────────────────────────
// AVERTISSEMENT DÉMARRAGE — Redis non configuré
// Émis une seule fois au premier cold-start de l'instance Edge.
// Visible dans Vercel → Functions → Logs.
// ─────────────────────────────────────────────────────────────────────────────
if (!isRedisConfigured()) {
  console.warn(
    '[rate-limit] Redis non configuré — fallback mémoire actif. ' +
    'En production multi-instance Vercel, chaque instance dispose de ses propres ' +
    'compteurs : la protection anti brute-force/spam est inefficace. ' +
    'Ajouter UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (voir docs/DEPLOY.md §5b).',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSP dynamique avec nonce ────────────────────────────────────────────────────

const SUPABASE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co')
  .replace(/^https?:\/\//, '');

const isDev = process.env.NODE_ENV === 'development';

/**
 * Construit la Content-Security-Policy avec le nonce fourni.
 *
 * Logique script-src :
 *  - Production : 'nonce-{nonce}' 'strict-dynamic' blob: + domaines explicites
 *    'strict-dynamic' propage la confiance aux scripts chargés dynamiquement
 *    par les scripts noncés (Next.js lazy-loading, Sentry Replay).
 *    'unsafe-inline' est RETIRÉ.
 *  - Développement : + 'unsafe-eval' pour le HMR Next.js.
 *
 * Next.js 15 lit le nonce depuis ce header CSP via :
 *   next/dist/server/app-render/get-script-nonce-from-header.js
 * Il l'applique automatiquement à ses scripts SSR inline (hydratation, RSC, etc.).
 */
export function buildCsp(nonce: string): string {
  const scriptSrc = isDev
    ? `'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' blob: https://vercel.live https://*.vercel-scripts.com https://browser.sentry-cdn.com`
    : `'nonce-${nonce}' 'strict-dynamic' blob: https://vercel.live https://*.vercel-scripts.com https://browser.sentry-cdn.com`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://*.genspark.ai https://lh3.googleusercontent.com https://avatars.githubusercontent.com`,
    `connect-src 'self' https://${SUPABASE_ORIGIN} wss://${SUPABASE_ORIGIN} https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in https://vercel.live https://*.vercel-scripts.com https://vitals.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://browser.sentry-cdn.com`,
    "worker-src 'self' blob:",
    "frame-src https://vercel.live",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-BOT — User-Agent blacklist
// Les bons crawlers (Googlebot, Bingbot…) sont exclus par la regex négative.
// ─────────────────────────────────────────────────────────────────────────────
const BAD_BOT_PATTERNS: RegExp[] = [
  /sqlmap/i, /nikto/i, /nessus/i, /masscan/i, /zgrab/i, /nuclei/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /hydra/i, /havij/i,
  /python-requests\/[01]\./i,
  /curl\/[0-6]\./i,
  /libwww-perl/i, /lwp-trivial/i,
  /\bbot\b(?!.*(?:google|bing|yahoo|duckduck|slurp|baidu|yandex|semrush|ahrefs|msnbot))/i,
];

function isBadBot(ua: string): boolean {
  if (!ua || ua.length < 5) return true; // UA vide ou très court = suspect
  return BAD_BOT_PATTERNS.some(p => p.test(ua));
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const ua = request.headers.get('user-agent') ?? '';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? request.headers.get('x-real-ip')
          ?? 'unknown';

  // 1. Filtre anti-bot
  if (isBadBot(ua)) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 2. Rate-limit distribué Redis (fenêtre glissante multi-instances)
  //    Fallback automatique sur la mémoire locale si Redis non configuré.
  if (!shouldBypassRateLimit(ip, pathname)) {
    const group  = resolveRouteGroupRedis(pathname, method);
    const result = await checkRateLimitRedis(ip, group);

    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques minutes.' }),
        {
          status: 429,
          headers: {
            'Content-Type':      'application/json',
            'Retry-After':       String(result.retryAfterSecs),
            'X-RateLimit-Limit': String(result.limit),
          },
        }
      );
    }
  }

  // 3. Génération du nonce CSP par requête
  //
  //    Stratégie :
  //    a) On génère un nonce cryptographique unique (128 bits, base64url).
  //    b) On injecte le nonce dans les request headers (x-nonce) pour que
  //       les Server Components (layout.tsx, JsonLd.tsx) puissent le lire
  //       via `headers()` de next/headers.
  //    c) La session Supabase est rafraîchie par updateSession() qui retourne
  //       la response finale. On y ajoute le header CSP avec le nonce.
  //
  //    Next.js 15 lit le nonce depuis le header Content-Security-Policy de
  //    la RESPONSE (pas du request) via getScriptNonceFromHeader() et
  //    l'applique automatiquement à ses scripts SSR inline.
  //    Ref: node_modules/next/dist/server/app-render/get-script-nonce-from-header.js
  const nonce = generateNonce();

  // Passer le nonce aux Server Components via request headers (x-nonce)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const requestWithNonce = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
    body: request.body,
  });

  // 4. Refresh session Supabase + guard routes protégées
  //    On passe la request modifiée (avec x-nonce) à updateSession.
  const supabaseResponse = await updateSession(requestWithNonce);

  // Ajouter le header CSP dynamique avec le nonce sur la response
  supabaseResponse.headers.set('Content-Security-Policy', buildCsp(nonce));

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Toutes les routes sauf assets statiques Next.js et fichiers publics
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
