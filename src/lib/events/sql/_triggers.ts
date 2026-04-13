/**
 * events/sql/_triggers.ts — Triggers du module Événements
 *
 * Couvre (étapes 11-12 de la migration) :
 *   11. Trigger updated_at sur events et event_participants
 *   12. Trigger d'audit des changements de statut → event_status_history
 *
 * Dépend des tables créées dans _schema.ts.
 */

export const EVENT_TRIGGERS_SQL = `-- ── Étape 11 : Trigger updated_at sur events ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_events_updated_at ON events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

DROP TRIGGER IF EXISTS trg_event_participants_updated_at ON event_participants;
CREATE TRIGGER trg_event_participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

-- ── Étape 12 : Trigger d'audit des changements de statut ─────────────────────
CREATE OR REPLACE FUNCTION log_event_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO event_status_history(event_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_event_status ON events;
CREATE TRIGGER trg_log_event_status
  AFTER UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION log_event_status_change();
`;
