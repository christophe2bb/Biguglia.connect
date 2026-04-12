/**
 * jobs/scoring/relevance.ts
 *
 * Calcule le score de pertinence entre une offre et une demande d'emploi.
 * Score calculé dynamiquement pour le matching — non persisté.
 */

import type { JobOffer, JobDemand } from '@/types/jobs';
import type { ContractType } from '@/types/jobs/constants';
import { SCORING_WEIGHTS } from '@/types/jobs/constants';

// ─── Geography helper ─────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine formula — returns distance in kilometres.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Contract compatibility map ───────────────────────────────────────────────

const COMPATIBLE_CONTRACTS: Partial<Record<ContractType, ContractType[]>> = {
  cdd: ['cdi'],
  stage: ['alternance'],
  alternance: ['stage'],
  mission: ['extra', 'remplacement'],
  extra: ['mission', 'remplacement'],
  remplacement: ['mission', 'extra'],
};

const EXPERIENCE_LEVELS = [
  'debutant',
  'junior',
  'confirme',
  'senior',
  'expert',
] as const;

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Calculate relevance score between an offer and a demand (0-100).
 * Used for matching and recommendations.
 */
export function calculateRelevanceScore(offer: JobOffer, demand: JobDemand): number {
  let score = 0;

  // Contract type matching (30 pts exact, 20 pts compatible)
  if (demand.desired_contract_types.includes(offer.contract_type)) {
    score += SCORING_WEIGHTS.EXACT_CONTRACT_MATCH;
  } else {
    const compatible = COMPATIBLE_CONTRACTS[offer.contract_type] ?? [];
    const isCompatible = compatible.some((c) =>
      demand.desired_contract_types.includes(c)
    );
    if (isCompatible) score += SCORING_WEIGHTS.COMPATIBLE_CONTRACT;
  }

  // Sector / proximity matching (25 pts)
  if (offer.sector_id && demand.sector_id) {
    if (offer.sector_id === demand.sector_id) {
      score += SCORING_WEIGHTS.PROXIMITY_MATCH;
    } else if (
      offer.location_lat != null &&
      offer.location_lng != null &&
      demand.location_lat != null &&
      demand.location_lng != null &&
      demand.mobility_radius
    ) {
      const distance = calculateDistance(
        offer.location_lat,
        offer.location_lng,
        demand.location_lat,
        demand.location_lng
      );
      if (distance <= demand.mobility_radius) {
        score += SCORING_WEIGHTS.PROXIMITY_MATCH * 0.7;
      }
    }
  }

  // Availability matching (15 pts)
  if (offer.start_date && demand.available_from) {
    const daysDiff =
      Math.abs(
        new Date(offer.start_date).getTime() -
          new Date(demand.available_from).getTime()
      ) /
      (1000 * 60 * 60 * 24);

    if (daysDiff <= 30) {
      score += SCORING_WEIGHTS.AVAILABILITY_MATCH;
    } else if (daysDiff <= 60) {
      score += SCORING_WEIGHTS.AVAILABILITY_MATCH * 0.5;
    }
  }

  // Category matching (10 pts)
  if (offer.job_category === demand.job_category) {
    score += SCORING_WEIGHTS.CATEGORY_MATCH;
  }

  // Experience matching (10 pts)
  if (offer.experience_level && demand.experience_level) {
    const offerIdx = EXPERIENCE_LEVELS.indexOf(offer.experience_level);
    const demandIdx = EXPERIENCE_LEVELS.indexOf(demand.experience_level);
    const diff = Math.abs(offerIdx - demandIdx);
    if (diff === 0) score += SCORING_WEIGHTS.EXPERIENCE_MATCH;
    else if (diff === 1) score += SCORING_WEIGHTS.EXPERIENCE_MATCH * 0.5;
  }

  // Freshness bonus (5 pts — offer published in the last 3 days)
  if (offer.published_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(offer.published_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 3) score += SCORING_WEIGHTS.FRESHNESS_BONUS;
  }

  return Math.min(score, 100);
}
