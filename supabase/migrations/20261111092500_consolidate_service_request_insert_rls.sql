-- La nouvelle policy service_requests_insert_integrity remplace
-- l'ancienne règle restrictive équivalente, en vérifiant EN PLUS
-- resident_id = auth.uid(). Conserver une seule règle stricte.
DROP POLICY IF EXISTS service_requests_insert_verified_artisan_and_submitted
  ON public.service_requests;
