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
 *   1. Skip des assets statiques (_next/*, favicon, images)
 *   2. Filtre anti-bot (UA blacklist : sqlmap, nikto, gobuster, hydra…)
 *   3. Rate-limit en mémoire  ⚠️ par instance Edge — voir note ci-dessous
 *   4. Refresh de session Supabase + guards d'authentification :
 *        /admin/**     → /connexion si non authentifié
 *        /dashboard/** → /connexion si non authentifié
 *        /profil       → /connexion si non authentifié
 *        /messages/**  → /connexion si non authentifié
 *   5. Injection des headers de sécurité sur la réponse
 *
 * ─── Matcher ──────────────────────────────────────────────────────────────────
 *
 *   Le matcher exclut les assets statiques Next.js et les fichiers publics
 *   pour éviter l'overhead du middleware sur chaque ressource statique.
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
  count: number;
  firstReq: number;
  blocked: boolean;
  blockedUntil: number;
}

const rateBuckets    = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60_000;   // fenêtre glissante : 1 minute
const RATE_LIMIT_MAX = 120;      // max requêtes/minute par IP (pages)
const RATE_LIMIT_API = 30;       // max requêtes/minute par IP sur /api/*
const BLOCK_DURATION = 5 * 60_000; // blocage 5 minutes après dépassement

let lastCleanup = Date.now();
function cleanBuckets() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  rateBuckets.forEach((b, ip) => {
    if (now > b.blockedUntil && now - b.firstReq > RATE_WINDOW_MS * 2) {
      rateBuckets.delete(ip);
    }
  });
}

function checkRateLimit(ip: string, isApi: boolean): boolean {
  cleanBuckets();
  const now   = Date.now();
  const limit = isApi ? RATE_LIMIT_API : RATE_LIMIT_MAX;
  const bucket  = rateBuckets.get(ip);

  if (!bucket) {
    rateBuckets.set(ip, { count: 1, firstReq: now, blocked: false, blockedUntil: 0 });
    return true;
  }

  if (bucket.blocked && now < bucket.blockedUntil) return false;

  if (bucket.blocked && now >= bucket.blockedUntil) {
    bucket.blocked = false;
    bucket.count   = 1;
    bucket.firstReq = now;
    return true;
  }

  if (now - bucket.firstReq > RATE_WINDOW_MS) {
    bucket.count   = 1;
    bucket.firstReq = now;
    return true;
  }

  bucket.count++;
  if (bucket.count > limit) {
    bucket.blocked      = true;
    bucket.blockedUntil = now + BLOCK_DURATION;
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-BOT — User-Agent blacklist
// ⚠️  Ne pas lister les bons crawlers (Googlebot, Bingbot, etc.) — ils sont
//    exclus par la regex négative sur "bot".
// ─────────────────────────────────────────────────────────────────────────────
const BAD_BOT_PATTERNS: RegExp[] = [
  /sqlmap/i, /nikto/i, /nessus/i, /masscan/i, /zgrab/i, /nuclei/i,
  /dirbuster/i, /gobuster/i, /wfuzz/i, /hydra/i, /havij/i,
  /python-requests\/[01]\./i,
  /curl\/[0-6]\./i,
  /libwww-perl/i, /lwp-trivial/i,
  // Bots génériques, en excluant les crawlers légitimes
  /\bbot\b(?!.*(?:google|bing|yahoo|duckduck|slurp|baidu|yandex|semrush|ahrefs|msnbot))/i,
];

function isBadBot(ua: string): boolean {
  if (!ua || ua.length < 5) return true; // UA vide ou très court = suspect
  return BAD_BOT_PATTERNS.some(p => p.test(ua));
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADERS DE SÉCURITÉ
// Complètent next.config.js : garantissent la couverture sur les routes API
// et les redirections de session qui ne passent pas par les headers statiques.
// ─────────────────────────────────────────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options':           'DENY',
  'X-Content-Type-Options':    'nosniff',
  'X-XSS-Protection':          '1; mode=block',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/favicon');

  if (!isStatic) {
    const ua = request.headers.get('user-agent') ?? '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? request.headers.get('x-real-ip')
            ?? 'unknown';
    const isApi = pathname.startsWith('/api/');

    // 1. Filtre anti-bot
    if (isBadBot(ua)) {
      return new NextResponse('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 2. Rate-limit (⚠️ par instance Edge — protection partielle)
    if (!checkRateLimit(ip, isApi)) {
      return new NextResponse(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques minutes.' }),
        {
          status: 429,
          headers: {
            'Content-Type':        'application/json',
            'Retry-After':         String(Math.ceil(BLOCK_DURATION / 1000)),
            'X-RateLimit-Limit':   String(isApi ? RATE_LIMIT_API : RATE_LIMIT_MAX),
          },
        }
      );
    }
  }

  // 3. Refresh session Supabase + guard /admin (dans updateSession)
  const response = await updateSession(request);

  // 4. Injecter les headers de sécurité sur la réponse finale
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    // Toutes les routes sauf assets statiques Next.js et images optimisées
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
