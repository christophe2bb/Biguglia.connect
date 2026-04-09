-- ============================================================================
-- MIGRATION COMPLÈTE — Module Emploi Local
-- Biguglia Connect — À exécuter dans Supabase SQL Editor
-- ============================================================================
-- Ordre d'exécution :
--   1. Extensions
--   2. Table job_offers
--   3. Table job_demands
--   4. Index de performance
--   5. RLS (Row Level Security)
--   6. Bucket Storage pour les CVs
-- ============================================================================

-- ── 0. Extensions nécessaires ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- pour la recherche full-text

-- ============================================================================
-- TABLE : job_offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_offers (
  -- Identifiants
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT          NOT NULL UNIQUE,
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- L'offre (étape 1)
  title                 TEXT          NOT NULL,
  job_category          TEXT          NOT NULL,
  contract_type         TEXT          NOT NULL,
  employment_type       TEXT          NOT NULL DEFAULT 'temps_plein',
  short_description     TEXT,
  full_description      TEXT,
  required_skills       TEXT[],
  nice_to_have_skills   TEXT[],
  tags                  TEXT[],

  -- Employeur (étape 2)
  employer_name         TEXT,
  location_label        TEXT,
  location_city         TEXT,
  location_address      TEXT,
  location_lat          DOUBLE PRECISION,
  location_lng          DOUBLE PRECISION,
  sector_id             TEXT,
  is_remote_possible    BOOLEAN       NOT NULL DEFAULT false,

  -- Dates / timing
  availability_type     TEXT          NOT NULL DEFAULT 'immediate',
  start_date            DATE,
  end_date              DATE,
  mission_duration_days INTEGER,

  -- Expérience
  experience_level      TEXT,
  experience_years_min  INTEGER,
  experience_years_max  INTEGER,

  -- Salaire (étape 3)
  salary_range_min      NUMERIC(10,2),
  salary_range_max      NUMERIC(10,2),
  salary_period         TEXT,                   -- 'hourly' | 'monthly' | 'yearly'
  salary_type           TEXT,                   -- 'net' | 'brut'
  salary_is_negotiable  BOOLEAN       NOT NULL DEFAULT false,

  -- Horaires (étape 3)
  weekly_hours          NUMERIC(5,1),
  schedule_details      TEXT,
  is_flexible_schedule  BOOLEAN       NOT NULL DEFAULT false,

  -- Prérequis
  has_driving_license   BOOLEAN       NOT NULL DEFAULT false,
  requires_vehicle      BOOLEAN       NOT NULL DEFAULT false,

  -- Avantages (étape 3)
  provides_housing      BOOLEAN       NOT NULL DEFAULT false,
  housing_details       TEXT,
  provides_meals        BOOLEAN       NOT NULL DEFAULT false,
  other_benefits        TEXT,                   -- liste séparée par virgules

  -- Contact (étape 4)
  application_mode      TEXT          NOT NULL DEFAULT 'email',
  contact_email         TEXT,
  contact_phone         TEXT,
  application_url       TEXT,
  contact_instructions  TEXT,

  -- Statut & visibilité
  status                TEXT          NOT NULL DEFAULT 'published',
  is_urgent             BOOLEAN       NOT NULL DEFAULT false,
  visibility_level      TEXT          NOT NULL DEFAULT 'public',
  promotion_type        TEXT          NOT NULL DEFAULT 'standard',
  boosted_until         TIMESTAMPTZ,
  sponsor_label         TEXT,

  -- Scores
  completeness_score    INTEGER       NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  freshness_score       INTEGER       NOT NULL DEFAULT 100 CHECK (freshness_score BETWEEN 0 AND 100),

  -- Statistiques
  views_count           INTEGER       NOT NULL DEFAULT 0,
  contacts_count        INTEGER       NOT NULL DEFAULT 0,

  -- Facturation
  billing_eligible      BOOLEAN       NOT NULL DEFAULT false,
  plan_type             TEXT          NOT NULL DEFAULT 'free',

  -- Modération
  moderation_status     TEXT          NOT NULL DEFAULT 'approved',
  is_moderated          BOOLEAN       NOT NULL DEFAULT false,
  moderation_notes      TEXT,

  -- Cycle de vie
  published_at          TIMESTAMPTZ,
  last_refreshed_at     TIMESTAMPTZ,
  last_contacted_at     TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  expired_at            TIMESTAMPTZ,
  filled_at             TIMESTAMPTZ,
  expired_reason        TEXT,
  filled_reason         TEXT,
  publication_source    TEXT          DEFAULT 'web',

  -- Audit
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE : job_demands
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_demands (
  -- Identifiants
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                      TEXT          NOT NULL UNIQUE,
  user_id                   UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profil (étape 1)
  title                     TEXT          NOT NULL,
  job_category              TEXT          NOT NULL,
  contract_types            TEXT[]        NOT NULL DEFAULT '{}',
  -- desired_contract_types est un alias métier de contract_types, géré côté app
  desired_contract_types    TEXT[]        NOT NULL DEFAULT '{}',
  employment_type           TEXT          NOT NULL DEFAULT 'flexible',
  desired_employment_types  TEXT[]        NOT NULL DEFAULT '{}',
  short_description         TEXT,
  full_description          TEXT,
  profile_description       TEXT,
  skills                    TEXT[],
  tags                      TEXT[],

  -- Localisation
  location_label            TEXT,
  location_city             TEXT,
  location_lat              DOUBLE PRECISION,
  location_lng              DOUBLE PRECISION,
  sector_id                 TEXT,
  mobility_radius           INTEGER,              -- km
  mobility_mode             TEXT,

  -- Disponibilité (étape 3)
  availability_type         TEXT          NOT NULL DEFAULT 'flexible',
  available_from            DATE,
  availability_comment      TEXT,

  -- Expérience (étape 2)
  experience_level          TEXT,
  experience_years          INTEGER,
  experience_summary        TEXT,

  -- Salaire souhaité (étape 3)
  salary_expectation_min    NUMERIC(10,2),
  salary_expectation_max    NUMERIC(10,2),
  salary_period             TEXT,
  salary_type               TEXT,                 -- 'net' | 'brut'

  -- Horaires souhaités (étape 3)
  weekly_hours_desired      NUMERIC(5,1),
  is_flexible_schedule      BOOLEAN       NOT NULL DEFAULT false,

  -- Atouts (étape 2)
  has_driving_license       BOOLEAN       NOT NULL DEFAULT false,
  has_vehicle               BOOLEAN       NOT NULL DEFAULT false,

  -- Documents
  cv_url                    TEXT,
  portfolio_url             TEXT,

  -- Contact (étape 4)
  contact_email             TEXT,
  contact_phone             TEXT,
  contact_mode              TEXT          NOT NULL DEFAULT 'email',
  contact_instructions      TEXT,

  -- Statut
  status                    TEXT          NOT NULL DEFAULT 'active',
  is_urgent                 BOOLEAN       NOT NULL DEFAULT false,

  -- Scores
  completeness_score        INTEGER       NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  freshness_score           INTEGER       NOT NULL DEFAULT 100 CHECK (freshness_score BETWEEN 0 AND 100),

  -- Statistiques
  views_count               INTEGER       NOT NULL DEFAULT 0,
  contacts_count            INTEGER       NOT NULL DEFAULT 0,

  -- Modération
  moderation_status         TEXT          NOT NULL DEFAULT 'approved',
  is_moderated              BOOLEAN       NOT NULL DEFAULT false,
  moderation_notes          TEXT,

  -- Cycle de vie
  published_at              TIMESTAMPTZ,
  last_refreshed_at         TIMESTAMPTZ,
  last_contacted_at         TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ,
  expired_at                TIMESTAMPTZ,
  filled_at                 TIMESTAMPTZ,
  expired_reason            TEXT,
  filled_reason             TEXT,
  publication_source        TEXT          DEFAULT 'web',

  -- Audit
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEX DE PERFORMANCE
-- ============================================================================

-- job_offers
CREATE INDEX IF NOT EXISTS idx_job_offers_status        ON public.job_offers(status);
CREATE INDEX IF NOT EXISTS idx_job_offers_user_id       ON public.job_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_slug          ON public.job_offers(slug);
CREATE INDEX IF NOT EXISTS idx_job_offers_category      ON public.job_offers(job_category);
CREATE INDEX IF NOT EXISTS idx_job_offers_contract      ON public.job_offers(contract_type);
CREATE INDEX IF NOT EXISTS idx_job_offers_sector        ON public.job_offers(sector_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_published_at  ON public.job_offers(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_urgent        ON public.job_offers(is_urgent) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_job_offers_city          ON public.job_offers(location_city);
CREATE INDEX IF NOT EXISTS idx_job_offers_title_trgm    ON public.job_offers USING gin(title gin_trgm_ops);

-- job_demands
CREATE INDEX IF NOT EXISTS idx_job_demands_status       ON public.job_demands(status);
CREATE INDEX IF NOT EXISTS idx_job_demands_user_id      ON public.job_demands(user_id);
CREATE INDEX IF NOT EXISTS idx_job_demands_slug         ON public.job_demands(slug);
CREATE INDEX IF NOT EXISTS idx_job_demands_category     ON public.job_demands(job_category);
CREATE INDEX IF NOT EXISTS idx_job_demands_sector       ON public.job_demands(sector_id);
CREATE INDEX IF NOT EXISTS idx_job_demands_published_at ON public.job_demands(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_demands_urgent       ON public.job_demands(is_urgent) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_job_demands_city         ON public.job_demands(location_city);

-- ============================================================================
-- TRIGGERS : updated_at automatique
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_offers_updated_at  ON public.job_offers;
DROP TRIGGER IF EXISTS trg_job_demands_updated_at ON public.job_demands;

CREATE TRIGGER trg_job_offers_updated_at
  BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_job_demands_updated_at
  BEFORE UPDATE ON public.job_demands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.job_offers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_demands ENABLE ROW LEVEL SECURITY;

-- ── job_offers ────────────────────────────────────────────────────────────────

-- Lecture publique : tout le monde voit les offres publiées
DROP POLICY IF EXISTS "job_offers_select_published" ON public.job_offers;
CREATE POLICY "job_offers_select_published"
  ON public.job_offers FOR SELECT
  USING (status = 'published' AND moderation_status = 'approved');

-- L'auteur voit toutes ses propres offres (même drafts)
DROP POLICY IF EXISTS "job_offers_select_own" ON public.job_offers;
CREATE POLICY "job_offers_select_own"
  ON public.job_offers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insertion : uniquement les utilisateurs connectés
DROP POLICY IF EXISTS "job_offers_insert" ON public.job_offers;
CREATE POLICY "job_offers_insert"
  ON public.job_offers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Modification : uniquement l'auteur
DROP POLICY IF EXISTS "job_offers_update" ON public.job_offers;
CREATE POLICY "job_offers_update"
  ON public.job_offers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Suppression : uniquement l'auteur
DROP POLICY IF EXISTS "job_offers_delete" ON public.job_offers;
CREATE POLICY "job_offers_delete"
  ON public.job_offers FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ── job_demands ───────────────────────────────────────────────────────────────

-- Lecture publique : demandes actives approuvées
DROP POLICY IF EXISTS "job_demands_select_published" ON public.job_demands;
CREATE POLICY "job_demands_select_published"
  ON public.job_demands FOR SELECT
  USING (status = 'active' AND moderation_status = 'approved');

-- L'auteur voit toutes ses propres demandes
DROP POLICY IF EXISTS "job_demands_select_own" ON public.job_demands;
CREATE POLICY "job_demands_select_own"
  ON public.job_demands FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insertion
DROP POLICY IF EXISTS "job_demands_insert" ON public.job_demands;
CREATE POLICY "job_demands_insert"
  ON public.job_demands FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Modification
DROP POLICY IF EXISTS "job_demands_update" ON public.job_demands;
CREATE POLICY "job_demands_update"
  ON public.job_demands FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Suppression
DROP POLICY IF EXISTS "job_demands_delete" ON public.job_demands;
CREATE POLICY "job_demands_delete"
  ON public.job_demands FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- STORAGE BUCKET : CVs
-- (à créer manuellement dans Supabase > Storage si ce SQL échoue sur cette partie)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-documents',
  'job-documents',
  true,
  5242880,  -- 5 Mo max
  ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Politique Storage : lecture publique
DROP POLICY IF EXISTS "job_documents_public_read" ON storage.objects;
CREATE POLICY "job_documents_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-documents');

-- Politique Storage : upload authentifié uniquement
DROP POLICY IF EXISTS "job_documents_auth_insert" ON storage.objects;
CREATE POLICY "job_documents_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'job-documents');

-- Politique Storage : suppression par propriétaire
DROP POLICY IF EXISTS "job_documents_owner_delete" ON storage.objects;
CREATE POLICY "job_documents_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-documents' AND owner = auth.uid());

-- ============================================================================
-- FIN DE MIGRATION
-- ✅ Tables : job_offers, job_demands
-- ✅ Index  : 10 index sur job_offers, 8 sur job_demands
-- ✅ RLS    : 5 policies par table
-- ✅ Storage: bucket job-documents (CV, PDF, DOC)
-- ============================================================================
