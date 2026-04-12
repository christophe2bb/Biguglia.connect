/**
 * admin/migration/_sql/collectionneurs.ts
 */
export const COLLECTIONNEURS_V2_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Module Collectionneurs v2.0 PREMIUM
-- IDEMPOTENT — coller dans Supabase > SQL Editor > Run
-- ============================================================

-- ─── 1. Enrichissement collection_items ───────────────────────────────────────
ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'vente'
    CHECK (mode IN ('vente','echange','don','recherche')),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'actif'
    CHECK (status IN ('actif','reserve','vendu','echange','donne','trouve','retire','archive','brouillon','en_attente_validation','signale','masque','supprime_admin')),
  ADD COLUMN IF NOT EXISTS rarity_level TEXT DEFAULT 'commun'
    CHECK (rarity_level IN ('commun','peu_commun','rare','tres_rare','unique')),
  ADD COLUMN IF NOT EXISTS year_period TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS series_name TEXT,
  ADD COLUMN IF NOT EXISTS authenticity_declared BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS provenance TEXT,
  ADD COLUMN IF NOT EXISTS defects_noted TEXT,
  ADD COLUMN IF NOT EXISTS dimensions TEXT,
  ADD COLUMN IF NOT EXISTS material TEXT,
  ADD COLUMN IF NOT EXISTS exchange_expected TEXT,
  ADD COLUMN IF NOT EXISTS shipping_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_meetup_available BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorites_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offers_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie'
    CHECK (moderation_status IN ('brouillon','en_attente_validation','publie','signale','masque','supprime_admin')),
  ADD COLUMN IF NOT EXISTS moderation_note TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

UPDATE collection_items SET mode = CASE WHEN item_type = 'troc' THEN 'echange' ELSE COALESCE(item_type,'vente') END WHERE mode IS NULL OR mode = 'vente';
UPDATE collection_items SET status = 'actif' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_ci_mode        ON collection_items(mode);
CREATE INDEX IF NOT EXISTS idx_ci_status      ON collection_items(status);
CREATE INDEX IF NOT EXISTS idx_ci_rarity      ON collection_items(rarity_level);
CREATE INDEX IF NOT EXISTS idx_ci_city        ON collection_items(city);
CREATE INDEX IF NOT EXISTS idx_ci_shipping    ON collection_items(shipping_available);
CREATE INDEX IF NOT EXISTS idx_ci_featured    ON collection_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_ci_author_stat ON collection_items(author_id, status);
CREATE INDEX IF NOT EXISTS idx_ci_modstatus   ON collection_items(moderation_status);

-- ─── 2. Photos enrichies (is_cover, sort_order) ───────────────────────────────
ALTER TABLE collection_item_photos
  ADD COLUMN IF NOT EXISTS is_cover   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alt_text   TEXT;

-- ─── 3. Table favoris collectionneurs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_cfav_user ON collection_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_cfav_item ON collection_favorites(item_id);
ALTER TABLE collection_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Favoris visibles par propriétaire" ON collection_favorites;
CREATE POLICY "Favoris visibles par propriétaire" ON collection_favorites FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Créer favori si connecté" ON collection_favorites;
CREATE POLICY "Créer favori si connecté" ON collection_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Supprimer favori si propriétaire" ON collection_favorites;
CREATE POLICY "Supprimer favori si propriétaire" ON collection_favorites FOR DELETE USING (auth.uid() = user_id);

-- ─── 4. Table offres/propositions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  offer_type TEXT NOT NULL DEFAULT 'price' CHECK (offer_type IN ('price','exchange','both')),
  offered_price NUMERIC(10,2),
  offered_item_description TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','refused','cancelled','expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_offer CHECK (buyer_id <> seller_id)
);
CREATE INDEX IF NOT EXISTS idx_coffer_item   ON collection_offers(item_id);
CREATE INDEX IF NOT EXISTS idx_coffer_buyer  ON collection_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_coffer_seller ON collection_offers(seller_id);
ALTER TABLE collection_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Offres visibles par participants" ON collection_offers;
CREATE POLICY "Offres visibles par participants" ON collection_offers FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
DROP POLICY IF EXISTS "Créer offre si connecté" ON collection_offers;
CREATE POLICY "Créer offre si connecté" ON collection_offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Modifier offre si participant" ON collection_offers;
CREATE POLICY "Modifier offre si participant" ON collection_offers FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ─── 5. Table vues analytics ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_views (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id   UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cview_item ON collection_views(item_id);
ALTER TABLE collection_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vues insert" ON collection_views;
CREATE POLICY "Vues insert" ON collection_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Vues lecture auteur" ON collection_views;
CREATE POLICY "Vues lecture auteur" ON collection_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM collection_items WHERE id = item_id AND author_id = auth.uid())
);

-- ─── 6. Triggers ──────────────────────────────────────────────────────────────
-- Incrémenter views_count
CREATE OR REPLACE FUNCTION increment_collection_views_trigger()
RETURNS TRIGGER AS $$
BEGIN UPDATE collection_items SET views_count = COALESCE(views_count,0) + 1 WHERE id = NEW.item_id; RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_inc_collection_views ON collection_views;
CREATE TRIGGER trg_inc_collection_views AFTER INSERT ON collection_views FOR EACH ROW EXECUTE FUNCTION increment_collection_views_trigger();

-- Sync favorites_count
CREATE OR REPLACE FUNCTION sync_collection_favorites_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collection_items SET favorites_count = COALESCE(favorites_count,0) + 1 WHERE id = NEW.item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collection_items SET favorites_count = GREATEST(COALESCE(favorites_count,1) - 1, 0) WHERE id = OLD.item_id;
  END IF; RETURN NULL;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_sync_cfav_count ON collection_favorites;
CREATE TRIGGER trg_sync_cfav_count AFTER INSERT OR DELETE ON collection_favorites FOR EACH ROW EXECUTE FUNCTION sync_collection_favorites_count();

-- ─── 7. RLS améliorée collection_items ────────────────────────────────────────
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collection_items_select" ON collection_items;
DROP POLICY IF EXISTS "CI select public"         ON collection_items;
DROP POLICY IF EXISTS "CI select owner"          ON collection_items;
DROP POLICY IF EXISTS "CI admin"                 ON collection_items;
CREATE POLICY "CI select public" ON collection_items FOR SELECT USING (
  status IN ('actif','reserve','vendu','echange','donne','trouve')
  AND moderation_status IN ('publie','signale')
);
CREATE POLICY "CI select owner" ON collection_items FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "CI admin"        ON collection_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);
DROP POLICY IF EXISTS "collection_items_insert" ON collection_items;
CREATE POLICY "CI insert" ON collection_items FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "collection_items_update" ON collection_items;
CREATE POLICY "CI update owner" ON collection_items FOR UPDATE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);
DROP POLICY IF EXISTS "collection_items_delete" ON collection_items;
CREATE POLICY "CI delete owner" ON collection_items FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 8. Catégories supplémentaires ────────────────────────────────────────────
INSERT INTO collection_categories (name, slug, icon, color, display_order)
SELECT * FROM (VALUES
  ('Cartes Pokémon / TCG',   'tcg-cards',   '🃏', 'red',    13),
  ('BD & Mangas collector',   'bd-manga',    '📖', 'indigo', 14),
  ('Jeux vidéo rétro',        'retro-gaming','🕹️', 'violet', 15),
  ('Montres & horlogerie',    'montres',     '⌚', 'gray',   16),
  ('Militaria & uniformes',   'militaria',   '🎖️', 'stone',  17)
) AS v(name, slug, icon, color, display_order)
WHERE NOT EXISTS (SELECT 1 FROM collection_categories WHERE slug = v.slug);

NOTIFY pgrst, 'reload schema';
-- ✅ Collectionneurs v2.0 : 20+ colonnes, photos enrichies, 3 nouvelles tables, triggers, RLS`;

