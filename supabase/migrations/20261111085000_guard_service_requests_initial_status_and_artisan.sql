-- Services : ne jamais faire confiance aux paramètres envoyés depuis le navigateur.
-- Cette politique RESTRICTIVE s'ajoute aux règles de propriété déjà en place.
-- Elle empêche les devis attribués à des profils artisan non vérifiés, les
-- devis envoyés à soi-même et les faux statuts 'completed' dès la création.
DROP POLICY IF EXISTS service_requests_insert_verified_artisan_and_submitted
  ON public.service_requests;
CREATE POLICY service_requests_insert_verified_artisan_and_submitted
ON public.service_requests
AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  status = 'submitted'
  AND (
    artisan_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.artisan_profiles ap
      WHERE ap.id = artisan_id
        AND ap.is_verified = true
        AND ap.user_id IS DISTINCT FROM (SELECT auth.uid())
    )
  )
);
