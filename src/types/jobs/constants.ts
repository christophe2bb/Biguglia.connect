/**
 * Module Emploi Local - Constantes centralisées
 * Version 1.1 - 2026-04-09
 * 
 * Source unique de vérité pour tous les enums, labels et configurations
 * Utilisé par : DB, TypeScript, Zod validations, UI components
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
  cdi: 'CDI',
  cdd: 'CDD',
  saisonnier: 'Saisonnier',
  mission: 'Mission',
  extra: 'Extra',
  remplacement: 'Remplacement',
  alternance: 'Alternance',
  stage: 'Stage',
  interim: 'Intérim',
  freelance: 'Freelance',
};

export const CONTRACT_TYPE_DESCRIPTIONS: Record<ContractType, string> = {
  cdi: 'Contrat à durée indéterminée',
  cdd: 'Contrat à durée déterminée',
  saisonnier: 'Travail saisonnier (été, hiver, vendanges...)',
  mission: 'Mission ponctuelle de quelques jours/semaines',
  extra: 'Service extra (restauration, événements)',
  remplacement: 'Remplacement temporaire d\'un salarié absent',
  alternance: 'Contrat d\'apprentissage ou de professionnalisation',
  stage: 'Stage conventionné',
  interim: 'Mission d\'intérim via agence',
  freelance: 'Mission freelance / prestation',
};

// ============================================================================
// EMPLOYMENT TYPES
// ============================================================================

export const EMPLOYMENT_TYPES = ['temps_plein', 'temps_partiel', 'flexible'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  temps_plein: 'Temps plein',
  temps_partiel: 'Temps partiel',
  flexible: 'Flexible',
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
  restauration: 'Restauration',
  hotellerie: 'Hôtellerie',
  commerce: 'Commerce',
  artisanat: 'Artisanat',
  batiment: 'Bâtiment & BTP',
  services_personne: 'Services à la personne',
  administratif: 'Administratif',
  logistique: 'Logistique',
  nettoyage: 'Nettoyage & Entretien',
  transport: 'Transport',
  sante: 'Santé',
  animation: 'Animation',
  petite_enfance: 'Petite enfance',
  association: 'Associatif',
  evenementiel: 'Événementiel',
  agriculture: 'Agriculture',
  autre: 'Autre',
};

export const JOB_CATEGORY_ICONS: Record<JobCategory, string> = {
  restauration: '🍽️',
  hotellerie: '🏨',
  commerce: '🛒',
  artisanat: '🔨',
  batiment: '🏗️',
  services_personne: '🤝',
  administratif: '📋',
  logistique: '📦',
  nettoyage: '🧹',
  transport: '🚚',
  sante: '⚕️',
  animation: '🎉',
  petite_enfance: '👶',
  association: '🏛️',
  evenementiel: '🎪',
  agriculture: '🌾',
  autre: '💼',
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
  junior: '1-2 ans',
  confirme: '3-5 ans',
  senior: '5-10 ans',
  expert: '+10 ans',
};

export const EXPERIENCE_LEVEL_DESCRIPTIONS: Record<ExperienceLevel, string> = {
  debutant: 'Aucune expérience requise',
  junior: '1 à 2 ans d\'expérience',
  confirme: '3 à 5 ans d\'expérience',
  senior: '5 à 10 ans d\'expérience',
  expert: 'Plus de 10 ans d\'expérience',
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
  week: 'Sous 1 semaine',
  month: 'Sous 1 mois',
  date: 'À partir du...',
  flexible: 'Flexible',
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
  draft: 'Brouillon',
  published: 'Publiée',
  paused: 'En pause',
  expired: 'Expirée',
  filled: 'Pourvue',
  archived: 'Archivée',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft: 'gray',
  published: 'green',
  paused: 'orange',
  expired: 'red',
  filled: 'blue',
  archived: 'gray',
};

// ============================================================================
// CONTACT STATUS
// ============================================================================

export const CONTACT_STATUSES = ['pending', 'read', 'replied', 'archived'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  pending: 'En attente',
  read: 'Lu',
  replied: 'Répondu',
  archived: 'Archivé',
};

// ============================================================================
// APPLICATION MODES
// ============================================================================

export const APPLICATION_MODES = ['email', 'phone', 'on_site', 'mixed'] as const;
export type ApplicationMode = (typeof APPLICATION_MODES)[number];

export const APPLICATION_MODE_LABELS: Record<ApplicationMode, string> = {
  email: 'Par email',
  phone: 'Par téléphone',
  on_site: 'Sur place',
  mixed: 'Plusieurs moyens',
};

// ============================================================================
// MOBILITY MODES
// ============================================================================

export const MOBILITY_MODES = ['car', 'public_transport', 'bike', 'walk'] as const;
export type MobilityMode = (typeof MOBILITY_MODES)[number];

export const MOBILITY_MODE_LABELS: Record<MobilityMode, string> = {
  car: 'Véhicule',
  public_transport: 'Transports en commun',
  bike: 'Vélo',
  walk: 'À pied',
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 120,
  SHORT_DESC_MIN_LENGTH: 50,
  SHORT_DESC_MAX_LENGTH: 300,
  FULL_DESC_MIN_LENGTH: 100,
  FULL_DESC_MAX_LENGTH: 3000,
  LOCATION_MIN_LENGTH: 3,
  LOCATION_MAX_LENGTH: 100,
  MIN_HOURLY_RATE: 8,
  MAX_HOURLY_RATE: 200,
  MIN_MONTHLY_SALARY: 800,
  MAX_MONTHLY_SALARY: 20000,
  MAX_MOBILITY_RADIUS: 100,
  MAX_TAGS: 10,
  MAX_TAG_LENGTH: 30,
  MAX_SKILLS: 15,
  MAX_SKILL_LENGTH: 50,
  MIN_MISSION_DURATION_DAYS: 1,
  MAX_MISSION_DURATION_DAYS: 365,
  MIN_WEEKLY_HOURS: 1,
  MAX_WEEKLY_HOURS: 48,
  MAX_CONTACT_MESSAGE_LENGTH: 1000,
} as const;

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

export const SCORING_WEIGHTS = {
  // Completeness scoring
  HAS_CONTRACT_TYPE: 15,
  HAS_LOCATION: 10,
  HAS_START_DATE: 5,
  HAS_END_DATE: 5,
  HAS_SALARY_RANGE: 15,
  HAS_SCHEDULE_DETAILS: 10,
  HAS_FULL_DESCRIPTION: 15,
  HAS_CONTACT_INFO: 15,
  HAS_EXPERIENCE_LEVEL: 5,
  HAS_REQUIRED_SKILLS: 5,

  // Relevance scoring
  EXACT_CONTRACT_MATCH: 30,
  COMPATIBLE_CONTRACT: 20,
  PROXIMITY_MATCH: 25,
  AVAILABILITY_MATCH: 15,
  CATEGORY_MATCH: 10,
  EXPERIENCE_MATCH: 10,
  FRESHNESS_BONUS: 5,

  // Freshness decay
  FRESHNESS_DAYS_THRESHOLD: 7,
  FRESHNESS_DECAY_PER_DAY: 2,
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_VALUES = {
  MOBILITY_RADIUS: 10, // km
  MAX_RESULTS_PER_PAGE: 20,
  SEARCH_DEBOUNCE_MS: 300,
  AUTO_EXPIRE_DAYS: 60,
  BOOST_DURATION_DAYS: 7,
  FEATURED_DURATION_DAYS: 14,
} as const;

// ============================================================================
// PREMIUM FEATURES (for future monetization)
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a contract type is compatible with another
 */
export function areContractsCompatible(
  offered: ContractType,
  desired: ContractType
): boolean {
  if (offered === desired) return true;

  // CDD is compatible with CDI search
  if (offered === 'cdd' && desired === 'cdi') return true;

  // Alternance is compatible with stage and vice versa
  if (
    (offered === 'alternance' && desired === 'stage') ||
    (offered === 'stage' && desired === 'alternance')
  )
    return true;

  // Mission, extra, remplacement are mutually compatible
  const flexibleTypes = ['mission', 'extra', 'remplacement'];
  if (flexibleTypes.includes(offered) && flexibleTypes.includes(desired)) return true;

  return false;
}

/**
 * Get contract type color for UI
 */
export function getContractTypeColor(contractType: ContractType): string {
  const colorMap: Record<ContractType, string> = {
    cdi: 'blue',
    cdd: 'cyan',
    saisonnier: 'orange',
    mission: 'purple',
    extra: 'pink',
    remplacement: 'amber',
    alternance: 'green',
    stage: 'lime',
    interim: 'teal',
    freelance: 'indigo',
  };
  return colorMap[contractType] || 'gray';
}

/**
 * Get job category color for UI
 */
export function getJobCategoryColor(category: JobCategory): string {
  const colorMap: Record<JobCategory, string> = {
    restauration: 'orange',
    hotellerie: 'purple',
    commerce: 'blue',
    artisanat: 'amber',
    batiment: 'gray',
    services_personne: 'pink',
    administratif: 'cyan',
    logistique: 'indigo',
    nettoyage: 'teal',
    transport: 'sky',
    sante: 'red',
    animation: 'yellow',
    petite_enfance: 'rose',
    association: 'violet',
    evenementiel: 'fuchsia',
    agriculture: 'green',
    autre: 'slate',
  };
  return colorMap[category] || 'gray';
}

/**
 * Format salary range for display
 */
export function formatSalaryRange(
  minSalary?: number | null,
  maxSalary?: number | null,
  currency: string = '€'
): string {
  if (!minSalary && !maxSalary) return 'Non précisé';
  if (minSalary && maxSalary) return `${minSalary} - ${maxSalary} ${currency}`;
  if (minSalary) return `À partir de ${minSalary} ${currency}`;
  if (maxSalary) return `Jusqu'à ${maxSalary} ${currency}`;
  return 'Non précisé';
}

/**
 * Check if a job offer/demand is considered "urgent"
 */
export function isUrgent(
  availableFrom?: Date | string | null,
  isExplicitlyUrgent?: boolean
): boolean {
  if (isExplicitlyUrgent) return true;

  if (!availableFrom) return false;

  const now = new Date();
  const availDate =
    typeof availableFrom === 'string' ? new Date(availableFrom) : availableFrom;
  const diffDays = Math.floor(
    (availDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays <= 7;
}

// ============================================================================
// SECTORS (Quartiers / Zones de Biguglia et alentours)
// Utilisé partout : wizards, filtres, pages de détail
// ============================================================================
export const JOB_SECTORS = [
  { id: 'figuerune',    label: 'Figuerune',             emoji: '🏘️' },
  { id: 'portale',      label: 'Portale',               emoji: '🏡' },
  { id: 'marana',       label: 'La Marana',             emoji: '🌿' },
  { id: 'borgo',        label: 'Borgo',                 emoji: '🏙️' },
  { id: 'lido',         label: 'Zone du Lido',          emoji: '🏖️' },
  { id: 'furiani',      label: 'Furiani',               emoji: '⛪' },
  { id: 'bastia',       label: 'Bastia (proches)',      emoji: '🏛️' },
  { id: 'biguglia',     label: 'Biguglia centre',       emoji: '📍' },
  { id: 'haute_corse',  label: 'Toute la Haute-Corse',  emoji: '🗺️' },
] as const;

export type SectorId = (typeof JOB_SECTORS)[number]['id'];

export const SECTOR_LABELS: Record<string, string> = Object.fromEntries(
  JOB_SECTORS.map(s => [s.id, `${s.emoji} ${s.label}`])
);
