-- Appliqué à Supabase le 11/11/2026, migration 20261111045528.
-- Ne permettre à aucun compte de forger une interaction de service terminée.
-- Les interactions service_request sont uniquement créées par le trigger
-- SECURITY DEFINER après la vraie clôture d'une demande avec artisan assigné.
-- Les autres types conservent leur politique d'insertion existante.
DROP POLICY IF EXISTS "TI créer si connecté" ON public.trust_interactions;
CREATE POLICY "TI créer si connecté" ON public.trust_interactions
FOR INSERT TO public WITH CHECK (
  (SELECT auth.uid()) = requester_id
  AND source_type <> 'service_request'
);
-- Tests ROLLBACK :
-- un résident ne peut pas insérer une trust_interaction factice 'done' ;
-- une clôture par l'artisan via service_requests crée toujours
-- la trust_interaction validée, done, review_unlocked=true.
