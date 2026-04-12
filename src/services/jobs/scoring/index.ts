/**
 * jobs/scoring/index.ts
 *
 * Point d'entrée public du module de scoring emploi.
 *
 * Sous-modules disponibles :
 *   completeness — scores de complétude (persistés en DB)
 *   freshness    — score de fraîcheur (calculé dynamiquement)
 *   relevance    — score de pertinence offre ↔ demande (calculé dynamiquement)
 *   readiness    — évaluation prêt-à-publier (blocages, warnings, suggestions)
 */

export {
  calculateJobOfferCompleteness,
  calculateJobDemandCompleteness,
} from './completeness';

export {
  calculateFreshnessScore,
  daysSincePublication,
} from './freshness';

export { calculateRelevanceScore } from './relevance';

export {
  evaluateJobOfferReadiness,
  evaluateJobDemandReadiness,
} from './readiness';
