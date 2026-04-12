/**
 * admin/migration/_sql/rating.ts
 */
export const RATING_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Table item_ratings (notation avec verification)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 0. Fonction helper role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Fonction : verification eligibilite pour noter un item
CREATE OR REPLACE FUNCTION can_rate_item(p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
  v_status    TEXT;
  v_date      DATE;
  v_uid       UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;

  -- Ne pas noter son propre item
  CASE p_target_type
    WHEN 'listing' THEN
      SELECT user_id INTO v_author_id FROM listings WHERE id = p_target_id;
    WHEN 'equipment' THEN
      SELECT owner_id INTO v_author_id FROM equipment WHERE id = p_target_id;
    WHEN 'help_request' THEN
      SELECT author_id INTO v_author_id FROM help_requests WHERE id = p_target_id;
    WHEN 'association' THEN
      SELECT author_id INTO v_author_id FROM associations WHERE id = p_target_id;
    WHEN 'collection_item' THEN
      SELECT author_id INTO v_author_id FROM collection_items WHERE id = p_target_id;
    WHEN 'event' THEN
      SELECT author_id INTO v_author_id FROM local_events WHERE id = p_target_id;
    WHEN 'outing' THEN
      SELECT organizer_id INTO v_author_id FROM group_outings WHERE id = p_target_id;
    ELSE
      v_author_id := NULL;
  END CASE;

  IF v_author_id = v_uid THEN RETURN FALSE; END IF;

  -- Libre : perdu/trouve, promenade
  IF p_target_type IN ('lost_found', 'promenade') THEN RETURN TRUE; END IF;

  -- Coup de main : doit etre resolu
  IF p_target_type = 'help_request' THEN
    SELECT status INTO v_status FROM help_requests WHERE id = p_target_id;
    IF v_status <> 'resolved' THEN RETURN FALSE; END IF;
    IF v_author_id = v_uid THEN RETURN TRUE; END IF;
  END IF;

  -- Evenement : inscrit + date passee
  IF p_target_type = 'event' THEN
    SELECT event_date INTO v_date FROM local_events WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM event_participations
      WHERE event_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Sortie : inscrit + date passee
  IF p_target_type = 'outing' THEN
    SELECT outing_date INTO v_date FROM group_outings WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM outing_participants
      WHERE outing_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Demande artisan : auteur de la demande
  IF p_target_type = 'service_request' THEN
    RETURN EXISTS (
      SELECT 1 FROM service_requests WHERE id = p_target_id AND resident_id = v_uid
    );
  END IF;

  -- listing, equipment, association, collection_item : conversation liee obligatoire
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.related_type = p_target_type
      AND c.related_id   = p_target_id
      AND cp.user_id     = v_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1. Creer la table item_ratings
CREATE TABLE IF NOT EXISTS item_ratings (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN (
    'listing','equipment','help_request','lost_found',
    'association','outing','collection_item','event',
    'promenade','service_request'
  )),
  target_id    UUID NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating       INT NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  comment      TEXT,
  poll_choice  INT CHECK (poll_choice >= 0 AND poll_choice <= 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_type, target_id, user_id)
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_item_ratings_target ON item_ratings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_author ON item_ratings(author_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_user   ON item_ratings(user_id);

-- 3. RLS stricte
ALTER TABLE item_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notes publiques"         ON item_ratings;
DROP POLICY IF EXISTS "Noter si connecte"        ON item_ratings;
DROP POLICY IF EXISTS "Modifier sa note"         ON item_ratings;
DROP POLICY IF EXISTS "Supprimer sa note"        ON item_ratings;
DROP POLICY IF EXISTS "Noter apres interaction"  ON item_ratings;

-- Lecture : toujours publique
CREATE POLICY "Notes publiques" ON item_ratings
  FOR SELECT USING (true);

-- Insertion : seulement si eligible (interaction reelle verifiee cote DB)
CREATE POLICY "Noter apres interaction" ON item_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND can_rate_item(target_type, target_id)
  );

-- Modification : seulement sa propre note
CREATE POLICY "Modifier sa note" ON item_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Suppression : soi-meme ou admin
CREATE POLICY "Supprimer sa note" ON item_ratings
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Recharge cache
NOTIFY pgrst, 'reload schema';`;

