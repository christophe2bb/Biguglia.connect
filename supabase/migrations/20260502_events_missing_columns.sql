-- ============================================================================
-- MIGRATION 20260502_events_missing_columns
-- ★ Ajout des colonnes manquantes sur la table events ★
--
-- Colonnes ajoutées (toutes avec IF NOT EXISTS — idempotent) :
--   price_type, price_amount, capacity, is_unlimited, start_time, end_time,
--   subtitle, event_end_date, location_area, location_detail, accessibility,
--   contact_info, external_link, target_audience, registration_open, sector_id,
--   organizer_name, tags, is_free
--
-- IDEMPOTENT : ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- ============================================================================

-- ── Prix ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price_type   TEXT    DEFAULT 'gratuit'
    CHECK (price_type IN ('gratuit', 'payant', 'libre')),
  ADD COLUMN IF NOT EXISTS price_amount NUMERIC(10,2) DEFAULT NULL;

-- ── Capacité ─────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS capacity     INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN NOT NULL DEFAULT true;

-- ── Horaires ─────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS start_time     TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS end_time       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS event_end_date DATE DEFAULT NULL;

-- ── Détails lieu ─────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_area   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location_detail TEXT DEFAULT NULL;

-- ── Sous-titre ───────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT NULL;

-- ── Accessibilité & contact ───────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS accessibility   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_info    TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS external_link   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT NULL;

-- ── Inscription ───────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_open BOOLEAN NOT NULL DEFAULT true;

-- ── Secteur ───────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS sector_id TEXT DEFAULT NULL;

-- ── Organisateur ─────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_name TEXT DEFAULT NULL;

-- ── Tags ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ── Gratuit (bool legacy) ────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_free BOOLEAN NOT NULL DEFAULT true;

-- ── Vues ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

-- ── Mise à jour automatique is_free en fonction de price_type ────────────────
-- (optionnel mais cohérent)
UPDATE public.events
  SET is_free = (price_type = 'gratuit')
  WHERE price_type IS NOT NULL;

-- ── Commentaire récapitulatif ─────────────────────────────────────────────────
COMMENT ON COLUMN public.events.price_type   IS 'gratuit | payant | libre';
COMMENT ON COLUMN public.events.price_amount IS 'Montant en € si price_type = payant';
COMMENT ON COLUMN public.events.sector_id    IS 'Slug du secteur géographique (SECTORS)';
COMMENT ON COLUMN public.events.tags         IS 'Mots-clés libres de l''événement';
