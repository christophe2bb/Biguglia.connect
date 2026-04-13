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
 *   2. Rate-limit en mémoire  ⚠️ par instance Edge — voir src/lib/rate-limit.ts
 *        Limites par groupe de routes (req/min) :
 *          default        → 300  (pages HTML)
 *          api            → 200  (API fallback)
 *          messages-write →  10  (POST /api/messages/start-conversation)
 *          emploi-write   →  20  (PATCH/DELETE /api/emploi/offres|demandes/*)
 *          emploi-read    →  60  (GET /api/emploi/**)
 *          admin-api      → 100  (/api/admin/**)
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
 *   La Map interne de src/lib/rate-limit.ts est locale à l'instance
 *   → inefficace contre les attaques distribuées multi-instances.
 *   Efficacité réelle : protection contre les rafales d'une même IP
 *   sur la même instance (navigateur, bots simples).
 *   → Upgrade recommandé : Upstash Redis + @upstash/ratelimit.
 *      Voir src/lib/rate-limit.ts pour le code de migration drop-in.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  shouldBypassRateLimit,
  resolveRouteGroup,
  checkRateLimit,
} from '@/lib/rate-limit';

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

  // 2. Rate-limit par groupe de routes (⚠️ par instance Edge — protection partielle)
  if (!shouldBypassRateLimit(ip, pathname)) {
    const group  = resolveRouteGroup(pathname, method);
    const result = checkRateLimit(ip, group);

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

  // 3. Refresh session Supabase + guard routes protégées
  return updateSession(request);
}

export const config = {
  matcher: [
    // Toutes les routes sauf assets statiques Next.js et fichiers publics
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
