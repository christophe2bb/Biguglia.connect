/**
 * jobs/_search.ts — Types liés à la recherche, aux filtres et aux formulaires
 *
 * Trois familles :
 *   Filtres       — JobOfferFilters, JobDemandFilters (paramètres de requête UI)
 *   Résultats     — JobOfferSearchResult, JobDemandSearchResult (entité + scores runtime)
 *   Formulaires   — JobOfferFormInput, JobDemandFormInput (données des wizards)
 *
 * Dépendances : _entities (interfaces de base) + constants (union types).
 */

import type {
  ContractType,
  EmploymentType,
  JobCategory,
  ExperienceLevel,
  AvailabilityType,
  ApplicationMode,
  MobilityMode,
  VisibilityLevel,
} from './constants';

import type { JobOffer, JobDemand, JobUserProfile } from './_entities';

// ============================================================================
// SEARCH FILTERS
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
// SEARCH RESULTS — entité enrichie avec scores runtime et profil auteur
// ============================================================================

export interface JobOfferSearchResult extends JobOffer {
  author_profile?: JobUserProfile;
  distance_km?: number;

  // Runtime scoring (calculé dynamiquement, non stocké en DB)
  relevance_score?: number; // 0-100, calculé par matching algorithm
  freshness_score?: number; // 0-100, calculé par scoring service
}

export interface JobDemandSearchResult extends JobDemand {
  author_profile?: JobUserProfile;
  distance_km?: number;

  // Runtime scoring
  relevance_score?: number;
  freshness_score?: number;
}

// ============================================================================
// FORM INPUT TYPES — données collectées par les wizards de publication
// ============================================================================

export interface JobOfferFormInput {
  // Étape 1 — Informations de base
  title: string;
  job_category: JobCategory;
  contract_type: ContractType;
  employment_type: EmploymentType;

  // Étape 2 — Localisation
  location_label: string;
  sector_id?: string;
  is_remote_possible: boolean;

  // Étape 3 — Description
  short_description: string;
  full_description?: string;
  required_skills?: string[];
  nice_to_have_skills?: string[];
  tags?: string[];

  // Étape 4 — Détails contrat
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

  // Étape 5 — Prérequis et avantages
  has_driving_license: boolean;
  requires_vehicle: boolean;
  provides_housing: boolean;
  housing_details?: string;
  provides_meals: boolean;
  other_benefits?: string;

  // Étape 6 — Contact
  application_mode: ApplicationMode;
  contact_email?: string;
  contact_phone?: string;
  application_url?: string;
  contact_instructions?: string;

  // Étape 7 — Options de publication
  is_urgent: boolean;
  visibility_level: VisibilityLevel;
  organization_id?: string;
}

export interface JobDemandFormInput {
  // Informations de base
  title: string;
  job_category: JobCategory;
  desired_contract_types: ContractType[];
  desired_employment_types: EmploymentType[];

  // Localisation & mobilité
  location_label: string;
  sector_id?: string;
  mobility_radius?: number;
  mobility_mode?: MobilityMode;

  // Disponibilité
  availability_type: AvailabilityType;
  available_from?: string;
  availability_comment?: string;

  // Description
  short_description: string;
  full_description?: string;
  skills?: string[];
  tags?: string[];

  // Expérience
  experience_level?: ExperienceLevel;
  experience_years?: number;

  // Prétentions salariales
  salary_expectation_min?: number;
  salary_expectation_max?: number;
  salary_period?: 'hourly' | 'monthly' | 'yearly';
  weekly_hours_desired?: number;
  is_flexible_schedule: boolean;

  // Atouts
  has_driving_license: boolean;
  has_vehicle: boolean;

  // Documents
  cv_url?: string;
  portfolio_url?: string;

  // Options
  is_urgent: boolean;
}
