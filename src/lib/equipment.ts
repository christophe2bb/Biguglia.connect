/**
 * Bibliothèque métier — Cycle de vie du matériel
 * Biguglia Connect
 * Statuts, transitions, règles, types, SQL
 */

// ─── Statuts du matériel ─────────────────────────────────────────────────────

export type EquipmentStatus =
  | 'disponible'
  | 'reserve'
  | 'prete'
  | 'rendu'
  | 'indisponible'
  | 'archive';

export type LoanRequestStatus =
  | 'en_attente'
  | 'acceptee'
  | 'refusee'
  | 'annulee'
  | 'terminee';

export type LoanStatus =
  | 'reserve'
  | 'en_cours'
  | 'retourne'
  | 'annule';

// ─── Labels et couleurs ───────────────────────────────────────────────────────

export const EQUIPMENT_STATUS_CONFIG: Record<EquipmentStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  icon: string;
  description: string;
}> = {
  disponible: {
    label: 'Disponible',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    icon: '✅',
    description: 'Ce matériel peut être emprunté',
  },
  reserve: {
    label: 'Réservé',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    icon: '🔒',
    description: 'Un emprunteur a été sélectionné',
  },
  prete: {
    label: 'Prêté',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
    icon: '🔄',
    description: 'Actuellement chez un emprunteur',
  },
  rendu: {
    label: 'Rendu',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    icon: '📦',
    description: 'Le prêt est terminé, matériel restitué',
  },
  indisponible: {
    label: 'Indisponible',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
    icon: '⛔',
    description: 'Temporairement non disponible',
  },
  archive: {
    label: 'Archivé',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    dot: 'bg-gray-500',
    icon: '📁',
    description: 'Retiré du circuit de prêt',
  },
};

export const LOAN_REQUEST_STATUS_CONFIG: Record<LoanRequestStatus, {
  label: string;
  color: string;
  bg: string;
  icon: string;
}> = {
  en_attente: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-50', icon: '⏳' },
  acceptee:   { label: 'Acceptée',   color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '✅' },
  refusee:    { label: 'Refusée',    color: 'text-red-700', bg: 'bg-red-50', icon: '❌' },
  annulee:    { label: 'Annulée',    color: 'text-gray-600', bg: 'bg-gray-50', icon: '🚫' },
  terminee:   { label: 'Terminée',   color: 'text-blue-700', bg: 'bg-blue-50', icon: '🏁' },
};

// ─── Transitions autorisées ───────────────────────────────────────────────────

export const ALLOWED_TRANSITIONS: Record<EquipmentStatus, EquipmentStatus[]> = {
  disponible:    ['reserve', 'indisponible', 'archive'],
  reserve:       ['prete', 'disponible', 'archive'],
  prete:         ['rendu', 'archive'],
  rendu:         ['disponible', 'archive'],
  indisponible:  ['disponible', 'archive'],
  archive:       [], // Fin de vie, aucune transition automatique
};

export const TRANSITION_LABELS: Record<string, string> = {
  'disponible→reserve':    'Réserver pour un emprunteur',
  'disponible→indisponible': 'Mettre en pause',
  'disponible→archive':    'Archiver',
  'reserve→prete':         'Marquer comme prêté (remis)',
  'reserve→disponible':    'Annuler la réservation',
  'reserve→archive':       'Archiver',
  'prete→rendu':           'Confirmer le retour',
  'prete→archive':         'Archiver',
  'rendu→disponible':      'Remettre en circulation',
  'rendu→archive':         'Archiver',
  'indisponible→disponible': 'Remettre disponible',
  'indisponible→archive':  'Archiver',
};

export function getAllowedTransitions(current: EquipmentStatus): EquipmentStatus[] {
  return ALLOWED_TRANSITIONS[current] || [];
}

export function canTransition(from: EquipmentStatus, to: EquipmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getTransitionLabel(from: EquipmentStatus, to: EquipmentStatus): string {
  return TRANSITION_LABELS[`${from}→${to}`] || `Passer à ${EQUIPMENT_STATUS_CONFIG[to]?.label}`;
}

// ─── Règles de suppression ───────────────────────────────────────────────────

export function canDelete(status: EquipmentStatus, hasActiveLoan: boolean): {
  allowed: boolean;
  reason?: string;
} {
  if (hasActiveLoan) return { allowed: false, reason: 'Un prêt est en cours' };
  if (status === 'prete') return { allowed: false, reason: 'Matériel actuellement prêté' };
  if (status === 'reserve') return { allowed: false, reason: 'Une réservation est active' };
  return { allowed: true };
}

// ─── Visibilité publique ──────────────────────────────────────────────────────

export function isPubliclyVisible(status: EquipmentStatus): boolean {
  return status !== 'archive';
}

export function isRequestable(status: EquipmentStatus): boolean {
  return status === 'disponible';
}

// ─── Types TypeScript complets ────────────────────────────────────────────────

export interface EquipmentItemFull {
  id: string;
  owner_id: string;
  category_id: string;
  title: string;
  description: string;
  condition: 'neuf' | 'tres_bon' | 'bon' | 'usage';
  status: EquipmentStatus;
  is_available: boolean; // legacy, sync avec status
  is_free: boolean;
  daily_rate?: number;
  deposit_amount?: number;
  pickup_location: string;
  location_area?: string;
  rules?: string;
  availability_notes?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  status_changed_at?: string;
  // Relations
  owner?: { id: string; full_name: string; avatar_url?: string };
  category?: { id: string; name: string; icon: string; slug: string };
  photos?: EquipmentPhotoFull[];
}

export interface EquipmentPhotoFull {
  id: string;
  item_id: string;
  url: string;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface EquipmentRequest {
  id: string;
  equipment_id: string;
  requester_id: string;
  message?: string;
  requested_start_date?: string;
  requested_end_date?: string;
  status: LoanRequestStatus;
  created_at: string;
  updated_at: string;
  // Relations
  equipment?: EquipmentItemFull;
  requester?: { id: string; full_name: string; avatar_url?: string };
}

export interface EquipmentLoan {
  id: string;
  equipment_id: string;
  owner_id: string;
  borrower_id: string;
  request_id?: string;
  status: LoanStatus;
  reserved_at?: string;
  loan_started_at?: string;
  returned_at?: string;
  notes_owner?: string;
  notes_borrower?: string;
  created_at: string;
  updated_at: string;
  // Relations
  equipment?: EquipmentItemFull;
  borrower?: { id: string; full_name: string; avatar_url?: string };
  owner?: { id: string; full_name: string; avatar_url?: string };
}

export interface EquipmentStatusHistory {
  id: string;
  equipment_id: string;
  old_status?: string;
  new_status: string;
  changed_by: string;
  reason?: string;
  created_at: string;
  changed_by_profile?: { full_name: string; avatar_url?: string };
}

// ─── SQL de migration ─────────────────────────────────────────────────────────

export const EQUIPMENT_LIFECYCLE_SQL = `-- ════════════════════════════════════════════════════════════════════════════
-- CYCLE DE VIE COMPLET DU MATÉRIEL — Biguglia Connect
-- Script idempotent — peut être relancé sans danger
-- ════════════════════════════════════════════════════════════════════════════

-- ── ÉTAPE 1 : Nouveaux statuts sur equipment_items ────────────────────────
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'disponible',
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availability_notes TEXT,
  ADD COLUMN IF NOT EXISTS location_area     TEXT;

-- Contrainte statuts valides
ALTER TABLE equipment_items
  DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE equipment_items
  ADD CONSTRAINT equipment_status_check
  CHECK (status IN ('disponible','reserve','prete','rendu','indisponible','archive'));

-- Migration données existantes
UPDATE equipment_items
SET status = CASE
  WHEN is_available = true  THEN 'disponible'
  WHEN is_available = false THEN 'indisponible'
  ELSE 'disponible'
END
WHERE status IS NULL OR status NOT IN ('disponible','reserve','prete','rendu','indisponible','archive');

-- ── ÉTAPE 2 : Table equipment_requests (demandes d'emprunt) ───────────────
CREATE TABLE IF NOT EXISTS equipment_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id         UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  requester_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message              TEXT,
  requested_start_date DATE,
  requested_end_date   DATE,
  status               TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente','acceptee','refusee','annulee','terminee')),
  owner_note           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÉTAPE 3 : Table equipment_loans (prêts réels validés) ─────────────────
CREATE TABLE IF NOT EXISTS equipment_loans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id     UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  owner_id         UUID NOT NULL REFERENCES profiles(id),
  borrower_id      UUID NOT NULL REFERENCES profiles(id),
  request_id       UUID REFERENCES equipment_requests(id),
  status           TEXT NOT NULL DEFAULT 'reserve'
    CHECK (status IN ('reserve','en_cours','retourne','annule')),
  reserved_at      TIMESTAMPTZ DEFAULT NOW(),
  loan_started_at  TIMESTAMPTZ,
  returned_at      TIMESTAMPTZ,
  notes_owner      TEXT,
  notes_borrower   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÉTAPE 4 : Table equipment_status_history (audit trail) ────────────────
CREATE TABLE IF NOT EXISTS equipment_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT NOT NULL,
  changed_by   UUID NOT NULL REFERENCES profiles(id),
  reason       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÉTAPE 5 : Colonnes manquantes (idempotence) ───────────────────────────
ALTER TABLE equipment_requests ADD COLUMN IF NOT EXISTS owner_note TEXT;
ALTER TABLE equipment_loans    ADD COLUMN IF NOT EXISTS notes_owner TEXT;
ALTER TABLE equipment_loans    ADD COLUMN IF NOT EXISTS notes_borrower TEXT;
ALTER TABLE equipment_photos   ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;

-- ── ÉTAPE 6 : Index de performance ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eq_status       ON equipment_items(status);
CREATE INDEX IF NOT EXISTS idx_eq_owner        ON equipment_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_eq_category     ON equipment_items(category_id);
CREATE INDEX IF NOT EXISTS idx_eqreq_equip     ON equipment_requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_eqreq_requester ON equipment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_eqreq_status    ON equipment_requests(status);
CREATE INDEX IF NOT EXISTS idx_eqloan_equip    ON equipment_loans(equipment_id);
CREATE INDEX IF NOT EXISTS idx_eqloan_borrower ON equipment_loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_eqloan_owner    ON equipment_loans(owner_id);
CREATE INDEX IF NOT EXISTS idx_eqloan_status   ON equipment_loans(status);
CREATE INDEX IF NOT EXISTS idx_eqhist_equip    ON equipment_status_history(equipment_id);

-- ── ÉTAPE 7 : Trigger updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_equipment_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_eq_updated_at       ON equipment_items;
DROP TRIGGER IF EXISTS trg_eqreq_updated_at    ON equipment_requests;
DROP TRIGGER IF EXISTS trg_eqloan_updated_at   ON equipment_loans;

CREATE TRIGGER trg_eq_updated_at
  BEFORE UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER trg_eqreq_updated_at
  BEFORE UPDATE ON equipment_requests
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER trg_eqloan_updated_at
  BEFORE UPDATE ON equipment_loans
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

-- ── ÉTAPE 8 : Trigger audit statut ───────────────────────────────────────
CREATE OR REPLACE FUNCTION log_equipment_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = NOW();
    IF NEW.status = 'archive' THEN NEW.archived_at = NOW(); END IF;
    -- Sync is_available
    NEW.is_available = (NEW.status = 'disponible');
    INSERT INTO equipment_status_history(equipment_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.owner_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_eq_status_log ON equipment_items;
CREATE TRIGGER trg_eq_status_log
  BEFORE UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION log_equipment_status_change();

-- ── ÉTAPE 9 : RLS — equipment_items ──────────────────────────────────────
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eq_public_read"    ON equipment_items;
DROP POLICY IF EXISTS "eq_owner_insert"   ON equipment_items;
DROP POLICY IF EXISTS "eq_owner_update"   ON equipment_items;
DROP POLICY IF EXISTS "eq_owner_delete"   ON equipment_items;
DROP POLICY IF EXISTS "eq_admin_all"      ON equipment_items;

CREATE POLICY "eq_public_read" ON equipment_items
  FOR SELECT USING (status != 'archive' OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "eq_owner_insert" ON equipment_items
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "eq_owner_update" ON equipment_items
  FOR UPDATE USING (owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "eq_owner_delete" ON equipment_items
  FOR DELETE USING (owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

-- ── ÉTAPE 10 : RLS — equipment_requests ──────────────────────────────────
ALTER TABLE equipment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eqreq_owner_read"      ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_requester_read"  ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_requester_insert" ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_requester_update" ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_owner_update"    ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_admin_all"       ON equipment_requests;

CREATE POLICY "eqreq_owner_read" ON equipment_requests
  FOR SELECT USING (
    requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM equipment_items ei WHERE ei.id = equipment_id AND ei.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "eqreq_requester_insert" ON equipment_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "eqreq_requester_update" ON equipment_requests
  FOR UPDATE USING (
    requester_id = auth.uid() AND status IN ('en_attente','annulee')
    OR EXISTS (SELECT 1 FROM equipment_items ei WHERE ei.id = equipment_id AND ei.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- ── ÉTAPE 11 : RLS — equipment_loans ─────────────────────────────────────
ALTER TABLE equipment_loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eqloan_parties_read"   ON equipment_loans;
DROP POLICY IF EXISTS "eqloan_owner_insert"   ON equipment_loans;
DROP POLICY IF EXISTS "eqloan_owner_update"   ON equipment_loans;
DROP POLICY IF EXISTS "eqloan_admin_all"      ON equipment_loans;

CREATE POLICY "eqloan_parties_read" ON equipment_loans
  FOR SELECT USING (
    owner_id = auth.uid() OR borrower_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "eqloan_owner_insert" ON equipment_loans
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "eqloan_owner_update" ON equipment_loans
  FOR UPDATE USING (
    owner_id = auth.uid() OR borrower_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- ── ÉTAPE 12 : RLS — equipment_status_history ────────────────────────────
ALTER TABLE equipment_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eqhist_read" ON equipment_status_history;

CREATE POLICY "eqhist_read" ON equipment_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM equipment_items ei WHERE ei.id = equipment_id AND ei.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

CREATE POLICY "eqhist_insert" ON equipment_status_history
  FOR INSERT WITH CHECK (changed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator')));

-- ── ÉTAPE 13 : Vue synthétique pour le dashboard propriétaire ─────────────
CREATE OR REPLACE VIEW equipment_owner_summary AS
SELECT
  ei.owner_id,
  COUNT(*)                                             AS total,
  COUNT(*) FILTER (WHERE ei.status = 'disponible')     AS disponible,
  COUNT(*) FILTER (WHERE ei.status = 'reserve')        AS reserve,
  COUNT(*) FILTER (WHERE ei.status = 'prete')          AS prete,
  COUNT(*) FILTER (WHERE ei.status = 'rendu')          AS rendu,
  COUNT(*) FILTER (WHERE ei.status = 'indisponible')   AS indisponible,
  COUNT(*) FILTER (WHERE ei.status = 'archive')        AS archive,
  (SELECT COUNT(*) FROM equipment_requests er2
   JOIN equipment_items ei2 ON er2.equipment_id = ei2.id
   WHERE ei2.owner_id = ei.owner_id AND er2.status = 'en_attente') AS pending_requests,
  (SELECT COUNT(*) FROM equipment_loans el2
   WHERE el2.owner_id = ei.owner_id AND el2.status = 'en_cours')   AS active_loans
FROM equipment_items ei
GROUP BY ei.owner_id;

GRANT SELECT ON equipment_owner_summary TO authenticated;

-- ── ÉTAPE 14 : Commentaires ───────────────────────────────────────────────
COMMENT ON TABLE equipment_requests       IS 'Demandes d''emprunt de matériel';
COMMENT ON TABLE equipment_loans          IS 'Prêts de matériel validés et en cours';
COMMENT ON TABLE equipment_status_history IS 'Historique des changements de statut matériel';

-- ════════════════════════════════════════════════════════════════════════════
-- ✅ Cycle de vie matériel opérationnel !
-- Tables    : equipment_requests, equipment_loans, equipment_status_history
-- Vue       : equipment_owner_summary
-- Dashboard : /dashboard/materiel
-- ════════════════════════════════════════════════════════════════════════════
`;
