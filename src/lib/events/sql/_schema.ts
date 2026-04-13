/**
 * events/sql/_schema.ts — DDL du schéma du module Événements
 *
 * Couvre (étapes 0-10 de la migration) :
 *   0.  Correctif préventif + migration statuts legacy sur local_events
 *   1.  Renommage local_events → events (ou création ex-nihilo)
 *   2.  Colonnes manquantes sur events (idempotent)
 *   3-4. Migration statuts + contrainte CHECK
 *   5-6. Table event_participants (renommage event_participations ou création)
 *   7.  Table event_photos
 *   8.  Contrainte couverture unique par événement
 *   9.  Table event_status_history
 *   10. Table event_date_history
 */

export const EVENT_SCHEMA_SQL = `-- ── Étape 0 : Correctif préventif sur local_events ───────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'local_events') THEN
    ALTER TABLE local_events DROP CONSTRAINT IF EXISTS local_events_status_check;
    ALTER TABLE local_events DROP CONSTRAINT IF EXISTS events_status_check;
    -- 0b. Migrer les statuts legacy AVANT le renommage
    UPDATE local_events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open');
    UPDATE local_events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
    UPDATE local_events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
    UPDATE local_events SET status = 'archive' WHERE status IN ('archived','archivee','archive');
    UPDATE local_events SET status = 'complet' WHERE status IN ('full','complete');
    UPDATE local_events SET status = 'a_venir'
      WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ── Étape 1 : Renommer local_events → events (ou créer si inexistant) ─────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'local_events')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    ALTER TABLE local_events RENAME TO events;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    CREATE TABLE events (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      title             TEXT NOT NULL,
      subtitle          TEXT DEFAULT '',
      description       TEXT DEFAULT '',
      category          TEXT NOT NULL DEFAULT 'autres',
      event_date        DATE NOT NULL,
      event_end_date    DATE,
      start_time        TIME DEFAULT '18:00',
      end_time          TIME,
      location          TEXT DEFAULT 'Biguglia',
      location_area     TEXT DEFAULT '',
      location_city     TEXT DEFAULT 'Biguglia',
      location_detail   TEXT DEFAULT '',
      organizer_name    TEXT DEFAULT '',
      price_type        TEXT DEFAULT 'gratuit' CHECK (price_type IN ('gratuit','payant','libre')),
      price_amount      NUMERIC(10,2),
      capacity          INTEGER,
      is_unlimited      BOOLEAN DEFAULT false,
      status            TEXT DEFAULT 'a_venir' CHECK (status IN ('a_venir','complet','reporte','annule','passe','archive')),
      registration_open BOOLEAN DEFAULT true,
      cover_photo_url   TEXT,
      tags              TEXT[] DEFAULT '{}',
      is_official       BOOLEAN DEFAULT false,
      report_reason     TEXT,
      cancel_reason     TEXT,
      postpone_reason   TEXT,
      original_event_date DATE,
      accessibility     TEXT DEFAULT '',
      contact_info      TEXT DEFAULT '',
      external_link     TEXT DEFAULT '',
      target_audience   TEXT DEFAULT '',
      created_at        TIMESTAMPTZ DEFAULT now(),
      updated_at        TIMESTAMPTZ DEFAULT now(),
      archived_at       TIMESTAMPTZ
    );
  END IF;
END$$;

-- ── Étape 2 : Colonnes manquantes sur events (idempotent) ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='subtitle') THEN
    ALTER TABLE events ADD COLUMN subtitle TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_end_date') THEN
    ALTER TABLE events ADD COLUMN event_end_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='start_time') THEN
    ALTER TABLE events ADD COLUMN start_time TIME DEFAULT '18:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='end_time') THEN
    ALTER TABLE events ADD COLUMN end_time TIME;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='location_area') THEN
    ALTER TABLE events ADD COLUMN location_area TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='location_city') THEN
    ALTER TABLE events ADD COLUMN location_city TEXT DEFAULT 'Biguglia';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='location_detail') THEN
    ALTER TABLE events ADD COLUMN location_detail TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='price_type') THEN
    ALTER TABLE events ADD COLUMN price_type TEXT DEFAULT 'gratuit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_unlimited') THEN
    ALTER TABLE events ADD COLUMN is_unlimited BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='registration_open') THEN
    ALTER TABLE events ADD COLUMN registration_open BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cover_photo_url') THEN
    ALTER TABLE events ADD COLUMN cover_photo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cancel_reason') THEN
    ALTER TABLE events ADD COLUMN cancel_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='postpone_reason') THEN
    ALTER TABLE events ADD COLUMN postpone_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='original_event_date') THEN
    ALTER TABLE events ADD COLUMN original_event_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='accessibility') THEN
    ALTER TABLE events ADD COLUMN accessibility TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='contact_info') THEN
    ALTER TABLE events ADD COLUMN contact_info TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='external_link') THEN
    ALTER TABLE events ADD COLUMN external_link TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='target_audience') THEN
    ALTER TABLE events ADD COLUMN target_audience TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='archived_at') THEN
    ALTER TABLE events ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='status') THEN
    ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'a_venir';
  END IF;
END$$;

-- ── Étapes 3-4 : Migration statuts legacy + contrainte CHECK ──────────────────
UPDATE events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open');
UPDATE events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
UPDATE events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
UPDATE events SET status = 'archive' WHERE status IN ('archived','archivee');
UPDATE events SET status = 'complet' WHERE status IN ('full','complete');
-- Tout statut non reconnu → a_venir
UPDATE events SET status = 'a_venir'
  WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');

DO $$
BEGIN
  ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
  ALTER TABLE events ADD CONSTRAINT events_status_check
    CHECK (status IN ('a_venir','complet','reporte','annule','passe','archive'));
EXCEPTION WHEN others THEN NULL;
END$$;

-- ── Étapes 5-6 : Table event_participants ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participations')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants') THEN
    ALTER TABLE event_participations RENAME TO event_participants;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants') THEN
    CREATE TABLE event_participants (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id             UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
      user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      status               TEXT DEFAULT 'inscrit' CHECK (status IN ('inscrit','confirme','annule','present','absent','liste_attente')),
      joined_at            TIMESTAMPTZ DEFAULT now(),
      confirmed_at         TIMESTAMPTZ,
      cancelled_at         TIMESTAMPTZ,
      attendance_marked_at TIMESTAMPTZ,
      notes                TEXT DEFAULT '',
      created_at           TIMESTAMPTZ DEFAULT now(),
      updated_at           TIMESTAMPTZ DEFAULT now(),
      UNIQUE(event_id, user_id)
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='status') THEN
    ALTER TABLE event_participants ADD COLUMN status TEXT DEFAULT 'inscrit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='joined_at') THEN
    ALTER TABLE event_participants ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='confirmed_at') THEN
    ALTER TABLE event_participants ADD COLUMN confirmed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='cancelled_at') THEN
    ALTER TABLE event_participants ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='attendance_marked_at') THEN
    ALTER TABLE event_participants ADD COLUMN attendance_marked_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='notes') THEN
    ALTER TABLE event_participants ADD COLUMN notes TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='updated_at') THEN
    ALTER TABLE event_participants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END$$;

-- ── Étape 7 : Table event_photos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_cover      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_photos' AND column_name='is_cover') THEN
    ALTER TABLE event_photos ADD COLUMN is_cover BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_photos' AND column_name='updated_at') THEN
    ALTER TABLE event_photos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END$$;

-- ── Étape 8 : Contrainte 1 seule photo de couverture par événement ────────────
CREATE UNIQUE INDEX IF NOT EXISTS event_photos_single_cover
  ON event_photos(event_id) WHERE is_cover = true;

-- ── Étape 9 : Table event_status_history ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Étape 10 : Table event_date_history (pour les reports) ───────────────────
CREATE TABLE IF NOT EXISTS event_date_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  old_event_date DATE,
  new_event_date DATE,
  old_start_time TIME,
  new_start_time TIME,
  changed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason         TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
`;
