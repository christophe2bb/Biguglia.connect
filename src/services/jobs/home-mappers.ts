/**
 * Module Emploi Local - Mappers Home Feed
 * Version 1.0 - 2026-04-09
 * 
 * Transforme les offres et demandes d'emploi en items de fil Home
 */

import type {
  JobOffer,
  JobDemand,
  JobOfferHomeFeedItem,
  JobDemandHomeFeedItem,
} from '@/types/jobs';
import { calculateFreshnessScore } from './scoring';

/**
 * Map job offers to home feed items
 * Utilisé pour afficher les offres dans le fil "Maison vivante"
 */
export function jobOffersToHomeFeedItems(
  offers: JobOffer[],
  userSectorId?: string | null
): JobOfferHomeFeedItem[] {
  return offers
    .filter((offer) => offer.status === 'published')
    .map((offer) => {
      const freshness_score = offer.published_at
        ? calculateFreshnessScore(offer.published_at)
        : 0;

      const freshness_days = offer.published_at
        ? Math.floor(
            (new Date().getTime() - new Date(offer.published_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      const is_local = userSectorId
        ? offer.sector_id === userSectorId
        : false;

      // Calculate priority score for feed ordering
      let priority_score = 0;

      // Base: completeness (0-40 points)
      priority_score += offer.completeness_score * 0.4;

      // Freshness (0-30 points)
      priority_score += freshness_score * 0.3;

      // Urgent bonus (+15 points)
      if (offer.is_urgent) {
        priority_score += 15;
      }

      // Local bonus (+10 points)
      if (is_local) {
        priority_score += 10;
      }

      // Featured/promoted bonus (+5 points)
      if (offer.visibility_level === 'featured' || offer.visibility_level === 'premium') {
        priority_score += 5;
      }

      return {
        type: 'job_offer' as const,
        data: {
          ...offer,
          freshness_score,
        },
        priority_score,
        freshness_days,
        is_local,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score); // Tri par priorité décroissante
}

/**
 * Map job demands to home feed items
 */
export function jobDemandsToHomeFeedItems(
  demands: JobDemand[],
  userSectorId?: string | null
): JobDemandHomeFeedItem[] {
  return demands
    .filter((demand) => demand.status === 'published')
    .map((demand) => {
      const freshness_score = demand.published_at
        ? calculateFreshnessScore(demand.published_at)
        : 0;

      const freshness_days = demand.published_at
        ? Math.floor(
            (new Date().getTime() - new Date(demand.published_at).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      const is_local = userSectorId
        ? demand.sector_id === userSectorId
        : false;

      // Calculate priority score
      let priority_score = 0;

      // Base: completeness (0-40 points)
      priority_score += demand.completeness_score * 0.4;

      // Freshness (0-30 points)
      priority_score += freshness_score * 0.3;

      // Urgent bonus (+15 points)
      if (demand.is_urgent) {
        priority_score += 15;
      }

      // Local bonus (+10 points)
      if (is_local) {
        priority_score += 10;
      }

      // CV/Portfolio bonus (+5 points)
      if (demand.cv_url || demand.portfolio_url) {
        priority_score += 5;
      }

      return {
        type: 'job_demand' as const,
        data: {
          ...demand,
          freshness_score,
        },
        priority_score,
        freshness_days,
        is_local,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

/**
 * Filter job offers for home feed based on quality criteria
 * Règles de présence dans le fil Home
 */
export function filterJobOffersForHomeFeed(
  items: JobOfferHomeFeedItem[],
  options: {
    minCompletenessScore?: number; // Score minimum (défaut: 60)
    maxFreshnessDays?: number; // Fraîcheur max en jours (défaut: 30)
    maxDistance?: number; // Distance max en km si géoloc disponible
    includeUrgentOnly?: boolean; // Afficher uniquement les urgents
    localOnly?: boolean; // Afficher uniquement les locaux
  } = {}
): JobOfferHomeFeedItem[] {
  const {
    minCompletenessScore = 60,
    maxFreshnessDays = 30,
    maxDistance,
    includeUrgentOnly = false,
    localOnly = false,
  } = options;

  return items.filter((item) => {
    const { data, freshness_days, is_local } = item;

    // Règle 1: Score de complétude minimum
    if (data.completeness_score < minCompletenessScore) {
      return false;
    }

    // Règle 2: Fraîcheur maximale
    if (freshness_days > maxFreshnessDays) {
      return false;
    }

    // Règle 3: Distance maximale (si applicable)
    if (maxDistance && data.distance_km && data.distance_km > maxDistance) {
      return false;
    }

    // Règle 4: Urgent uniquement
    if (includeUrgentOnly && !data.is_urgent) {
      return false;
    }

    // Règle 5: Local uniquement
    if (localOnly && !is_local) {
      return false;
    }

    return true;
  });
}

/**
 * Filter job demands for home feed
 */
export function filterJobDemandsForHomeFeed(
  items: JobDemandHomeFeedItem[],
  options: {
    minCompletenessScore?: number;
    maxFreshnessDays?: number;
    maxDistance?: number;
    localOnly?: boolean;
    withCvOnly?: boolean; // Afficher uniquement ceux avec CV
  } = {}
): JobDemandHomeFeedItem[] {
  const {
    minCompletenessScore = 60,
    maxFreshnessDays = 30,
    maxDistance,
    localOnly = false,
    withCvOnly = false,
  } = options;

  return items.filter((item) => {
    const { data, freshness_days, is_local } = item;

    // Score minimum
    if (data.completeness_score < minCompletenessScore) {
      return false;
    }

    // Fraîcheur
    if (freshness_days > maxFreshnessDays) {
      return false;
    }

    // Distance
    if (maxDistance && data.distance_km && data.distance_km > maxDistance) {
      return false;
    }

    // Local
    if (localOnly && !is_local) {
      return false;
    }

    // Avec CV uniquement
    if (withCvOnly && !data.cv_url && !data.portfolio_url) {
      return false;
    }

    return true;
  });
}

/**
 * Get dynamic badges for job offers in home feed
 * Retourne les badges à afficher dynamiquement
 */
export function getJobOfferBadges(offer: JobOffer): string[] {
  const badges: string[] = [];

  if (offer.is_urgent) {
    badges.push('🔥 Urgent');
  }

  if (offer.contract_type === 'saisonnier') {
    badges.push('☀️ Saisonnier');
  }

  if (offer.provides_housing) {
    badges.push('🏠 Logement');
  }

  if (offer.contract_type === 'remplacement') {
    badges.push('⚡ Remplacement');
  }

  if (offer.provides_meals) {
    badges.push('🍽️ Repas');
  }

  if (offer.is_remote_possible) {
    badges.push('💻 Télétravail');
  }

  if (offer.visibility_level === 'featured' || offer.visibility_level === 'premium') {
    badges.push('⭐ Mise en avant');
  }

  return badges;
}

/**
 * Get dynamic badges for job demands in home feed
 */
export function getJobDemandBadges(demand: JobDemand): string[] {
  const badges: string[] = [];

  if (demand.is_urgent) {
    badges.push('🔥 Disponible rapidement');
  }

  if (demand.cv_url) {
    badges.push('📄 CV disponible');
  }

  if (demand.has_driving_license && demand.has_vehicle) {
    badges.push('🚗 Permis + Véhicule');
  } else if (demand.has_driving_license) {
    badges.push('🪪 Permis');
  }

  if (demand.experience_level === 'expert' || demand.experience_level === 'senior') {
    badges.push('⭐ Expérimenté');
  }

  if (demand.is_flexible_schedule) {
    badges.push('🕐 Horaires flexibles');
  }

  return badges;
}
