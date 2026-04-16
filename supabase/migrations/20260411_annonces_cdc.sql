-- ===========================================================================
-- MIGRATION : Petites Annonces CDC -- Biguglia Connect
-- Enrichit listings + cree listing_favorites, listing_saved_searches,
-- listing_reports, listing_status_history
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Enrichissement de la table listings existante
-- ---------------------------------------------------------------------------
-- Nouveaux types d'annonce (exchange + location en plus de sale/wanted/free/service)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('sale', 'wanted', 'free', 'exchange', 'service', 'rental'));

-- Nouveaux statuts (reserved, sold, given, exchanged, closed, expired en plus de active/archived)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'reserved', 'sold', 'given', 'exchanged', 'closed', 'expired', 'archived', 'hidden'));

-- Colonnes manquantes (IF NOT EXISTS via DO block)
DO $$ BEGIN
  -- Etat de l'objet : neuf / tres_bon / bon / a_reparer / lot
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='condition_state') THEN
    ALTER TABLE listings ADD COLUMN condition_state TEXT
      CHECK (condition_state IN ('neuf', 'tres_bon', 'bon', 'a_reparer', 'lot'));
  END IF;
  -- Prix negociable / gratuit / echange uniquement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='price_type') THEN
    ALTER TABLE listings ADD COLUMN price_type TEXT NOT NULL DEFAULT 'fixed'
      CHECK (price_type IN ('fixed', 'negotiable', 'free', 'exchange_only', 'contact'));
  END IF;
  -- Preferences d'echange
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='exchange_preferences') THEN
    ALTER TABLE listings ADD COLUMN exchange_preferences TEXT;
  END IF;
  -- Notes de remise / lieu de retrait
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='pickup_notes') THEN
    ALTER TABLE listings ADD COLUMN pickup_notes TEXT;
  END IF;
  -- Creneau de disponibilite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='availability_window') THEN
    ALTER TABLE listings ADD COLUMN availability_window TEXT;
  END IF;
  -- Retrait rapide possible
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='quick_pickup') THEN
    ALTER TABLE listings ADD COLUMN quick_pickup BOOLEAN NOT NULL DEFAULT false;
  END IF;
  -- Prix negociable flag simple
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_negotiable') THEN
    ALTER TABLE listings ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT false;
  END IF;
  -- Valeur sentimentale / urgence de vente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_urgent') THEN
    ALTER TABLE listings ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
  END IF;
  -- Annonce mise en avant (premium futur)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='boost_until') THEN
    ALTER TABLE listings ADD COLUMN boost_until TIMESTAMPTZ;
  END IF;
  -- Reservation par quel utilisateur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='reserved_by_user_id') THEN
    ALTER TABLE listings ADD COLUMN reserved_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  -- Secteur si pas encore present
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='sector_id') THEN
    ALTER TABLE listings ADD COLUMN sector_id TEXT;
  END IF;
  -- Expiration automatique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='expires_at') THEN
    ALTER TABLE listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  -- Compteur de vues
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='views_count') THEN
    ALTER TABLE listings ADD COLUMN views_count INT NOT NULL DEFAULT 0;
  END IF;
  -- Author id alias (peut exister deja sous user_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='author_id') THEN
    ALTER TABLE listings ADD COLUMN author_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    -- Copie user_id -> author_id si user_id existe
    UPDATE listings SET author_id = user_id WHERE user_id IS NOT NULL AND author_id IS NULL;
  END IF;
END $$;

-- Index nouveaux
CREATE INDEX IF NOT EXISTS listings_sector_idx    ON listings(sector_id);
CREATE INDEX IF NOT EXISTS listings_status_idx    ON listings(status);
CREATE INDEX IF NOT EXISTS listings_type_idx      ON listings(listing_type);
CREATE INDEX IF NOT EXISTS listings_price_idx     ON listings(price);
CREATE INDEX IF NOT EXISTS listings_urgent_idx    ON listings(is_urgent) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS listings_expires_idx   ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_boost_idx     ON listings(boost_until) WHERE boost_until IS NOT NULL;

-- 2. Table listing_favorites (favoris par utilisateur)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS lf_fav_user_idx    ON listing_favorites(user_id);
CREATE INDEX IF NOT EXISTS lf_fav_listing_idx ON listing_favorites(listing_id);

ALTER TABLE listing_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_fav_select" ON listing_favorites;
CREATE POLICY "lf_fav_select" ON listing_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lf_fav_insert" ON listing_favorites;
CREATE POLICY "lf_fav_insert" ON listing_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lf_fav_delete" ON listing_favorites;
CREATE POLICY "lf_fav_delete" ON listing_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Table listing_saved_searches (alertes / recherches sauvegardees)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_saved_searches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  query         TEXT,
  category_id   UUID REFERENCES listing_categories(id) ON DELETE SET NULL,
  listing_type  TEXT,
  sector_id     TEXT,
  price_max     INT,
  condition     TEXT,
  notify        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS lss_user_idx ON listing_saved_searches(user_id);

ALTER TABLE listing_saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lss_select" ON listing_saved_searches;
CREATE POLICY "lss_select" ON listing_saved_searches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lss_insert" ON listing_saved_searches;
CREATE POLICY "lss_insert" ON listing_saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lss_update" ON listing_saved_searches;
CREATE POLICY "lss_update" ON listing_saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lss_delete" ON listing_saved_searches;
CREATE POLICY "lss_delete" ON listing_saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Table listing_reports (signalements)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL
                CHECK (reason IN (
                  'arnaque', 'contenu_interdit', 'produit_dangereux',
                  'prix_trompeur', 'doublon', 'faux_profil',
                  'harcelement', 'hors_sujet', 'autre'
                )),
  comment       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS lr_listing_idx  ON listing_reports(listing_id);
CREATE INDEX IF NOT EXISTS lr_status_idx   ON listing_reports(status);

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lr_select_own" ON listing_reports;
CREATE POLICY "lr_select_own" ON listing_reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "lr_insert" ON listing_reports;
CREATE POLICY "lr_insert" ON listing_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 5. Table listing_status_history (journal des changements de statut)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lsh_listing_idx ON listing_status_history(listing_id);

ALTER TABLE listing_status_history ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — policy trop permissive (USING true exposait l'historique interne)
--     Remplacée dans : 20260416_listing_status_history_rls.sql
DROP POLICY IF EXISTS "lsh_select" ON listing_status_history;

DROP POLICY IF EXISTS "lsh_insert" ON listing_status_history;
CREATE POLICY "lsh_insert" ON listing_status_history
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- 6. Trigger auto-update updated_at sur listings
-- ---------------------------------------------------------------------------
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

-- 7. Commentaires de table
-- ---------------------------------------------------------------------------
COMMENT ON TABLE listing_favorites IS 'Favoris annonces -- CDC Biguglia Connect 2026';
COMMENT ON TABLE listing_saved_searches IS 'Alertes recherche annonces -- CDC 2026';
COMMENT ON TABLE listing_reports IS 'Signalements annonces -- CDC 2026';
COMMENT ON TABLE listing_status_history IS 'Journal statuts annonces -- CDC 2026';

-- Migration Petites Annonces CDC terminee !
