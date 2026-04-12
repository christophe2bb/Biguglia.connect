/**
 * jobs/scoring/readiness.ts
 *
 * Évalue la prêt-à-publier d'une offre ou demande d'emploi.
 * Retourne des blocages, avertissements et suggestions de qualité.
 */

import type { JobOfferFormInput, JobDemandFormInput, PublicationReadiness } from '@/types/jobs';
import { VALIDATION_RULES } from '@/types/jobs/constants';
import { calculateJobOfferCompleteness, calculateJobDemandCompleteness } from './completeness';

// ─── Offer readiness ──────────────────────────────────────────────────────────

/**
 * Evaluate if a job offer is ready to be published.
 * Returns blocking issues, warnings, and suggestions.
 */
export function evaluateJobOfferReadiness(
  offer: JobOfferFormInput
): PublicationReadiness {
  const blocking_issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const completeness_score = calculateJobOfferCompleteness(offer);

  // ── Blocking issues (prevent publication) ───────────────────────────────────
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

  if (offer.application_mode === 'email' && !offer.contact_email) {
    blocking_issues.push(
      'Un email de contact est requis pour le mode de candidature choisi'
    );
  }

  if (offer.application_mode === 'phone' && !offer.contact_phone) {
    blocking_issues.push(
      'Un numéro de téléphone est requis pour le mode de candidature choisi'
    );
  }

  if (offer.application_mode === 'mixed') {
    const methodCount = [
      offer.contact_email,
      offer.contact_phone,
      offer.application_url,
    ].filter(Boolean).length;
    if (methodCount < 2) {
      blocking_issues.push(
        'Le mode "Plusieurs moyens" requiert au moins 2 méthodes de contact'
      );
    }
  }

  // ── Warnings (recommended but not blocking) ──────────────────────────────────
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
      "Aucune description détaillée : ajoutez plus d'informations pour attirer les meilleurs candidats"
    );
  }

  if (!offer.experience_level) {
    warnings.push(
      "Niveau d'expérience non précisé : cela aide à cibler les bons profils"
    );
  }

  if (completeness_score < 70) {
    warnings.push(
      `Complétude ${completeness_score}% : les annonces complètes sont 2x plus visibles`
    );
  }

  // ── Suggestions (optional improvements) ─────────────────────────────────────
  if (!offer.required_skills || offer.required_skills.length === 0) {
    suggestions.push(
      'Ajoutez les compétences requises pour améliorer le matching avec les candidats'
    );
  }

  if (!offer.tags || offer.tags.length === 0) {
    suggestions.push("Ajoutez des tags pour améliorer la recherche de votre annonce");
  }

  if (!offer.weekly_hours && !offer.schedule_details) {
    suggestions.push(
      "Précisez les horaires (nombre d'heures, amplitude) pour plus de transparence"
    );
  }

  if (offer.provides_housing && !offer.housing_details) {
    suggestions.push("Détaillez l'hébergement proposé pour valoriser cet avantage");
  }

  return {
    canPublish: blocking_issues.length === 0,
    completeness_score,
    blocking_issues,
    warnings,
    suggestions,
  };
}

// ─── Demand readiness ─────────────────────────────────────────────────────────

/**
 * Evaluate if a job demand is ready to be published.
 */
export function evaluateJobDemandReadiness(
  demand: JobDemandFormInput
): PublicationReadiness {
  const blocking_issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const completeness_score = calculateJobDemandCompleteness(demand);

  // ── Blocking issues ──────────────────────────────────────────────────────────
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

  // ── Warnings ─────────────────────────────────────────────────────────────────
  if (!demand.cv_url && !demand.portfolio_url) {
    warnings.push(
      "Aucun CV ni portfolio : ajoutez-en un pour augmenter vos chances (5x plus de réponses)"
    );
  }

  if (!demand.salary_expectation_min && !demand.salary_expectation_max) {
    warnings.push(
      "Salaire attendu non précisé : cela aide les recruteurs à vous proposer des offres adaptées"
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

  // ── Suggestions ───────────────────────────────────────────────────────────────
  if (!demand.skills || demand.skills.length === 0) {
    suggestions.push('Listez vos compétences pour améliorer le matching');
  }

  if (!demand.experience_level) {
    suggestions.push("Précisez votre niveau d'expérience");
  }

  if (!demand.mobility_radius && !demand.mobility_mode) {
    suggestions.push(
      'Indiquez votre rayon de mobilité pour recevoir des offres pertinentes'
    );
  }

  return {
    canPublish: blocking_issues.length === 0,
    completeness_score,
    blocking_issues,
    warnings,
    suggestions,
  };
}
