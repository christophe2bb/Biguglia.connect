/**
 * services/jobs/queries/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Point d'entrée unique du sous-module queries.
 * Re-exporte toutes les fonctions publiques des quatre domaines.
 *
 * Import recommandé :
 *   import { getJobOffers, getJobDemandBySlug, checkJobOwnership }
 *     from '@/services/jobs/queries';
 */

// Offres
export {
  getJobOffers,
  getJobOfferBySlug,
  getRecentJobOffers,
  type GetJobOffersResult,
} from './offers';

// Demandes
export {
  getJobDemands,
  getJobDemandBySlug,
  getRecentJobDemands,
  type GetJobDemandsResult,
} from './demands';

// Appartenance
export {
  checkJobOwnership,
  type JobTable,
} from './ownership';

// Utilitaires partagés (exposés pour les tests et les modules avancés)
export {
  isMissingTableError,
  isNotFoundError,
  asDbError,
  toAuthorProfile,
  toJobOffer,
  toJobDemand,
  buildPagination,
  type DbError,
  type PaginationParams,
  type JobOfferRow,
  type JobDemandRow,
  type AuthorJoinRow,
  type JobOfferRowWithAuthor,
  type JobDemandRowWithAuthor,
} from './shared';
