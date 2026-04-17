-- ============================================================================
-- MIGRATION 20260416_help_participants_rls
-- ★ Correction policy SELECT help_request_participants (🟠 → ✅) ★
--
-- Problème : USING(true) exposait publiquement pour chaque participant :
--   • user_id   → identité du volontaire
--   • role      → rôle dans la demande
--   • state     → état de participation
--   • message   → message privé du volontaire
--
-- Correction : lecture limitée à 3 cas légitimes :
--   1. Le participant lui-même (auth.uid() = user_id)
--   2. L'auteur de la demande d'aide (peut voir qui propose)
--   3. Les admins / modérateurs (supervision)
--
-- Les policies INSERT / UPDATE / DELETE restent dans help_requests_cdc.sql
-- (non dupliquées, non modifiées).
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "help_participants_select" ON public.help_request_participants;

CREATE POLICY "help_participants_select"
  ON public.help_request_participants
  FOR SELECT
  USING (
    -- Le participant voit sa propre ligne
    auth.uid() = user_id
    -- L'auteur de la demande voit tous les participants
    OR EXISTS (
      SELECT 1 FROM public.help_requests hr
      WHERE hr.id = help_request_participants.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Admins / modérateurs voient tout
    OR is_moderator_or_admin()
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'help_request_participants';
-- Attendu : help_participants_select avec auth.uid()=user_id OR EXISTS(author) OR admin
--           help_participants_insert, update, delete inchangées
-- ============================================================================
