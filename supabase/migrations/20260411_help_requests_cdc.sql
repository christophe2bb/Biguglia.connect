-- ===========================================================================
-- MIGRATION : Entraide / Coups de main -- CDC Biguglia Connect
-- Tables : help_requests, help_photos, help_comments, help_request_participants
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Table principale help_requests
CREATE TABLE IF NOT EXISTS help_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type et statut
  help_type           TEXT NOT NULL DEFAULT 'demande'
                      CHECK (help_type IN ('demande', 'offre', 'echange')),
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('draft', 'active', 'in_progress', 'paused', 'resolved', 'closed', 'archived')),

  -- Contenu
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'autre',
  description         TEXT NOT NULL,

  -- Urgence / planning
  urgency             TEXT NOT NULL DEFAULT 'flexible'
                      CHECK (urgency IN ('flexible', 'cette_semaine', 'rapidement', 'urgent')),
  help_date           DATE,
  help_time           TEXT,

  -- Localisation
  sector_id           TEXT,   -- FK logique vers src/lib/sectors.ts (TEXT, pas UUID)
  location_area       TEXT NOT NULL DEFAULT 'Centre-ville',
  location_city       TEXT NOT NULL DEFAULT 'Biguglia',
  location_detail     TEXT,

  -- Details pratiques
  duration            TEXT NOT NULL DEFAULT '1h'
                      CHECK (duration IN ('15min','30min','1h','2h','demi_journee','journee','variable')),
  persons_needed      INT NOT NULL DEFAULT 1,

  -- Contrepartie
  compensation        TEXT NOT NULL DEFAULT 'gratuit'
                      CHECK (compensation IN ('gratuit','cafe','echange','frais','discuter')),
  compensation_detail TEXT,

  -- Materiel et conditions
  equipment           TEXT[] NOT NULL DEFAULT '{}',
  conditions          TEXT[] NOT NULL DEFAULT '{}',
  for_who             TEXT NOT NULL DEFAULT 'Pour moi',

  -- Vie privee
  visibility          TEXT NOT NULL DEFAULT 'public'
                      CHECK (visibility IN ('public', 'membres')),
  contact_mode        TEXT NOT NULL DEFAULT 'messagerie'
                      CHECK (contact_mode IN ('messagerie', 'telephone_apres')),
  display_name        TEXT NOT NULL DEFAULT 'prenom_initiale'
                      CHECK (display_name IN ('prenom', 'prenom_initiale', 'complet')),

  -- Audience
  audience            TEXT DEFAULT 'Tout public',

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

-- 2. Index help_requests
CREATE INDEX IF NOT EXISTS help_requests_author_idx   ON help_requests(author_id);
CREATE INDEX IF NOT EXISTS help_requests_status_idx   ON help_requests(status);
CREATE INDEX IF NOT EXISTS help_requests_type_idx     ON help_requests(help_type);
CREATE INDEX IF NOT EXISTS help_requests_category_idx ON help_requests(category);
CREATE INDEX IF NOT EXISTS help_requests_urgency_idx  ON help_requests(urgency);
CREATE INDEX IF NOT EXISTS help_requests_sector_idx   ON help_requests(sector_id);
CREATE INDEX IF NOT EXISTS help_requests_date_idx     ON help_requests(created_at DESC);

-- 3. RLS help_requests
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_requests_select" ON help_requests;
CREATE POLICY "help_requests_select" ON help_requests
  FOR SELECT USING (
    status != 'draft'
    OR author_id = auth.uid()
  );

DROP POLICY IF EXISTS "help_requests_insert" ON help_requests;
CREATE POLICY "help_requests_insert" ON help_requests
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "help_requests_update" ON help_requests;
CREATE POLICY "help_requests_update" ON help_requests
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "help_requests_delete" ON help_requests;
CREATE POLICY "help_requests_delete" ON help_requests
  FOR DELETE USING (auth.uid() = author_id);

-- 4. Table help_photos
CREATE TABLE IF NOT EXISTS help_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_id       UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  storage_path  TEXT,
  caption       TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_photos_help_idx ON help_photos(help_id, display_order);

ALTER TABLE help_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_photos_select" ON help_photos;
CREATE POLICY "help_photos_select" ON help_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "help_photos_insert" ON help_photos;
CREATE POLICY "help_photos_insert" ON help_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM help_requests WHERE id = help_id AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS "help_photos_delete" ON help_photos;
CREATE POLICY "help_photos_delete" ON help_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM help_requests WHERE id = help_id AND author_id = auth.uid())
  );

-- 5. Table help_comments (mini-forum par annonce)
CREATE TABLE IF NOT EXISTS help_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_id    UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_comments_help_idx  ON help_comments(help_id);
CREATE INDEX IF NOT EXISTS help_comments_date_idx  ON help_comments(created_at DESC);

ALTER TABLE help_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_comments_select" ON help_comments;
CREATE POLICY "help_comments_select" ON help_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "help_comments_insert" ON help_comments;
CREATE POLICY "help_comments_insert" ON help_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "help_comments_delete" ON help_comments;
CREATE POLICY "help_comments_delete" ON help_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 6. Table help_request_participants (je peux aider / interesse)
CREATE TABLE IF NOT EXISTS help_request_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'interested'
                  CHECK (role IN ('author', 'helper', 'interested')),
  state           TEXT NOT NULL DEFAULT 'pending'
                  CHECK (state IN ('pending', 'accepted', 'declined', 'done')),
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (help_request_id, user_id)
);

CREATE INDEX IF NOT EXISTS help_participants_request_idx ON help_request_participants(help_request_id);
CREATE INDEX IF NOT EXISTS help_participants_user_idx    ON help_request_participants(user_id);

ALTER TABLE help_request_participants ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — USING(true) exposait user_id, role, state, message publiquement
--     Remplacée dans : 20260416_help_participants_rls.sql
DROP POLICY IF EXISTS "help_participants_select" ON help_request_participants;

DROP POLICY IF EXISTS "help_participants_insert" ON help_request_participants;
CREATE POLICY "help_participants_insert" ON help_request_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "help_participants_update" ON help_request_participants;
CREATE POLICY "help_participants_update" ON help_request_participants
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT author_id FROM help_requests WHERE id = help_request_id)
  );

DROP POLICY IF EXISTS "help_participants_delete" ON help_request_participants;
CREATE POLICY "help_participants_delete" ON help_request_participants
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Table help_request_status_history (audit trail)
CREATE TABLE IF NOT EXISTS help_request_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note            TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_status_history_req_idx ON help_request_status_history(help_request_id);

ALTER TABLE help_request_status_history ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — USING(true) exposait l'historique d'audit publiquement
--     Remplacée dans : 20260416_help_status_history_rls.sql
DROP POLICY IF EXISTS "help_status_history_select" ON help_request_status_history;

DROP POLICY IF EXISTS "help_status_history_insert" ON help_request_status_history;
CREATE POLICY "help_status_history_insert" ON help_request_status_history
  FOR INSERT WITH CHECK (
    auth.uid() = changed_by
    OR auth.uid() IN (SELECT author_id FROM help_requests WHERE id = help_request_id)
  );

-- 8. Trigger auto-update updated_at on help_requests
CREATE OR REPLACE FUNCTION update_help_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_help_requests_updated_at ON help_requests;
CREATE TRIGGER trg_help_requests_updated_at
  BEFORE UPDATE ON help_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_help_request_updated_at();

-- Migration Entraide / Coups de main terminee !
