/**
 * jobs/index.ts — Point d'entrée unique du module Emploi Local
 *
 * Ré-exporte l'intégralité de l'API publique depuis les sous-modules pour
 * une compatibilité arrière totale avec tous les consommateurs qui importent
 * depuis '@/types/jobs'.
 *
 * Sous-modules :
 *   constants.ts  — énumérations et labels (ContractType, JobCategory, …)
 *   _config.ts    — règles de validation, scoring, helpers, secteurs
 *   _entities.ts  — interfaces entités DB (JobOffer, JobDemand, JobContact, …)
 *   _search.ts    — filtres, résultats de recherche, formulaires
 *   _workflow.ts  — readiness, transitions, analytics, permissions, home feed
 *   validations.ts — schémas Zod + types inférés
 */

// ── Énumérations et labels ────────────────────────────────────────────────────
export type {
  ContractType,
  EmploymentType,
  JobCategory,
  ExperienceLevel,
  AvailabilityType,
  JobStatus,
  ContactStatus,
  ApplicationMode,
  MobilityMode,
  VisibilityLevel,
  PromotionType,
  PlanType,
} from './constants';

export {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPE_DESCRIPTIONS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  JOB_CATEGORY_ICONS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
  EXPERIENCE_LEVEL_DESCRIPTIONS,
  AVAILABILITY_TYPES,
  AVAILABILITY_TYPE_LABELS,
  JOB_STATUSES,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  CONTACT_STATUSES,
  CONTACT_STATUS_LABELS,
  APPLICATION_MODES,
  APPLICATION_MODE_LABELS,
  MOBILITY_MODES,
  MOBILITY_MODE_LABELS,
  VISIBILITY_LEVELS,
  PROMOTION_TYPES,
  PLAN_TYPES,
} from './constants';

// ── Config, scoring, helpers, secteurs ───────────────────────────────────────
export type { SectorId } from './_config';

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

// ── Interfaces entités ────────────────────────────────────────────────────────
export type {
  JobOffer,
  JobDemand,
  JobContact,
  JobUserProfile,
} from './_entities';

// ── Recherche, filtres et formulaires ─────────────────────────────────────────
export type {
  JobOfferFilters,
  JobDemandFilters,
  JobOfferSearchResult,
  JobDemandSearchResult,
  JobOfferFormInput,
  JobDemandFormInput,
} from './_search';

// ── Workflow, analytics, permissions, home feed ───────────────────────────────
export type {
  PublicationReadiness,
  JobOfferStatusTransition,
  JobDemandStatusTransition,
  JobAnalyticsEvent,
  JobPermission,
  JobOwnership,
  JobOfferHomeFeedItem,
  JobDemandHomeFeedItem,
} from './_workflow';

// ── Schémas Zod + types inférés ───────────────────────────────────────────────
export {
  jobOfferSchema,
  jobDemandSchema,
  jobContactSchema,
  jobOfferFiltersSchema,
  jobDemandFiltersSchema,
} from './validations';

export type {
  JobOfferValidated,
  JobDemandValidated,
  JobContactValidated,
  JobOfferFiltersValidated,
  JobDemandFiltersValidated,
} from './validations';
