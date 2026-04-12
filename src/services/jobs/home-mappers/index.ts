/**
 * jobs/home-mappers/index.ts
 *
 * Point d'entrée public du module home-mappers emploi.
 *
 * Sous-modules :
 *   mappers  — conversion offre/demande → HomeFeedItem avec score de priorité
 *   filters  — filtrage des items selon critères de qualité
 *   badges   — génération des badges dynamiques
 */

export {
  jobOffersToHomeFeedItems,
  jobDemandsToHomeFeedItems,
} from './mappers';

export {
  filterJobOffersForHomeFeed,
  filterJobDemandsForHomeFeed,
} from './filters';

export type { OfferFeedFilterOptions, DemandFeedFilterOptions } from './filters';

export { getJobOfferBadges, getJobDemandBadges } from './badges';
