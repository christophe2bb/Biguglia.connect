/**
 * jobs/home-mappers/filters.ts
 *
 * Règles de présence dans le fil d'accueil.
 * Filtre les items en fonction de critères de qualité.
 */

import type { JobOfferHomeFeedItem, JobDemandHomeFeedItem } from '@/types/jobs';

// ─── Shared option types ──────────────────────────────────────────────────────

interface BaseFeedFilterOptions {
  /** Score de complétude minimum (défaut : 60) */
  minCompletenessScore?: number;
  /** Ancienneté maximale en jours (défaut : 30) */
  maxFreshnessDays?: number;
  /** Distance maximale en km si géolocalisation disponible */
  maxDistance?: number;
  /** Afficher uniquement les annonces locales */
  localOnly?: boolean;
}

export interface OfferFeedFilterOptions extends BaseFeedFilterOptions {
  /** Afficher uniquement les annonces urgentes */
  includeUrgentOnly?: boolean;
}

export interface DemandFeedFilterOptions extends BaseFeedFilterOptions {
  /** Afficher uniquement les profils avec CV */
  withCvOnly?: boolean;
}

// ─── Offer filter ─────────────────────────────────────────────────────────────

/**
 * Filter job offers for home feed based on quality criteria.
 */
export function filterJobOffersForHomeFeed(
  items: JobOfferHomeFeedItem[],
  options: OfferFeedFilterOptions = {}
): JobOfferHomeFeedItem[] {
  const {
    minCompletenessScore = 60,
    maxFreshnessDays = 30,
    maxDistance,
    includeUrgentOnly = false,
    localOnly = false,
  } = options;

  return items.filter(({ data, freshness_days, is_local }) => {
    if (data.completeness_score < minCompletenessScore) return false;
    if (freshness_days > maxFreshnessDays) return false;
    if (maxDistance && data.distance_km != null && data.distance_km > maxDistance) return false;
    if (includeUrgentOnly && !data.is_urgent) return false;
    if (localOnly && !is_local) return false;
    return true;
  });
}

// ─── Demand filter ────────────────────────────────────────────────────────────

/**
 * Filter job demands for home feed based on quality criteria.
 */
export function filterJobDemandsForHomeFeed(
  items: JobDemandHomeFeedItem[],
  options: DemandFeedFilterOptions = {}
): JobDemandHomeFeedItem[] {
  const {
    minCompletenessScore = 60,
    maxFreshnessDays = 30,
    maxDistance,
    localOnly = false,
    withCvOnly = false,
  } = options;

  return items.filter(({ data, freshness_days, is_local }) => {
    if (data.completeness_score < minCompletenessScore) return false;
    if (freshness_days > maxFreshnessDays) return false;
    if (maxDistance && data.distance_km != null && data.distance_km > maxDistance) return false;
    if (localOnly && !is_local) return false;
    if (withCvOnly && !data.cv_url && !data.portfolio_url) return false;
    return true;
  });
}
