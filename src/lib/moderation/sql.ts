/**
 * moderation/sql.ts
 * Script SQL de migration du système de modération.
 * À exécuter UNE SEULE FOIS dans Supabase → SQL Editor.
 */
export const MODERATION_SQL = `-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTÈME DE MODÉRATION CENTRALISÉ — Biguglia Connect
-- À exécuter UNE SEULE FOIS dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Colonne trust_level sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'nouveau'
    CHECK (trust_level IN ('nouveau','surveille','fiable','de_confiance')),
  ADD COLUMN IF NOT EXISTS publication_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_received  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moderation_note   TEXT;

-- 2. Table principale de file de modération
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

-- 3. Table d'historique d'audit
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

-- 4. Index de performance
CREATE INDEX IF NOT EXISTS idx_modqueue_status    ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_modqueue_type      ON moderation_queue(content_type);
CREATE INDEX IF NOT EXISTS idx_modqueue_author    ON moderation_queue(author_id);
CREATE INDEX IF NOT EXISTS idx_modqueue_submitted ON moderation_queue(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_modqueue_risk      ON moderation_queue(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_modhist_queue      ON moderation_history(queue_id);
CREATE INDEX IF NOT EXISTS idx_modhist_content    ON moderation_history(content_id);

-- 5. Trigger updated_at sur moderation_queue
CREATE OR REPLACE FUNCTION update_modqueue_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_modqueue_updated_at ON moderation_queue;
CREATE TRIGGER trg_modqueue_updated_at
  BEFORE UPDATE ON moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_modqueue_updated_at();

-- 6. Trigger audit automatique dans moderation_history
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

-- 7. Trigger : incrémente publication_count sur profiles
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

-- 8. Ajout colonne moderation_status sur chaque table de contenu
ALTER TABLE listings         ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE equipment_items  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE help_requests    ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE group_outings    ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE events           ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';
ALTER TABLE forum_posts      ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'publie';

-- 9. RLS sur moderation_queue
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

-- 10. RLS sur moderation_history
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

-- 11. Vue KPI modération (pour dashboard admin)
CREATE OR REPLACE VIEW moderation_kpi AS
SELECT
  COUNT(*)                                                  AS total,
  COUNT(*) FILTER (WHERE status = 'en_attente_validation') AS pending,
  COUNT(*) FILTER (WHERE status = 'publie')                AS published,
  COUNT(*) FILTER (WHERE status = 'refuse')                AS refused,
  COUNT(*) FILTER (WHERE status = 'a_corriger')            AS correction,
  COUNT(*) FILTER (WHERE status = 'archive')               AS archived,
  AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at))/3600)
    FILTER (WHERE reviewed_at IS NOT NULL)                 AS avg_review_hours,
  COUNT(*) FILTER (WHERE risk_level IN ('high','critical')) AS high_risk,
  COUNT(*) FILTER (WHERE author_trust = 'nouveau')         AS new_authors,
  COUNT(*) FILTER (WHERE submitted_at >= NOW() - INTERVAL '24 hours') AS last_24h
FROM moderation_queue;

GRANT SELECT ON moderation_kpi TO authenticated;

COMMENT ON TABLE moderation_queue   IS 'File de modération centralisée — toutes publications Biguglia Connect';
COMMENT ON TABLE moderation_history IS 'Audit trail complet des décisions de modération';
`;
