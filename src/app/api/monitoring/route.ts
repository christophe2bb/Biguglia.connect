/**
 * API Route — GET /api/monitoring  &  POST /api/monitoring
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoint de monitoring de santé — utilisé par :
 *   • Vercel Health Checks (sonde de disponibilité Vercel)
 *   • Dashboards externes (Uptime Robot, BetterUptime…)
 *   • Scripts d'infrastructure (exclu du rate-limit via BYPASS_PREFIXES)
 *
 * ⚠️  SÉPARATION TUNNEL SENTRY : /api/sentry-tunnel gère le tunnel Sentry.
 *     Cette route est exclusivement dédiée au health-check.
 *
 * ⓘ  La logique de vérification DB/auth est partagée avec /api/health
 *     via src/app/api/_health/check.ts (pas de duplication).
 *     Ce endpoint conserve le format services{} pour la rétrocompatibilité
 *     avec les monitors déjà configurés sur /api/monitoring.
 *
 * Format GET 200 :
 * {
 *   "status": "ok",
 *   "timestamp": "…",
 *   "version": "abc12345",
 *   "environment": "production",
 *   "uptime_ms": 12345,
 *   "services": {
 *     "database":   { "status": "ok", "latency_ms": 42 },
 *     "auth":       { "status": "ok" },
 *     "rate_limit": { "status": "ok", "mode": "redis", "latency_ms": 3 }
 *   }
 * }
 *
 * Quand Redis n'est pas configuré :
 *   "rate_limit": { "status": "degraded", "mode": "memory", "error": "UPSTASH_…" }
 *
 * Format GET 503 (dégradé) :
 * { "status": "degraded", … "services": { "database": { "status": "degraded" } } }
 *
 * POST /api/monitoring → 200 (certaines sondes envoient un POST)
 *
 * Sécurité :
 *   • PUBLIC_HEALTH_ENDPOINT — endpoint de monitoring public, sans auth intentionnelle
 *     (sentinel reconnu par src/app/api/__tests__/no-debug-routes.test.ts)
 *   • Aucune donnée sensible exposée (NEXT_PUBLIC_* uniquement)
 *   • CORS * autorisé (outils de monitoring externes)
 *   • Cache-Control : no-store
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDatabase, checkAuth, checkRateLimitRedis, overallStatus } from '../_health/check';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Version lisible : NEXT_PUBLIC_APP_VERSION > 8 premiers chars du commit SHA > '1.0.0' */
const _rawSha  = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  (_rawSha.length >= 8 ? _rawSha.substring(0, 8) : _rawSha) ||
  '1.0.0';

/** Démarrage du process — pour uptime_ms */
const PROCESS_START = Date.now();

// ─── GET /api/monitoring ──────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const [dbCheck, authCheck, rateLimitCheck] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkAuth()),
    checkRateLimitRedis(),
  ]);

  const status = overallStatus([dbCheck, authCheck, rateLimitCheck]);

  return NextResponse.json(
    {
      status,
      timestamp:   new Date().toISOString(),
      version:     APP_VERSION,
      environment: process.env.NODE_ENV ?? 'unknown',
      uptime_ms:   Date.now() - PROCESS_START,
      services: {
        database:   dbCheck,
        auth:       authCheck,
        rate_limit: rateLimitCheck,
      },
    },
    {
      status:  status === 'ok' ? 200 : 503,
      headers: {
        'Cache-Control':                'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin':  '*',
      },
    },
  );
}

// ─── POST /api/monitoring ─────────────────────────────────────────────────────
// Certains outils de monitoring envoient un POST comme sonde — répondre 200.

export async function POST(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      status:    'ok',
      message:   'Monitoring endpoint actif. Utiliser GET pour les métriques complètes.',
      timestamp: new Date().toISOString(),
    },
    {
      status:  200,
      headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    },
  );
}
