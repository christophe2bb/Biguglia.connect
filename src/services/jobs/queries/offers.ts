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
 *  - Zéro `any` : les rows DB sont typées via JobOfferRow / JobOfferRowWithAuthor
 *  - select('*') résolu par assertion vers JobOfferRow (projection explicite)
 *  - select avec jointure résolu vers JobOfferRowWithAuthor
 *  - Toutes les erreurs "table manquante" sont interceptées silencieusement
 *  - La jointure author est optionnelle (toAuthorProfile → undefined si absente)
 */

import { createClient } from '@/lib/supabase/server';
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

/**
 * La colonne `author` est typée `unknown` dans la réponse brute de Supabase
 * quand select('*') est utilisé. On utilise la projection explicite avec jointure
 * pour les requêtes enrichies ; les autres n'ont pas de champ `author`.
 *
 * Convertit une JobOfferRow en JobOfferSearchResult (ajoute freshness_score).
 */
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
 * Tous les filtres sont appliqués côté Supabase (pas de post-filtrage en mémoire).
 * Si la table est absente (migration en attente), retourne une liste vide sans crash.
 */
export async function getJobOffers(
  filters?: Partial<JobOfferFilters>,
): Promise<GetJobOffersResult> {
  const supabase = createClient();
  const { page, limit, from, to } = buildPagination(filters?.page, filters?.limit);

  // ── Construction de la requête ─────────────────────────────────────────────
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

  // ── Tri ────────────────────────────────────────────────────────────────────
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
    default: // 'date_desc' | 'relevance'
      query = query.order('published_at', { ascending: false });
  }

  query = query.range(from, to);

  // ── Exécution ──────────────────────────────────────────────────────────────
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

  // Supabase sans schéma généré retourne `data: any` pour select('*').
  // JobOfferRow est la projection explicite qui décrit exactement la forme DB.
  const rows = (data ?? []) as JobOfferRow[];

  return {
    offers: rows.map(toSearchResult),
    total: count ?? 0,
    page,
    limit,
  };
}

// ─── getJobOfferBySlug ────────────────────────────────────────────────────────

/**
 * Retourne le détail d'une offre par son slug.
 *
 * Stratégie en deux passes :
 *  1. SELECT * sans jointure → vérifie existence + statut publié
 *  2. SELECT avec jointure profiles!user_id → enrichit author_profile
 *     (optionnel : si la jointure échoue, on retourne quand même le résultat)
 *
 * Retourne null si : slug inexistant, offre non publiée, table absente.
 */
export async function getJobOfferBySlug(
  slug: string,
): Promise<JobOfferSearchResult | null> {
  const supabase = createClient();

  // ── Passe 1 : vérification d'existence et de statut ───────────────────────
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
    if (isNotFoundError(dbErr)) {
      return null; // slug absent — pas d'erreur à logger
    }
    console.error('[jobs/offers] getJobOfferBySlug (passe 1):', dbErr.message);
    return null;
  }
  if (!base) return null;

  const baseRow = base as JobOfferRow;
  if (baseRow.status !== 'published') return null;

  // ── Passe 2 : jointure author (optionnelle) ───────────────────────────────
  const { data: withAuthor, error: err2 } = await supabase
    .from('job_offers')
    .select(
      `*, author:profiles!user_id (
        id, display_name, avatar_url, is_verified, created_at
      )`,
    )
    .eq('slug', slug)
    .single();

  // Si la jointure réussit → utiliser la row enrichie
  if (!err2 && withAuthor) {
    return toSearchResultWithAuthor(withAuthor as JobOfferRowWithAuthor);
  }

  // Jointure échouée → retourner la base sans auteur
  return toSearchResult(baseRow);
}

// ─── getRecentJobOffers ───────────────────────────────────────────────────────

/**
 * Retourne les `limit` offres les plus récentes pour le fil Home.
 * Filtre optionnel par `sectorId`.
 */
export async function getRecentJobOffers(
  limit: number = 5,
  sectorId?: string,
): Promise<JobOfferSearchResult[]> {
  const supabase = createClient();

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

  const rows = (data ?? []) as JobOfferRow[];
  return rows.map(toSearchResult);
}
