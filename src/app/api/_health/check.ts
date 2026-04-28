/**
 * src/app/api/_health/check.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Logique partagée entre /api/health et /api/monitoring.
 *
 * Avant ce refactor, les deux routes dupliquaient la même logique de vérification
 * Supabase (requête légère + timeout + gestion RLS).  Ce module centralise :
 *   • checkDatabase()       — connectivité Supabase avec timeout 5 s
 *   • checkAuth()           — présence des variables d'env (pas de réseau)
 *   • checkRateLimitRedis() — présence des vars Upstash + ping Redis réel
 *
 * Les deux endpoints conservent leur propre format de réponse JSON pour la
 * rétrocompatibilité (monitors externes configurés sur l'un ou l'autre) :
 *   /api/health     → { status, version, env, timestamp, uptime_s, checks[] }
 *   /api/monitoring → { status, version, environment, timestamp, uptime_ms, services{} }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { isRedisConfigured } from '@/lib/rate-limit-redis';

// ─── Types partagés ──────────────────────────────────────────────────────────

export type ServiceStatus = 'ok' | 'degraded' | 'down' | 'error';

export interface ServiceCheck {
  status: ServiceStatus;
  latency_ms?: number;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Vérifie la connexion à Supabase avec un timeout de 5 s.
 * Utilise le client anonyme — pas de service-role key exposée.
 * Une erreur RLS (PGRST301 / JWT) est traitée comme "ok" :
 * cela indique que la DB est joignable, même sans session valide.
 */
export async function checkDatabase(): Promise<ServiceCheck> {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { status: 'error', error: 'Variables SUPABASE env manquantes' };
  }

  const start = Date.now();
  try {
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await Promise.race([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1),
      new Promise<{ error: Error }>(resolve =>
        setTimeout(() => resolve({ error: new Error('timeout') }), 5_000),
      ),
    ]);

    const latency_ms = Date.now() - start;

    if (error) {
      // Erreur RLS attendue sans session — DB joignable
      if (
        error.message?.includes('JWT') ||
        (error as unknown as { code?: string }).code === 'PGRST301'
      ) {
        return { status: 'ok', latency_ms };
      }
      if (error.message === 'timeout') {
        return { status: 'degraded', latency_ms, error: 'DB timeout (> 5 s)' };
      }
      return { status: 'degraded', latency_ms, error: error.message };
    }

    return { status: 'ok', latency_ms };
  } catch (err) {
    return {
      status: 'down',
      latency_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Vérifie que les variables d'env Supabase sont présentes.
 * Pas de requête réseau.
 */
export function checkAuth(): ServiceCheck {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey
    ? { status: 'ok' }
    : { status: 'degraded', error: 'Supabase env vars missing' };
}

/**
 * checkRateLimitRedis — Vérifie la disponibilité du rate-limiting distribué.
 *
 * Deux niveaux de vérification :
 *   1. Présence des variables d'env UPSTASH_REDIS_REST_URL + TOKEN
 *      → 'degraded' si absentes (fallback mémoire actif, insuffisant multi-instance)
 *   2. Ping HTTP réel vers Upstash (SET nx + GET) avec timeout 3 s
 *      → 'degraded' si les variables sont là mais Redis inaccessible
 *
 * Statut retourné :
 *   'ok'       — Redis configuré ET joignable
 *   'degraded' — variables absentes ou Redis inaccessible (fallback mémoire)
 *   'down'     — erreur inattendue
 *
 * Note : cette vérification est intentionnellement légère (PING HTTP, pas de
 * Lua script sliding window) pour ne pas consommer de quota Upstash.
 */
export async function checkRateLimitRedis(): Promise<ServiceCheck & { mode: 'redis' | 'memory' }> {
  if (!isRedisConfigured()) {
    return {
      status: 'degraded',
      mode:   'memory',
      error:  'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN absents — '
            + 'fallback mémoire actif (insuffisant en multi-instance Vercel)',
    };
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const start = Date.now();

  try {
    // Ping léger : PING via l'API REST Upstash (GET /ping)
    // Répond { result: 'PONG' } — sans consommer de slot de rate-limit.
    const res = await Promise.race([
      fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3_000),
      ),
    ]);

    const latency_ms = Date.now() - start;

    if (!res.ok) {
      return {
        status:     'degraded',
        mode:       'redis',
        latency_ms,
        error:      `Upstash HTTP ${res.status}`,
      };
    }

    const body = await res.json() as { result?: string };
    if (body?.result !== 'PONG') {
      return {
        status:     'degraded',
        mode:       'redis',
        latency_ms,
        error:      `Réponse inattendue : ${JSON.stringify(body)}`,
      };
    }

    return { status: 'ok', mode: 'redis', latency_ms };

  } catch (err) {
    const latency_ms = Date.now() - start;
    const message    = err instanceof Error ? err.message : String(err);
    return {
      status:     'degraded',
      mode:       'redis',
      latency_ms,
      error:      message === 'timeout'
                    ? 'Upstash timeout (> 3 s)'
                    : `Upstash error: ${message}`,
    };
  }
}

/** Calcule le statut global à partir d'un tableau de ServiceCheck. */
export function overallStatus(checks: ServiceCheck[]): 'ok' | 'degraded' {
  return checks.every(c => c.status === 'ok') ? 'ok' : 'degraded';
}
