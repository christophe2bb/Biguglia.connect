-- Déjà appliqué à Supabase (20261111043845).
-- Une demande résolue ou annulée ne peut recevoir de nouvelles réponses,
-- même si un client appelle Supabase directement hors de l'interface.
-- Les restrictions de devis privés restent inchangées.
DROP POLICY IF EXISTS request_comments_insert ON public.request_comments;
CREATE POLICY request_comments_insert ON public.request_comments
FOR INSERT TO authenticated WITH CHECK (
  author_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id = request_comments.request_id
      AND sr.status NOT IN ('completed', 'cancelled')
      AND (
        public.is_moderator_or_admin()
        OR sr.resident_id = (SELECT auth.uid())
        OR sr.artisan_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.artisan_profiles ap
          WHERE ap.id = sr.artisan_id
            AND ap.user_id = (SELECT auth.uid())
        )
      )
  )
);
-- Essais SQL ROLLBACK : réponse sur demande ouverte autorisée,
-- demande completed refusée, cancelled refusée, devis privé tiers refusé.
