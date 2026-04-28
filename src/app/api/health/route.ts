/**
 * GET /api/health
 * ─────────────────────────────────────────────────────────────────────────────
 * Endpoint de santé canonique — utilisé par :
 *   • Smoke tests E2E post-déploiement
 *   • Tests d'intégration CI
 *   • Alertes externes (UptimeRobot, Better Uptime…)
 *
 * Format de réponse : { status, version, env, timestamp, uptime_s, checks[] }
 * checks inclut : supabase, auth, rate_limit
 *
 * ⓘ  La logique de vérification (DB, auth, rate_limit) est partagée avec /api/monitoring
 *     via src/app/api/_health/check.ts pour éviter la duplication.
 *     /api/monitoring conserve son propre format JSON (services{}) pour la
 *     rétrocompatibilité avec les monitors Vercel configurés sur cette route.
 *
 * Sécurité :
 *   • PUBLIC_HEALTH_ENDPOINT — endpoint de santé public, sans auth intentionnelle
 *     (sentinel reconnu par src/app/api/__tests__/no-debug-routes.test.ts)
 *   • Aucune donnée sensible exposée (NEXT_PUBLIC_* uniquement)
 *   • Rate-limit global /api/* → 300 req/min
 *   • Cache-Control : no-store
 */

import { NextResponse } from 'next/server';
import { checkDatabase, checkAuth, checkRateLimitRedis, overallStatus } from '../_health/check';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const [dbCheck, authCheck, rateLimitCheck] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkAuth()),
    checkRateLimitRedis(),
  ]);

  const checks = [
    { name: 'supabase',   ...dbCheck },
    { name: 'auth',       ...authCheck },
    { name: 'rate_limit', ...rateLimitCheck },
  ];

  const status = overallStatus(checks);

  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
  const version   = commitSha.substring(0, 8) || (process.env.NEXT_PUBLIC_APP_VERSION ?? 'local');

  return NextResponse.json(
    {
      status,
      version,
      env:       process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
      uptime_s:  Math.floor(process.uptime()),
      checks,
    },
    {
      status:  200, // toujours 200 — les monitors lisent body.status
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    },
  );
}
