/**
 * trust/index.ts — Point d'entrée public du moteur de confiance
 *
 * Re-exporte tout depuis les sous-modules afin que les imports existants
 * `from '@/lib/trust'` continuent de fonctionner sans modification.
 *
 * Sous-modules :
 *   _types        – types & interfaces (InteractionSourceType, BadgeCode, Review, …)
 *   _themes       – THEME_CONFIG, ThemeConfig
 *   _badges       – BADGE_CONFIG
 *   _scoring      – computeUnifiedTrustScore, TrustScoreResult, niveaux
 *   _interactions – getOrCreateInteraction, updateInteractionStatus
 *   _reviews      – submitReview, fetchPublicReviews, canLeaveReview
 *   _queries      – fetchTrustStats, fetchProfileBadges, awardAutomaticBadges
 */

export type {
  InteractionSourceType,
  InteractionStatus,
  InteractionType,
  BadgeCode,
  TrustInteraction,
  Review,
  TrustProfileStats,
  ProfileBadge,
} from './_types';

export type { ThemeConfig }      from './_themes';
export { THEME_CONFIG }          from './_themes';

export { BADGE_CONFIG }          from './_badges';

export type { TrustScoreResult } from './_scoring';
export { computeUnifiedTrustScore } from './_scoring';

export {
  getOrCreateInteraction,
  updateInteractionStatus,
} from './_interactions';

export {
  submitReview,
  fetchPublicReviews,
  canLeaveReview,
} from './_reviews';

export {
  fetchTrustStats,
  fetchProfileBadges,
  awardAutomaticBadges,
} from './_queries';
