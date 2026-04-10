-- ============================================================================
-- MIGRATION v2 — Module Emploi Local — Biguglia Connect
-- À exécuter dans Supabase SQL Editor
-- Cette version utilise les IDs de secteurs canoniques de src/lib/sectors.ts
-- Secteurs : les-collines, figabruna, village, casatorra, ortale, la-plaine, la-marana
-- ============================================================================

-- ── 0. Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TABLE : job_offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_offers (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT          NOT NULL UNIQUE,
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Étape 1 — L'offre
  title                 TEXT          NOT NULL,
  job_category          TEXT          NOT NULL,
  contract_type         TEXT          NOT NULL,
  employment_type       TEXT          DEFAULT 'temps_plein',
  short_description     TEXT,
  full_description      TEXT,

  -- Compétences
  required_skills       TEXT[]        DEFAULT '{}',
  nice_to_have_skills   TEXT[]        DEFAULT '{}',

  -- Étape 2 — Employeur
  employer_name         TEXT,
  location_label        TEXT,
  location_city         TEXT,
  location_address      TEXT,
  -- sector_id : IDs canoniques → les-collines, figabruna, village, casatorra, ortale, la-plaine, la-marana
  sector_id             TEXT,

  -- Télétravail / disponibilité
  is_remote_possible    BOOLEAN       DEFAULT false,
  availability_type     TEXT          DEFAULT 'immediate',
  start_date            DATE,
  end_date              DATE,

  -- Étape 3 — Conditions
  experience_level      TEXT,
  salary_range_min      NUMERIC,
  salary_range_max      NUMERIC,
  salary_period         TEXT,
  salary_type           TEXT,           -- 'net' | 'brut'
  salary_is_negotiable  BOOLEAN       DEFAULT false,
  weekly_hours          NUMERIC,
  schedule_details      TEXT,
  is_flexible_schedule  BOOLEAN       DEFAULT false,
  has_driving_license   BOOLEAN       DEFAULT false,
  requires_vehicle      BOOLEAN       DEFAULT false,
  provides_housing      BOOLEAN       DEFAULT false,
  housing_details       TEXT,
  provides_meals        BOOLEAN       DEFAULT false,
  other_benefits        TEXT,          -- JSON-stringified list

  -- Étape 4 — Contact
  application_mode      TEXT          DEFAULT 'email',
  contact_email         TEXT,
  contact_phone         TEXT,
  contact_instructions  TEXT,
  application_url       TEXT,

  -- Statuts
  status                TEXT          DEFAULT 'published',
  is_urgent             BOOLEAN       DEFAULT false,
  visibility_level      TEXT          DEFAULT 'public',
  promotion_type        TEXT          DEFAULT 'standard',

  -- Scores & stats
  completeness_score    INTEGER       DEFAULT 0,
  freshness_score       INTEGER       DEFAULT 100,
  views_count           INTEGER       DEFAULT 0,
  contacts_count        INTEGER       DEFAULT 0,

  -- Facturation
  billing_eligible      BOOLEAN       DEFAULT false,
  plan_type             TEXT          DEFAULT 'free',

  -- Modération
  moderation_status     TEXT          DEFAULT 'approved',
  is_moderated          BOOLEAN       DEFAULT false,
  moderation_notes      TEXT,

  -- Dates
  published_at          TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   DEFAULT now(),
  updated_at            TIMESTAMPTZ   DEFAULT now()
);

-- ============================================================================
-- TABLE : job_demands
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_demands (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT          NOT NULL UNIQUE,
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Étape 1 — Profil
  title                 TEXT          NOT NULL,
  job_category          TEXT          NOT NULL,
  contract_types        TEXT[]        DEFAULT '{}',
  desired_contract_types TEXT[]       DEFAULT '{}',
  employment_type       TEXT          DEFAULT 'flexible',
  short_description     TEXT,
  full_description      TEXT,
  profile_description   TEXT,
  experience_summary    TEXT,

  -- Localisation
  location_label        TEXT,
  location_city         TEXT,
  -- sector_id : IDs canoniques → les-collines, figabruna, village, casatorra, ortale, la-plaine, la-marana
  sector_id             TEXT,
  mobility_radius       INTEGER,

  -- Étape 3 — Disponibilité
  availability_type     TEXT          DEFAULT 'flexible',
  available_from        DATE,

  -- Étape 2 — Expérience
  experience_level      TEXT,

  -- Salaire souhaité
  salary_expectation_min NUMERIC,
  salary_expectation_max NUMERIC,
  salary_period         TEXT,
  salary_type           TEXT,           -- 'net' | 'brut'
  weekly_hours_desired  NUMERIC,
  is_flexible_schedule  BOOLEAN       DEFAULT false,

  -- Mobilité
  has_driving_license   BOOLEAN       DEFAULT false,
  has_vehicle           BOOLEAN       DEFAULT false,

  -- CV
  cv_url                TEXT,

  -- Étape 4 — Contact
  contact_email         TEXT,
  contact_phone         TEXT,
  contact_mode          TEXT          DEFAULT 'email',
  contact_instructions  TEXT,

  -- Statuts
  status                TEXT          DEFAULT 'active',
  is_urgent             BOOLEAN       DEFAULT false,

  -- Scores & stats
  completeness_score    INTEGER       DEFAULT 0,
  freshness_score       INTEGER       DEFAULT 100,
  views_count           INTEGER       DEFAULT 0,
  contacts_count        INTEGER       DEFAULT 0,

  -- Modération
  moderation_status     TEXT          DEFAULT 'approved',
  is_moderated          BOOLEAN       DEFAULT false,

  -- Dates
  published_at          TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   DEFAULT now(),
  updated_at            TIMESTAMPTZ   DEFAULT now()
);

-- ============================================================================
-- INDEX DE PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_job_offers_status        ON public.job_offers (status);
CREATE INDEX IF NOT EXISTS idx_job_offers_slug          ON public.job_offers (slug);
CREATE INDEX IF NOT EXISTS idx_job_offers_sector        ON public.job_offers (sector_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_category      ON public.job_offers (job_category);
CREATE INDEX IF NOT EXISTS idx_job_offers_user          ON public.job_offers (user_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_published_at  ON public.job_offers (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_urgent        ON public.job_offers (is_urgent) WHERE is_urgent = true;

CREATE INDEX IF NOT EXISTS idx_job_demands_status       ON public.job_demands (status);
CREATE INDEX IF NOT EXISTS idx_job_demands_slug         ON public.job_demands (slug);
CREATE INDEX IF NOT EXISTS idx_job_demands_sector       ON public.job_demands (sector_id);
CREATE INDEX IF NOT EXISTS idx_job_demands_category     ON public.job_demands (job_category);
CREATE INDEX IF NOT EXISTS idx_job_demands_user         ON public.job_demands (user_id);
CREATE INDEX IF NOT EXISTS idx_job_demands_published_at ON public.job_demands (published_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.job_offers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_demands ENABLE ROW LEVEL SECURITY;

-- Lecture publique
DROP POLICY IF EXISTS "job_offers_public_read"  ON public.job_offers;
DROP POLICY IF EXISTS "job_demands_public_read" ON public.job_demands;

CREATE POLICY "job_offers_public_read"
  ON public.job_offers FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "job_demands_public_read"
  ON public.job_demands FOR SELECT
  TO anon, authenticated
  USING (status IN ('active', 'published'));

-- CRUD authentifié (ses propres annonces)
DROP POLICY IF EXISTS "job_offers_own_crud"  ON public.job_offers;
DROP POLICY IF EXISTS "job_demands_own_crud" ON public.job_demands;

CREATE POLICY "job_offers_own_crud"
  ON public.job_offers FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "job_demands_own_crud"
  ON public.job_demands FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- BUCKET STORAGE pour les CVs
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-documents',
  'job-documents',
  true,
  5242880,  -- 5 MB
  ARRAY['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg','image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Politique storage : lecture publique
DROP POLICY IF EXISTS "job_docs_public_read" ON storage.objects;
CREATE POLICY "job_docs_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-documents');

-- Politique storage : upload authentifié
DROP POLICY IF EXISTS "job_docs_auth_insert" ON storage.objects;
CREATE POLICY "job_docs_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-documents');

-- ============================================================================
-- TRIGGER updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_job_offers_updated_at  ON public.job_offers;
DROP TRIGGER IF EXISTS set_job_demands_updated_at ON public.job_demands;

CREATE TRIGGER set_job_offers_updated_at
  BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_job_demands_updated_at
  BEFORE UPDATE ON public.job_demands
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
