-- ===========================================================================
-- MIGRATION CONSOLIDÉE : Toutes les colonnes manquantes de listings
-- Date : 2026-04-13
-- Exécuter dans Supabase → SQL Editor
-- Idempotent : utilise IF NOT EXISTS partout, peut être relancé sans risque
-- ===========================================================================

-- ── 1. Contraintes sur listing_type et status ──────────────────────────────
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('sale', 'wanted', 'free', 'exchange', 'service', 'rental'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'reserved', 'sold', 'given', 'exchanged', 'closed', 'expired', 'archived', 'hidden'));

-- ── 2. Ajout de toutes les colonnes manquantes (idempotent) ────────────────
DO $$ BEGIN

  -- Prix négociable (booléen simple)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_negotiable') THEN
    ALTER TABLE listings ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Annonce urgente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_urgent') THEN
    ALTER TABLE listings ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Statut de modération
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='moderation_status') THEN
    ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'en_attente_validation';
  END IF;

  -- Secteur géographique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='sector_id') THEN
    ALTER TABLE listings ADD COLUMN sector_id TEXT;
  END IF;

  -- État de l'objet (texte libre)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='condition_state') THEN
    ALTER TABLE listings ADD COLUMN condition_state TEXT;
  END IF;

  -- Préférences d'échange
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='exchange_preferences') THEN
    ALTER TABLE listings ADD COLUMN exchange_preferences TEXT;
  END IF;

  -- Notes de remise / retrait
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='pickup_notes') THEN
    ALTER TABLE listings ADD COLUMN pickup_notes TEXT;
  END IF;

  -- Créneaux de disponibilité
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='availability_window') THEN
    ALTER TABLE listings ADD COLUMN availability_window TEXT;
  END IF;

  -- Compteur de vues
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='views_count') THEN
    ALTER TABLE listings ADD COLUMN views_count INT NOT NULL DEFAULT 0;
  END IF;

  -- Author id (alias de user_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='author_id') THEN
    ALTER TABLE listings ADD COLUMN author_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    UPDATE listings SET author_id = user_id WHERE user_id IS NOT NULL AND author_id IS NULL;
  END IF;

  -- Expiration automatique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='expires_at') THEN
    ALTER TABLE listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Mise en avant (futur premium)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='boost_until') THEN
    ALTER TABLE listings ADD COLUMN boost_until TIMESTAMPTZ;
  END IF;

  -- Retrait rapide possible
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='quick_pickup') THEN
    ALTER TABLE listings ADD COLUMN quick_pickup BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Réservé par quel utilisateur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='reserved_by_user_id') THEN
    ALTER TABLE listings ADD COLUMN reserved_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

END $$;

-- ── 3. Index utiles ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS listings_sector_idx    ON listings(sector_id);
CREATE INDEX IF NOT EXISTS listings_status_idx    ON listings(status);
CREATE INDEX IF NOT EXISTS listings_type_idx      ON listings(listing_type);
CREATE INDEX IF NOT EXISTS listings_price_idx     ON listings(price);
CREATE INDEX IF NOT EXISTS listings_urgent_idx    ON listings(is_urgent) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS listings_expires_idx   ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_boost_idx     ON listings(boost_until) WHERE boost_until IS NOT NULL;

-- ── 4. Trigger updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();

-- ── 5. Rafraîchissement du cache PostgREST ──────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- Migration terminée !
