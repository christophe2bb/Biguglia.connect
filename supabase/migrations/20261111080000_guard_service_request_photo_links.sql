-- Services : contraindre les URLs des photos en fonction de la confidentialité
-- du dossier. Un propriétaire ne peut pas injecter un lien extérieur en BDD.
-- Cette règle complémentaire est restrictive : elle ne donne AUCUN droit nouveau.
DROP POLICY IF EXISTS service_request_photos_valid_location ON public.service_request_photos;
CREATE POLICY service_request_photos_valid_location
ON public.service_request_photos AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_requests sr
    WHERE sr.id = request_id
      AND sr.resident_id = (SELECT auth.uid())
      AND sr.status NOT IN ('completed', 'cancelled')
      AND (
        (
          sr.artisan_id IS NOT NULL
          AND url LIKE '/api/service-requests/' || sr.id::text || '/photos/%'
          AND url ~ ('^/api/service-requests/' || sr.id::text
              || '/photos/[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,180}[.](jpg|jpeg|png|webp|gif)$')
          AND position('..' in url) = 0
        )
        OR
        (
          sr.artisan_id IS NULL
          AND url LIKE 'https://%.supabase.co/storage/v1/object/public/photos/requests/' || sr.id::text || '/%'
          AND url ~ ('^https://[a-z0-9-]+[.]supabase[.]co/storage/v1/object/public/photos/requests/'
              || sr.id::text || '/[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,180}[.](jpg|jpeg|png|webp|gif)$')
          AND position('..' in url) = 0
        )
      )
  )
);
