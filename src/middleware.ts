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
 *   2. Rate-limit en mémoire  ⚠️ par instance Edge — voir note ci-dessous
 *        Limites : 300 req/min (pages), 200 req/min (API), blocage 1 min
 *   3. Refresh de session Supabase + guards d'authentification :
 *        /admin/**     → /connexion si non authentifié
 *        /dashboard/** → /connexion si non authentifié
 *        /profil       → /connexion si non authentifié
 *        /messages/**  → /connexion si non authentifié
 *
 * ─── Headers de sécurité ──────────────────────────────────────────────────────
 *
 *   Les headers de sécurité (X-Frame-Options, HSTS, CSP, etc.) sont définis
 *   une seule fois dans next.config.js via la fonction headers().
 *   Le middleware ne les duplique PAS.
 *
 * ─── Matcher ──────────────────────────────────────────────────────────────────
 *
 *   Le matcher exclut les assets statiques Next.js et les fichiers publics.
 *   Le middleware ne court donc que sur les vraies pages et routes API.
 *
 * ⚠️  LIMITE CONNUE — Rate-limit en mémoire sur Vercel/serverless :
 *   Sur Vercel, chaque Edge Function est instanciée indépendamment.
 *   La Map `rateBuckets` est locale à l'instance → inefficace contre
 *   les attaques distribuées multi-instances.
 *   Efficacité réelle : protection contre les rafales d'une même IP
 *   sur la même instance (cas de navigateur, bots simples).
 *   Pour une protection robuste en prod → Upstash Redis + @upstash/ratelimit.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER — en mémoire, Edge-compatible (⚠️ par instance, voir note)
// ─────────────────────────────────────────────────────────────────────────────
interface RateBucket {
  count:        number;
  firstReq:     number;
  blockedUntil: number; // 0 = pas bloqué
}

const rateBuckets    = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60_000;  // fenêtre glissante : 1 minute
const RATE_LIMIT_MAX = 300;     // max req/min par IP (pages)  — ~5 req/s
const RATE_LIMIT_API = 200;     // max req/min par IP sur /api — ~3 req/s
const BLOCK_DURATION = 60_000;  // blocage 1 minute après dépassement

// Routes API exclues du rate-limit (auth Supabase, session refresh auto)
const RATE_LIMIT_BYPASS_PREFIXES = ['/api/auth', '/api/_next'] as const;

let lastCleanup = Date.now();
function cleanBuckets(): void {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  rateBuckets.forEach((b, ip) => {
    if (now > b.blockedUntil && now - b.firstReq > RATE_WINDOW_MS * 2) {
      rateBuckets.delete(ip);
    }
  });
}

function checkRateLimit(ip: string, isApi: boolean, pathname: string): boolean {
  // Bypass routes auth/session
  if (RATE_LIMIT_BYPASS_PREFIXES.some(p => pathname.startsWith(p))) return true;
  // Bypass IPs locales (dev, Vercel preview interne)
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'unknown') return true;

  cleanBuckets();
  const now   = Date.now();
  const limit = isApi ? RATE_LIMIT_API : RATE_LIMIT_MAX;
  const bucket = rateBuckets.get(ip);

  if (!bucket) {
    rateBuckets.set(ip, { count: 1, firstReq: now, blockedUntil: 0 });
    return true;
  }

  // Encore en période de blocage
  if (bucket.blockedUntil > 0 && now < bucket.blockedUntil) return false;

  // Fenêtre expirée (blocage levé ou fenêtre normale écoulée)
  if (now - bucket.firstReq > RATE_WINDOW_MS || bucket.blockedUntil > 0) {
    bucket.count        = 1;
    bucket.firstReq     = now;
    bucket.blockedUntil = 0;
    return true;
  }

  bucket.count++;
  if (bucket.count > limit) {
    bucket.blockedUntil = now + BLOCK_DURATION;
    return false;
  }
  return true;
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
  const isApi = pathname.startsWith('/api/');

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

  // 2. Rate-limit (⚠️ par instance Edge — protection partielle)
  if (!checkRateLimit(ip, isApi, pathname)) {
    return new NextResponse(
      JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques minutes.' }),
      {
        status: 429,
        headers: {
          'Content-Type':      'application/json',
          'Retry-After':       String(Math.ceil(BLOCK_DURATION / 1000)),
          'X-RateLimit-Limit': String(isApi ? RATE_LIMIT_API : RATE_LIMIT_MAX),
        },
      }
    );
  }

  // 3. Refresh session Supabase + guard routes protégées
  return updateSession(request);
}

export const config = {
  matcher: [
    // Toutes les routes sauf assets statiques Next.js et fichiers publics
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
