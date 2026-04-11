-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION : group_outings — colonnes enrichies pour la page Promenades
-- Biguglia Connect — 2026-04-11
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Colonnes amenities / options sorties ────────────────────────────────
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS difficulty TEXT
  CHECK (difficulty IN ('facile', 'moyen', 'difficile'));

ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS kids_friendly   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS dogs_allowed    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS parking_info    TEXT;

-- stroller_accessible & parking_available (déjà présents dans OUTINGS_LIFECYCLE_SQL,
-- ajoutés ici en sécurité avec IF NOT EXISTS)
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS stroller_accessible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS parking_available   BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Secteur géographique ────────────────────────────────────────────────
-- Secteur stocké en TEXT (correspond aux IDs de src/lib/sectors.ts : 'village', 'figabruna', etc.)
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS sector_id TEXT;

-- ── 3. Table photos sortie ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outing_photos (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id     UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0,
  is_cover      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outing_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_photos' AND policyname='outing_photos_select') THEN
    CREATE POLICY "outing_photos_select" ON outing_photos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_photos' AND policyname='outing_photos_insert') THEN
    CREATE POLICY "outing_photos_insert" ON outing_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_photos' AND policyname='outing_photos_delete') THEN
    CREATE POLICY "outing_photos_delete" ON outing_photos FOR DELETE USING (
      EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid())
    );
  END IF;
END $$;

-- ── 4. Migrer statuts anglais → français (idempotent) ─────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_outings' AND column_name = 'status'
  ) THEN
    -- Supprimer ancienne contrainte CHECK si elle existe
    ALTER TABLE group_outings DROP CONSTRAINT IF EXISTS group_outings_status_check;

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

    -- Ajouter la nouvelle contrainte CHECK française
    ALTER TABLE group_outings
      ADD CONSTRAINT group_outings_status_check
      CHECK (status IN ('ouverte','complete','terminee','annulee','archivee'));
  END IF;
END $$;

-- ── 5. Index performances ──────────────────────────────────────────────────
-- sector_id est TEXT, index standard
CREATE INDEX IF NOT EXISTS group_outings_sector_idx  ON group_outings(sector_id);
CREATE INDEX IF NOT EXISTS group_outings_date_idx    ON group_outings(outing_date);
CREATE INDEX IF NOT EXISTS group_outings_status_idx  ON group_outings(status);
CREATE INDEX IF NOT EXISTS outing_photos_outing_idx  ON outing_photos(outing_id, display_order);

-- ✅ Migration group_outings enrichie terminée !
