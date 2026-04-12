/**
 * @deprecated
 * Ce fichier est un point d'entrée retro-compatible.
 * Importez directement depuis '@/services/jobs/scoring'.
 *
 * @example
 *   import { calculateJobOfferCompleteness } from '@/services/jobs/scoring';
 *   import { calculateFreshnessScore }        from '@/services/jobs/scoring';
 *   import { calculateRelevanceScore }         from '@/services/jobs/scoring';
 *   import { evaluateJobOfferReadiness }       from '@/services/jobs/scoring';
 */

export {
  calculateJobOfferCompleteness,
  calculateJobDemandCompleteness,
  calculateFreshnessScore,
  daysSincePublication,
  calculateRelevanceScore,
  evaluateJobOfferReadiness,
  evaluateJobDemandReadiness,
} from './scoring/index';
