/**
 * jobs/scoring/completeness.ts
 *
 * Calcule les scores de complétude pour les offres et demandes d'emploi.
 * Ces scores sont persistés en base lors de la publication.
 */

import type { JobOffer, JobDemand, JobOfferFormInput, JobDemandFormInput } from '@/types/jobs';
import { SCORING_WEIGHTS, VALIDATION_RULES } from '@/types/jobs/constants';

// ─── Temporary contract types that require an end date ────────────────────────
const FIXED_TERM_CONTRACTS = [
  'cdd',
  'saisonnier',
  'mission',
  'extra',
  'remplacement',
  'stage',
  'interim',
] as const;

/**
 * Calculate completeness score for a job offer (0-100).
 * This score is persisted in the database at publish time.
 */
export function calculateJobOfferCompleteness(
  offer: Partial<JobOffer> | JobOfferFormInput
): number {
  let score = 0;

  // Contract type (15 pts)
  if (offer.contract_type) score += SCORING_WEIGHTS.HAS_CONTRACT_TYPE;

  // Location (10 pts)
  if (
    offer.location_label &&
    offer.location_label.length >= VALIDATION_RULES.LOCATION_MIN_LENGTH
  ) {
    score += SCORING_WEIGHTS.HAS_LOCATION;
  }

  // Start date (5 pts)
  if (offer.start_date) score += SCORING_WEIGHTS.HAS_START_DATE;

  // End date — required only for fixed-term contracts (5 pts)
  const isFixedTerm = FIXED_TERM_CONTRACTS.includes(
    (offer.contract_type ?? '') as (typeof FIXED_TERM_CONTRACTS)[number]
  );
  if (isFixedTerm) {
    if (offer.end_date || (offer as Partial<JobOffer>).mission_duration_days) {
      score += SCORING_WEIGHTS.HAS_END_DATE;
    }
  } else {
    // Not applicable for CDI, alternance, freelance — award full points
    score += SCORING_WEIGHTS.HAS_END_DATE;
  }

  // Salary range (15 pts)
  if (offer.salary_range_min || offer.salary_range_max) {
    score += SCORING_WEIGHTS.HAS_SALARY_RANGE;
  }

  // Schedule details (10 pts)
  if (offer.weekly_hours || offer.schedule_details) {
    score += SCORING_WEIGHTS.HAS_SCHEDULE_DETAILS;
  }

  // Full description (15 pts)
  if (
    offer.full_description &&
    offer.full_description.length >= VALIDATION_RULES.FULL_DESC_MIN_LENGTH
  ) {
    score += SCORING_WEIGHTS.HAS_FULL_DESCRIPTION;
  }

  // Contact info (15 pts)
  if (
    (offer as Partial<JobOffer>).contact_email ||
    (offer as Partial<JobOffer>).contact_phone ||
    (offer as Partial<JobOffer>).application_url
  ) {
    score += SCORING_WEIGHTS.HAS_CONTACT_INFO;
  }

  // Experience level (5 pts)
  if (offer.experience_level) score += SCORING_WEIGHTS.HAS_EXPERIENCE_LEVEL;

  // Required skills (5 pts)
  if (
    (offer as Partial<JobOffer>).required_skills &&
    ((offer as Partial<JobOffer>).required_skills?.length ?? 0) > 0
  ) {
    score += SCORING_WEIGHTS.HAS_REQUIRED_SKILLS;
  }

  return Math.min(score, 100);
}

/**
 * Calculate completeness score for a job demand (0-100).
 * This score is persisted in the database at publish time.
 */
export function calculateJobDemandCompleteness(
  demand: Partial<JobDemand> | JobDemandFormInput
): number {
  let score = 0;

  // Desired contract types (15 pts)
  const contractTypes =
    (demand as Partial<JobDemand>).desired_contract_types ??
    (demand as JobDemandFormInput).desired_contract_types;
  if (contractTypes && contractTypes.length > 0) {
    score += SCORING_WEIGHTS.HAS_CONTRACT_TYPE;
  }

  // Location (10 pts)
  if (
    demand.location_label &&
    demand.location_label.length >= VALIDATION_RULES.LOCATION_MIN_LENGTH
  ) {
    score += SCORING_WEIGHTS.HAS_LOCATION;
  }

  // Availability (10 pts = HAS_START_DATE + HAS_END_DATE)
  if (
    (demand as Partial<JobDemand>).available_from ||
    demand.availability_type === 'immediate'
  ) {
    score += SCORING_WEIGHTS.HAS_START_DATE + SCORING_WEIGHTS.HAS_END_DATE;
  }

  // Salary expectation (15 pts)
  if (
    (demand as Partial<JobDemand>).salary_expectation_min ||
    (demand as Partial<JobDemand>).salary_expectation_max
  ) {
    score += SCORING_WEIGHTS.HAS_SALARY_RANGE;
  }

  // Schedule (10 pts)
  if ((demand as Partial<JobDemand>).weekly_hours_desired) {
    score += SCORING_WEIGHTS.HAS_SCHEDULE_DETAILS;
  }

  // Full description (15 pts)
  if (
    demand.full_description &&
    demand.full_description.length >= VALIDATION_RULES.FULL_DESC_MIN_LENGTH
  ) {
    score += SCORING_WEIGHTS.HAS_FULL_DESCRIPTION;
  }

  // CV or portfolio (15 pts)
  if (
    (demand as Partial<JobDemand>).cv_url ||
    (demand as Partial<JobDemand>).portfolio_url
  ) {
    score += SCORING_WEIGHTS.HAS_CONTACT_INFO;
  }

  // Experience level (5 pts)
  if (demand.experience_level) score += SCORING_WEIGHTS.HAS_EXPERIENCE_LEVEL;

  // Skills (5 pts)
  const skills =
    (demand as Partial<JobDemand>).skills ?? (demand as JobDemandFormInput).skills;
  if (skills && skills.length > 0) {
    score += SCORING_WEIGHTS.HAS_REQUIRED_SKILLS;
  }

  return Math.min(score, 100);
}
