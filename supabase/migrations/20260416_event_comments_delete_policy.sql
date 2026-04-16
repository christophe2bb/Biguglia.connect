-- ============================================================================
-- MIGRATION 20260416_event_comments_delete_policy
-- Ajout de la policy DELETE manquante sur event_comments
--
-- Contexte : 20260411_events_cdc_fields.sql créait SELECT (USING true)
-- et INSERT (WITH CHECK auth.uid() = author_id) mais aucune policy DELETE.
-- Sans elle, personne ne peut supprimer un commentaire depuis le navigateur.
--
-- Règle retenue :
--   • L'auteur peut supprimer son propre commentaire
--   • Les admins / modérateurs peuvent supprimer n'importe quel commentaire
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "event_comments_delete" ON public.event_comments;

CREATE POLICY "event_comments_delete"
  ON public.event_comments
  FOR DELETE
  USING (
    auth.uid() = author_id
    OR is_moderator_or_admin()
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'event_comments'
-- ORDER BY cmd;
-- Attendu : event_comments_delete (DELETE), event_comments_insert (INSERT),
--           event_comments_select (SELECT)
-- ============================================================================
