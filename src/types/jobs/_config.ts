/**
 * jobs/_config.ts — Règles de validation, poids de scoring, valeurs par défaut,
 *                   fonctions helpers et référentiel des secteurs géographiques
 *
 * Séparé de constants.ts (enums purs) pour pouvoir être importé
 * indépendamment par les services de scoring et les wizards de publication.
 *
 * Dépendances : ./constants (ContractType, JobCategory) + @/lib/sectors
 */

import type { ContractType, JobCategory } from './constants';
import { SECTORS as LIB_SECTORS } from '@/lib/sectors';

// ============================================================================
// VALIDATION RULES — limites utilisées par les schémas Zod et les helpers UI
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
// SCORING WEIGHTS — complétude et pertinence
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
// DEFAULT VALUES — valeurs par défaut partagées entre services et UI
// ============================================================================

export const DEFAULT_VALUES = {
  MOBILITY_RADIUS: 10,       // km
  MAX_RESULTS_PER_PAGE: 20,
  SEARCH_DEBOUNCE_MS: 300,
  AUTO_EXPIRE_DAYS: 60,
  BOOST_DURATION_DAYS: 7,
  FEATURED_DURATION_DAYS: 14,
} as const;

// ============================================================================
// SECTORS — source unique : src/lib/sectors.ts
// Utilisé par les wizards, filtres et pages de détail
// ============================================================================

export const JOB_SECTORS = LIB_SECTORS.map(s => ({
  id:    s.id,
  label: s.name,
  emoji: s.icon,
}));

export type SectorId = string;

export const SECTOR_LABELS: Record<string, string> = Object.fromEntries(
  JOB_SECTORS.map(s => [s.id, `${s.emoji} ${s.label}`])
);

// ============================================================================
// HELPER FUNCTIONS — logique métier pure, sans dépendance Supabase
// ============================================================================

/**
 * Indique si deux types de contrat sont compatibles pour le matching offre/demande.
 */
export function areContractsCompatible(
  offered: ContractType,
  desired: ContractType,
): boolean {
  if (offered === desired) return true;

  // CDD is compatible with CDI search
  if (offered === 'cdd' && desired === 'cdi') return true;

  // Alternance is compatible with stage and vice versa
  if (
    (offered === 'alternance' && desired === 'stage') ||
    (offered === 'stage'      && desired === 'alternance')
  ) return true;

  // Mission, extra, remplacement are mutually compatible
  const flexibleTypes: ContractType[] = ['mission', 'extra', 'remplacement'];
  if (flexibleTypes.includes(offered) && flexibleTypes.includes(desired)) return true;

  return false;
}

/**
 * Retourne la couleur Tailwind associée à un type de contrat.
 */
export function getContractTypeColor(contractType: ContractType): string {
  const colorMap: Record<ContractType, string> = {
    cdi:          'blue',
    cdd:          'cyan',
    saisonnier:   'orange',
    mission:      'purple',
    extra:        'pink',
    remplacement: 'amber',
    alternance:   'green',
    stage:        'lime',
    interim:      'teal',
    freelance:    'indigo',
  };
  return colorMap[contractType] ?? 'gray';
}

/**
 * Retourne la couleur Tailwind associée à une catégorie d'emploi.
 */
export function getJobCategoryColor(category: JobCategory): string {
  const colorMap: Record<JobCategory, string> = {
    restauration:      'orange',
    hotellerie:        'purple',
    commerce:          'blue',
    artisanat:         'amber',
    batiment:          'gray',
    services_personne: 'pink',
    administratif:     'cyan',
    logistique:        'indigo',
    nettoyage:         'teal',
    transport:         'sky',
    sante:             'red',
    animation:         'yellow',
    petite_enfance:    'rose',
    association:       'violet',
    evenementiel:      'fuchsia',
    agriculture:       'green',
    autre:             'slate',
  };
  return colorMap[category] ?? 'gray';
}

/**
 * Formate une plage salariale pour l'affichage UI.
 */
export function formatSalaryRange(
  minSalary?: number | null,
  maxSalary?: number | null,
  currency = '€',
): string {
  if (!minSalary && !maxSalary) return 'Non précisé';
  if (minSalary && maxSalary)   return `${minSalary} - ${maxSalary} ${currency}`;
  if (minSalary)                return `À partir de ${minSalary} ${currency}`;
  if (maxSalary)                return `Jusqu'à ${maxSalary} ${currency}`;
  return 'Non précisé';
}

/**
 * Indique si une offre/demande est considérée comme urgente.
 * Urgente si `isExplicitlyUrgent` est vrai, ou si la date de disponibilité
 * est dans moins de 7 jours.
 */
export function isUrgent(
  availableFrom?: Date | string | null,
  isExplicitlyUrgent?: boolean,
): boolean {
  if (isExplicitlyUrgent) return true;
  if (!availableFrom)     return false;

  const now       = new Date();
  const availDate = typeof availableFrom === 'string'
    ? new Date(availableFrom)
    : availableFrom;
  const diffDays  = Math.floor(
    (availDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return diffDays <= 7;
}
