/**
 * services/jobs/queries/demands.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Requêtes Supabase pour les demandes d'emploi.
 *
 * Fonctions exportées :
 *  - getJobDemands(filters?)       Liste paginée + filtrée
 *  - getJobDemandBySlug(slug)      Détail d'une demande par slug (avec auteur)
 *  - getRecentJobDemands(n, sec)   Fil Home — n demandes récentes
 *
 * Garanties :
 *  - Aucun `any` : les rows DB sont typées via les interfaces JobDemand
 *  - Toutes les erreurs "table manquante" sont interceptées silencieusement
 *  - La jointure author est optionnelle (toAuthorProfile → undefined si absente)
 *  - Stratégie admin (bypass RLS) + fallback client anon pour getJobDemandBySlug
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import type {
  JobDemand,
  JobDemandFilters,
  JobDemandSearchResult,
} from '@/types/jobs';
import { calculateFreshnessScore } from '../scoring';
import {
  isMissingTableError,
  isNotFoundError,
  toAuthorProfile,
  buildPagination,
  type DbError,
} from './shared';

// ─── Type interne ─────────────────────────────────────────────────────────────

/** Row brute renvoyée par Supabase pour job_demands */
type JobDemandRow = JobDemand;

/** Row avec la jointure author optionnelle */
interface JobDemandRowWithAuthor extends JobDemandRow {
  author?: unknown;
}

// ─── Helpers locaux ────────────────────────────────────────────────────────────

function toSearchResult(row: JobDemandRow): JobDemandSearchResult {
  return {
    ...row,
    author_profile: undefined,
    freshness_score: row.published_at
      ? calculateFreshnessScore(row.published_at)
      : 0,
  };
}

function toSearchResultWithAuthor(row: JobDemandRowWithAuthor): JobDemandSearchResult {
  return {
    ...row,
    author_profile: toAuthorProfile(row.author),
    freshness_score: row.published_at
      ? calculateFreshnessScore(row.published_at)
      : 0,
  };
}

// ─── getJobDemands ────────────────────────────────────────────────────────────

export interface GetJobDemandsResult {
  demands: JobDemandSearchResult[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Retourne une liste paginée de demandes publiées, avec filtres optionnels.
 */
export async function getJobDemands(
  filters?: Partial<JobDemandFilters>,
): Promise<GetJobDemandsResult> {
  const supabase = createClient();
  const { page, limit, from, to } = buildPagination(filters?.page, filters?.limit);

  let query = supabase
    .from('job_demands')
    .select('*', { count: 'exact' })
    .eq('status', 'published');

  // Filtres
  if (filters?.query) {
    query = query.ilike('title', `%${filters.query}%`);
  }
  if (filters?.categories?.length) {
    query = query.in('job_category', filters.categories);
  }
  if (filters?.sectorId) {
    query = query.eq('sector_id', filters.sectorId);
  }
  if (filters?.experienceLevels?.length) {
    query = query.in('experience_level', filters.experienceLevels);
  }
  if (filters?.isUrgent !== undefined) {
    query = query.eq('is_urgent', filters.isUrgent);
  }
  if (filters?.hasLicense !== undefined) {
    query = query.eq('has_driving_license', filters.hasLicense);
  }
  if (filters?.hasVehicle !== undefined) {
    query = query.eq('has_vehicle', filters.hasVehicle);
  }

  // Tri
  switch (filters?.sortBy ?? 'date_desc') {
    case 'date_asc':
      query = query.order('published_at', { ascending: true });
      break;
    case 'experience_desc':
      query = query.order('experience_years', { ascending: false, nullsFirst: false });
      break;
    case 'completeness_desc':
      query = query.order('completeness_score', { ascending: false });
      break;
    default: // 'date_desc' | 'relevance'
      query = query.order('published_at', { ascending: false });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    const dbErr = error as DbError;
    if (isMissingTableError(dbErr)) {
      console.warn('[jobs/demands] Table job_demands introuvable — migration en attente.');
      return { demands: [], total: 0, page, limit };
    }
    console.error('[jobs/demands] getJobDemands error:', dbErr.message);
    return { demands: [], total: 0, page, limit };
  }

  return {
    demands: (data as JobDemandRow[] ?? []).map(toSearchResult),
    total: count ?? 0,
    page,
    limit,
  };
}

// ─── getJobDemandBySlug ───────────────────────────────────────────────────────

/**
 * Retourne le détail d'une demande par son slug.
 *
 * Stratégie en deux niveaux :
 *
 * 1. Client admin (service role, bypass RLS complet)
 *    → SELECT * + statut vérifié côté app
 *    → Jointure author tentée séparément (optionnelle)
 *    → Utilisé si SUPABASE_SERVICE_ROLE_KEY est défini
 *
 * 2. Client anon + RLS (fallback si pas de service role key)
 *    → SELECT * WHERE status = 'published'
 *    → Pas de jointure author (RLS trop restrictif)
 *
 * Retourne null si : slug inexistant, demande non publiée, table absente.
 */
export async function getJobDemandBySlug(
  slug: string,
): Promise<JobDemandSearchResult | null> {
  // ── Niveau 1 : client admin ────────────────────────────────────────────────
  try {
    const admin = createAdminClient();

    const { data: base, error: adminErr } = await admin
      .from('job_demands')
      .select('*')
      .eq('slug', slug)
      .single();

    if (adminErr) {
      const dbErr = adminErr as DbError;
      if (isMissingTableError(dbErr)) {
        console.warn('[jobs/demands] Table job_demands introuvable — migration en attente.');
        return null;
      }
      if (isNotFoundError(dbErr)) return null;
      // Erreur inattendue → log + fallback passe 2
      console.error('[jobs/demands] getJobDemandBySlug (admin):', dbErr.message);
    } else if (base) {
      const baseRow = base as JobDemandRow;
      if (baseRow.status !== 'published') return null;

      // Jointure author (optionnelle — ne bloque pas)
      let withAuthorRow: JobDemandRowWithAuthor = { ...baseRow };
      try {
        const { data: joined } = await admin
          .from('job_demands')
          .select(
            `author:profiles!user_id (
              id, display_name, avatar_url, is_verified, created_at
            )`,
          )
          .eq('slug', slug)
          .single();

        if (joined) {
          const j = joined as { author?: unknown };
          withAuthorRow = { ...baseRow, author: j.author };
        }
      } catch {
        // Jointure optionnelle — on continue sans auteur
      }

      return toSearchResultWithAuthor(withAuthorRow);
    }
  } catch {
    // Service role key absent ou erreur réseau → fallback client anon
  }

  // ── Niveau 2 : client anon + RLS ──────────────────────────────────────────
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_demands')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    const dbErr = error as DbError;
    if (isMissingTableError(dbErr)) {
      console.warn('[jobs/demands] Table job_demands introuvable — migration en attente.');
      return null;
    }
    if (isNotFoundError(dbErr)) return null;
    console.error('[jobs/demands] getJobDemandBySlug (anon fallback):', dbErr.message);
    return null;
  }
  if (!data) return null;

  return toSearchResult(data as JobDemandRow);
}

// ─── getRecentJobDemands ──────────────────────────────────────────────────────

/**
 * Retourne les `limit` demandes les plus récentes pour le fil Home.
 */
export async function getRecentJobDemands(
  limit: number = 5,
  sectorId?: string,
): Promise<JobDemandSearchResult[]> {
  const supabase = createClient();

  let query = supabase
    .from('job_demands')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (sectorId) {
    query = query.eq('sector_id', sectorId);
  }

  const { data, error } = await query;

  if (error) {
    const dbErr = error as DbError;
    if (isMissingTableError(dbErr)) return [];
    console.error('[jobs/demands] getRecentJobDemands error:', dbErr.message);
    return [];
  }

  return (data as JobDemandRow[] ?? []).map(toSearchResult);
}
