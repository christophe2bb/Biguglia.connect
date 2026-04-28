/**
 * API Route — GET /api/admin/logs
 *
 * Retourne les entrées de admin_action_logs avec filtres et pagination.
 *
 * Query params :
 *   page      number (default 1)
 *   limit     number (default 50, max 200)
 *   action    string  — filtrer sur action (ex : "user_status_set")
 *   actor_id  uuid    — filtrer sur l'acteur
 *   table     string  — filtrer sur target_table
 *   from      ISO date string — born inférieure (created_at >=)
 *   to        ISO date string — born supérieure (created_at <=)
 *
 * Sécurité :
 *   • getAdminUser() vérifie la session + rôle admin/moderator côté serveur
 *   • Lecture via adminClient (service role) — contourne la RLS SELECT
 *     de la table (qui est toutefois correcte pour les clients navigateur)
 *   • Aucune mutation possible via cette route (GET uniquement)
 */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/supabase/admin-guard';

// ─── Types publics ────────────────────────────────────────────────────────────

export interface AdminActionLog {
  id:           string;
  actor_id:     string;
  actor_role:   string;
  action:       string;
  target_table: string | null;
  target_id:    string | null;
  reason:       string | null;
  meta:         Record<string, unknown>;
  created_at:   string;
  /** Champs joints depuis profiles (optionnel) */
  actor_email?: string | null;
  actor_name?:  string | null;
}

export interface AdminLogsResponse {
  logs:  AdminActionLog[];
  total: number;
  page:  number;
  limit: number;
  pages: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

// ─── Helper — parse entier borné ─────────────────────────────────────────────

function parsePositiveInt(raw: string | null, fallback: number, max?: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  if (max !== undefined && n > max) return max;
  return n;
}

// ─── GET /api/admin/logs ──────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  const guard = await getAdminUser(req);
  if (!guard.ok) return guard.response;

  const { adminClient } = guard;
  const url    = new URL(req.url);
  const sp     = url.searchParams;

  // ── Pagination ────────────────────────────────────────────────────────────
  const page  = parsePositiveInt(sp.get('page'),  1);
  const limit = parsePositiveInt(sp.get('limit'), DEFAULT_LIMIT, MAX_LIMIT);
  const from_idx = (page - 1) * limit;
  const to_idx   = from_idx + limit - 1;

  // ── Filtres ───────────────────────────────────────────────────────────────
  const filterAction   = sp.get('action')   ?? null;
  const filterActorId  = sp.get('actor_id') ?? null;
  const filterTable    = sp.get('table')    ?? null;
  const filterFrom     = sp.get('from')     ?? null;
  const filterTo       = sp.get('to')       ?? null;

  // ── Requête principale ────────────────────────────────────────────────────
  let query = adminClient
    .from('admin_action_logs')
    .select(
      `id, actor_id, actor_role, action, target_table, target_id,
       reason, meta, created_at`,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from_idx, to_idx);

  if (filterAction)  query = query.eq('action',       filterAction);
  if (filterActorId) query = query.eq('actor_id',     filterActorId);
  if (filterTable)   query = query.eq('target_table', filterTable);
  if (filterFrom)    query = query.gte('created_at',  filterFrom);
  if (filterTo)      query = query.lte('created_at',  filterTo);

  const { data: logs, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger les logs.' },
      { status: 500 },
    );
  }

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  // ── Enrichissement optionnel : emails / noms des acteurs ──────────────────
  // On récupère les profils uniques des acteurs présents dans la page courante
  // pour afficher un nom lisible dans l'interface.
  const actorIdSet = new Set((logs ?? []).map((l) => l.actor_id as string));
  const actorIds = Array.from(actorIdSet);
  const profileMap: Record<string, { email: string; full_name: string | null }> = {};

  if (actorIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, email, full_name')
      .in('id', actorIds);

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = { email: p.email, full_name: p.full_name };
      }
    }
  }

  // Enrichir les logs
  const enrichedLogs: AdminActionLog[] = (logs ?? []).map((l) => {
    const profile = profileMap[l.actor_id as string];
    return {
      ...l,
      actor_email: profile?.email     ?? null,
      actor_name:  profile?.full_name ?? null,
    } as AdminActionLog;
  });

  const response: AdminLogsResponse = {
    logs:  enrichedLogs,
    total,
    page,
    limit,
    pages,
  };

  return NextResponse.json(response);
}
