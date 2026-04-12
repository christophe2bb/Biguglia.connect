/**
 * src/types/supabase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hand-crafted Database type used as the generic parameter for Supabase clients.
 *
 * Purpose :
 *  When no generated schema is available (`supabase gen types typescript`),
 *  the Supabase client defaults to `any` for all `select()` return values.
 *  Threading this `Database` type into every `createClient<Database>()` call
 *  makes TypeScript infer the correct row shape for every query — eliminating
 *  all `data as SomeRow` unsafe assertions.
 *
 * Structure mirrors what `supabase gen types` produces :
 *  Database['public']['Tables'][TableName]['Row']     — full select * shape
 *  Database['public']['Tables'][TableName]['Insert']  — insert payload
 *  Database['public']['Tables'][TableName]['Update']  — update payload
 *  Database['public']['Tables'][TableName]['Relationships'] — FK relations
 *
 * IMPORTANT — `type` vs `interface` for Row shapes :
 *  Supabase's internal type system checks `Row extends Record<string, unknown>`.
 *  In TypeScript strict mode, `interface` declarations do NOT satisfy this
 *  constraint (interfaces are "open" / potentially augmented), but `type`
 *  aliases of object literals DO. All Row shapes must therefore be declared
 *  with `type`, not `interface`.
 *
 * Migration path :
 *  Once `supabase gen types typescript --project-id <id> > src/types/supabase.ts`
 *  is wired into CI, this file can be replaced by the generated output verbatim.
 *  All consumers of `Database` will continue to work without changes.
 *
 * Tables covered :
 *  - job_offers    (queries/offers.ts, publish/offer.ts)
 *  - job_demands   (queries/demands.ts, publish/demand.ts)
 *  - profiles      (joined via profiles!user_id in offer/demand detail queries)
 */

import type {
  ContractType,
  EmploymentType,
  JobCategory,
  ExperienceLevel,
  AvailabilityType,
  JobStatus,
  ApplicationMode,
  VisibilityLevel,
  PromotionType,
  PlanType,
  MobilityMode,
} from './jobs/constants';

// ─── Row shapes (MUST be `type`, not `interface` — see file header) ───────────

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type JobOfferDbRow = {
  id: string;
  slug: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  job_category: JobCategory;
  contract_type: ContractType;
  employment_type: EmploymentType;
  employer_name: string | null;
  employer_address: string | null;
  location_label: string;
  location_city: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  sector_id: string | null;
  is_remote_possible: boolean;
  start_date: string | null;
  end_date: string | null;
  mission_duration_days: number | null;
  availability_type: AvailabilityType;
  short_description: string;
  full_description: string | null;
  required_skills: string[] | null;
  nice_to_have_skills: string[] | null;
  tags: string[] | null;
  experience_level: ExperienceLevel | null;
  experience_years_min: number | null;
  experience_years_max: number | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  salary_period: 'hourly' | 'monthly' | 'yearly' | null;
  salary_is_negotiable: boolean;
  weekly_hours: number | null;
  schedule_details: string | null;
  is_flexible_schedule: boolean;
  has_driving_license: boolean;
  requires_vehicle: boolean;
  application_mode: ApplicationMode;
  contact_email: string | null;
  contact_phone: string | null;
  application_url: string | null;
  contact_instructions: string | null;
  provides_housing: boolean;
  housing_details: string | null;
  provides_meals: boolean;
  other_benefits: string | null;
  status: JobStatus;
  is_urgent: boolean;
  visibility_level: VisibilityLevel;
  promotion_type: PromotionType;
  boosted_until: string | null;
  sponsor_label: string | null;
  completeness_score: number;
  views_count: number;
  contacts_count: number;
  billing_eligible: boolean;
  plan_type: PlanType;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  last_refreshed_at: string | null;
  last_contacted_at: string | null;
  expired_at: string | null;
  filled_at: string | null;
  expired_reason: string | null;
  filled_reason: string | null;
  publication_source: 'web' | 'mobile' | 'api' | null;
  is_moderated: boolean;
  moderation_notes: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type JobDemandDbRow = {
  id: string;
  slug: string;
  user_id: string;
  title: string;
  job_category: JobCategory;
  desired_contract_types: ContractType[];
  desired_employment_types: EmploymentType[];
  location_label: string;
  location_lat: number | null;
  location_lng: number | null;
  sector_id: string | null;
  mobility_radius: number | null;
  mobility_mode: MobilityMode | null;
  availability_type: AvailabilityType;
  available_from: string | null;
  availability_comment: string | null;
  short_description: string;
  full_description: string | null;
  skills: string[] | null;
  tags: string[] | null;
  experience_level: ExperienceLevel | null;
  experience_years: number | null;
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
  salary_period: 'hourly' | 'monthly' | 'yearly' | null;
  weekly_hours_desired: number | null;
  is_flexible_schedule: boolean;
  has_driving_license: boolean;
  has_vehicle: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  contact_mode: string | null;
  cv_url: string | null;
  portfolio_url: string | null;
  location_city: string | null;
  status: JobStatus;
  is_urgent: boolean;
  completeness_score: number;
  views_count: number;
  contacts_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  last_refreshed_at: string | null;
  last_contacted_at: string | null;
  expired_at: string | null;
  filled_at: string | null;
  expired_reason: string | null;
  filled_reason: string | null;
  publication_source: 'web' | 'mobile' | 'api' | null;
  is_moderated: boolean;
  moderation_notes: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProfileDbRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // Additional profile fields (nullable — not all used by jobs queries)
  bio: string | null;
  sector_id: string | null;
  location_label: string | null;
  phone: string | null;
  website_url: string | null;
  is_public: boolean;
};

// ─── Supabase Database generic ────────────────────────────────────────────────

/**
 * Database type for `createClient<Database>()` / `createServerClient<Database>()`.
 *
 * Mirrors the structure produced by `supabase gen types typescript`.
 *
 * Key constraints satisfied for Supabase's internal type machinery:
 *  1. Row shapes are `type` aliases (not `interface`) so they extend
 *     `Record<string, unknown>` in strict mode.
 *  2. Each table has `Relationships: []` (empty tuple typed as never[])
 *     so postgrest-js can infer join types.
 *  3. Views/Functions/Enums/CompositeTypes use `{ [_ in never]: never }`
 *     (not `Record<never, never>`) so they satisfy `Record<string, X>` without
 *     polluting the `from()` overload that resolves table names.
 *
 * Once `supabase gen types typescript --project-id <id>` is wired into CI,
 * this file can be replaced by the generated output verbatim.
 */
export type Database = {
  public: {
    Tables: {
      job_offers: {
        Row: JobOfferDbRow;
        Insert: Partial<JobOfferDbRow> & Pick<JobOfferDbRow, 'user_id' | 'slug' | 'title' | 'job_category' | 'contract_type' | 'employment_type' | 'location_label' | 'short_description' | 'availability_type' | 'application_mode' | 'status'>;
        Update: Partial<JobOfferDbRow>;
        Relationships: [];
      };
      job_demands: {
        Row: JobDemandDbRow;
        Insert: Partial<JobDemandDbRow> & Pick<JobDemandDbRow, 'user_id' | 'slug' | 'title' | 'job_category' | 'location_label' | 'short_description' | 'availability_type' | 'status'>;
        Update: Partial<JobDemandDbRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileDbRow;
        Insert: Partial<ProfileDbRow> & Pick<ProfileDbRow, 'user_id'>;
        Update: Partial<ProfileDbRow>;
        Relationships: [];
      };
    };
    // Canonical empty-schema pattern from `supabase gen types`.
    // `{ [_ in never]: never }` satisfies Record<string, X> without an index
    // signature that would make every string a valid table/view/function name.
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
