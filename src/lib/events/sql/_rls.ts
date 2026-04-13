/**
 * events/sql/_rls.ts — Row Level Security du module Événements
 *
 * Couvre (étapes 14-19 de la migration) :
 *   14. RLS events
 *   15. RLS event_participants
 *   16. RLS event_photos
 *   17. RLS event_status_history
 *   18. RLS event_date_history
 *   19. Table event_comments + RLS
 *
 * Dépend des tables créées dans _schema.ts.
 */

export const EVENT_RLS_SQL = `-- ── Étape 14 : RLS events ─────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_public_select" ON events;
DROP POLICY IF EXISTS "events_insert_own"    ON events;
DROP POLICY IF EXISTS "events_update_own"    ON events;
DROP POLICY IF EXISTS "events_delete_own"    ON events;
DROP POLICY IF EXISTS "events_admin_all"     ON events;

CREATE POLICY "events_public_select" ON events
  FOR SELECT USING (status NOT IN ('archive') OR author_id = auth.uid());

CREATE POLICY "events_insert_own" ON events
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "events_update_own" ON events
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "events_delete_own" ON events
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- ── Étape 15 : RLS event_participants ────────────────────────────────────────
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ep_select" ON event_participants;
DROP POLICY IF EXISTS "ep_insert" ON event_participants;
DROP POLICY IF EXISTS "ep_update" ON event_participants;
DROP POLICY IF EXISTS "ep_delete" ON event_participants;

CREATE POLICY "ep_select" ON event_participants
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "ep_insert" ON event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ep_update" ON event_participants
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "ep_delete" ON event_participants
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  );

-- ── Étape 16 : RLS event_photos ───────────────────────────────────────────────
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ephoto_select" ON event_photos;
DROP POLICY IF EXISTS "ephoto_insert" ON event_photos;
DROP POLICY IF EXISTS "ephoto_delete" ON event_photos;

CREATE POLICY "ephoto_select" ON event_photos FOR SELECT USING (true);

CREATE POLICY "ephoto_insert" ON event_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
);

CREATE POLICY "ephoto_delete" ON event_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

-- ── Étape 17 : RLS event_status_history ──────────────────────────────────────
ALTER TABLE event_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esh_select" ON event_status_history;

CREATE POLICY "esh_select" ON event_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

-- ── Étape 18 : RLS event_date_history ────────────────────────────────────────
ALTER TABLE event_date_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edh_select" ON event_date_history;

CREATE POLICY "edh_select" ON event_date_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

-- ── Étape 19 : Table event_comments (mini-forum par événement) ───────────────
CREATE TABLE IF NOT EXISTS event_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_select" ON event_comments;
DROP POLICY IF EXISTS "ec_insert" ON event_comments;
DROP POLICY IF EXISTS "ec_delete" ON event_comments;

CREATE POLICY "ec_select" ON event_comments FOR SELECT USING (true);

CREATE POLICY "ec_insert" ON event_comments FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "ec_delete" ON event_comments FOR DELETE USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM events WHERE id = event_id AND author_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);
`;
