/**
 * @deprecated
 * Ce fichier est un point d'entrée retro-compatible.
 * Importez directement depuis '@/services/jobs/home-mappers'.
 *
 * @example
 *   import { jobOffersToHomeFeedItems }     from '@/services/jobs/home-mappers';
 *   import { filterJobOffersForHomeFeed }   from '@/services/jobs/home-mappers';
 *   import { getJobOfferBadges }            from '@/services/jobs/home-mappers';
 */

export {
  jobOffersToHomeFeedItems,
  jobDemandsToHomeFeedItems,
  filterJobOffersForHomeFeed,
  filterJobDemandsForHomeFeed,
  getJobOfferBadges,
  getJobDemandBadges,
} from './home-mappers/index';

export type {
  OfferFeedFilterOptions,
  DemandFeedFilterOptions,
} from './home-mappers/filters';
