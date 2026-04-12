/**
 * admin/migration/_sql/rls-status.ts
 */
export const RLS_STATUS_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — RLS Statuts & Fonctions SECURITY DEFINER
-- Protège les changements de statut : seul le créateur/modérateur/admin peut agir
-- À exécuter APRÈS le SQL "Statuts enrichis"
-- ============================================================

-- ============================================================
-- 1. Fonction SECURITY DEFINER : changer le statut d'une annonce
-- ============================================================
CREATE OR REPLACE FUNCTION change_listing_status(
  p_listing_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  -- Récupère le propriétaire et le statut actuel
  SELECT user_id, status INTO v_owner_id, v_current_status
    FROM listings WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Annonce introuvable');
  END IF;

  -- Récupère le rôle de l'appelant
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  -- Admin : accès total
  IF v_role IN ('admin', 'moderator') THEN
    UPDATE listings
      SET status = p_new_status,
          status_changed_at = NOW(),
          updated_at = NOW()
    WHERE id = p_listing_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- Propriétaire : transitions autorisées
  IF v_user_id = v_owner_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'active'   THEN ARRAY['reserved','sold','archived','expired']
      WHEN 'reserved' THEN ARRAY['active','sold','archived']
      WHEN 'sold'     THEN ARRAY['active','archived']
      WHEN 'expired'  THEN ARRAY['active','archived']
      WHEN 'archived' THEN ARRAY['active']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE listings
        SET status = p_new_status,
            status_changed_at = NOW(),
            updated_at = NOW()
      WHERE id = p_listing_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée : ' || v_current_status || ' → ' || p_new_status);
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_listing_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 2. Fonction SECURITY DEFINER : changer le statut d'un équipement
-- ============================================================
CREATE OR REPLACE FUNCTION change_equipment_status(
  p_item_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  SELECT owner_id, COALESCE(status, CASE WHEN is_available THEN 'available' ELSE 'unavailable' END)
    INTO v_owner_id, v_current_status
    FROM equipment_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Matériel introuvable');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  IF v_role IN ('admin', 'moderator') THEN
    UPDATE equipment_items
      SET status = p_new_status,
          is_available = (p_new_status = 'available'),
          status_changed_at = NOW(),
          updated_at = NOW()
    WHERE id = p_item_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_user_id = v_owner_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'available'   THEN ARRAY['reserved','unavailable','archived']
      WHEN 'reserved'    THEN ARRAY['available','borrowed','archived']
      WHEN 'borrowed'    THEN ARRAY['available']
      WHEN 'unavailable' THEN ARRAY['available','archived']
      WHEN 'archived'    THEN ARRAY['available']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE equipment_items
        SET status = p_new_status,
            is_available = (p_new_status = 'available'),
            status_changed_at = NOW(),
            updated_at = NOW()
      WHERE id = p_item_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_equipment_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 3. Fonction SECURITY DEFINER : changer le statut d'une aide
-- ============================================================
CREATE OR REPLACE FUNCTION change_help_request_status(
  p_request_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_author_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  SELECT author_id, status INTO v_author_id, v_current_status
    FROM help_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Demande introuvable');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  IF v_role IN ('admin', 'moderator') THEN
    UPDATE help_requests
      SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
          resolved_at = CASE WHEN p_new_status = 'resolved' THEN NOW() ELSE resolved_at END,
          archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
    WHERE id = p_request_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_user_id = v_author_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'active'      THEN ARRAY['in_progress','paused','resolved','closed']
      WHEN 'in_progress' THEN ARRAY['resolved','paused','closed']
      WHEN 'paused'      THEN ARRAY['active','resolved','closed']
      WHEN 'resolved'    THEN ARRAY['active','archived']
      WHEN 'closed'      THEN ARRAY['active','archived']
      WHEN 'archived'    THEN ARRAY['active']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE help_requests
        SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
            resolved_at = CASE WHEN p_new_status = 'resolved' THEN NOW() ELSE resolved_at END,
            archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
      WHERE id = p_request_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_help_request_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 4. Fonction SECURITY DEFINER : changer statut perdu/trouvé
-- ============================================================
CREATE OR REPLACE FUNCTION change_lost_found_status(
  p_item_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_author_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  SELECT author_id, status INTO v_author_id, v_current_status
    FROM lost_found_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Objet introuvable');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  IF v_role IN ('admin', 'moderator') THEN
    UPDATE lost_found_items
      SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
          resolved_at = CASE WHEN p_new_status IN ('resolved','restituted') THEN NOW() ELSE resolved_at END,
          archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
    WHERE id = p_item_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_user_id = v_author_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'active'    THEN ARRAY['resolved','restituted','closed','archived']
      WHEN 'resolved'  THEN ARRAY['active','archived']
      WHEN 'restituted'THEN ARRAY['active','archived']
      WHEN 'closed'    THEN ARRAY['active','archived']
      WHEN 'archived'  THEN ARRAY['active']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE lost_found_items
        SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
            resolved_at = CASE WHEN p_new_status IN ('resolved','restituted') THEN NOW() ELSE resolved_at END,
            archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
      WHERE id = p_item_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_lost_found_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 5. Politique RLS renforcée : seul créateur/modo/admin peut UPDATE le statut
-- ============================================================

-- Listings
DROP POLICY IF EXISTS "listings_status_update" ON listings;
CREATE POLICY "listings_status_update" ON listings
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Equipment items
DROP POLICY IF EXISTS "equipment_status_update" ON equipment_items;
CREATE POLICY "equipment_status_update" ON equipment_items
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Help requests
DROP POLICY IF EXISTS "help_requests_status_update" ON help_requests;
CREATE POLICY "help_requests_status_update" ON help_requests
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Lost & found items
DROP POLICY IF EXISTS "lost_found_status_update" ON lost_found_items;
CREATE POLICY "lost_found_status_update" ON lost_found_items
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Group outings
DROP POLICY IF EXISTS "group_outings_status_update" ON group_outings;
CREATE POLICY "group_outings_status_update" ON group_outings
  FOR UPDATE USING (
    auth.uid() = organizer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = organizer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Local events
DROP POLICY IF EXISTS "local_events_status_update" ON local_events;
CREATE POLICY "local_events_status_update" ON local_events
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- ============================================================
-- 6. Table d'historique des changements de statut
-- ============================================================
CREATE TABLE IF NOT EXISTS status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name    TEXT NOT NULL,           -- 'listings', 'help_requests', etc.
  record_id     UUID NOT NULL,
  old_status    TEXT,
  new_status    TEXT NOT NULL,
  changed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at    TIMESTAMPTZ DEFAULT NOW(),
  note          TEXT                     -- optionnel : raison du changement
);

CREATE INDEX IF NOT EXISTS status_history_record ON status_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS status_history_user ON status_history(changed_by);
CREATE INDEX IF NOT EXISTS status_history_date ON status_history(changed_at DESC);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Lecture : créateur ou admin
DROP POLICY IF EXISTS "status_history_read" ON status_history;
CREATE POLICY "status_history_read" ON status_history
  FOR SELECT USING (
    changed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Insertion : authentifié (via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "status_history_insert" ON status_history;
CREATE POLICY "status_history_insert" ON status_history
  FOR INSERT WITH CHECK (changed_by = auth.uid());

-- ============================================================
-- 7. Trigger générique : enregistrer chaque changement de statut
-- ============================================================
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO status_history(table_name, record_id, old_status, new_status, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attache le trigger à chaque table concernée
DROP TRIGGER IF EXISTS log_listings_status ON listings;
CREATE TRIGGER log_listings_status
  AFTER UPDATE ON listings FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_equipment_status ON equipment_items;
CREATE TRIGGER log_equipment_status
  AFTER UPDATE ON equipment_items FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_help_status ON help_requests;
CREATE TRIGGER log_help_status
  AFTER UPDATE ON help_requests FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_lost_found_status ON lost_found_items;
CREATE TRIGGER log_lost_found_status
  AFTER UPDATE ON lost_found_items FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_outings_status ON group_outings;
CREATE TRIGGER log_outings_status
  AFTER UPDATE ON group_outings FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_events_status ON local_events;
CREATE TRIGGER log_events_status
  AFTER UPDATE ON local_events FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

SELECT 'OK: RLS statuts + SECURITY DEFINER + historique appliqués avec succès' AS result;
`;

