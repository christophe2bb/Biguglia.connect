/**
 * jobs/publish/index.ts
 *
 * Point d'entrée public du module de publication emploi.
 *
 * Sous-modules :
 *   offer  — publication d'une offre d'emploi
 *   demand — publication d'une demande d'emploi
 *   shared — utilitaires partagés (generateSlug, expiryDate)
 */

export { publishJobOffer } from './offer';
export type { PublishOfferInput, PublishOfferResult } from './offer';

export { publishJobDemand } from './demand';
export type { PublishDemandInput, PublishDemandResult } from './demand';

export { generateSlug, expiryDate } from './shared';
