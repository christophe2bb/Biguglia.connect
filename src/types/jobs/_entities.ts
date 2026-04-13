/**
 * jobs/_entities.ts — Interfaces des entités persistées du module Emploi Local
 *
 * Contient les quatre interfaces qui reflètent directement les tables Supabase :
 *   JobOffer      — offre d'emploi publiée par un employeur
 *   JobDemand     — candidature / recherche publiée par un chercheur d'emploi
 *   JobContact    — message envoyé entre un candidat et un employeur
 *   JobUserProfile — projection minimale du profil pour les joins
 *
 * Dépendances : uniquement des types primitifs issus de ./constants
 * Importable côté serveur et client sans effet de bord.
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
  employer_name?: string | null;    // Nom de l'entreprise / employeur
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
  start_date?: string | null;             // ISO date
  end_date?: string | null;               // ISO date (for CDD, saisonnier, mission)
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
  boosted_until?: string | null;  // ISO datetime
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
  created_at: string;              // ISO datetime
  updated_at: string;              // ISO datetime
  published_at?: string | null;    // ISO datetime
  last_refreshed_at?: string | null; // ISO datetime — dernière mise à jour/refresh
  last_contacted_at?: string | null; // ISO datetime — dernier contact reçu
  expired_at?: string | null;      // ISO datetime
  filled_at?: string | null;       // ISO datetime
  expired_reason?: string | null;  // 'auto_expired' | 'manually_expired' | 'filled'
  filled_reason?: string | null;   // 'hired_from_ad' | 'hired_elsewhere' | 'no_longer_needed'
  publication_source?: 'web' | 'mobile' | 'api' | null;

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
  desired_contract_types: ContractType[];   // Peut chercher plusieurs types
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
  available_from?: string | null;      // ISO date
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

  // Schedule
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
  created_at: string;              // ISO datetime
  updated_at: string;              // ISO datetime
  published_at?: string | null;    // ISO datetime
  last_refreshed_at?: string | null;
  last_contacted_at?: string | null;
  expired_at?: string | null;
  filled_at?: string | null;
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
  created_at: string;         // ISO datetime
  read_at?: string | null;    // ISO datetime
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
