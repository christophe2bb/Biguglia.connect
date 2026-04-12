/**
 * services/jobs/queries.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Point d'entrée rétro-compatible — re-exporte depuis les modules découpés.
 *
 * Ce fichier existe uniquement pour ne pas casser les imports existants
 * (src/app/page.tsx, src/app/emploi/…). Les nouveaux modules doivent importer
 * directement depuis '@/services/jobs/queries/<domaine>'.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * @deprecated Préférer les imports directs :
 *   import { getJobOffers }      from '@/services/jobs/queries/offers';
 *   import { getJobDemands }     from '@/services/jobs/queries/demands';
 *   import { checkJobOwnership } from '@/services/jobs/queries/ownership';
 */

export {
  getJobOffers,
  getJobOfferBySlug,
  getRecentJobOffers,
  getJobDemands,
  getJobDemandBySlug,
  getRecentJobDemands,
  checkJobOwnership,
} from './queries/index';
