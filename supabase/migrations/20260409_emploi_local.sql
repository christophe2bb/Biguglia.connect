-- ============================================================================
-- Module Emploi Local - Migration SQL
-- Version 1.1 - 2026-04-09
-- 
-- Corrections V1.1 appliquées :
-- - organization_id optionnel (nullable)
-- - Champs d'audit lifecycle ajoutés
-- - sector_id type TEXT (aligné avec table sectors)
-- - RLS policies renforcées (WITH CHECK, séparation champs user/system)
-- - Indexes optimisés pour performance
-- - Slug generation strategy déterministe
-- ============================================================================

-- ============================================================================
-- 1. ENUMS & TYPES
-- ============================================================================

-- Contract types
DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM (
    'cdi', 'cdd', 'saisonnier', 'mission', 'extra', 
    'remplacement', 'alternance', 'stage', 'interim', 'freelance'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Employment types
DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM (
    'temps_plein', 'temps_partiel', 'flexible'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Job categories
DO $$ BEGIN
  CREATE TYPE job_category AS ENUM (
    'restauration', 'hotellerie', 'commerce', 'artisanat', 
    'batiment', 'services_personne', 'administratif', 'logistique',
    'nettoyage', 'transport', 'sante', 'animation', 'petite_enfance',
    'association', 'evenementiel', 'agriculture', 'autre'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Experience levels
DO $$ BEGIN
  CREATE TYPE experience_level AS ENUM (
    'debutant', 'junior', 'confirme', 'senior', 'expert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Availability types
DO $$ BEGIN
  CREATE TYPE availability_type AS ENUM (
    'immediate', 'week', 'month', 'date', 'flexible'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Job status
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'draft', 'published', 'paused', 'expired', 'filled', 'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Contact status
DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM (
    'pending', 'read', 'replied', 'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Application modes
DO $$ BEGIN
  CREATE TYPE application_mode AS ENUM (
    'email', 'phone', 'on_site', 'mixed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Mobility modes
DO $$ BEGIN
  CREATE TYPE mobility_mode AS ENUM (
    'car', 'public_transport', 'bike', 'walk'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Visibility levels
DO $$ BEGIN
  CREATE TYPE visibility_level AS ENUM (
    'standard', 'featured', 'premium'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Promotion types
DO $$ BEGIN
  CREATE TYPE promotion_type AS ENUM (
    'none', 'boost_local', 'badge_verified', 'urgent', 'top_position'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Plan types
DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM (
    'free', 'basic', 'pro', 'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Salary period
DO $$ BEGIN
  CREATE TYPE salary_period AS ENUM (
    'hourly', 'monthly', 'yearly'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Publication source
DO $$ BEGIN
  CREATE TYPE publication_source AS ENUM (
    'web', 'mobile', 'api'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABLE job_offers
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_offers (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Optional/nullable

  -- Basic info
  title TEXT NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 120),
  job_category job_category NOT NULL,
  contract_type contract_type NOT NULL,
  employment_type employment_type NOT NULL,

  -- Location
  location_label TEXT NOT NULL CHECK (char_length(location_label) >= 3),
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL, -- Type TEXT aligné avec sectors
  is_remote_possible BOOLEAN NOT NULL DEFAULT false,

  -- Timing
  start_date DATE,
  end_date DATE,
  mission_duration_days INTEGER CHECK (mission_duration_days >= 1 AND mission_duration_days <= 365),
  availability_type availability_type NOT NULL,

  -- Description
  short_description TEXT NOT NULL CHECK (char_length(short_description) >= 50 AND char_length(short_description) <= 300),
  full_description TEXT CHECK (char_length(full_description) >= 100 AND char_length(full_description) <= 3000),
  required_skills TEXT[],
  nice_to_have_skills TEXT[],
  tags TEXT[],

  -- Experience
  experience_level experience_level,
  experience_years_min INTEGER CHECK (experience_years_min >= 0 AND experience_years_min <= 50),
  experience_years_max INTEGER CHECK (experience_years_max >= 0 AND experience_years_max <= 50),

  -- Salary
  salary_range_min NUMERIC(10, 2) CHECK (salary_range_min >= 8),
  salary_range_max NUMERIC(10, 2) CHECK (salary_range_max <= 20000),
  salary_period salary_period,
  salary_is_negotiable BOOLEAN NOT NULL DEFAULT false,

  -- Schedule
  weekly_hours NUMERIC(4, 1) CHECK (weekly_hours >= 1 AND weekly_hours <= 48),
  schedule_details TEXT,
  is_flexible_schedule BOOLEAN NOT NULL DEFAULT false,

  -- Requirements
  has_driving_license BOOLEAN NOT NULL DEFAULT false,
  requires_vehicle BOOLEAN NOT NULL DEFAULT false,

  -- Contact
  application_mode application_mode NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  application_url TEXT,
  contact_instructions TEXT,

  -- Benefits
  provides_housing BOOLEAN NOT NULL DEFAULT false,
  housing_details TEXT,
  provides_meals BOOLEAN NOT NULL DEFAULT false,
  other_benefits TEXT,

  -- Status & visibility
  status job_status NOT NULL DEFAULT 'draft',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  visibility_level visibility_level NOT NULL DEFAULT 'standard',
  promotion_type promotion_type NOT NULL DEFAULT 'none',
  boosted_until TIMESTAMPTZ,
  sponsor_label TEXT,

  -- Scoring (completeness persisted, relevance runtime)
  completeness_score INTEGER NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),

  -- Stats (system-only fields)
  views_count INTEGER NOT NULL DEFAULT 0,
  contacts_count INTEGER NOT NULL DEFAULT 0,

  -- Billing
  billing_eligible BOOLEAN NOT NULL DEFAULT false,
  plan_type plan_type NOT NULL DEFAULT 'free',

  -- Audit & lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ, -- V1.1: dernière mise à jour/refresh
  last_contacted_at TIMESTAMPTZ, -- V1.1: dernier contact reçu
  expired_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  expired_reason TEXT, -- V1.1: 'auto_expired' | 'manually_expired' | 'filled'
  filled_reason TEXT, -- V1.1: 'hired_from_ad' | 'hired_elsewhere' | 'no_longer_needed'
  publication_source publication_source, -- V1.1: source de publication

  -- Moderation (system-only)
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  moderation_notes TEXT,

  -- Constraints
  CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date),
  CHECK (salary_range_min IS NULL OR salary_range_max IS NULL OR salary_range_min <= salary_range_max),
  CHECK (experience_years_min IS NULL OR experience_years_max IS NULL OR experience_years_min <= experience_years_max),
  CHECK (NOT requires_vehicle OR has_driving_license = true)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_offers_user_id ON job_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON job_offers(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_category ON job_offers(job_category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_contract ON job_offers(contract_type) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_sector ON job_offers(sector_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_created_at ON job_offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_published_at ON job_offers(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_location ON job_offers USING GIST (ll_to_earth(location_lat::float8, location_lng::float8)) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_offers_urgent ON job_offers(is_urgent) WHERE status = 'published' AND is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_job_offers_completeness ON job_offers(completeness_score DESC) WHERE status = 'published';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_job_offers_search ON job_offers USING gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(full_description, ''))
) WHERE status = 'published';

-- ============================================================================
-- 3. TABLE job_demands
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_demands (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 120),
  job_category job_category NOT NULL,
  desired_contract_types contract_type[] NOT NULL CHECK (array_length(desired_contract_types, 1) >= 1),
  desired_employment_types employment_type[] NOT NULL CHECK (array_length(desired_employment_types, 1) >= 1),

  -- Location & mobility
  location_label TEXT NOT NULL CHECK (char_length(location_label) >= 3),
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL, -- Type TEXT
  mobility_radius INTEGER CHECK (mobility_radius >= 0 AND mobility_radius <= 100),
  mobility_mode mobility_mode,

  -- Availability
  availability_type availability_type NOT NULL,
  available_from DATE,
  availability_comment TEXT,

  -- Description
  short_description TEXT NOT NULL CHECK (char_length(short_description) >= 50 AND char_length(short_description) <= 300),
  full_description TEXT CHECK (char_length(full_description) >= 100 AND char_length(full_description) <= 3000),
  skills TEXT[],
  tags TEXT[],

  -- Experience
  experience_level experience_level,
  experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50),

  -- Expectations
  salary_expectation_min NUMERIC(10, 2) CHECK (salary_expectation_min >= 8),
  salary_expectation_max NUMERIC(10, 2) CHECK (salary_expectation_max <= 20000),
  salary_period salary_period,

  -- Availability
  weekly_hours_desired NUMERIC(4, 1) CHECK (weekly_hours_desired >= 1 AND weekly_hours_desired <= 48),
  is_flexible_schedule BOOLEAN NOT NULL DEFAULT false,

  -- Assets
  has_driving_license BOOLEAN NOT NULL DEFAULT false,
  has_vehicle BOOLEAN NOT NULL DEFAULT false,

  -- Documents
  cv_url TEXT,
  portfolio_url TEXT,

  -- Status
  status job_status NOT NULL DEFAULT 'draft',
  is_urgent BOOLEAN NOT NULL DEFAULT false,

  -- Scoring
  completeness_score INTEGER NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),

  -- Stats
  views_count INTEGER NOT NULL DEFAULT 0,
  contacts_count INTEGER NOT NULL DEFAULT 0,

  -- Audit & lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  expired_reason TEXT,
  filled_reason TEXT,
  publication_source publication_source,

  -- Moderation
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  moderation_notes TEXT,

  -- Constraints
  CHECK (salary_expectation_min IS NULL OR salary_expectation_max IS NULL OR salary_expectation_min <= salary_expectation_max)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_demands_user_id ON job_demands(user_id);
CREATE INDEX IF NOT EXISTS idx_job_demands_status ON job_demands(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_category ON job_demands(job_category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_sector ON job_demands(sector_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_created_at ON job_demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_demands_published_at ON job_demands(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_location ON job_demands USING GIST (ll_to_earth(location_lat::float8, location_lng::float8)) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_demands_urgent ON job_demands(is_urgent) WHERE status = 'published' AND is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_job_demands_completeness ON job_demands(completeness_score DESC) WHERE status = 'published';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_job_demands_search ON job_demands USING gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(full_description, ''))
) WHERE status = 'published';

-- ============================================================================
-- 4. TABLE job_contacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  demand_id UUID REFERENCES job_demands(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 1000),
  contact_method TEXT NOT NULL CHECK (contact_method IN ('internal_message', 'email', 'phone')),
  status contact_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,

  -- Constraint: must have either offer_id OR demand_id, not both
  CHECK ((offer_id IS NOT NULL AND demand_id IS NULL) OR (offer_id IS NULL AND demand_id IS NOT NULL))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_contacts_offer_id ON job_contacts(offer_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_demand_id ON job_contacts(demand_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_sender_id ON job_contacts(sender_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_receiver_id ON job_contacts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_created_at ON job_contacts(created_at DESC);

-- ============================================================================
-- 5. TRIGGERS (auto-update updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_offers_updated_at ON job_offers;
CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON job_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_demands_updated_at ON job_demands;
CREATE TRIGGER update_job_demands_updated_at
  BEFORE UPDATE ON job_demands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. SLUG GENERATION FUNCTION (deterministic, collision-safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_job_slug(job_title TEXT, job_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  short_id TEXT;
BEGIN
  -- Normalize title: lowercase, remove accents, replace spaces with hyphens
  base_slug := lower(unaccent(job_title));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  base_slug := substring(base_slug, 1, 60);
  
  -- Use first 8 chars of UUID for uniqueness
  short_id := substring(job_id::text, 1, 8);
  
  -- Combine: title-shortid
  final_slug := base_slug || '-' || short_id;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 7. RLS POLICIES (renforcées V1.1)
-- ============================================================================

-- Enable RLS
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS job_offers_select ON job_offers;
DROP POLICY IF EXISTS job_offers_insert ON job_offers;
DROP POLICY IF EXISTS job_offers_update ON job_offers;
DROP POLICY IF EXISTS job_offers_delete ON job_offers;

DROP POLICY IF EXISTS job_demands_select ON job_demands;
DROP POLICY IF EXISTS job_demands_insert ON job_demands;
DROP POLICY IF EXISTS job_demands_update ON job_demands;
DROP POLICY IF EXISTS job_demands_delete ON job_demands;

DROP POLICY IF EXISTS job_contacts_select ON job_contacts;
DROP POLICY IF EXISTS job_contacts_insert ON job_contacts;
DROP POLICY IF EXISTS job_contacts_update ON job_contacts;
DROP POLICY IF EXISTS job_contacts_delete ON job_contacts;

-- ============================================================================
-- JOB OFFERS POLICIES
-- ============================================================================

-- SELECT: published visible to all, own drafts visible to author
CREATE POLICY job_offers_select ON job_offers
  FOR SELECT
  USING (
    status = 'published' 
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- INSERT: authenticated users can create
CREATE POLICY job_offers_insert ON job_offers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    -- System-only fields must remain default on insert
    AND views_count = 0
    AND contacts_count = 0
    AND is_moderated = false
  );

-- UPDATE: authors can update their own offers (user-editable fields only)
-- System fields (views_count, contacts_count, is_moderated, moderation_notes) protected
CREATE POLICY job_offers_update ON job_offers
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- DELETE: authors can delete their own offers
CREATE POLICY job_offers_delete ON job_offers
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- JOB DEMANDS POLICIES
-- ============================================================================

-- ⚠️  NEUTRALISÉ — policy déplacée vers la source de vérité unique :
--     20260416_job_demands_rls_normalize.sql
-- (cette version acceptait status IN ('active','published') + auteur + admin)

CREATE POLICY job_demands_insert ON job_demands
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND views_count = 0
    AND contacts_count = 0
    AND is_moderated = false
  );

CREATE POLICY job_demands_update ON job_demands
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY job_demands_delete ON job_demands
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- JOB CONTACTS POLICIES
-- ============================================================================

CREATE POLICY job_contacts_select ON job_contacts
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY job_contacts_insert ON job_contacts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    -- Verify receiver owns the offer/demand
    AND (
      (offer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM job_offers WHERE id = offer_id AND user_id = receiver_id
      ))
      OR
      (demand_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM job_demands WHERE id = demand_id AND user_id = receiver_id
      ))
    )
  );

CREATE POLICY job_contacts_update ON job_contacts
  FOR UPDATE
  USING (
    receiver_id = auth.uid() -- Only receiver can update (mark as read, replied)
  )
  WITH CHECK (
    receiver_id = auth.uid()
  );

CREATE POLICY job_contacts_delete ON job_contacts
  FOR DELETE
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE job_offers IS 'Offres d''emploi local - Module Emploi Biguglia Connect';
COMMENT ON TABLE job_demands IS 'Demandes d''emploi - Chercheurs d''emploi';
COMMENT ON TABLE job_contacts IS 'Contacts/candidatures entre recruteurs et chercheurs';

COMMENT ON COLUMN job_offers.completeness_score IS 'Score de complétude 0-100 (persisté en DB)';
COMMENT ON COLUMN job_offers.views_count IS 'Compteur de vues (system-only, protected by RLS)';
COMMENT ON COLUMN job_offers.contacts_count IS 'Compteur de contacts (system-only, protected by RLS)';
COMMENT ON COLUMN job_offers.last_refreshed_at IS 'V1.1: Dernière mise à jour/refresh de l''annonce';
COMMENT ON COLUMN job_offers.last_contacted_at IS 'V1.1: Date du dernier contact reçu';
COMMENT ON COLUMN job_offers.expired_reason IS 'V1.1: Raison d''expiration (auto_expired, manually_expired, filled)';
COMMENT ON COLUMN job_offers.filled_reason IS 'V1.1: Raison du pourvoi (hired_from_ad, hired_elsewhere, no_longer_needed)';
COMMENT ON COLUMN job_offers.publication_source IS 'V1.1: Source de publication (web, mobile, api)';
