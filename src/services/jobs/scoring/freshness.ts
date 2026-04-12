/**
 * jobs/scoring/freshness.ts
 *
 * Calcule le score de fraîcheur d'une annonce en fonction de sa date de publication.
 * Score calculé dynamiquement (non persisté en base).
 */

import { SCORING_WEIGHTS } from '@/types/jobs/constants';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculate freshness score based on publication date (0-100).
 * - Score = 100 for the first FRESHNESS_DAYS_THRESHOLD days.
 * - Then decreases by FRESHNESS_DECAY_PER_DAY per additional day.
 */
export function calculateFreshnessScore(publishedAt: Date | string): number {
  const published =
    typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt;
  const daysSince = Math.floor((Date.now() - published.getTime()) / MS_PER_DAY);

  if (daysSince <= SCORING_WEIGHTS.FRESHNESS_DAYS_THRESHOLD) return 100;

  const daysOver = daysSince - SCORING_WEIGHTS.FRESHNESS_DAYS_THRESHOLD;
  return Math.max(100 - daysOver * SCORING_WEIGHTS.FRESHNESS_DECAY_PER_DAY, 0);
}

/**
 * Calculate the number of days since publication.
 * Returns 999 when publishedAt is not provided.
 */
export function daysSincePublication(publishedAt?: string | null): number {
  if (!publishedAt) return 999;
  return Math.floor((Date.now() - new Date(publishedAt).getTime()) / MS_PER_DAY);
}
