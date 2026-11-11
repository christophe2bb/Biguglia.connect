-- Déjà appliqué dans Supabase de production le 11/11/2026.
-- Les métadonnées photo d'une demande publique sont visibles aux personnes
-- connectées. Les devis privés restent réservés à leurs participants et
-- à la modération. Les URLs de Storage demeurent publiques à cette étape :
-- ne pas transmettre de photos confidentielles via des liens publics.
DROP POLICY IF EXISTS "Photos demande visibles par participants"
  ON public.service_request_photos;
CREATE POLICY "Photos demande visibles par participants"
ON public.service_request_photos FOR SELECT TO public
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests AS sr
    WHERE sr.id = request_id
      AND (
        sr.resident_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.artisan_profiles AS ap
          WHERE ap.id = sr.artisan_id AND ap.user_id = (SELECT auth.uid())
        )
        OR (sr.artisan_id IS NULL AND (SELECT auth.uid()) IS NOT NULL)
        OR public.is_moderator_or_admin()
      )
  )
);
-- Contrôlé en transaction ROLLBACK : les visiteurs ne peuvent pas lire,
-- un habitant connecté voit les photos d'une demande publique,
-- il ne voit pas les photos d'un devis privé étranger,
-- le résident propriétaire et l'artisan destinataire voient leur devis.
