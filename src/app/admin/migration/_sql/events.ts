/**
 * admin/migration/_sql/events.ts
 */
export const EVENTS_BASE_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Événements : tables de base idempotentes
-- À exécuter si "Événements locaux" et "Participations" restent en rouge
-- dans le diagnostic, même après EVENT_LIFECYCLE_SQL.
-- Ce script crée les tables sous leurs NOUVEAUX noms (events, event_participants)
-- sans passer par le renommage (plus sûr si local_events a déjà été renommée).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Table events (anciennement local_events) ────────────────────────────
DO $$
BEGIN
  -- Si local_events existe encore, la renommer
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'local_events' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    ALTER TABLE local_events RENAME TO events;
  END IF;
  -- Si ni l'une ni l'autre n'existe, créer events
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events' AND table_schema = 'public') THEN
    CREATE TABLE events (
      id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      author_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
      title            TEXT NOT NULL,
      description      TEXT NOT NULL DEFAULT '',
      event_date       DATE NOT NULL,
      event_end_date   DATE,
      start_time       TEXT DEFAULT '18:00',
      end_time         TEXT,
      location         TEXT DEFAULT 'Biguglia',
      location_city    TEXT DEFAULT 'Biguglia',
      category         TEXT DEFAULT 'social',
      organizer_name   TEXT,
      price_type       TEXT DEFAULT 'gratuit' CHECK (price_type IN ('gratuit','payant','libre')),
      price_amount     NUMERIC(10,2),
      capacity         INTEGER,
      is_unlimited     BOOLEAN DEFAULT false,
      registration_open BOOLEAN DEFAULT true,
      cover_photo_url  TEXT,
      tags             TEXT[] DEFAULT '{}',
      is_official      BOOLEAN DEFAULT false,
      status           TEXT DEFAULT 'a_venir' CHECK (status IN ('a_venir','complet','reporte','annule','passe','archive')),
      cancel_reason    TEXT,
      postpone_reason  TEXT,
      created_at       TIMESTAMPTZ DEFAULT now(),
      updated_at       TIMESTAMPTZ DEFAULT now()
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'events table: %', SQLERRM;
END$$;

-- Ajouter colonnes manquantes sur events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='subtitle') THEN
    ALTER TABLE events ADD COLUMN subtitle TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='event_end_date') THEN
    ALTER TABLE events ADD COLUMN event_end_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='price_type') THEN
    ALTER TABLE events ADD COLUMN price_type TEXT DEFAULT 'gratuit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INTEGER;
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
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'events columns: %', SQLERRM;
END$$;

-- Mettre à jour les statuts legacy si besoin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='events' AND table_schema='public') THEN
    UPDATE events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open','pending');
    UPDATE events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
    UPDATE events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
    UPDATE events SET status = 'archive' WHERE status IN ('archived','archivee');
    UPDATE events SET status = 'a_venir' WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'events status update: %', SQLERRM;
END$$;

-- Contrainte statut (idempotente)
DO $$ BEGIN
  ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
  ALTER TABLE events ADD CONSTRAINT events_status_check
    CHECK (status IN ('a_venir','complet','reporte','annule','passe','archive'));
EXCEPTION WHEN OTHERS THEN NULL; END$$;

-- RLS events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_select"         ON events;
DROP POLICY IF EXISTS "events_select_all"     ON events;
DROP POLICY IF EXISTS "events_insert"         ON events;
DROP POLICY IF EXISTS "events_update_own"     ON events;
DROP POLICY IF EXISTS "events_update_admin"   ON events;
CREATE POLICY "events_select_all"   ON events FOR SELECT USING (true);
CREATE POLICY "events_insert"       ON events FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "events_update_own"   ON events FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "events_update_admin" ON events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

-- ── 2. Table event_participants (anciennement event_participations) ─────────
DO $$
BEGIN
  -- Si event_participations existe encore, la renommer
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participations' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants' AND table_schema = 'public') THEN
    ALTER TABLE event_participations RENAME TO event_participants;
  END IF;
  -- Si ni l'une ni l'autre n'existe, créer event_participants
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_participants' AND table_schema = 'public') THEN
    CREATE TABLE event_participants (
      id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_id     UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
      user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      status       TEXT DEFAULT 'inscrit' CHECK (status IN ('inscrit','confirme','annule','present','absent','liste_attente')),
      joined_at    TIMESTAMPTZ DEFAULT now(),
      created_at   TIMESTAMPTZ DEFAULT now(),
      updated_at   TIMESTAMPTZ DEFAULT now(),
      UNIQUE(event_id, user_id)
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'event_participants table: %', SQLERRM;
END$$;

-- Ajouter colonnes manquantes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='status') THEN
    ALTER TABLE event_participants ADD COLUMN status TEXT DEFAULT 'inscrit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='joined_at') THEN
    ALTER TABLE event_participants ADD COLUMN joined_at TIMESTAMPTZ DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_participants' AND column_name='updated_at') THEN
    ALTER TABLE event_participants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'event_participants columns: %', SQLERRM;
END$$;

-- RLS event_participants
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ep_select" ON event_participants;
DROP POLICY IF EXISTS "ep_insert" ON event_participants;
DROP POLICY IF EXISTS "ep_delete" ON event_participants;
CREATE POLICY "ep_select" ON event_participants FOR SELECT USING (true);
CREATE POLICY "ep_insert" ON event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ep_delete" ON event_participants FOR DELETE USING (auth.uid() = user_id);

-- ── 3. event_status_history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason     TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE event_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "esh_select" ON event_status_history;
CREATE POLICY "esh_select" ON event_status_history FOR SELECT USING (true);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_events_date       ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status     ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_author     ON events(author_id);
CREATE INDEX IF NOT EXISTS idx_ep_event          ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_user           ON event_participants(user_id);

NOTIFY pgrst, 'reload schema';
-- ✅ Tables events, event_participants, event_status_history créées/migrées
`;

export const REMINDER_SQL = `-- ═══════════════════════════════════════════════════════════════════════════
-- RAPPEL J-1 MATÉRIEL — Fonction PostgreSQL + pg_cron ou Supabase Edge
-- ═══════════════════════════════════════════════════════════════════════════
-- Option A : pg_cron (nécessite l'extension pg_cron activée dans Supabase)
-- Option B : Supabase Edge Function planifiée (invoke toutes les 24h)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Étape 1 : Fonction qui génère les notifications J-1 ───────────────────
CREATE OR REPLACE FUNCTION send_loan_return_reminders()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
  tomorrow DATE := CURRENT_DATE + INTERVAL '1 day';
BEGIN
  FOR r IN
    SELECT
      el.id          AS loan_id,
      el.borrower_id,
      el.owner_id,
      ei.title       AS item_title,
      ei.id          AS item_id,
      er.requested_end_date
    FROM equipment_loans el
    JOIN equipment_items    ei ON ei.id = el.equipment_id
    LEFT JOIN equipment_requests er ON er.id = el.request_id
    WHERE el.status = 'en_cours'
      AND er.requested_end_date::date = tomorrow
  LOOP
    -- Notifier l'emprunteur
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      r.borrower_id,
      'loan_reminder',
      '⏰ Rappel retour J-1',
      'Vous devez rendre "' || r.item_title || '" demain (' || r.requested_end_date || '). Merci de le remettre propre et en bon état.',
      '/materiel/' || r.item_id
    )
    ON CONFLICT DO NOTHING;

    -- Notifier le propriétaire
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      r.owner_id,
      'loan_reminder',
      '📦 Retour prévu demain',
      '"' || r.item_title || '" devrait être rendu demain (' || r.requested_end_date || ').',
      '/dashboard/materiel'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ── Étape 2 : Programmer l'appel quotidien avec pg_cron (optionnel) ───────
-- Activez d'abord pg_cron dans Supabase : Extensions → pg_cron
-- Puis exécutez :
--
-- SELECT cron.schedule(
--   'loan-return-reminders',   -- Nom du job
--   '0 8 * * *',               -- Tous les jours à 8h UTC
--   $$SELECT send_loan_return_reminders();$$
-- );

-- ── Alternative : Supabase Edge Function ─────────────────────────────────
-- Créez une Edge Function "loan-reminders" avec le code :
--   const { data } = await supabase.rpc('send_loan_return_reminders');
-- Et planifiez-la dans Dashboard → Edge Functions → Schedules (cron: 0 8 * * *)

-- ✅ Résultat : emprunteur + propriétaire notifiés la veille du retour prévu
`;

