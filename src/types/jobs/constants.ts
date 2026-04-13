/**
 * jobs/constants.ts — Énumérations et labels du module Emploi Local
 *
 * Responsabilité unique : valeurs d'enum + libellés + icônes + couleurs.
 * Aucun helper, aucune logique — importable côté serveur et client sans effet de bord.
 *
 * Les règles de validation, poids de scoring, valeurs par défaut et fonctions
 * helpers ont été déplacés dans ./_config.ts.
 *
 * Consommateurs directs (imports '@/types/jobs/constants') :
 *   - src/services/jobs/scoring/completeness.ts  → SCORING_WEIGHTS, VALIDATION_RULES
 *   - src/services/jobs/scoring/readiness.ts     → VALIDATION_RULES
 *   - src/services/jobs/queries/*                → ContractType, ExperienceLevel, …
 * Ces consommateurs importent directement constants.ts ; les re-exports ci-dessous
 * maintiennent leur compatibilité sans modification.
 */

// ============================================================================
// CONTRACT TYPES
// ============================================================================

export const CONTRACT_TYPES = [
  'cdi',
  'cdd',
  'saisonnier',
  'mission',
  'extra',
  'remplacement',
  'alternance',
  'stage',
  'interim',
  'freelance',
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  cdi:          'CDI',
  cdd:          'CDD',
  saisonnier:   'Saisonnier',
  mission:      'Mission',
  extra:        'Extra',
  remplacement: 'Remplacement',
  alternance:   'Alternance',
  stage:        'Stage',
  interim:      'Intérim',
  freelance:    'Freelance',
};

export const CONTRACT_TYPE_DESCRIPTIONS: Record<ContractType, string> = {
  cdi:          'Contrat à durée indéterminée',
  cdd:          'Contrat à durée déterminée',
  saisonnier:   'Travail saisonnier (été, hiver, vendanges...)',
  mission:      'Mission ponctuelle de quelques jours/semaines',
  extra:        'Service extra (restauration, événements)',
  remplacement: "Remplacement temporaire d'un salarié absent",
  alternance:   "Contrat d'apprentissage ou de professionnalisation",
  stage:        'Stage conventionné',
  interim:      "Mission d'intérim via agence",
  freelance:    'Mission freelance / prestation',
};

// ============================================================================
// EMPLOYMENT TYPES
// ============================================================================

export const EMPLOYMENT_TYPES = ['temps_plein', 'temps_partiel', 'flexible'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  temps_plein:   'Temps plein',
  temps_partiel: 'Temps partiel',
  flexible:      'Flexible',
};

// ============================================================================
// JOB CATEGORIES
// ============================================================================

export const JOB_CATEGORIES = [
  'restauration',
  'hotellerie',
  'commerce',
  'artisanat',
  'batiment',
  'services_personne',
  'administratif',
  'logistique',
  'nettoyage',
  'transport',
  'sante',
  'animation',
  'petite_enfance',
  'association',
  'evenementiel',
  'agriculture',
  'autre',
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  restauration:      'Restauration',
  hotellerie:        'Hôtellerie',
  commerce:          'Commerce',
  artisanat:         'Artisanat',
  batiment:          'Bâtiment & BTP',
  services_personne: 'Services à la personne',
  administratif:     'Administratif',
  logistique:        'Logistique',
  nettoyage:         'Nettoyage & Entretien',
  transport:         'Transport',
  sante:             'Santé',
  animation:         'Animation',
  petite_enfance:    'Petite enfance',
  association:       'Associatif',
  evenementiel:      'Événementiel',
  agriculture:       'Agriculture',
  autre:             'Autre',
};

export const JOB_CATEGORY_ICONS: Record<JobCategory, string> = {
  restauration:      '🍽️',
  hotellerie:        '🏨',
  commerce:          '🛒',
  artisanat:         '🔨',
  batiment:          '🏗️',
  services_personne: '🤝',
  administratif:     '📋',
  logistique:        '📦',
  nettoyage:         '🧹',
  transport:         '🚚',
  sante:             '⚕️',
  animation:         '🎉',
  petite_enfance:    '👶',
  association:       '🏛️',
  evenementiel:      '🎪',
  agriculture:       '🌾',
  autre:             '💼',
};

// ============================================================================
// EXPERIENCE LEVELS
// ============================================================================

export const EXPERIENCE_LEVELS = [
  'debutant',
  'junior',
  'confirme',
  'senior',
  'expert',
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  debutant: 'Débutant',
  junior:   '1-2 ans',
  confirme: '3-5 ans',
  senior:   '5-10 ans',
  expert:   '+10 ans',
};

export const EXPERIENCE_LEVEL_DESCRIPTIONS: Record<ExperienceLevel, string> = {
  debutant: 'Aucune expérience requise',
  junior:   "1 à 2 ans d'expérience",
  confirme: "3 à 5 ans d'expérience",
  senior:   "5 à 10 ans d'expérience",
  expert:   "Plus de 10 ans d'expérience",
};

// ============================================================================
// AVAILABILITY TYPES
// ============================================================================

export const AVAILABILITY_TYPES = [
  'immediate',
  'week',
  'month',
  'date',
  'flexible',
] as const;

export type AvailabilityType = (typeof AVAILABILITY_TYPES)[number];

export const AVAILABILITY_TYPE_LABELS: Record<AvailabilityType, string> = {
  immediate: 'Immédiate',
  week:      'Sous 1 semaine',
  month:     'Sous 1 mois',
  date:      'À partir du...',
  flexible:  'Flexible',
};

// ============================================================================
// JOB STATUS
// ============================================================================

export const JOB_STATUSES = [
  'draft',
  'published',
  'paused',
  'expired',
  'filled',
  'archived',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft:     'Brouillon',
  published: 'Publiée',
  paused:    'En pause',
  expired:   'Expirée',
  filled:    'Pourvue',
  archived:  'Archivée',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft:     'gray',
  published: 'green',
  paused:    'orange',
  expired:   'red',
  filled:    'blue',
  archived:  'gray',
};

// ============================================================================
// CONTACT STATUS
// ============================================================================

export const CONTACT_STATUSES = ['pending', 'read', 'replied', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  pending:  'En attente',
  read:     'Lu',
  replied:  'Répondu',
  archived: 'Archivé',
};

// ============================================================================
// APPLICATION MODES
// ============================================================================

export const APPLICATION_MODES = ['email', 'phone', 'on_site', 'mixed'] as const;
export type ApplicationMode = (typeof APPLICATION_MODES)[number];

export const APPLICATION_MODE_LABELS: Record<ApplicationMode, string> = {
  email:   'Par email',
  phone:   'Par téléphone',
  on_site: 'Sur place',
  mixed:   'Plusieurs moyens',
};

// ============================================================================
// MOBILITY MODES
// ============================================================================

export const MOBILITY_MODES = ['car', 'public_transport', 'bike', 'walk'] as const;
export type MobilityMode = (typeof MOBILITY_MODES)[number];

export const MOBILITY_MODE_LABELS: Record<MobilityMode, string> = {
  car:              'Véhicule',
  public_transport: 'Transports en commun',
  bike:             'Vélo',
  walk:             'À pied',
};

// ============================================================================
// PREMIUM FEATURES (monetization future)
// ============================================================================

export const VISIBILITY_LEVELS = ['standard', 'featured', 'premium'] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

export const PROMOTION_TYPES = [
  'none',
  'boost_local',
  'badge_verified',
  'urgent',
  'top_position',
] as const;
export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PLAN_TYPES = ['free', 'basic', 'pro', 'enterprise'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

// ============================================================================
// Re-exports de compatibilité — consommateurs directs de constants.ts
// qui importent VALIDATION_RULES, SCORING_WEIGHTS, JOB_SECTORS, etc.
// ============================================================================

export {
  VALIDATION_RULES,
  SCORING_WEIGHTS,
  DEFAULT_VALUES,
  JOB_SECTORS,
  SECTOR_LABELS,
  areContractsCompatible,
  getContractTypeColor,
  getJobCategoryColor,
  formatSalaryRange,
  isUrgent,
} from './_config';

export type { SectorId } from './_config';
