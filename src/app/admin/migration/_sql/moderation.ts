/**
 * admin/migration/_sql/moderation.ts
 */
export const USER_ROLE_FIX_SQL = `-- ============================================================
-- 🔧 CORRECTIF — enum user_role : valeur "moderateur" invalide
-- Exécutez CE SCRIPT si vous obtenez l'erreur :
--   invalid input value for enum user_role: "moderateur"
--
-- POURQUOI : L'enum user_role de la BD utilise 'moderateur' (FR)
-- mais nos politiques RLS comparent à 'moderator' (EN), ou
-- inversement un ancien trigger/fonction stocke 'moderateur'
-- alors que l'enum a été mis à jour vers 'moderator'.
-- Ce script harmonise les deux en ajoutant la valeur manquante
-- et en convertissant toutes les lignes existantes.
-- ============================================================

-- ÉTAPE 1 : Ajouter 'moderator' à l'enum si absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'moderator'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'moderator';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- user_role n'est peut-être pas un enum, ignorer
  NULL;
END$$;

-- NOTE : ALTER TYPE ADD VALUE ne peut pas s'exécuter dans un bloc DO
-- si une transaction est déjà ouverte. Si l'étape 1 échoue, commitez
-- d'abord puis exécutez uniquement :
--   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- ÉTAPE 2 : Migrer toutes les lignes 'moderateur' → 'moderator'
-- (nécessite que 'moderator' existe déjà dans l'enum)
UPDATE profiles
  SET role = 'moderator'::user_role
  WHERE role::text = 'moderateur';

-- ÉTAPE 3 : Si user_role est TEXT (pas un enum), mettre à jour directement
-- (cette requête ne fait rien si role est un enum, sans erreur)
DO $$
BEGIN
  UPDATE profiles SET role = 'moderator' WHERE role::text = 'moderateur';
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ÉTAPE 4 : Recréer les fonctions qui référençaient 'moderateur'
-- Remplace current_user_role() avec une version robuste TEXT
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ÉTAPE 5 : Vérification
SELECT id, role::text FROM profiles WHERE role::text IN ('moderateur','moderator','admin') LIMIT 10;

-- ✅ Correctif appliqué
-- Rechargez la page et réessayez la migration
`;

export const MODERATION_FIX_SQL = `-- ══════════════════════════════════════════════════════════════
-- CORRECTIF URGENT — moderation_queue colonnes manquantes
-- Exécutez CE script EN PREMIER si vous avez l'erreur :
-- "column submitted_at does not exist"
-- ══════════════════════════════════════════════════════════════

-- Supprime la vue KPI qui bloque (dépendante des colonnes)
DROP VIEW IF EXISTS moderation_kpi;

-- Ajoute toutes les colonnes potentiellement manquantes
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_score        INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_level        TEXT DEFAULT 'low';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS completeness      INT DEFAULT 100;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS author_trust      TEXT DEFAULT 'nouveau';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_title     TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_excerpt   TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_photos    TEXT[];
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS resubmit_count    INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS moderator_note    TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS correction_reason TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS refusal_reason    TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS decision          TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMPTZ;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_by       UUID;

-- Recrée la vue KPI avec les colonnes maintenant présentes
CREATE VIEW moderation_kpi AS
SELECT
  COUNT(*)                                                              AS total,
  COUNT(*) FILTER (WHERE status = 'en_attente_validation')             AS pending,
  COUNT(*) FILTER (WHERE status = 'publie')                            AS published,
  COUNT(*) FILTER (WHERE status = 'refuse')                            AS refused,
  COUNT(*) FILTER (WHERE status = 'a_corriger')                        AS correction,
  COUNT(*) FILTER (WHERE status = 'archive')                           AS archived,
  AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600)
    FILTER (WHERE reviewed_at IS NOT NULL AND submitted_at IS NOT NULL) AS avg_review_hours,
  COUNT(*) FILTER (WHERE risk_level IN ('high','critical'))             AS high_risk,
  COUNT(*) FILTER (WHERE author_trust = 'nouveau')                     AS new_authors,
  COUNT(*) FILTER (WHERE submitted_at >= NOW() - INTERVAL '24 hours')  AS last_24h
FROM moderation_queue;

GRANT SELECT ON moderation_kpi TO authenticated;

-- ✅ Correctif appliqué — la modération est opérationnelle
`;

export const MODERATION_SQL = `-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTÈME DE MODÉRATION CENTRALISÉ — Biguglia Connect
-- ═══════════════════════════════════════════════════════════════════════════
-- IMPORTANT : Ce script est idempotent (peut être relancé sans danger).
-- Si vous obtenez "column submitted_at does not exist" sur une ancienne
-- installation, ce script corrige automatiquement le schéma.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ÉTAPE 1 : Colonnes sur profiles ──────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'nouveau'
    CHECK (trust_level IN ('nouveau','surveille','fiable','de_confiance')),
  ADD COLUMN IF NOT EXISTS publication_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_received  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moderation_note   TEXT;

-- ── ÉTAPE 2 : Création table moderation_queue ────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type      TEXT NOT NULL
    CHECK (content_type IN ('listing','equipment','help_request','outing','event',
                            'lost_found','collection_item','association','forum_post')),
  content_id        UUID NOT NULL,
  content_title     TEXT,
  content_excerpt   TEXT,
  content_photos    TEXT[],
  author_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_trust      TEXT DEFAULT 'nouveau',
  status            TEXT NOT NULL DEFAULT 'en_attente_validation'
    CHECK (status IN ('brouillon','en_attente_validation','a_corriger',
                      'refuse','publie','archive','supprime_moderation')),
  risk_score        INT DEFAULT 0,
  risk_level        TEXT DEFAULT 'low'
    CHECK (risk_level IN ('low','medium','high','critical')),
  completeness      INT DEFAULT 100,
  validation_errors JSONB DEFAULT '[]',
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  decision          TEXT CHECK (decision IN ('accepter','refuser','demander_correction')),
  refusal_reason    TEXT,
  correction_reason TEXT,
  moderator_note    TEXT,
  resubmit_count    INT DEFAULT 0,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÉTAPE 3 : Ajout des colonnes manquantes (correctif si table existante) ─
-- Ces ALTER sont sans danger si les colonnes existent déjà.
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_score        INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_level        TEXT DEFAULT 'low';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS completeness      INT DEFAULT 100;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS author_trust      TEXT DEFAULT 'nouveau';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_title     TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_excerpt   TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_photos    TEXT[];
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS resubmit_count    INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS moderator_note    TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS correction_reason TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS refusal_reason    TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS decision          TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMPTZ;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_by       UUID REFERENCES profiles(id);

-- ── ÉTAPE 4 : Table historique d'audit ───────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id         UUID NOT NULL REFERENCES moderation_queue(id) ON DELETE CASCADE,
  content_type     TEXT NOT NULL,
  content_id       UUID NOT NULL,
  author_id        UUID NOT NULL REFERENCES profiles(id),
  action           TEXT NOT NULL,
  old_status       TEXT,
  new_status       TEXT,
  decision         TEXT,
  reason           TEXT,
  moderator_id     UUID REFERENCES profiles(id),
  moderator_note   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── ÉTAPE 5 : Index de performance ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_modqueue_status    ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_modqueue_type      ON moderation_queue(content_type);
CREATE INDEX IF NOT EXISTS idx_modqueue_author    ON moderation_queue(author_id);
CREATE INDEX IF NOT EXISTS idx_modqueue_submitted ON moderation_queue(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_modqueue_risk      ON moderation_queue(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_modhist_queue      ON moderation_history(queue_id);
CREATE INDEX IF NOT EXISTS idx_modhist_content    ON moderation_history(content_id);

-- ── ÉTAPE 6 : Trigger updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_modqueue_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_modqueue_updated_at ON moderation_queue;
CREATE TRIGGER trg_modqueue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_modqueue_updated_at();

-- ── ÉTAPE 7 : Trigger audit automatique ──────────────────────────────────
CREATE OR REPLACE FUNCTION log_moderation_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO moderation_history(queue_id, content_type, content_id, author_id,
      action, old_status, new_status, decision, reason, moderator_id, moderator_note)
    VALUES (NEW.id, NEW.content_type, NEW.content_id, NEW.author_id,
      'status_change', OLD.status, NEW.status, NEW.decision,
      COALESCE(NEW.refusal_reason, NEW.correction_reason), NEW.reviewed_by, NEW.moderator_note);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_moderation ON moderation_queue;
CREATE TRIGGER trg_log_moderation
  AFTER UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION log_moderation_history();

-- ── ÉTAPE 8 : Trigger compteur publications ───────────────────────────────
CREATE OR REPLACE FUNCTION increment_publication_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'publie' AND (OLD.status IS NULL OR OLD.status != 'publie') THEN
    UPDATE profiles SET publication_count = COALESCE(publication_count, 0) + 1
    WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_increment_pub_count ON moderation_queue;
CREATE TRIGGER trg_increment_pub_count
  AFTER INSERT OR UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION increment_publication_count();

-- ── ÉTAPE 9 : Colonne moderation_status sur les tables de contenu ─────────
ALTER TABLE listings         ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE equipment_items  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE help_requests    ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE group_outings    ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE local_events     ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE forum_posts      ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';

-- ── ÉTAPE 10 : RLS sur moderation_queue ──────────────────────────────────
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modq_author_select" ON moderation_queue;
CREATE POLICY "modq_author_select" ON moderation_queue
  FOR SELECT USING (author_id = auth.uid());

DROP POLICY IF EXISTS "modq_staff_select" ON moderation_queue;
CREATE POLICY "modq_staff_select" ON moderation_queue
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

DROP POLICY IF EXISTS "modq_author_insert" ON moderation_queue;
CREATE POLICY "modq_author_insert" ON moderation_queue
  FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "modq_staff_update" ON moderation_queue;
CREATE POLICY "modq_staff_update" ON moderation_queue
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

DROP POLICY IF EXISTS "modq_author_update_draft" ON moderation_queue;
CREATE POLICY "modq_author_update_draft" ON moderation_queue
  FOR UPDATE USING (
    author_id = auth.uid()
    AND status IN ('brouillon','a_corriger')
  );

-- ── ÉTAPE 11 : RLS sur moderation_history ────────────────────────────────
ALTER TABLE moderation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modhist_staff_select" ON moderation_history;
CREATE POLICY "modhist_staff_select" ON moderation_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    OR author_id = auth.uid()
  );

DROP POLICY IF EXISTS "modhist_staff_insert" ON moderation_history;
CREATE POLICY "modhist_staff_insert" ON moderation_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- ── ÉTAPE 12 : Vue KPI (DROP + CREATE pour éviter toute erreur de schéma) ─
DROP VIEW IF EXISTS moderation_kpi;

CREATE VIEW moderation_kpi AS
SELECT
  COUNT(*)                                                              AS total,
  COUNT(*) FILTER (WHERE status = 'en_attente_validation')             AS pending,
  COUNT(*) FILTER (WHERE status = 'publie')                            AS published,
  COUNT(*) FILTER (WHERE status = 'refuse')                            AS refused,
  COUNT(*) FILTER (WHERE status = 'a_corriger')                        AS correction,
  COUNT(*) FILTER (WHERE status = 'archive')                           AS archived,
  AVG(
    EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600
  ) FILTER (WHERE reviewed_at IS NOT NULL AND submitted_at IS NOT NULL) AS avg_review_hours,
  COUNT(*) FILTER (WHERE risk_level IN ('high','critical'))             AS high_risk,
  COUNT(*) FILTER (WHERE author_trust = 'nouveau')                     AS new_authors,
  COUNT(*) FILTER (
    WHERE submitted_at IS NOT NULL
      AND submitted_at >= NOW() - INTERVAL '24 hours'
  )                                                                     AS last_24h
FROM moderation_queue;

GRANT SELECT ON moderation_kpi TO authenticated;

-- ── ÉTAPE 13 : Commentaires ───────────────────────────────────────────────
COMMENT ON TABLE moderation_queue   IS 'File de modération centralisée — toutes publications Biguglia Connect';
COMMENT ON TABLE moderation_history IS 'Audit trail complet des décisions de modération';

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ Modération centralisée opérationnelle !
-- Tables : moderation_queue, moderation_history
-- Vue    : moderation_kpi
-- Admin  : /admin/moderation  |  Stats : /admin/moderation/stats
-- ═══════════════════════════════════════════════════════════════════════════
`;

