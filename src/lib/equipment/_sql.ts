/**
 * equipment/_sql.ts — Script de migration SQL du cycle de vie matériel
 *
 * Responsabilité unique : héberger le script SQL idempotent utilisé par
 * src/app/admin/migration pour provisionner / mettre à jour le schéma de
 * la base de données Supabase.
 *
 * Ce fichier ne contient aucune logique TypeScript en dehors de la constante
 * exportée — il ne doit pas être importé dans des composants UI.
 */

export const EQUIPMENT_LIFECYCLE_SQL = `-- ════════════════════════════════════════════════════════════════════════════
-- CYCLE DE VIE COMPLET DU MATÉRIEL — Biguglia Connect
-- Script idempotent — peut être relancé sans danger
-- ════════════════════════════════════════════════════════════════════════════

-- ── ÉTAPE 1 : Nouvelles colonnes sur equipment_items ──────────────────────
ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS status             TEXT DEFAULT 'disponible',
  ADD COLUMN IF NOT EXISTS status_changed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS availability_notes TEXT,
  ADD COLUMN IF NOT EXISTS location_area      TEXT;

-- ── ÉTAPE 1b : Supprimer TOUTES les contraintes status existantes ────────
-- (deux noms possibles selon la version de la base)
ALTER TABLE equipment_items DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE equipment_items DROP CONSTRAINT IF EXISTS equipment_items_status_check;

-- ── ÉTAPE 1c : Migrer les données AVANT d'ajouter la contrainte ───────────
-- Convertit les anciens statuts anglais (available/borrowed/reserved/unavailable)
-- et toute valeur invalide vers les nouveaux statuts français
UPDATE equipment_items
SET status = CASE
  WHEN status = 'available'    THEN 'disponible'
  WHEN status = 'reserved'     THEN 'reserve'
  WHEN status = 'borrowed'     THEN 'prete'
  WHEN status = 'returned'     THEN 'rendu'
  WHEN status = 'unavailable'  THEN 'indisponible'
  WHEN status = 'archived'     THEN 'archive'
  WHEN status IN ('disponible','reserve','prete','rendu','indisponible','archive') THEN status
  -- Fallback sur is_available si statut inconnu ou NULL
  WHEN is_available = true     THEN 'disponible'
  ELSE 'indisponible'
END
WHERE status IS NULL
   OR status NOT IN ('disponible','reserve','prete','rendu','indisponible','archive');

-- ── ÉTAPE 1d : Ajouter la contrainte APRÈS migration des données ──────────
ALTER TABLE equipment_items
  ADD CONSTRAINT equipment_status_check
  CHECK (status IN ('disponible','reserve','prete','rendu','indisponible','archive'));

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

DROP POLICY IF EXISTS "eqreq_owner_read"       ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_requester_read"   ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_requester_insert" ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_requester_update" ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_owner_update"     ON equipment_requests;
DROP POLICY IF EXISTS "eqreq_admin_all"        ON equipment_requests;

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

DROP POLICY IF EXISTS "eqhist_read"   ON equipment_status_history;
DROP POLICY IF EXISTS "eqhist_insert" ON equipment_status_history;

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
