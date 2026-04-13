/**
 * events/sql/_views_indexes.ts — Vue organisateur, index de performance
 *                                et lecture publique des profils
 *
 * Couvre (étapes 13, 13b, 20-21 de la migration) :
 *   13.  Guard colonnes capacity / is_unlimited / registration_open
 *   13b. Vue event_organizer_summary
 *   20.  Index de performance sur toutes les tables événements
 *   21.  Policy lecture publique des profils (nécessaire pour /profil/[id])
 *
 * Dépend des tables et triggers créés dans _schema.ts et _triggers.ts.
 */

export const EVENT_VIEWS_INDEXES_SQL = `-- ── Étape 13 : Guard colonnes avant la vue ───────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='capacity') THEN
    ALTER TABLE events ADD COLUMN capacity INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_unlimited') THEN
    ALTER TABLE events ADD COLUMN is_unlimited BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='registration_open') THEN
    ALTER TABLE events ADD COLUMN registration_open BOOLEAN DEFAULT true;
  END IF;
END$$;

-- ── Étape 13b : Vue résumé organisateur ──────────────────────────────────────
DROP VIEW IF EXISTS event_organizer_summary;
CREATE VIEW event_organizer_summary AS
SELECT
  e.id,
  e.title,
  e.category,
  e.event_date,
  e.start_time,
  e.location,
  e.status,
  e.capacity,
  e.is_unlimited,
  e.registration_open,
  e.author_id,
  COUNT(ep.id) FILTER (WHERE ep.status != 'annule')            AS participants_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'inscrit')            AS inscrit_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'confirme')           AS confirme_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'liste_attente')      AS attente_count,
  COUNT(ep.id) FILTER (WHERE ep.status = 'present')            AS present_count,
  CASE
    WHEN e.is_unlimited OR e.capacity IS NULL THEN NULL
    ELSE GREATEST(0, e.capacity - COUNT(ep.id) FILTER (WHERE ep.status != 'annule'))
  END AS remaining_places,
  CASE
    WHEN e.is_unlimited OR e.capacity IS NULL OR e.capacity = 0 THEN NULL
    ELSE ROUND(COUNT(ep.id) FILTER (WHERE ep.status != 'annule') * 100.0 / e.capacity)
  END AS fill_percentage
FROM events e
LEFT JOIN event_participants ep ON ep.event_id = e.id
GROUP BY e.id;

-- ── Étape 20 : Index de performance ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_date     ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status   ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_author   ON events(author_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_ep_event_id     ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_user_id      ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_esh_event_id    ON event_status_history(event_id);
CREATE INDEX IF NOT EXISTS idx_edh_event_id    ON event_date_history(event_id);
CREATE INDEX IF NOT EXISTS idx_ec_event_id     ON event_comments(event_id);

-- ── Étape 21 : RLS profiles — lecture publique ────────────────────────────────
-- Sans cette policy, la page /profil/[id] retourne "Profil introuvable"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_public_select'
  ) THEN
    CREATE POLICY "profiles_public_select" ON profiles
      FOR SELECT USING (true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'profiles_public_select déjà configurée : %', SQLERRM;
END$$;
`;
