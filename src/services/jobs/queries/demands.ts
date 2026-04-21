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
 *  - Zéro `as X` sur les données Supabase : createJobsClient<Database>() infère
 *    automatiquement JobDemandRow pour .from('job_demands').select(...)
 *  - Toutes les erreurs "table manquante" sont interceptées silencieusement
 *  - La jointure author est optionnelle
 *  - Stratégie admin (bypass RLS) + fallback client anon pour getJobDemandBySlug
 */

import { unstable_cache } from 'next/cache';
import { createJobsClient, createJobsAdminClient } from '@/lib/supabase/server';
import type {
  JobDemandFilters,
  JobDemandSearchResult,
} from '@/types/jobs';
import { calculateFreshnessScore } from '../scoring';
import {
  isMissingTableError,
  isNotFoundError,
  asDbError,
  toAuthorProfile,
  toJobDemand,
  buildPagination,
  type JobDemandRow,
  type JobDemandRowWithAuthor,
  type AuthorJoinRow,
} from './shared';

// ─── Helpers locaux ────────────────────────────────────────────────────────────

function toSearchResult(row: JobDemandRow): JobDemandSearchResult {
  return {
    ...toJobDemand(row),
    author_profile: undefined,
    freshness_score: row.published_at
      ? calculateFreshnessScore(row.published_at)
      : 0,
  };
}

function toSearchResultWithAuthor(row: JobDemandRowWithAuthor): JobDemandSearchResult {
  return {
    ...toJobDemand(row),
    author_profile: toAuthorProfile(row.author),
    freshness_score: row.published_at
      ? calculateFreshnessScore(row.published_at)
      : 0,
  };
}

// ─── Type local pour la jointure admin (author uniquement) ────────────────────

/** Forme renvoyée par la requête admin qui ne sélectionne que la jointure author. */
interface AdminAuthorJoinResult {
  author: AuthorJoinRow | AuthorJoinRow[] | null;
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
  const supabase = createJobsClient();
  const { page, limit, from, to } = buildPagination(filters?.page, filters?.limit);

  let query = supabase
    .from('job_demands')
    .select('*', { count: 'exact' })
    .eq('status', 'published');

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
    default:
      query = query.order('published_at', { ascending: false });
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    const dbErr = asDbError(error);
    if (isMissingTableError(dbErr)) {
      console.warn('[jobs/demands] Table job_demands introuvable — migration en attente.');
      return { demands: [], total: 0, page, limit };
    }
    console.error('[jobs/demands] getJobDemands error:', dbErr.message);
    return { demands: [], total: 0, page, limit };
  }

  // data est inféré JobDemandRow[] par le client typé Database — aucun cast
  return {
    demands: (data ?? []).map(toSearchResult),
    total: count ?? 0,
    page,
    limit,
  };
}

// ─── getJobDemandBySlug ───────────────────────────────────────────────────────

/**
 * Retourne le détail d'une demande par son slug.
 *
 * Niveau 1 : client admin (bypass RLS) + jointure author optionnelle
 * Niveau 2 : client anon + RLS (fallback si service role key absent)
 */
export async function getJobDemandBySlug(
  slug: string,
): Promise<JobDemandSearchResult | null> {
  // ── Niveau 1 : client admin ────────────────────────────────────────────────
  try {
    const admin = createJobsAdminClient();

    const { data: base, error: adminErr } = await admin
      .from('job_demands')
      .select('*')
      .eq('slug', slug)
      .single();

    if (adminErr) {
      const dbErr = asDbError(adminErr);
      if (isMissingTableError(dbErr)) {
        console.warn('[jobs/demands] Table job_demands introuvable — migration en attente.');
        return null;
      }
      if (isNotFoundError(dbErr)) return null;
      console.error('[jobs/demands] getJobDemandBySlug (admin):', dbErr.message);
    } else if (base) {
      // base est inféré JobDemandRow par le client typé
      if (base.status !== 'published') return null;

      // Jointure author (optionnelle)
      let withAuthorRow: JobDemandRowWithAuthor = { ...base, author: null };
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
          // La jointure ajoute un champ `author` hors du type inféré DB.
          // On l'annote via AdminAuthorJoinResult : projection SQL explicite garantit le contrat.
          const j = joined as unknown as AdminAuthorJoinResult;
          withAuthorRow = { ...base, author: j.author };
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
  const supabase = createJobsClient();
  const { data, error } = await supabase
    .from('job_demands')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    const dbErr = asDbError(error);
    if (isMissingTableError(dbErr)) {
      console.warn('[jobs/demands] Table job_demands introuvable — migration en attente.');
      return null;
    }
    if (isNotFoundError(dbErr)) return null;
    console.error('[jobs/demands] getJobDemandBySlug (anon fallback):', dbErr.message);
    return null;
  }
  if (!data) return null;

  // data est inféré JobDemandRow — aucun cast
  return toSearchResult(data);
}

// ─── getRecentJobDemands ──────────────────────────────────────────────────────

/**
 * Retourne les `limit` demandes les plus récentes pour le fil Home.
 */
async function _getRecentJobDemands(
  limit: number = 5,
  sectorId?: string,
): Promise<JobDemandSearchResult[]> {
  const supabase = createJobsClient();

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
    const dbErr = asDbError(error);
    if (isMissingTableError(dbErr)) return [];
    console.error('[jobs/demands] getRecentJobDemands error:', dbErr.message);
    return [];
  }

  // data est inféré JobDemandRow[] — aucun cast
  return (data ?? []).map(toSearchResult);
}

export const getRecentJobDemands = unstable_cache(
  (limit = 5, sectorId?: string) => _getRecentJobDemands(limit, sectorId),
  ['jobs-recent-demands'],
  { revalidate: 60, tags: ['jobs-demands'] },
);
