/**
 * outings.ts — Librairie métier pour le module Promenades / Sorties groupées
 * Biguglia Connect
 *
 * Statuts français, transitions autorisées, configuration UI, SQL migration
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type OutingStatus =
  | 'ouverte'
  | 'complete'
  | 'terminee'
  | 'annulee'
  | 'archivee';

export type ParticipantStatus =
  | 'inscrit'
  | 'confirme'
  | 'annule'
  | 'present'
  | 'absent';

export interface OutingStatusConfig {
  label: string;
  description: string;
  color: string;        // Tailwind text color
  bg: string;           // Tailwind bg color
  border: string;       // Tailwind border color
  badgeBg: string;      // badge background
  badgeText: string;    // badge text color
  icon: string;         // emoji icon
  canRegister: boolean; // inscriptions possibles
}

export interface ParticipantStatusConfig {
  label: string;
  color: string;
  bg: string;
  icon: string;
}

export interface StatusTransition {
  from: OutingStatus;
  to: OutingStatus;
  label: string;
  description: string;
  requiresReason?: boolean;
}

// ─── Configuration des statuts ────────────────────────────────────────────────

export const OUTING_STATUS_CONFIG: Record<OutingStatus, OutingStatusConfig> = {
  ouverte: {
    label: 'Ouverte',
    description: 'Inscriptions ouvertes, la sortie est confirmée',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    icon: '🟢',
    canRegister: true,
  },
  complete: {
    label: 'Complète',
    description: 'Capacité maximale atteinte, liste pleine',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    icon: '🟡',
    canRegister: false,
  },
  terminee: {
    label: 'Terminée',
    description: 'La sortie a eu lieu',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    icon: '✅',
    canRegister: false,
  },
  annulee: {
    label: 'Annulée',
    description: 'La sortie a été annulée',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    icon: '❌',
    canRegister: false,
  },
  archivee: {
    label: 'Archivée',
    description: 'Sortie archivée, visible uniquement dans l\'historique',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
    icon: '📦',
    canRegister: false,
  },
};

// ─── Configuration des statuts participants ───────────────────────────────────

export const PARTICIPANT_STATUS_CONFIG: Record<ParticipantStatus, ParticipantStatusConfig> = {
  inscrit: {
    label: 'Inscrit',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    icon: '✓',
  },
  confirme: {
    label: 'Confirmé',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: '✅',
  },
  annule: {
    label: 'Annulé',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    icon: '✗',
  },
  present: {
    label: 'Présent',
    color: 'text-green-700',
    bg: 'bg-green-50',
    icon: '🙋',
  },
  absent: {
    label: 'Absent',
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: '🚫',
  },
};

// ─── Transitions autorisées ───────────────────────────────────────────────────

export const OUTING_TRANSITIONS: StatusTransition[] = [
  // ouverte ↔ complete
  {
    from: 'ouverte',
    to: 'complete',
    label: 'Marquer complète',
    description: 'Indiquer que la capacité est atteinte',
  },
  {
    from: 'complete',
    to: 'ouverte',
    label: 'Rouvrir les inscriptions',
    description: 'Remettre des places disponibles',
  },
  // ouverte/complete → terminee
  {
    from: 'ouverte',
    to: 'terminee',
    label: 'Marquer terminée',
    description: 'La sortie a eu lieu',
  },
  {
    from: 'complete',
    to: 'terminee',
    label: 'Marquer terminée',
    description: 'La sortie a eu lieu',
  },
  // ouverte/complete → annulee
  {
    from: 'ouverte',
    to: 'annulee',
    label: 'Annuler la sortie',
    description: 'Annuler définitivement cette sortie',
    requiresReason: true,
  },
  {
    from: 'complete',
    to: 'annulee',
    label: 'Annuler la sortie',
    description: 'Annuler définitivement cette sortie',
    requiresReason: true,
  },
  // terminee/annulee → archivee
  {
    from: 'terminee',
    to: 'archivee',
    label: 'Archiver',
    description: 'Déplacer dans l\'historique',
  },
  {
    from: 'annulee',
    to: 'archivee',
    label: 'Archiver',
    description: 'Déplacer dans l\'historique',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retourne les transitions disponibles depuis un statut donné
 */
export function getAvailableTransitions(
  currentStatus: OutingStatus,
  isAdmin = false,
): StatusTransition[] {
  const transitions = OUTING_TRANSITIONS.filter(t => t.from === currentStatus);
  // Admin can archive from any non-archived status
  if (isAdmin && currentStatus !== 'archivee') {
    const hasArchive = transitions.some(t => t.to === 'archivee');
    if (!hasArchive) {
      transitions.push({
        from: currentStatus,
        to: 'archivee',
        label: 'Archiver (admin)',
        description: 'Archiver cette sortie',
      });
    }
  }
  return transitions;
}

/**
 * Vérifie si une inscription est possible
 */
export function canRegister(
  status: OutingStatus,
  participantsCount: number,
  maxParticipants: number,
  outingDate: string,
): { allowed: boolean; reason?: string } {
  const config = OUTING_STATUS_CONFIG[status];
  if (!config) return { allowed: false, reason: 'Statut inconnu' };

  if (!config.canRegister) {
    return { allowed: false, reason: `La sortie est ${config.label.toLowerCase()}` };
  }

  const date = new Date(outingDate + 'T23:59:59');
  if (date < new Date()) {
    return { allowed: false, reason: 'La date de cette sortie est dépassée' };
  }

  if (participantsCount >= maxParticipants) {
    return { allowed: false, reason: 'La sortie est complète' };
  }

  return { allowed: true };
}

/**
 * Convertit un ancien statut anglais en statut français
 */
export function legacyToFrenchStatus(status: string): OutingStatus {
  const map: Record<string, OutingStatus> = {
    open: 'ouverte',
    active: 'ouverte',
    full: 'complete',
    done: 'terminee',
    completed: 'terminee',
    cancelled: 'annulee',
    archived: 'archivee',
    // Already french
    ouverte: 'ouverte',
    complete: 'complete',
    terminee: 'terminee',
    annulee: 'annulee',
    archivee: 'archivee',
  };
  return map[status] || 'ouverte';
}

/**
 * Calcule le statut affiché en tenant compte de la date et du remplissage
 */
export function computeDisplayStatus(
  status: OutingStatus,
  participantsCount: number,
  maxParticipants: number,
  outingDate: string,
): OutingStatus {
  // Statuts terminaux — ne pas recalculer
  if (['terminee', 'annulee', 'archivee'].includes(status)) return status;

  // Si date dépassée, considérer terminée (UI uniquement)
  const date = new Date(outingDate + 'T23:59:59');
  if (date < new Date()) return 'terminee';

  // Si complet automatiquement
  if (participantsCount >= maxParticipants && status === 'ouverte') return 'complete';

  return status;
}

// ─── SQL Migration ────────────────────────────────────────────────────────────

export const OUTINGS_LIFECYCLE_SQL = `-- ════════════════════════════════════════════════════════════════════════════
-- SQL CYCLE DE VIE DES SORTIES GROUPÉES — Biguglia Connect
-- Statuts français : ouverte, complete, terminee, annulee, archivee
-- À exécuter UNE FOIS dans Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── Étape 1 : Colonnes manquantes sur group_outings ─────────────────────────
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ouverte';
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS is_registration_open BOOLEAN DEFAULT true;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS location_area TEXT;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS location_city TEXT DEFAULT 'Biguglia';
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS duration_estimate TEXT;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS stroller_accessible BOOLEAN DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false;

-- ── Étape 2 : Migrer les anciens statuts anglais vers français ───────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='group_outings' AND column_name='status') THEN

    -- Supprimer l'ancienne contrainte CHECK si elle existe
    ALTER TABLE group_outings DROP CONSTRAINT IF EXISTS group_outings_status_check;
    ALTER TABLE group_outings DROP CONSTRAINT IF EXISTS outings_status_check;

    UPDATE group_outings SET status = CASE
      WHEN status = 'open'       THEN 'ouverte'
      WHEN status = 'active'     THEN 'ouverte'
      WHEN status = 'full'       THEN 'complete'
      WHEN status = 'done'       THEN 'terminee'
      WHEN status = 'completed'  THEN 'terminee'
      WHEN status = 'cancelled'  THEN 'annulee'
      WHEN status = 'archived'   THEN 'archivee'
      WHEN status IN ('ouverte','complete','terminee','annulee','archivee') THEN status
      ELSE 'ouverte'
    END;

    -- Ajouter la nouvelle contrainte CHECK
    ALTER TABLE group_outings
      ADD CONSTRAINT group_outings_status_check
      CHECK (status IN ('ouverte','complete','terminee','annulee','archivee'));
  END IF;
END $$;

-- ── Étape 3 : Colonnes manquantes sur outing_participants ───────────────────
ALTER TABLE outing_participants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inscrit';
ALTER TABLE outing_participants ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE outing_participants ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE outing_participants ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ;
ALTER TABLE outing_participants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE outing_participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE outing_participants ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  ALTER TABLE outing_participants DROP CONSTRAINT IF EXISTS outing_participants_status_check;
  ALTER TABLE outing_participants
    ADD CONSTRAINT outing_participants_status_check
    CHECK (status IN ('inscrit','confirme','annule','present','absent'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- ── Étape 4 : Colonne is_cover sur outing_photos ────────────────────────────
ALTER TABLE outing_photos ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;

-- ── Étape 5 : Table outing_status_history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS outing_status_history (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id     UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  old_status    TEXT,
  new_status    TEXT NOT NULL,
  changed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outing_status_history_outing_idx
  ON outing_status_history(outing_id, created_at DESC);

-- ── Étape 6 : RLS outing_status_history ──────────────────────────────────────
ALTER TABLE outing_status_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_status_history' AND policyname='outing_status_history_select') THEN
    CREATE POLICY "outing_status_history_select" ON outing_status_history FOR SELECT USING (
      EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "outing_status_history_insert" ON outing_status_history FOR INSERT WITH CHECK (
      auth.uid() = changed_by
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ── Étape 7 : RLS policies supplémentaires group_outings ────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "group_outings_delete" ON group_outings;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='group_outings' AND policyname='group_outings_delete') THEN
    CREATE POLICY "group_outings_delete" ON group_outings FOR DELETE USING (
      auth.uid() = organizer_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- RLS participants mise à jour
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_participants' AND policyname='outing_participants_update') THEN
    CREATE POLICY "outing_participants_update" ON outing_participants FOR UPDATE USING (
      auth.uid() = user_id
      OR EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ── Étape 8 : Trigger updated_at sur outing_participants ─────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER LANGUAGE plpgsql AS $func$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $func$;
  END IF;
EXCEPTION WHEN duplicate_function THEN NULL;
END $$;

DROP TRIGGER IF EXISTS outing_participants_updated_at ON outing_participants;
CREATE TRIGGER outing_participants_updated_at
  BEFORE UPDATE ON outing_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Étape 9 : Trigger log historique statut sortie ───────────────────────────
CREATE OR REPLACE FUNCTION log_outing_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO outing_status_history(outing_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS outing_status_change_trigger ON group_outings;
CREATE TRIGGER outing_status_change_trigger
  AFTER UPDATE ON group_outings
  FOR EACH ROW EXECUTE FUNCTION log_outing_status_change();

-- ── Étape 10 : Trigger updated_at sur group_outings ─────────────────────────
DROP TRIGGER IF EXISTS group_outings_updated_at ON group_outings;
CREATE TRIGGER group_outings_updated_at
  BEFORE UPDATE ON group_outings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Étape 11 : Vue récapitulative organisateur ────────────────────────────────
CREATE OR REPLACE VIEW outing_organizer_summary AS
SELECT
  o.id,
  o.organizer_id,
  o.title,
  o.status,
  o.outing_date,
  o.outing_time,
  o.max_participants,
  o.is_registration_open,
  COUNT(p.id) FILTER (WHERE p.status != 'annule') AS participants_count,
  COUNT(p.id) FILTER (WHERE p.status = 'inscrit') AS inscrit_count,
  COUNT(p.id) FILTER (WHERE p.status = 'confirme') AS confirme_count,
  COUNT(p.id) FILTER (WHERE p.status = 'annule') AS annule_count,
  COUNT(p.id) FILTER (WHERE p.status = 'present') AS present_count,
  ROUND(
    COUNT(p.id) FILTER (WHERE p.status != 'annule')::numeric
    / NULLIF(o.max_participants, 0) * 100
  ) AS fill_percent
FROM group_outings o
LEFT JOIN outing_participants p ON p.outing_id = o.id
GROUP BY o.id;

GRANT SELECT ON outing_organizer_summary TO authenticated;

-- ── Étape 12 : Commentaires tables ───────────────────────────────────────────
COMMENT ON TABLE group_outings IS 'Sorties groupées organisées par les membres de Biguglia Connect';
COMMENT ON TABLE outing_participants IS 'Inscriptions et présences aux sorties groupées';
COMMENT ON TABLE outing_status_history IS 'Historique des changements de statut des sorties';

-- ✅ Migration Sorties groupées terminée !
`;
