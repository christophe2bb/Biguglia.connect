/**
 * admin/migration/_sql/lost-found.ts
 */
export const LF_HISTORY_SQL = `-- ════════════════════════════════════════════════════════════════
-- PERDU / TROUVÉ — Historique de statuts (lf_status_history)
-- ════════════════════════════════════════════════════════════════
-- Exécuter APRÈS le bloc principal Perdu/Trouvé (lost_found_items).
-- Ce script est idempotent (safe à relancer).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lf_status_history (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id     UUID REFERENCES lost_found_items(id) ON DELETE CASCADE NOT NULL,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lf_status_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lf_status_history' AND policyname='lf_sh_select') THEN
    CREATE POLICY "lf_sh_select" ON lf_status_history FOR SELECT USING (
      EXISTS (SELECT 1 FROM lost_found_items WHERE id = item_id AND author_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "lf_sh_insert" ON lf_status_history FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM lost_found_items WHERE id = item_id AND author_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ✅ Résultat : chaque changement de statut est tracé dans lf_status_history
`;

export const LF_MATCHES_SQL = `-- ════════════════════════════════════════════════════════════════
-- PERDU / TROUVÉ — Correspondances automatiques (lf_matches)
-- ════════════════════════════════════════════════════════════════
-- Exécuter APRÈS le bloc principal Perdu/Trouvé (lost_found_items).
-- Ce script est idempotent (safe à relancer).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lf_matches (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lost_item_id   UUID REFERENCES lost_found_items(id) ON DELETE CASCADE NOT NULL,
  found_item_id  UUID REFERENCES lost_found_items(id) ON DELETE CASCADE NOT NULL,
  match_score    INT NOT NULL DEFAULT 0,
  match_status   TEXT NOT NULL DEFAULT 'suggested'
                 CHECK (match_status IN ('suggested','confirmed','rejected')),
  reviewed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lf_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lf_matches' AND policyname='lf_matches_select') THEN
    CREATE POLICY "lf_matches_select" ON lf_matches FOR SELECT USING (true);
    CREATE POLICY "lf_matches_insert" ON lf_matches FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
      OR auth.uid() = (SELECT author_id FROM lost_found_items WHERE id = lost_item_id)
    );
    CREATE POLICY "lf_matches_update" ON lf_matches FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ✅ Résultat : les correspondances perdu↔trouvé sont stockées et consultables
`;

export const LF_EXTRAS_SQL = `-- ════════════════════════════════════════════════════════════════════════════
-- PERDU / TROUVÉ — Extras : visibility_type + archivage automatique J+60
-- ════════════════════════════════════════════════════════════════════════════
-- Idempotent — exécuter APRÈS les blocs lf_status_history et lf_matches.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Ajouter visibility_type sur lf_photos (niveaux : public / private_admin / private_restitution)
ALTER TABLE lf_photos
  ADD COLUMN IF NOT EXISTS visibility_type TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility_type IN ('public','private_admin','private_restitution'));

COMMENT ON COLUMN lf_photos.visibility_type IS
  'public = visible par tous | private_admin = visible admin/mod seulement | private_restitution = visible au propriétaire prouvé uniquement';

-- 2. Archivage automatique J+60 via pg_cron (activer l''extension dans Supabase Dashboard → Database → Extensions)
-- Cette fonction archive toutes les annonces actives dont expires_at est dépassé.
CREATE OR REPLACE FUNCTION archive_expired_lost_found()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lost_found_items
  SET
    status     = 'archive',
    archived_at = now(),
    updated_at  = now()
  WHERE
    status IN ('perdu','trouve','identifie')
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

GRANT EXECUTE ON FUNCTION archive_expired_lost_found() TO service_role;

-- 3. Planifier l''archivage tous les jours à 02h00 (si pg_cron est activé)
-- Décommentez après avoir activé l''extension pg_cron :
-- SELECT cron.schedule('archive-expired-lf', '0 2 * * *', 'SELECT archive_expired_lost_found()');

-- ✅ Résultat :
-- • lf_photos dispose de visibility_type pour contrôler la confidentialité des images
-- • archive_expired_lost_found() peut être planifiée en cron pour l''archivage automatique à J+60
`;

