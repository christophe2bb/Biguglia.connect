-- ============================================================================
-- MIGRATION 20260416_help_status_history_rls
-- ★ Correction policy SELECT help_request_status_history (🟠 → ✅) ★
--
-- Problème : USING(true) exposait publiquement l'audit trail :
--   • old_status / new_status  → transitions d'état internes
--   • changed_by               → identité de qui a changé l'état
--   • note                     → notes internes de modération
--
-- Correction : lecture limitée à 3 cas légitimes :
--   1. L'auteur de la demande d'aide (suit l'évolution de sa demande)
--   2. Les participants concernés (suivent leur demande de participation)
--   3. Les admins / modérateurs (supervision complète)
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "help_status_history_select" ON public.help_request_status_history;

CREATE POLICY "help_status_history_select"
  ON public.help_request_status_history
  FOR SELECT
  USING (
    -- Auteur de la demande
    EXISTS (
      SELECT 1 FROM public.help_requests hr
      WHERE hr.id = help_request_status_history.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Participants à cette demande
    OR EXISTS (
      SELECT 1 FROM public.help_request_participants p
      WHERE p.help_request_id = help_request_status_history.help_request_id
        AND p.user_id = auth.uid()
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
-- WHERE tablename = 'help_request_status_history';
-- Attendu : help_status_history_select avec EXISTS(author) OR EXISTS(participant) OR admin
--           help_status_history_insert inchangé
-- ============================================================================
