-- ============================================================================
-- MIGRATION 20260416_listing_status_history_rls
-- ★ SOURCE DE VÉRITÉ pour la policy SELECT de listing_status_history ★
--
-- Problème : 20260411_annonces_cdc.sql créait USING(true) → tout le monde
-- pouvait lire l'historique interne (ancien statut, nouveau statut, changed_by,
-- note, date) — y compris les actions de modération et changements admin.
--
-- Correction :
--   Lecture limitée à :
--     • L'auteur de l'annonce (via JOIN listings.author_id)
--     • Les admins / modérateurs
--   Les anon et les autres utilisateurs ne voient rien.
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "lsh_select" ON public.listing_status_history;

CREATE POLICY "lsh_select"
  ON public.listing_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_status_history.listing_id
        AND (
          l.author_id = auth.uid()
          OR is_moderator_or_admin()
        )
    )
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'listing_status_history';
-- Attendu : lsh_select avec EXISTS(listings.author_id = auth.uid() OR admin)
--           lsh_insert inchangé (auth.uid() = changed_by)
-- ============================================================================
