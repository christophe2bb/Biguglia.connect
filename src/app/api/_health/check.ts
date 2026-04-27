/**
 * src/app/api/_health/check.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Logique partagée entre /api/health et /api/monitoring.
 *
 * Avant ce refactor, les deux routes dupliquaient la même logique de vérification
 * Supabase (requête légère + timeout + gestion RLS).  Ce module centralise :
 *   • checkDatabase() — connectivité Supabase avec timeout 5 s
 *   • checkAuth()     — présence des variables d'env (pas de réseau)
 *
 * Les deux endpoints conservent leur propre format de réponse JSON pour la
 * rétrocompatibilité (monitors externes configurés sur l'un ou l'autre) :
 *   /api/health     → { status, version, env, timestamp, uptime_s, checks[] }
 *   /api/monitoring → { status, version, environment, timestamp, uptime_ms, services{} }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';

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

/** Calcule le statut global à partir d'un tableau de ServiceCheck. */
export function overallStatus(checks: ServiceCheck[]): 'ok' | 'degraded' {
  return checks.every(c => c.status === 'ok') ? 'ok' : 'degraded';
}
