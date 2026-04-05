-- ============================================================
-- BIGUGLIA CONNECT — Module Collectionneurs v2.0 PREMIUM
-- Cahier des charges complet — migration idempotente
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- ─── 1. Enrichissement table collection_items ─────────────────────────────────
-- Nouveaux champs pour un module premium

ALTER TABLE collection_items
  -- Mode d'annonce étendu (troc → echange pour cohérence)
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'vente'
    CHECK (mode IN ('vente','echange','don','recherche')),

  -- Statuts métier complets
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'actif'
    CHECK (status IN (
      'actif','reserve','vendu','echange','donne','trouve','retire','archive',
      'brouillon','en_attente_validation','signale','masque','supprime_admin'
    )),

  -- Champs objet enrichis
  ADD COLUMN IF NOT EXISTS rarity_level TEXT DEFAULT 'commun'
    CHECK (rarity_level IN ('commun','peu_commun','rare','tres_rare','unique')),
  ADD COLUMN IF NOT EXISTS year_period TEXT,            -- ex: "1960-1970", "XIXe siècle"
  ADD COLUMN IF NOT EXISTS brand TEXT,                  -- marque / éditeur / fabricant
  ADD COLUMN IF NOT EXISTS series_name TEXT,            -- série / collection
  ADD COLUMN IF NOT EXISTS authenticity_declared BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS provenance TEXT,             -- historique / origine
  ADD COLUMN IF NOT EXISTS defects_noted TEXT,          -- défauts signalés honnêtement
  ADD COLUMN IF NOT EXISTS dimensions TEXT,             -- ex: "12 x 8 x 5 cm"
  ADD COLUMN IF NOT EXISTS material TEXT,               -- matière

  -- Transaction
  ADD COLUMN IF NOT EXISTS exchange_expected TEXT,      -- ce que le vendeur veut en échange
  ADD COLUMN IF NOT EXISTS shipping_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_meetup_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,

  -- Mise en avant
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_count INT DEFAULT 0,

  -- Compteurs
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorites_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offers_count INT DEFAULT 0,

  -- Timestamps complets
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,

  -- Modération
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie'
    CHECK (moderation_status IN ('brouillon','en_attente_validation','publie','signale','masque','supprime_admin')),
  ADD COLUMN IF NOT EXISTS moderation_note TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Sous-catégorie optionnelle
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Migrer item_type → mode pour compatibilité
UPDATE collection_items SET mode = item_type WHERE mode IS NULL OR mode = 'vente';
UPDATE collection_items SET mode = 'echange' WHERE item_type = 'troc' AND mode = 'vente';

-- Migrer status existant si vide
UPDATE collection_items SET status = 'actif' WHERE status IS NULL;

-- Index performance
CREATE INDEX IF NOT EXISTS idx_ci_mode     ON collection_items(mode);
CREATE INDEX IF NOT EXISTS idx_ci_status   ON collection_items(status);
CREATE INDEX IF NOT EXISTS idx_ci_rarity   ON collection_items(rarity_level);
CREATE INDEX IF NOT EXISTS idx_ci_city     ON collection_items(city);
CREATE INDEX IF NOT EXISTS idx_ci_shipping ON collection_items(shipping_available);
CREATE INDEX IF NOT EXISTS idx_ci_featured ON collection_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_ci_author   ON collection_items(author_id);
CREATE INDEX IF NOT EXISTS idx_ci_catmod   ON collection_items(category_id, moderation_status);

-- ─── 2. Photos améliorées ─────────────────────────────────────────────────────
ALTER TABLE collection_item_photos
  ADD COLUMN IF NOT EXISTS is_cover     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS alt_text     TEXT,
  ADD COLUMN IF NOT EXISTS sort_order   INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS width        INT,
  ADD COLUMN IF NOT EXISTS height       INT;

-- ─── 3. Table favoris collectionneurs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_favorites (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id    UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_cfav_user ON collection_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_cfav_item ON collection_favorites(item_id);

ALTER TABLE collection_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Favoris lecture propriétaire" ON collection_favorites;
DROP POLICY IF EXISTS "Favoris créer" ON collection_favorites;
DROP POLICY IF EXISTS "Favoris supprimer" ON collection_favorites;
CREATE POLICY "Favoris lecture propriétaire" ON collection_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Favoris créer" ON collection_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Favoris supprimer" ON collection_favorites FOR DELETE USING (auth.uid() = user_id);

-- ─── 4. Table offres/propositions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_offers (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id          UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  conversation_id  UUID REFERENCES conversations(id) ON DELETE SET NULL,
  buyer_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  offer_type       TEXT NOT NULL CHECK (offer_type IN ('price','exchange','both')),
  offered_price    NUMERIC(10,2),
  offered_item_id  UUID REFERENCES collection_items(id) ON DELETE SET NULL,
  offered_item_desc TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','counter','cancelled','expired')),
  message          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  CONSTRAINT no_self_offer CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_coffer_item   ON collection_offers(item_id);
CREATE INDEX IF NOT EXISTS idx_coffer_buyer  ON collection_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_coffer_seller ON collection_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_coffer_status ON collection_offers(status);

ALTER TABLE collection_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Offres lecture participants" ON collection_offers;
DROP POLICY IF EXISTS "Offres créer" ON collection_offers;
DROP POLICY IF EXISTS "Offres modifier" ON collection_offers;
CREATE POLICY "Offres lecture participants" ON collection_offers FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Offres créer" ON collection_offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Offres modifier" ON collection_offers FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ─── 5. Table alertes de recherche ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_alerts (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  keywords       TEXT NOT NULL,
  category_id    UUID REFERENCES collection_categories(id) ON DELETE SET NULL,
  mode_filter    TEXT CHECK (mode_filter IN ('vente','echange','don','recherche','all')) DEFAULT 'all',
  max_price      NUMERIC(10,2),
  condition_min  TEXT CHECK (condition_min IN ('neuf','excellent','bon','passable')),
  is_active      BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calert_user ON collection_alerts(user_id);
ALTER TABLE collection_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Alertes propriétaire" ON collection_alerts;
CREATE POLICY "Alertes propriétaire" ON collection_alerts FOR ALL USING (auth.uid() = user_id);

-- ─── 6. Table vues (analytics) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_views (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id    UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  viewer_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash    TEXT  -- anonymisé
);

CREATE INDEX IF NOT EXISTS idx_cview_item ON collection_views(item_id);
CREATE INDEX IF NOT EXISTS idx_cview_date ON collection_views(viewed_at);
ALTER TABLE collection_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vues insert" ON collection_views;
DROP POLICY IF EXISTS "Vues lecture auteur" ON collection_views;
CREATE POLICY "Vues insert" ON collection_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Vues lecture auteur" ON collection_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM collection_items WHERE id = item_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

-- ─── 7. Triggers ──────────────────────────────────────────────────────────────

-- Trigger: incrémenter views_count
CREATE OR REPLACE FUNCTION increment_collection_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE collection_items SET views_count = views_count + 1 WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inc_collection_views ON collection_views;
CREATE TRIGGER trg_inc_collection_views
  AFTER INSERT ON collection_views
  FOR EACH ROW EXECUTE FUNCTION increment_collection_views();

-- Trigger: mettre à jour favorites_count
CREATE OR REPLACE FUNCTION sync_collection_favorites_count()
RETURNS TRIGGER AS $$
DECLARE v_item_id UUID;
BEGIN
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);
  UPDATE collection_items
    SET favorites_count = (SELECT COUNT(*) FROM collection_favorites WHERE item_id = v_item_id)
  WHERE id = v_item_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_fav_count ON collection_favorites;
CREATE TRIGGER trg_sync_fav_count
  AFTER INSERT OR DELETE ON collection_favorites
  FOR EACH ROW EXECUTE FUNCTION sync_collection_favorites_count();

-- Trigger: fermer l'annonce (closed_at) quand vendu/échangé/donné/trouvé
CREATE OR REPLACE FUNCTION auto_close_collection_item()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('vendu','echange','donne','trouve') AND
     (OLD.status IS NULL OR OLD.status NOT IN ('vendu','echange','donne','trouve')) THEN
    NEW.closed_at := now();
  END IF;
  IF NEW.status = 'archive' AND NEW.archived_at IS NULL THEN
    NEW.archived_at := now();
  END IF;
  IF NEW.status = 'reserve' AND NEW.reserved_at IS NULL THEN
    NEW.reserved_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_close_ci ON collection_items;
CREATE TRIGGER trg_auto_close_ci
  BEFORE UPDATE ON collection_items
  FOR EACH ROW EXECUTE FUNCTION auto_close_collection_item();

-- ─── 8. RLS améliorée pour collection_items ───────────────────────────────────
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collection_items_select" ON collection_items;
DROP POLICY IF EXISTS "CI select public"         ON collection_items;
DROP POLICY IF EXISTS "CI select owner"          ON collection_items;
DROP POLICY IF EXISTS "CI admin"                 ON collection_items;

-- Lecture publique : actif, réservé, vendu, échangé, donné, trouvé (historique)
CREATE POLICY "CI select public" ON collection_items
  FOR SELECT USING (
    status IN ('actif','reserve','vendu','echange','donne','trouve')
    AND moderation_status IN ('publie','signale')
  );

-- Propriétaire voit tout le sien
CREATE POLICY "CI select owner" ON collection_items
  FOR SELECT USING (auth.uid() = author_id);

-- Admin voit tout
CREATE POLICY "CI admin" ON collection_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

DROP POLICY IF EXISTS "collection_items_insert" ON collection_items;
CREATE POLICY "CI insert" ON collection_items
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "collection_items_update" ON collection_items;
CREATE POLICY "CI update owner" ON collection_items
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

DROP POLICY IF EXISTS "collection_items_delete" ON collection_items;
CREATE POLICY "CI delete owner" ON collection_items
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── 9. Sous-catégories enrichies ─────────────────────────────────────────────
-- Ajouter des catégories manquantes si pas déjà présentes
INSERT INTO collection_categories (name, slug, icon, color, display_order)
SELECT * FROM (VALUES
  ('Cartes Pokémon / TCG',     'tcg-cards',     '🃏', 'red',     13),
  ('BD & Mangas collector',     'bd-manga',      '📖', 'indigo',  14),
  ('Jeux vidéo rétro',          'retro-gaming',  '🕹️', 'violet',  15),
  ('Montres & horlogerie',      'montres',       '⌚', 'gray',    16),
  ('Militaria & uniformes',     'militaria',     '🎖️', 'stone',   17),
  ('Objets publicitaires',      'publicitaires', '📺', 'yellow',  18),
  ('Porcelaine & céramique',    'porcelaine',    '🏺', 'rose',    19),
  ('Vins & spiritueux anciens', 'vins',          '🍷', 'red',     20)
) AS v(name, slug, icon, color, display_order)
WHERE NOT EXISTS (SELECT 1 FROM collection_categories WHERE slug = v.slug);

-- ─── 10. Reload PostgREST ─────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ✅ Migration Collectionneurs v2.0 terminée
-- Tables enrichies: collection_items (30+ colonnes), collection_item_photos
-- Nouvelles tables: collection_favorites, collection_offers, collection_alerts, collection_views
-- Triggers: views auto-increment, favorites count sync, auto-close on terminal status
-- RLS: public voit actif/réservé/historique, propriétaire voit tout, admin tout
