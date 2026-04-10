/**
 * Module Emploi Local - Types TypeScript
 * Version 1.1 - 2026-04-09
 * 
 * Corrections appliquées :
 * - organization_id rendu optionnel (peut être null si orgs instable)
 * - Ajout des champs d'audit lifecycle
 * - sector_id de type string (aligné avec table sectors)
 * - Séparation scores: completeness_score (persisted), relevance_score (runtime)
 * - freshness_score clarifiée (calculée dynamiquement par service scoring)
 */

import type {
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

// ============================================================================
// JOB OFFER
// ============================================================================

export interface JobOffer {
  // Identifiers
  id: string;
  slug: string;
  user_id: string;
  organization_id?: string | null; // Optional: peut être null si table organizations instable

  // Basic info
  title: string;
  job_category: JobCategory;
  contract_type: ContractType;
  employment_type: EmploymentType;

  // Employer
  employer_name?: string | null;   // Nom de l'entreprise / employeur
  employer_address?: string | null; // Adresse physique de l'employeur

  // Location
  location_label: string;
  location_city?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  sector_id?: string | null; // Type string (aligné avec table sectors)
  is_remote_possible: boolean;

  // Timing
  start_date?: string | null; // ISO date
  end_date?: string | null; // ISO date (for CDD, saisonnier, mission)
  mission_duration_days?: number | null;
  availability_type: AvailabilityType;

  // Description
  short_description: string;
  full_description?: string | null;
  required_skills?: string[] | null;
  nice_to_have_skills?: string[] | null;
  tags?: string[] | null;

  // Experience
  experience_level?: ExperienceLevel | null;
  experience_years_min?: number | null;
  experience_years_max?: number | null;

  // Salary
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  salary_period?: 'hourly' | 'monthly' | 'yearly' | null;
  salary_is_negotiable: boolean;

  // Schedule
  weekly_hours?: number | null;
  schedule_details?: string | null;
  is_flexible_schedule: boolean;

  // Requirements
  has_driving_license: boolean;
  requires_vehicle: boolean;

  // Contact
  application_mode: ApplicationMode;
  contact_email?: string | null;
  contact_phone?: string | null;
  application_url?: string | null;
  contact_instructions?: string | null;

  // Benefits
  provides_housing: boolean;
  housing_details?: string | null;
  provides_meals: boolean;
  other_benefits?: string | null;

  // Status & visibility
  status: JobStatus;
  is_urgent: boolean;
  visibility_level: VisibilityLevel;
  promotion_type: PromotionType;
  boosted_until?: string | null; // ISO datetime
  sponsor_label?: string | null;

  // Scoring (completeness persisted, relevance runtime)
  completeness_score: number; // 0-100, calculé au publish, stocké en DB
  // freshness_score calculé dynamiquement par scoring service (pas stocké)

  // Stats
  views_count: number;
  contacts_count: number;

  // Billing
  billing_eligible: boolean;
  plan_type: PlanType;

  // Audit & lifecycle
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  published_at?: string | null; // ISO datetime
  last_refreshed_at?: string | null; // ISO datetime - dernière mise à jour/refresh
  last_contacted_at?: string | null; // ISO datetime - dernier contact reçu
  expired_at?: string | null; // ISO datetime
  filled_at?: string | null; // ISO datetime
  expired_reason?: string | null; // 'auto_expired' | 'manually_expired' | 'filled'
  filled_reason?: string | null; // 'hired_from_ad' | 'hired_elsewhere' | 'no_longer_needed'
  publication_source?: 'web' | 'mobile' | 'api' | null; // Source de publication

  // Moderation (system-only fields)
  is_moderated: boolean;
  moderation_notes?: string | null;
}

// ============================================================================
// JOB DEMAND
// ============================================================================

export interface JobDemand {
  // Identifiers
  id: string;
  slug: string;
  user_id: string;

  // Basic info
  title: string;
  job_category: JobCategory;
  desired_contract_types: ContractType[]; // Peut chercher plusieurs types
  desired_employment_types: EmploymentType[];

  // Location & mobility
  location_label: string;
  location_lat?: number | null;
  location_lng?: number | null;
  sector_id?: string | null; // Type string (aligné avec table sectors)
  mobility_radius?: number | null; // km
  mobility_mode?: MobilityMode | null;

  // Availability
  availability_type: AvailabilityType;
  available_from?: string | null; // ISO date
  availability_comment?: string | null;

  // Description
  short_description: string;
  full_description?: string | null;
  skills?: string[] | null;
  tags?: string[] | null;

  // Experience
  experience_level?: ExperienceLevel | null;
  experience_years?: number | null;

  // Expectations
  salary_expectation_min?: number | null;
  salary_expectation_max?: number | null;
  salary_period?: 'hourly' | 'monthly' | 'yearly' | null;

  // Availability
  weekly_hours_desired?: number | null;
  is_flexible_schedule: boolean;

  // Assets
  has_driving_license: boolean;
  has_vehicle: boolean;

  // Contact
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_mode?: string | null; // 'email' | 'phone' | 'mixed'

  // Documents
  cv_url?: string | null;
  portfolio_url?: string | null;

  // Location details
  location_city?: string | null;

  // Status
  status: JobStatus;
  is_urgent: boolean;

  // Scoring (completeness persisted, relevance runtime)
  completeness_score: number; // 0-100, calculé au publish, stocké en DB

  // Stats
  views_count: number;
  contacts_count: number;

  // Audit & lifecycle
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  published_at?: string | null; // ISO datetime
  last_refreshed_at?: string | null; // ISO datetime
  last_contacted_at?: string | null; // ISO datetime
  expired_at?: string | null; // ISO datetime
  filled_at?: string | null; // ISO datetime
  expired_reason?: string | null;
  filled_reason?: string | null;
  publication_source?: 'web' | 'mobile' | 'api' | null;

  // Moderation
  is_moderated: boolean;
  moderation_notes?: string | null;
}

// ============================================================================
// JOB CONTACT
// ============================================================================

export interface JobContact {
  id: string;
  offer_id?: string | null;
  demand_id?: string | null;
  sender_id: string;
  receiver_id: string;
  message: string;
  contact_method: 'internal_message' | 'email' | 'phone';
  status: ContactStatus;
  created_at: string; // ISO datetime
  read_at?: string | null; // ISO datetime
  replied_at?: string | null; // ISO datetime
}

// ============================================================================
// USER PROFILE (minimal, for joins)
// ============================================================================

export interface JobUserProfile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  is_verified: boolean;
  created_at: string;
}

// ============================================================================
// SEARCH & FILTER TYPES
// ============================================================================

export interface JobOfferFilters {
  // Text search
  query?: string;

  // Category & contract
  categories?: JobCategory[];
  contractTypes?: ContractType[];
  employmentTypes?: EmploymentType[];

  // Location
  sectorId?: string;
  radius?: number; // km
  lat?: number;
  lng?: number;

  // Experience
  experienceLevels?: ExperienceLevel[];

  // Salary
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: 'hourly' | 'monthly' | 'yearly';

  // Requirements
  requiresLicense?: boolean;
  requiresVehicle?: boolean;
  providesHousing?: boolean;
  providesRemote?: boolean;

  // Timing
  availableFrom?: string; // ISO date
  isUrgent?: boolean;

  // Sorting
  sortBy?:
    | 'relevance'
    | 'date_desc'
    | 'date_asc'
    | 'salary_desc'
    | 'salary_asc'
    | 'completeness_desc';

  // Pagination
  page?: number;
  limit?: number;
}

export interface JobDemandFilters {
  // Text search
  query?: string;

  // Category & contract
  categories?: JobCategory[];
  contractTypes?: ContractType[];
  employmentTypes?: EmploymentType[];

  // Location
  sectorId?: string;
  radius?: number;
  lat?: number;
  lng?: number;

  // Experience
  experienceLevels?: ExperienceLevel[];

  // Availability
  availableFrom?: string; // ISO date
  isUrgent?: boolean;

  // Assets
  hasLicense?: boolean;
  hasVehicle?: boolean;

  // Sorting
  sortBy?:
    | 'relevance'
    | 'date_desc'
    | 'date_asc'
    | 'experience_desc'
    | 'completeness_desc';

  // Pagination
  page?: number;
  limit?: number;
}

// ============================================================================
// SEARCH RESULTS (séparés offer/demand pour clarté UI)
// ============================================================================

export interface JobOfferSearchResult extends JobOffer {
  // Enriched data
  author_profile?: JobUserProfile;
  distance_km?: number;

  // Runtime scoring (calculé dynamiquement, non stocké)
  relevance_score?: number; // 0-100, calculé par matching algorithm
  freshness_score?: number; // 0-100, calculé par scoring service
}

export interface JobDemandSearchResult extends JobDemand {
  // Enriched data
  author_profile?: JobUserProfile;
  distance_km?: number;

  // Runtime scoring
  relevance_score?: number;
  freshness_score?: number;
}

// ============================================================================
// FORM INPUT TYPES (for publication wizards)
// ============================================================================

export interface JobOfferFormInput {
  // Basic (étape 1)
  title: string;
  job_category: JobCategory;
  contract_type: ContractType;
  employment_type: EmploymentType;

  // Location (étape 2)
  location_label: string;
  sector_id?: string;
  is_remote_possible: boolean;

  // Description (étape 3)
  short_description: string;
  full_description?: string;
  required_skills?: string[];
  nice_to_have_skills?: string[];
  tags?: string[];

  // Details (étape 4)
  start_date?: string;
  end_date?: string;
  mission_duration_days?: number;
  experience_level?: ExperienceLevel;
  salary_range_min?: number;
  salary_range_max?: number;
  salary_period?: 'hourly' | 'monthly' | 'yearly';
  salary_is_negotiable: boolean;
  weekly_hours?: number;
  schedule_details?: string;
  is_flexible_schedule: boolean;

  // Requirements (étape 5)
  has_driving_license: boolean;
  requires_vehicle: boolean;
  provides_housing: boolean;
  housing_details?: string;
  provides_meals: boolean;
  other_benefits?: string;

  // Contact (étape 6)
  application_mode: ApplicationMode;
  contact_email?: string;
  contact_phone?: string;
  application_url?: string;
  contact_instructions?: string;

  // Options (étape 7)
  is_urgent: boolean;
  visibility_level: VisibilityLevel;
  organization_id?: string; // Optional
}

export interface JobDemandFormInput {
  // Basic
  title: string;
  job_category: JobCategory;
  desired_contract_types: ContractType[];
  desired_employment_types: EmploymentType[];

  // Location & mobility
  location_label: string;
  sector_id?: string;
  mobility_radius?: number;
  mobility_mode?: MobilityMode;

  // Availability
  availability_type: AvailabilityType;
  available_from?: string;
  availability_comment?: string;

  // Description
  short_description: string;
  full_description?: string;
  skills?: string[];
  tags?: string[];

  // Experience
  experience_level?: ExperienceLevel;
  experience_years?: number;

  // Expectations
  salary_expectation_min?: number;
  salary_expectation_max?: number;
  salary_period?: 'hourly' | 'monthly' | 'yearly';
  weekly_hours_desired?: number;
  is_flexible_schedule: boolean;

  // Assets
  has_driving_license: boolean;
  has_vehicle: boolean;

  // Documents
  cv_url?: string;
  portfolio_url?: string;

  // Options
  is_urgent: boolean;
}

// ============================================================================
// PUBLICATION READINESS (quality gate)
// ============================================================================

export interface PublicationReadiness {
  canPublish: boolean;
  completeness_score: number; // 0-100
  blocking_issues: string[]; // Issues qui empêchent publication
  warnings: string[]; // Points d'amélioration suggérés
  suggestions: string[]; // Conseils pour améliorer visibilité
}

// ============================================================================
// STATE TRANSITION TYPES (pour workflow management)
// ============================================================================

export type JobOfferStatusTransition =
  | { from: 'draft'; to: 'published' }
  | { from: 'published'; to: 'paused' }
  | { from: 'paused'; to: 'published' }
  | { from: 'published'; to: 'filled' }
  | { from: 'published'; to: 'expired' }
  | { from: 'paused'; to: 'expired' }
  | { from: 'filled'; to: 'archived' }
  | { from: 'expired'; to: 'archived' };

export type JobDemandStatusTransition =
  | { from: 'draft'; to: 'published' }
  | { from: 'published'; to: 'paused' }
  | { from: 'paused'; to: 'published' }
  | { from: 'published'; to: 'filled' }
  | { from: 'published'; to: 'expired' }
  | { from: 'paused'; to: 'expired' }
  | { from: 'filled'; to: 'archived' }
  | { from: 'expired'; to: 'archived' };

// ============================================================================
// ANALYTICS EVENT TYPES (pour tracking)
// ============================================================================

export interface JobAnalyticsEvent {
  event_type:
    | 'job_offer_created'
    | 'job_offer_published'
    | 'job_offer_viewed'
    | 'job_offer_contacted'
    | 'job_offer_saved'
    | 'job_demand_created'
    | 'job_demand_published'
    | 'job_demand_viewed'
    | 'job_demand_contacted'
    | 'job_demand_saved'
    | 'job_search_performed';
  user_id?: string;
  job_id?: string;
  search_query?: string;
  filters_applied?: Record<string, any>;
  created_at: string;
}

// ============================================================================
// OWNERSHIP & PERMISSION MATRIX
// ============================================================================

export type JobPermission =
  | 'view_own_jobs'
  | 'view_all_jobs'
  | 'create_offer'
  | 'create_demand'
  | 'edit_own_offer'
  | 'edit_own_demand'
  | 'delete_own_offer'
  | 'delete_own_demand'
  | 'contact_offers'
  | 'contact_demands'
  | 'moderate_all'
  | 'view_analytics';

export interface JobOwnership {
  user_id: string;
  can_edit: boolean;
  can_delete: boolean;
  can_moderate: boolean;
  is_author: boolean;
  is_organization_admin: boolean;
}

// ============================================================================
// HOME FEED INTEGRATION
// ============================================================================

export interface JobOfferHomeFeedItem {
  type: 'job_offer';
  data: JobOfferSearchResult;
  priority_score: number; // Pour tri dans fil Home
  freshness_days: number;
  is_local: boolean; // Basé sur sector_id user
}

export interface JobDemandHomeFeedItem {
  type: 'job_demand';
  data: JobDemandSearchResult;
  priority_score: number;
  freshness_days: number;
  is_local: boolean;
}
