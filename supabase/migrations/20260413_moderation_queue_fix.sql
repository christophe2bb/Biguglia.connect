-- ===========================================================================
-- MIGRATION : Correction colonnes manquantes de moderation_queue
-- Date      : 2026-04-13
-- Raison    : Le hook submitForModeration insère des colonnes (submitted_at,
--             risk_score, author_trust, content_photos, etc.) absentes de
--             la table de base, provoquant l'erreur :
--             "Erreur lors de la soumission"
-- Idempotent : peut être relancé sans risque
-- ===========================================================================

-- 1. S'assurer que la table existe (au cas où)
CREATE TABLE IF NOT EXISTS moderation_queue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,
  content_id   uuid NOT NULL,
  status       text NOT NULL DEFAULT 'en_attente_validation',
  created_at   timestamptz DEFAULT now()
);

-- 2. Supprimer la vue KPI si elle bloque les ALTER TABLE
DROP VIEW IF EXISTS moderation_kpi;

-- 3. Ajouter toutes les colonnes manquantes (idempotent)
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_title      TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_excerpt    TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_photos     TEXT[];
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS submitted_at       TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_score         INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_level         TEXT DEFAULT 'low';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS completeness       INT DEFAULT 100;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS validation_errors  JSONB DEFAULT '[]';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS author_trust       TEXT DEFAULT 'nouveau';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS resubmit_count     INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS moderator_note     TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS correction_reason  TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS refusal_reason     TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS decision           TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMPTZ;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_by        UUID REFERENCES profiles(id);

-- 4. Contrainte de statut mise à jour
ALTER TABLE moderation_queue DROP CONSTRAINT IF EXISTS moderation_queue_status_check;
ALTER TABLE moderation_queue ADD CONSTRAINT moderation_queue_status_check
  CHECK (status IN (
    'en_attente_validation', 'publie', 'refuse', 'a_corriger',
    'pending', 'approved', 'rejected', 'draft'
  ));

-- 5. RLS
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_author_select') THEN
    CREATE POLICY "modq_author_select" ON moderation_queue
      FOR SELECT USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_author_insert') THEN
    CREATE POLICY "modq_author_insert" ON moderation_queue
      FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_staff_select') THEN
    CREATE POLICY "modq_staff_select" ON moderation_queue
      FOR SELECT USING (
        EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_staff_update') THEN
    CREATE POLICY "modq_staff_update" ON moderation_queue
      FOR UPDATE USING (
        EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
      );
  END IF;
END $$;

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_modqueue_author    ON moderation_queue(author_id);
CREATE INDEX IF NOT EXISTS idx_modqueue_submitted ON moderation_queue(submitted_at);
CREATE INDEX IF NOT EXISTS idx_modqueue_status    ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_modqueue_risk      ON moderation_queue(risk_score DESC);

-- 7. Vue KPI recréée
CREATE OR REPLACE VIEW moderation_kpi AS
SELECT
  COUNT(*)                                                                    AS total,
  COUNT(*) FILTER (WHERE status = 'en_attente_validation')                   AS pending,
  COUNT(*) FILTER (WHERE status = 'publie')                                  AS published,
  COUNT(*) FILTER (WHERE status = 'refuse')                                  AS refused,
  COUNT(*) FILTER (WHERE status = 'a_corriger')                              AS correction,
  ROUND(AVG(risk_score))                                                      AS avg_risk,
  COUNT(*) FILTER (WHERE submitted_at >= now() - INTERVAL '24h')             AS last_24h
FROM moderation_queue;

-- 8. Rafraîchissement du cache
NOTIFY pgrst, 'reload schema';

-- Migration terminée !
