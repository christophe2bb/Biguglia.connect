/**
 * jobs/home-mappers/mappers.ts
 *
 * Transforme les offres et demandes publiées en items de fil d'accueil,
 * avec calcul de score de priorité pour le tri.
 */

import type {
  JobOffer,
  JobDemand,
  JobOfferHomeFeedItem,
  JobDemandHomeFeedItem,
} from '@/types/jobs';
import { calculateFreshnessScore, daysSincePublication } from '../scoring/freshness';

// ─── Offer mapper ─────────────────────────────────────────────────────────────

/**
 * Map published job offers to sorted home feed items.
 * @param userSectorId - Optional user sector for local-match bonus.
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
      const freshness_days = daysSincePublication(offer.published_at);
      const is_local = userSectorId ? offer.sector_id === userSectorId : false;

      let priority_score = 0;
      priority_score += offer.completeness_score * 0.4; // base (0-40 pts)
      priority_score += freshness_score * 0.3;          // freshness (0-30 pts)
      if (offer.is_urgent) priority_score += 15;        // urgency bonus
      if (is_local) priority_score += 10;               // local bonus
      if (
        offer.visibility_level === 'featured' ||
        offer.visibility_level === 'premium'
      ) {
        priority_score += 5;                            // featured/promoted bonus
      }

      return {
        type: 'job_offer' as const,
        data: { ...offer, freshness_score },
        priority_score,
        freshness_days,
        is_local,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

// ─── Demand mapper ────────────────────────────────────────────────────────────

/**
 * Map published job demands to sorted home feed items.
 * @param userSectorId - Optional user sector for local-match bonus.
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
      const freshness_days = daysSincePublication(demand.published_at);
      const is_local = userSectorId ? demand.sector_id === userSectorId : false;

      let priority_score = 0;
      priority_score += demand.completeness_score * 0.4; // base (0-40 pts)
      priority_score += freshness_score * 0.3;           // freshness (0-30 pts)
      if (demand.is_urgent) priority_score += 15;        // urgency bonus
      if (is_local) priority_score += 10;               // local bonus
      if (demand.cv_url || demand.portfolio_url) {
        priority_score += 5;                            // CV/portfolio bonus
      }

      return {
        type: 'job_demand' as const,
        data: { ...demand, freshness_score },
        priority_score,
        freshness_days,
        is_local,
      };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}
