-- Services / Poster une demande :
-- Les policies PostgreSQL PERMISSIVE sont combinées avec OR.
-- Imposer ces invariants avec une policy RESTRICTIVE pour que l'ancien
-- service_requests_insert_resident ne puisse contourner aucune vérification.
DROP POLICY IF EXISTS service_requests_insert_integrity ON public.service_requests;
CREATE POLICY service_requests_insert_integrity
  ON public.service_requests
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    resident_id = (SELECT auth.uid())
    AND status = 'submitted'
    AND (
      artisan_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.artisan_profiles ap
        WHERE ap.id = service_requests.artisan_id
          AND ap.is_verified = true
          AND ap.user_id IS DISTINCT FROM (SELECT auth.uid())
      )
    )
  );
