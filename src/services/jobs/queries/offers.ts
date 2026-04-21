/**
 * services/jobs/queries/offers.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Requêtes Supabase pour les offres d'emploi.
 *
 * Fonctions exportées :
 *  - getJobOffers(filters?)       Liste paginée + filtrée
 *  - getJobOfferBySlug(slug)      Détail d'une offre par slug (avec auteur)
 *  - getRecentJobOffers(n, sec)   Fil Home — n offres récentes
 *
 * Garanties :
 *  - Zéro `as X` sur les données Supabase : createJobsClient<Database>() infère
 *    automatiquement JobOfferRow pour .from('job_offers').select(...)
 *  - Toutes les erreurs "table manquante" sont interceptées silencieusement
 *  - La jointure author est optionnelle (toAuthorProfile → undefined si absente)
 */

import { unstable_cache } from 'next/cache';
import { createJobsClient } from '@/lib/supabase/server';
import type {
  JobOfferFilters,
  JobOfferSearchResult,
} from '@/types/jobs';
import { calculateFreshnessScore } from '../scoring';
import {
  isMissingTableError,
  isNotFoundError,
  asDbError,
  toAuthorProfile,
  toJobOffer,
  buildPagination,
  type JobOfferRow,
  type JobOfferRowWithAuthor,
} from './shared';

// ─── Helpers locaux ────────────────────────────────────────────────────────────

function toSearchResult(row: JobOfferRow): JobOfferSearchResult {
  return {
    ...toJobOffer(row),
    author_profile: undefined,
    freshness_score: row.published_at
      ? calculateFreshnessScore(row.published_at)
      : 0,
  };
}

function toSearchResultWithAuthor(row: JobOfferRowWithAuthor): JobOfferSearchResult {
  return {
    ...toJobOffer(row),
    author_profile: toAuthorProfile(row.author),
    freshness_score: row.published_at
      ? calculateFreshnessScore(row.published_at)
      : 0,
  };
}

// ─── getJobOffers ─────────────────────────────────────────────────────────────

export interface GetJobOffersResult {
  offers: JobOfferSearchResult[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Retourne une liste paginée d'offres publiées, avec filtres optionnels.
 *
 * Tous les filtres sont appliqués côté Supabase.
 * Si la table est absente (migration en attente), retourne une liste vide.
 */
export async function getJobOffers(
  filters?: Partial<JobOfferFilters>,
): Promise<GetJobOffersResult> {
  const supabase = createJobsClient();
  const { page, limit, from, to } = buildPagination(filters?.page, filters?.limit);

  let query = supabase
    .from('job_offers')
    .select('*', { count: 'exact' })
    .eq('status', 'published');

  // Filtres textuels
  if (filters?.query) {
    query = query.ilike('title', `%${filters.query}%`);
  }

  // Filtres catégoriels
  if (filters?.categories?.length) {
    query = query.in('job_category', filters.categories);
  }
  if (filters?.contractTypes?.length) {
    query = query.in('contract_type', filters.contractTypes);
  }
  if (filters?.employmentTypes?.length) {
    query = query.in('employment_type', filters.employmentTypes);
  }
  if (filters?.sectorId) {
    query = query.eq('sector_id', filters.sectorId);
  }
  if (filters?.experienceLevels?.length) {
    query = query.in('experience_level', filters.experienceLevels);
  }

  // Filtres salaire / prérequis
  if (filters?.salaryMin !== undefined) {
    query = query.gte('salary_range_min', filters.salaryMin);
  }
  if (filters?.requiresLicense !== undefined) {
    query = query.eq('has_driving_license', filters.requiresLicense);
  }
  if (filters?.requiresVehicle !== undefined) {
    query = query.eq('requires_vehicle', filters.requiresVehicle);
  }
  if (filters?.providesHousing !== undefined) {
    query = query.eq('provides_housing', filters.providesHousing);
  }
  if (filters?.providesRemote !== undefined) {
    query = query.eq('is_remote_possible', filters.providesRemote);
  }
  if (filters?.isUrgent !== undefined) {
    query = query.eq('is_urgent', filters.isUrgent);
  }

  // Tri
  switch (filters?.sortBy ?? 'date_desc') {
    case 'date_asc':
      query = query.order('published_at', { ascending: true });
      break;
    case 'salary_desc':
      query = query.order('salary_range_max', { ascending: false, nullsFirst: false });
      break;
    case 'salary_asc':
      query = query.order('salary_range_min', { ascending: true, nullsFirst: false });
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
      console.warn('[jobs/offers] Table job_offers introuvable — migration en attente.');
      return { offers: [], total: 0, page, limit };
    }
    console.error('[jobs/offers] getJobOffers error:', dbErr.message);
    return { offers: [], total: 0, page, limit };
  }

  // data est inféré JobOfferRow[] par le client typé Database — aucun cast nécessaire
  return {
    offers: (data ?? []).map(toSearchResult),
    total: count ?? 0,
    page,
    limit,
  };
}

// ─── getJobOfferBySlug ────────────────────────────────────────────────────────

/**
 * Retourne le détail d'une offre par son slug.
 *
 * Passe 1 : select * → vérifie existence + statut
 * Passe 2 : select avec jointure profiles → enrichit author_profile (optionnel)
 */
export async function getJobOfferBySlug(
  slug: string,
): Promise<JobOfferSearchResult | null> {
  const supabase = createJobsClient();

  // ── Passe 1 ───────────────────────────────────────────────────────────────
  const { data: base, error: err1 } = await supabase
    .from('job_offers')
    .select('*')
    .eq('slug', slug)
    .single();

  if (err1) {
    const dbErr = asDbError(err1);
    if (isMissingTableError(dbErr)) {
      console.warn('[jobs/offers] Table job_offers introuvable — migration en attente.');
      return null;
    }
    if (isNotFoundError(dbErr)) return null;
    console.error('[jobs/offers] getJobOfferBySlug (passe 1):', dbErr.message);
    return null;
  }
  if (!base) return null;

  // base est inféré JobOfferRow par le client typé
  if (base.status !== 'published') return null;

  // ── Passe 2 : jointure author (optionnelle) ───────────────────────────────
  //
  // La sélection `*, author:profiles!user_id (...)` fait sortir le client du
  // type inféré automatiquement (Supabase ne connaît pas la jointure dans le
  // type généré). On type le résultat manuellement via JobOfferRowWithAuthor
  // qui étend JobOfferRow avec le champ author.
  const { data: withAuthor, error: err2 } = await supabase
    .from('job_offers')
    .select(
      `*, author:profiles!user_id (
        id, display_name, avatar_url, is_verified, created_at
      )`,
    )
    .eq('slug', slug)
    .single();

  if (!err2 && withAuthor) {
    // La jointure `author:profiles!user_id` ajoute un champ `author` non présent
    // dans le type inféré. On l'annote manuellement : le runtime est garanti
    // correct par la projection SQL explicite.
    const enriched = withAuthor as unknown as JobOfferRowWithAuthor;
    return toSearchResultWithAuthor(enriched);
  }

  return toSearchResult(base);
}

// ─── getRecentJobOffers ───────────────────────────────────────────────────────

/**
 * Retourne les `limit` offres les plus récentes pour le fil Home.
 */
async function _getRecentJobOffers(
  limit: number = 5,
  sectorId?: string,
): Promise<JobOfferSearchResult[]> {
  const supabase = createJobsClient();

  let query = supabase
    .from('job_offers')
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
    console.error('[jobs/offers] getRecentJobOffers error:', dbErr.message);
    return [];
  }

  // data est inféré JobOfferRow[] — aucun cast
  return (data ?? []).map(toSearchResult);
}

export const getRecentJobOffers = unstable_cache(
  (limit = 5, sectorId?: string) => _getRecentJobOffers(limit, sectorId),
  ['jobs-recent-offers'],
  { revalidate: 60, tags: ['jobs-offers'] },
);
