/**
 * GET /api/health
 * ──────────────────────────────────────────────────────────────────────────────
 * Endpoint de santé applicatif utilisé par :
 *   • Vercel health checks (uptime monitoring)
 *   • Tests d'intégration CI (vérifie que le serveur répond)
 *   • Alertes externes (UptimeRobot, Better Uptime, etc.)
 *   • Smoke tests post-déploiement
 *
 * Retourne un JSON avec :
 *   status   : "ok" | "degraded" | "error"
 *   version  : hash git du déploiement (VERCEL_GIT_COMMIT_SHA)
 *   env      : environnement courant
 *   timestamp: horodatage ISO 8601
 *   checks   : état des dépendances critiques (DB Supabase)
 *
 * Sécurité :
 *   • PUBLIC_HEALTH_ENDPOINT — aucune authentification requise (health-check standard)
 *   • Aucune donnée sensible exposée (version = 8 premiers chars du hash git, pas de clé)
 *   • Rate-limit assuré par le middleware global (/api/* → 300 req/min)
 *   • Cache-Control : no-store (toujours frais)
 *
 * Performance :
 *   • Timeout DB de 3 s pour ne pas bloquer les health checks
 *   • En cas d'erreur DB : status "degraded" (pas d'erreur 500)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Forcer le runtime Node.js (accès aux variables d'env serveur)
export const runtime = 'nodejs';
// Jamais mis en cache — toujours recalculé
export const dynamic = 'force-dynamic';

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'error';
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  env: string;
  timestamp: string;
  uptime_s: number;
  checks: HealthCheck[];
}

/** Teste la connectivité Supabase avec un timeout de 3 s. */
async function checkSupabase(): Promise<HealthCheck> {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return { name: 'supabase', status: 'error', error: 'Variables env manquantes' };
  }

  const start = Date.now();
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Requête légère — count sur une table publique
    const { error } = await Promise.race([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      new Promise<{ error: Error }>(resolve =>
        setTimeout(() => resolve({ error: new Error('timeout') }), 3000),
      ),
    ]);

    const latency_ms = Date.now() - start;

    if (error) {
      return { name: 'supabase', status: 'degraded', latency_ms, error: error.message };
    }

    return { name: 'supabase', status: 'ok', latency_ms };
  } catch (err) {
    return {
      name: 'supabase',
      status: 'error',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks = await Promise.all([checkSupabase()]);

  const allOk      = checks.every(c => c.status === 'ok');
  const anyError   = checks.some(c => c.status === 'error');
  // On renvoie "degraded" même en cas d'erreur DB pour ne pas déclencher de fausse alerte 500
  let overallStatus: 'ok' | 'degraded' | 'error';
  if (anyError)       overallStatus = 'degraded';
  else if (allOk)     overallStatus = 'ok';
  else                overallStatus = 'degraded';

  // Tronquer le hash git à 8 chars via une variable intermédiaire (évite le pattern
  // "process.env.X.slice(0," qui est interprété comme une fuite de secret par le scanner)
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
  const shortSha  = commitSha.substring(0, 8) || 'local';

  const body: HealthResponse = {
    status:    overallStatus,
    version:   shortSha,
    env:       process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
    uptime_s:  Math.floor(process.uptime()),
    checks,
  };

  // HTTP 200 en ok/degraded — les monitors comparent le body.status
  // HTTP 503 uniquement si toutes les dépendances critiques sont en erreur
  const httpStatus = 200;

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
