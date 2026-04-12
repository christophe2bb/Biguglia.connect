/**
 * jobs/home-mappers/badges.ts
 *
 * Génère les badges dynamiques affichés sur les annonces du fil d'accueil.
 */

import type { JobOffer, JobDemand } from '@/types/jobs';

/**
 * Get display badges for a job offer.
 */
export function getJobOfferBadges(offer: JobOffer): string[] {
  const badges: string[] = [];

  if (offer.is_urgent)                                           badges.push('🔥 Urgent');
  if (offer.contract_type === 'saisonnier')                     badges.push('☀️ Saisonnier');
  if (offer.provides_housing)                                   badges.push('🏠 Logement');
  if (offer.contract_type === 'remplacement')                   badges.push('⚡ Remplacement');
  if (offer.provides_meals)                                     badges.push('🍽️ Repas');
  if (offer.is_remote_possible)                                 badges.push('💻 Télétravail');
  if (
    offer.visibility_level === 'featured' ||
    offer.visibility_level === 'premium'
  ) {
    badges.push('⭐ Mise en avant');
  }

  return badges;
}

/**
 * Get display badges for a job demand.
 */
export function getJobDemandBadges(demand: JobDemand): string[] {
  const badges: string[] = [];

  if (demand.is_urgent)                                         badges.push('🔥 Disponible rapidement');
  if (demand.cv_url)                                            badges.push('📄 CV disponible');
  if (demand.has_driving_license && demand.has_vehicle)         badges.push('🚗 Permis + Véhicule');
  else if (demand.has_driving_license)                          badges.push('🪪 Permis');
  if (
    demand.experience_level === 'expert' ||
    demand.experience_level === 'senior'
  ) {
    badges.push('⭐ Expérimenté');
  }
  if (demand.is_flexible_schedule)                              badges.push('🕐 Horaires flexibles');

  return badges;
}
