-- ===========================================================================
-- MIGRATION : Ajout de sector_id sur service_requests
-- Date       : 2026-04-22
-- Contexte   : Le formulaire /artisans/demande envoie sector_id mais la
--              colonne n'existait pas → erreur Supabase à l'insertion.
-- Idempotent : utilise IF NOT EXISTS, peut être relancé sans risque.
-- ===========================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests'
      AND column_name = 'sector_id'
  ) THEN
    ALTER TABLE service_requests
      ADD COLUMN sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;

    COMMENT ON COLUMN service_requests.sector_id IS
      'Secteur géographique de la demande (Collines, Figabruna, Village…) — facultatif mais recommandé pour cibler les artisans de la zone';
  END IF;
END $$;

-- Index pour filtrer/trier les demandes par secteur
CREATE INDEX IF NOT EXISTS idx_service_requests_sector_id
  ON service_requests (sector_id)
  WHERE sector_id IS NOT NULL;
