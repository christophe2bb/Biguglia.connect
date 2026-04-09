/**
 * Module Emploi Local - Service de Scoring
 * Version 1.1 - 2026-04-09
 * 
 * Calcule les scores de complétude, pertinence et fraîcheur
 * Basé sur les poids définis dans constants.ts
 */

import type {
  JobOffer,
  JobDemand,
  JobOfferFormInput,
  JobDemandFormInput,
  PublicationReadiness,
} from '@/types/jobs';
import { SCORING_WEIGHTS, VALIDATION_RULES } from '@/types/jobs/constants';

// ============================================================================
// COMPLETENESS SCORING (persisted in DB)
// ============================================================================

/**
 * Calculate completeness score for a job offer (0-100)
 * This score is persisted in the database
 */
export function calculateJobOfferCompleteness(
  offer: Partial<JobOffer> | JobOfferFormInput
): number {
  let score = 0;

  // Contract type (15 points)
  if (offer.contract_type) {
    score += SCORING_WEIGHTS.HAS_CONTRACT_TYPE;
  }

  // Location (10 points)
  if (offer.location_label && offer.location_label.length >= VALIDATION_RULES.LOCATION_MIN_LENGTH) {
    score += SCORING_WEIGHTS.HAS_LOCATION;
  }

  // Start date (5 points)
  if (offer.start_date) {
    score += SCORING_WEIGHTS.HAS_START_DATE;
  }

  // End date for temporary contracts (5 points)
  if (
    ['cdd', 'saisonnier', 'mission', 'extra', 'remplacement', 'stage', 'interim'].includes(
      offer.contract_type || ''
    )
  ) {
    if (offer.end_date || offer.mission_duration_days) {
      score += SCORING_WEIGHTS.HAS_END_DATE;
    }
  } else {
    // Not applicable for CDI, alternance, freelance
    score += SCORING_WEIGHTS.HAS_END_DATE;
  }

  // Salary range (15 points)
  if (offer.salary_range_min || offer.salary_range_max) {
    score += SCORING_WEIGHTS.HAS_SALARY_RANGE;
  }

  // Schedule details (10 points)
  if (offer.weekly_hours || offer.schedule_details) {
    score += SCORING_WEIGHTS.HAS_SCHEDULE_DETAILS;
  }

  // Full description (15 points)
  if (
    offer.full_description &&
    offer.full_description.length >= VALIDATION_RULES.FULL_DESC_MIN_LENGTH
  ) {
    score += SCORING_WEIGHTS.HAS_FULL_DESCRIPTION;
  }

  // Contact info (15 points)
  if (offer.contact_email || offer.contact_phone || offer.application_url) {
    score += SCORING_WEIGHTS.HAS_CONTACT_INFO;
  }

  // Experience level (5 points)
  if (offer.experience_level) {
    score += SCORING_WEIGHTS.HAS_EXPERIENCE_LEVEL;
  }

  // Required skills (5 points)
  if (offer.required_skills && offer.required_skills.length > 0) {
    score += SCORING_WEIGHTS.HAS_REQUIRED_SKILLS;
  }

  return Math.min(score, 100);
}

/**
 * Calculate completeness score for a job demand (0-100)
 */
export function calculateJobDemandCompleteness(
  demand: Partial<JobDemand> | JobDemandFormInput
): number {
  let score = 0;

  // Desired contract types (15 points)
  if (demand.desired_contract_types && demand.desired_contract_types.length > 0) {
    score += SCORING_WEIGHTS.HAS_CONTRACT_TYPE;
  }

  // Location (10 points)
  if (
    demand.location_label &&
    demand.location_label.length >= VALIDATION_RULES.LOCATION_MIN_LENGTH
  ) {
    score += SCORING_WEIGHTS.HAS_LOCATION;
  }

  // Availability (10 points)
  if (demand.available_from || demand.availability_type === 'immediate') {
    score += SCORING_WEIGHTS.HAS_START_DATE + SCORING_WEIGHTS.HAS_END_DATE;
  }

  // Salary expectation (15 points)
  if (demand.salary_expectation_min || demand.salary_expectation_max) {
    score += SCORING_WEIGHTS.HAS_SALARY_RANGE;
  }

  // Schedule (10 points)
  if (demand.weekly_hours_desired) {
    score += SCORING_WEIGHTS.HAS_SCHEDULE_DETAILS;
  }

  // Full description (15 points)
  if (
    demand.full_description &&
    demand.full_description.length >= VALIDATION_RULES.FULL_DESC_MIN_LENGTH
  ) {
    score += SCORING_WEIGHTS.HAS_FULL_DESCRIPTION;
  }

  // CV or portfolio (15 points)
  if (demand.cv_url || demand.portfolio_url) {
    score += SCORING_WEIGHTS.HAS_CONTACT_INFO;
  }

  // Experience level (5 points)
  if (demand.experience_level) {
    score += SCORING_WEIGHTS.HAS_EXPERIENCE_LEVEL;
  }

  // Skills (5 points)
  if (demand.skills && demand.skills.length > 0) {
    score += SCORING_WEIGHTS.HAS_REQUIRED_SKILLS;
  }

  return Math.min(score, 100);
}

// ============================================================================
// FRESHNESS SCORING (calculated dynamically, not persisted)
// ============================================================================

/**
 * Calculate freshness score based on publication date (0-100)
 * Score decreases by 2 points per day after 7 days
 */
export function calculateFreshnessScore(publishedAt: Date | string): number {
  const published = typeof publishedAt === 'string' ? new Date(publishedAt) : publishedAt;
  const now = new Date();
  const daysSincePublished = Math.floor(
    (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSincePublished <= SCORING_WEIGHTS.FRESHNESS_DAYS_THRESHOLD) {
    return 100; // Fresh within 7 days
  }

  const daysOverThreshold = daysSincePublished - SCORING_WEIGHTS.FRESHNESS_DAYS_THRESHOLD;
  const penalty = daysOverThreshold * SCORING_WEIGHTS.FRESHNESS_DECAY_PER_DAY;
  const score = 100 - penalty;

  return Math.max(score, 0);
}

// ============================================================================
// RELEVANCE SCORING (calculated dynamically based on matching)
// ============================================================================

/**
 * Calculate relevance score between an offer and a demand (0-100)
 * Used for matching and recommendations
 */
export function calculateRelevanceScore(
  offer: JobOffer,
  demand: JobDemand
): number {
  let score = 0;

  // Contract type matching (30 points for exact, 20 for compatible)
  const hasExactContractMatch = demand.desired_contract_types.includes(offer.contract_type);
  if (hasExactContractMatch) {
    score += SCORING_WEIGHTS.EXACT_CONTRACT_MATCH;
  } else {
    // Check compatible contracts
    const compatiblePairs: Record<string, string[]> = {
      cdd: ['cdi'],
      stage: ['alternance'],
      alternance: ['stage'],
      mission: ['extra', 'remplacement'],
      extra: ['mission', 'remplacement'],
      remplacement: ['mission', 'extra'],
    };
    const isCompatible = compatiblePairs[offer.contract_type]?.some((c) =>
      demand.desired_contract_types.includes(c as any)
    );
    if (isCompatible) {
      score += SCORING_WEIGHTS.COMPATIBLE_CONTRACT;
    }
  }

  // Proximity matching (25 points)
  if (offer.sector_id && demand.sector_id) {
    if (offer.sector_id === demand.sector_id) {
      score += SCORING_WEIGHTS.PROXIMITY_MATCH;
    } else if (
      offer.location_lat &&
      offer.location_lng &&
      demand.location_lat &&
      demand.location_lng &&
      demand.mobility_radius
    ) {
      const distance = calculateDistance(
        offer.location_lat,
        offer.location_lng,
        demand.location_lat,
        demand.location_lng
      );
      if (distance <= demand.mobility_radius) {
        score += SCORING_WEIGHTS.PROXIMITY_MATCH * 0.7; // Partial points
      }
    }
  }

  // Availability matching (15 points)
  if (offer.start_date && demand.available_from) {
    const offerStart = new Date(offer.start_date);
    const demandAvailable = new Date(demand.available_from);
    const daysDiff = Math.abs(
      (offerStart.getTime() - demandAvailable.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 30) {
      score += SCORING_WEIGHTS.AVAILABILITY_MATCH;
    } else if (daysDiff <= 60) {
      score += SCORING_WEIGHTS.AVAILABILITY_MATCH * 0.5;
    }
  }

  // Category matching (10 points)
  if (offer.job_category === demand.job_category) {
    score += SCORING_WEIGHTS.CATEGORY_MATCH;
  }

  // Experience matching (10 points)
  if (offer.experience_level && demand.experience_level) {
    const expLevels = ['debutant', 'junior', 'confirme', 'senior', 'expert'];
    const offerLevel = expLevels.indexOf(offer.experience_level);
    const demandLevel = expLevels.indexOf(demand.experience_level);
    const levelDiff = Math.abs(offerLevel - demandLevel);
    if (levelDiff === 0) {
      score += SCORING_WEIGHTS.EXPERIENCE_MATCH;
    } else if (levelDiff === 1) {
      score += SCORING_WEIGHTS.EXPERIENCE_MATCH * 0.5;
    }
  }

  // Freshness bonus (5 points)
  if (offer.published_at) {
    const daysSincePublished = Math.floor(
      (new Date().getTime() - new Date(offer.published_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSincePublished <= 3) {
      score += SCORING_WEIGHTS.FRESHNESS_BONUS;
    }
  }

  return Math.min(score, 100);
}

// ============================================================================
// QUALITY GATE (publication readiness check)
// ============================================================================

/**
 * Evaluate if a job offer is ready to be published
 * Returns blocking issues, warnings, and suggestions
 */
export function evaluateJobOfferReadiness(
  offer: JobOfferFormInput
): PublicationReadiness {
  const blocking_issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Calculate completeness
  const completeness_score = calculateJobOfferCompleteness(offer);

  // BLOCKING ISSUES (prevent publication)
  if (!offer.title || offer.title.length < VALIDATION_RULES.TITLE_MIN_LENGTH) {
    blocking_issues.push(
      `Le titre doit contenir au moins ${VALIDATION_RULES.TITLE_MIN_LENGTH} caractères`
    );
  }

  if (
    !offer.short_description ||
    offer.short_description.length < VALIDATION_RULES.SHORT_DESC_MIN_LENGTH
  ) {
    blocking_issues.push(
      `La description courte doit contenir au moins ${VALIDATION_RULES.SHORT_DESC_MIN_LENGTH} caractères`
    );
  }

  if (!offer.location_label) {
    blocking_issues.push('Le lieu est obligatoire');
  }

  if (!offer.contract_type) {
    blocking_issues.push('Le type de contrat est obligatoire');
  }

  // Contact info validation
  if (offer.application_mode === 'email' && !offer.contact_email) {
    blocking_issues.push('Un email de contact est requis pour le mode de candidature choisi');
  }

  if (offer.application_mode === 'phone' && !offer.contact_phone) {
    blocking_issues.push(
      'Un numéro de téléphone est requis pour le mode de candidature choisi'
    );
  }

  if (offer.application_mode === 'mixed') {
    const methods = [offer.contact_email, offer.contact_phone, offer.application_url].filter(
      Boolean
    );
    if (methods.length < 2) {
      blocking_issues.push(
        'Le mode "Plusieurs moyens" requiert au moins 2 méthodes de contact'
      );
    }
  }

  // WARNINGS (should be fixed but not blocking)
  if (!offer.salary_range_min && !offer.salary_range_max) {
    warnings.push(
      'Aucun salaire indiqué : les annonces avec salaire reçoivent 3x plus de candidatures'
    );
  }

  if (
    !offer.full_description ||
    offer.full_description.length < VALIDATION_RULES.FULL_DESC_MIN_LENGTH
  ) {
    warnings.push(
      'Aucune description détaillée : ajoutez plus d\'informations pour attirer les meilleurs candidats'
    );
  }

  if (!offer.experience_level) {
    warnings.push('Niveau d\'expérience non précisé : cela aide à cibler les bons profils');
  }

  if (completeness_score < 70) {
    warnings.push(
      `Complétude ${completeness_score}% : les annonces complètes sont 2x plus visibles`
    );
  }

  // SUGGESTIONS (for better visibility)
  if (!offer.required_skills || offer.required_skills.length === 0) {
    suggestions.push(
      'Ajoutez les compétences requises pour améliorer le matching avec les candidats'
    );
  }

  if (!offer.tags || offer.tags.length === 0) {
    suggestions.push('Ajoutez des tags pour améliorer la recherche de votre annonce');
  }

  if (!offer.weekly_hours && !offer.schedule_details) {
    suggestions.push(
      'Précisez les horaires (nombre d\'heures, amplitude) pour plus de transparence'
    );
  }

  if (offer.provides_housing || offer.provides_meals) {
    if (!offer.housing_details && offer.provides_housing) {
      suggestions.push('Détaillez l\'hébergement proposé pour valoriser cet avantage');
    }
  }

  return {
    canPublish: blocking_issues.length === 0,
    completeness_score,
    blocking_issues,
    warnings,
    suggestions,
  };
}

/**
 * Evaluate if a job demand is ready to be published
 */
export function evaluateJobDemandReadiness(
  demand: JobDemandFormInput
): PublicationReadiness {
  const blocking_issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const completeness_score = calculateJobDemandCompleteness(demand);

  // BLOCKING ISSUES
  if (!demand.title || demand.title.length < VALIDATION_RULES.TITLE_MIN_LENGTH) {
    blocking_issues.push(
      `Le titre doit contenir au moins ${VALIDATION_RULES.TITLE_MIN_LENGTH} caractères`
    );
  }

  if (
    !demand.short_description ||
    demand.short_description.length < VALIDATION_RULES.SHORT_DESC_MIN_LENGTH
  ) {
    blocking_issues.push(
      `La description courte doit contenir au moins ${VALIDATION_RULES.SHORT_DESC_MIN_LENGTH} caractères`
    );
  }

  if (!demand.location_label) {
    blocking_issues.push('Le lieu est obligatoire');
  }

  if (!demand.desired_contract_types || demand.desired_contract_types.length === 0) {
    blocking_issues.push('Vous devez sélectionner au moins un type de contrat recherché');
  }

  // WARNINGS
  if (!demand.cv_url && !demand.portfolio_url) {
    warnings.push(
      'Aucun CV ni portfolio : ajoutez-en un pour augmenter vos chances (5x plus de réponses)'
    );
  }

  if (!demand.salary_expectation_min && !demand.salary_expectation_max) {
    warnings.push(
      'Salaire attendu non précisé : cela aide les recruteurs à vous proposer des offres adaptées'
    );
  }

  if (
    !demand.full_description ||
    demand.full_description.length < VALIDATION_RULES.FULL_DESC_MIN_LENGTH
  ) {
    warnings.push('Ajoutez une description détaillée de votre parcours et motivations');
  }

  if (completeness_score < 70) {
    warnings.push(
      `Complétude ${completeness_score}% : les profils complets sont 3x plus consultés`
    );
  }

  // SUGGESTIONS
  if (!demand.skills || demand.skills.length === 0) {
    suggestions.push('Listez vos compétences pour améliorer le matching');
  }

  if (!demand.experience_level) {
    suggestions.push('Précisez votre niveau d\'expérience');
  }

  if (!demand.mobility_radius && !demand.mobility_mode) {
    suggestions.push('Indiquez votre rayon de mobilité pour recevoir des offres pertinentes');
  }

  return {
    canPublish: blocking_issues.length === 0,
    completeness_score,
    blocking_issues,
    warnings,
    suggestions,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate distance between two lat/lng points (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
