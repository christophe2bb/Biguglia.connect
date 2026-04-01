-- ============================================================
-- BIGUGLIA CONNECT — Table item_ratings (notation universelle)
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Créer la table item_ratings
CREATE TABLE IF NOT EXISTS item_ratings (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN (
    'listing','equipment','help_request','lost_found',
    'association','outing','collection_item','event',
    'promenade','service_request'
  )),
  target_id    UUID NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- auteur de l'item noté
  rating       INT NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  comment      TEXT,
  poll_choice  INT CHECK (poll_choice >= 0 AND poll_choice <= 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_type, target_id, user_id)
);

-- 2. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_item_ratings_target ON item_ratings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_author ON item_ratings(author_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_user   ON item_ratings(user_id);

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION update_item_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_item_ratings_updated_at ON item_ratings;
CREATE TRIGGER trg_item_ratings_updated_at
  BEFORE UPDATE ON item_ratings
  FOR EACH ROW EXECUTE FUNCTION update_item_ratings_updated_at();

-- 4. RLS
ALTER TABLE item_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes publiques" ON item_ratings
  FOR SELECT USING (true);

CREATE POLICY "Noter si connecté" ON item_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier sa note" ON item_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Supprimer sa note" ON item_ratings
  FOR DELETE USING (auth.uid() = user_id OR current_user_role() = 'admin');

-- 5. Recharge cache PostgREST
NOTIFY pgrst, 'reload schema';
