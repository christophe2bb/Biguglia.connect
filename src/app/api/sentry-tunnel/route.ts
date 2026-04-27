/**
 * src/app/api/sentry-tunnel/route.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Endpoint de fallback pour le tunnel Sentry.
 *
 * ── Comment fonctionne le tunnel Sentry ──────────────────────────────────────
 *
 *   Le plugin `@sentry/nextjs` (option `tunnelRoute: '/api/sentry-tunnel'` dans
 *   next.config.js) injecte au build des règles Next.js `rewrites` qui
 *   interceptent les requêtes Sentry AVANT qu'elles n'atteignent ce handler :
 *
 *     POST /api/sentry-tunnel?o=<orgId>&p=<projectId>
 *       → redirigé vers https://o:<orgId>.ingest.sentry.io/api/<projectId>/envelope/
 *
 *   Ce handler n'est donc JAMAIS appelé par le SDK Sentry en conditions normales.
 *
 * ── Pourquoi ce fichier existe ────────────────────────────────────────────────
 *
 *   1. Clarté architecturale : rend la route visible dans le repo et documente
 *      le mécanisme, évitant toute confusion avec /api/monitoring (health-check).
 *
 *   2. Fallback propre : si un GET ou un POST arrive sans les query params Sentry
 *      (ex. scan de sécurité, probe de monitoring, rewrite mal configuré),
 *      ce handler répond 204 No Content plutôt qu'un 404 opaque.
 *
 *   3. Séparation nette des responsabilités :
 *        /api/monitoring      → health-check Vercel/UptimeRobot (src/app/api/monitoring/route.ts)
 *        /api/sentry-tunnel   → tunnel Sentry exclusivement (ce fichier + rewrites)
 *
 * ── Rate-limiting ─────────────────────────────────────────────────────────────
 *
 *   /api/sentry-tunnel est exclu du rate-limiting via BYPASS_PREFIXES dans
 *   src/lib/rate-limit.ts et src/lib/rate-limit-redis.ts.
 *   Raison : le SDK Sentry peut envoyer des bursts légitimes d'enveloppes
 *   (ex. erreurs groupées, sessions) qui dépasseraient les seuils normaux.
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/sentry-tunnel
 *
 * Fallback pour les requêtes GET sans params Sentry (ex. scanners, probes).
 * Les vrais appels tunnel Sentry (POST ?o=&p=) sont réécrits par Next.js
 * avant d'atteindre ce handler.
 */
export function GET(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * POST /api/sentry-tunnel
 *
 * Fallback pour les POST qui auraient manqué la règle rewrite (ex. params
 * ?o= ou ?p= absents ou malformés). Répond 204 pour ne pas générer d'erreur
 * côté SDK Sentry si le rewrite échoue en dev local (pas de DSN configuré).
 */
export function POST(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
