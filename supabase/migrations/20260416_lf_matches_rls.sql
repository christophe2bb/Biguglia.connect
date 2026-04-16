-- ============================================================================
-- MIGRATION 20260416_lf_matches_rls
-- ★ Correction policy SELECT lf_matches (🟠 → ✅) ★
--
-- Problème : USING(true) exposait publiquement la logique interne de matching :
--   • match_score   → score interne de correspondance (0-100)
--   • match_status  → suggested / confirmed / rejected (non validé visible)
--   • suggested_by  → identité de l'auteur de la suggestion
--
-- Correction : lecture limitée aux parties directement concernées :
--   1. Auteur de l'objet perdu (lost_item_id → lost_found_items.author_id)
--   2. Auteur de l'objet trouvé (found_item_id → lost_found_items.author_id)
--   3. Admins / modérateurs
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "lf_matches_select" ON public.lf_matches;

CREATE POLICY "lf_matches_select"
  ON public.lf_matches
  FOR SELECT
  USING (
    -- Auteur de l'objet perdu
    EXISTS (
      SELECT 1 FROM public.lost_found_items l1
      WHERE l1.id = lf_matches.lost_item_id
        AND l1.author_id = auth.uid()
    )
    -- Auteur de l'objet trouvé
    OR EXISTS (
      SELECT 1 FROM public.lost_found_items l2
      WHERE l2.id = lf_matches.found_item_id
        AND l2.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'lf_matches';
-- Attendu : lf_matches_select avec EXISTS(lost_item author) OR EXISTS(found_item author) OR admin
--           lf_matches_insert inchangé (auth.uid() IS NOT NULL)
-- ============================================================================
