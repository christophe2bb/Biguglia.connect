/**
 * API Route — GET /api/monitoring  &  POST /api/monitoring
 * ──────────────────────────────────────────────────────────────────────────────
 * Endpoint de monitoring de santé de l'application.
 *
 * Utilisé par :
 *   • Vercel Health Checks (sonde de disponibilité)
 *   • Dashboards de monitoring externes (Uptime Robot, BetterUptime, etc.)
 *   • Scripts d'infrastructure (rate-limit-redis.ts exclut ce chemin du
 *     throttling via BYPASS_PREFIXES — voir src/lib/rate-limit-redis.ts:136)
 *
 * SÉCURITÉ :
 *   • Pas d'informations sensibles exposées (pas de clés, secrets, env vars)
 *   • Pas d'authentification requise (endpoint de health check public)
 *   • Les compteurs Supabase sont optionnels : si la DB est inaccessible,
 *     le endpoint répond quand même 200 avec db_status: "degraded"
 *   • Aucune PII exposée
 *
 * Réponse GET (200 — application saine) :
 * {
 *   "status": "ok",
 *   "timestamp": "2026-04-22T10:00:00.000Z",
 *   "version": "1.0.0",
 *   "environment": "production",
 *   "uptime_ms": 12345,
 *   "services": {
 *     "database": { "status": "ok", "latency_ms": 42 },
 *     "auth":     { "status": "ok" }
 *   }
 * }
 *
 * Réponse GET (503 — DB dégradée) :
 * {
 *   "status": "degraded",
 *   ...
 *   "services": {
 *     "database": { "status": "degraded", "error": "..." }
 *   }
 * }
 *
 * POST /api/monitoring → 405 Method Not Allowed
 *   (Vercel probe parfois envoie un POST — répondre proprement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Démarrage du processus Node.js — pour calculer l'uptime */
const PROCESS_START = Date.now();

/** Version de l'application (injectée par Vercel ou définie manuellement) */
const _rawCommitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? '';
const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  (_rawCommitSha.length >= 8 ? _rawCommitSha.substring(0, 8) : _rawCommitSha) ||
  '1.0.0';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceStatus = 'ok' | 'degraded' | 'down';

interface ServiceCheck {
  status: ServiceStatus;
  latency_ms?: number;
  error?: string;
}

interface MonitoringResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime_ms: number;
  services: {
    database: ServiceCheck;
    auth: ServiceCheck;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Vérifie la connexion à Supabase en effectuant une requête légère.
 * Utilise le client anonyme pour ne pas exposer la service-role key.
 * Timeout de 5 secondes pour ne pas bloquer le health check.
 */
async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();

  try {
    const { url, anonKey } = getSupabaseEnv();

    // Client ephémère — pas de persistance de session
    const supabase = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Requête légère : COUNT sur profiles avec head=true (pas de données renvoyées)
    // Protected by RLS — renvoie 0 sans session, ce qui est normal
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      // Erreur RLS (PGRST301) attendue sans session — la DB est joignable
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        return { status: 'ok', latency_ms: latency };
      }
      return {
        status: 'degraded',
        latency_ms: latency,
        error: error.message,
      };
    }

    return { status: 'ok', latency_ms: latency };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      status: 'down',
      latency_ms: latency,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Vérifie que les variables d'environnement Supabase Auth sont présentes.
 * Pas de requête réseau — vérification locale uniquement.
 */
function checkAuth(): ServiceCheck {
  try {
    const { url, anonKey } = getSupabaseEnv();
    const configured = !!url && !!anonKey;
    return { status: configured ? 'ok' : 'degraded' };
  } catch {
    return { status: 'degraded', error: 'Supabase env vars missing' };
  }
}

// ─── Contrôle d'accès (health check public) ───────────────────────────────────

/**
 * Le endpoint /api/monitoring est intentionnellement public (pas d'authentification).
 * Il est conçu pour les outils de monitoring, sondes Vercel, et UptimeRobot.
 *
 * Sécurité :
 *   • Aucune donnée sensible n'est exposée (pas de clés, secrets, PII)
 *   • Exclut le rate-limiting via BYPASS_PREFIXES dans rate-limit-redis.ts
 *   • La fonction isAuthorized() marque explicitement ce choix architectural
 *
 * @returns true toujours (endpoint public par conception)
 */
function isAuthorized(): true {
  return true;
}

// ─── GET /api/monitoring ──────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // Public health check — intentionnellement sans authentification
  isAuthorized();
  const timestamp = new Date().toISOString();
  const uptimeMs = Date.now() - PROCESS_START;

  // Vérifications des services en parallèle
  const [dbCheck, authCheck] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkAuth()),
  ]);

  const overallStatus: 'ok' | 'degraded' =
    dbCheck.status === 'ok' && authCheck.status === 'ok' ? 'ok' : 'degraded';

  const body: MonitoringResponse = {
    status: overallStatus,
    timestamp,
    version: APP_VERSION,
    environment: process.env.NODE_ENV ?? 'unknown',
    uptime_ms: uptimeMs,
    services: {
      database: dbCheck,
      auth: authCheck,
    },
  };

  const httpStatus = overallStatus === 'ok' ? 200 : 503;

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      // Pas de cache — toujours les données fraîches
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      // Permettre aux outils de monitoring d'accéder à cet endpoint
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ─── POST /api/monitoring ─────────────────────────────────────────────────────
// Certains outils de monitoring (Vercel, UptimeRobot, etc.) envoient parfois
// un POST comme sonde. Répondre 200 plutôt que 405 pour éviter les fausses alertes.

export async function POST(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'Monitoring endpoint actif. Utiliser GET pour les métriques complètes.',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
