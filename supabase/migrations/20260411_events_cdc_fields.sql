-- ===========================================================================
-- MIGRATION : events -- champs complementaires CDC Biguglia Connect
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Champs CDC manquants
ALTER TABLE events ADD COLUMN IF NOT EXISTS sector_id            TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS audience             TEXT DEFAULT 'Tout public';
ALTER TABLE events ADD COLUMN IF NOT EXISTS subtitle             TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_detail      TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_link        TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_info         TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_type          TEXT; -- 'mairie', 'association', 'particulier', etc.
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_id            TEXT; -- ID de l'association ou org liee

-- 2. Table event_saves (favoris)
CREATE TABLE IF NOT EXISTS event_saves (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_saves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_saves' AND policyname='event_saves_select') THEN
    CREATE POLICY "event_saves_select" ON event_saves FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_saves' AND policyname='event_saves_insert') THEN
    CREATE POLICY "event_saves_insert" ON event_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_saves' AND policyname='event_saves_delete') THEN
    CREATE POLICY "event_saves_delete" ON event_saves FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Table event_comments (si pas encore creee)
CREATE TABLE IF NOT EXISTS event_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_comments' AND policyname='event_comments_select') THEN
    CREATE POLICY "event_comments_select" ON event_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_comments' AND policyname='event_comments_insert') THEN
    CREATE POLICY "event_comments_insert" ON event_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
END $$;

-- 4. Index performances
CREATE INDEX IF NOT EXISTS events_sector_idx      ON events(sector_id);
CREATE INDEX IF NOT EXISTS events_date_cat_idx    ON events(event_date, category);
CREATE INDEX IF NOT EXISTS events_status_date_idx ON events(status, event_date);
CREATE INDEX IF NOT EXISTS event_saves_user_idx   ON event_saves(user_id);
CREATE INDEX IF NOT EXISTS event_comments_evt_idx ON event_comments(event_id);

-- Migration events CDC terminee !
