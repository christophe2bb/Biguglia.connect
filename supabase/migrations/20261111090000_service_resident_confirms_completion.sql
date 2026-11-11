-- Services : un artisan ne peut pas auto-certifier la fin d'un devis,
-- opération qui déclenche la confiance / possibilité de laisser un avis.
-- Le résident reste décisionnaire. Les mises à jour administratives autorisées
-- et le service_role de maintenance restent possibles.
CREATE OR REPLACE FUNCTION public.guard_service_request_resident_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.status = 'completed'
     AND NEW.status IS DISTINCT FROM OLD.status
     AND CURRENT_USER NOT IN ('postgres', 'service_role')
     AND (SELECT auth.uid()) IS DISTINCT FROM OLD.resident_id
     AND NOT public.is_moderator_or_admin() THEN
    RAISE EXCEPTION 'Seul le résident peut confirmer la fin du devis.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_service_request_resident_completion() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS service_requests_resident_completion_guard ON public.service_requests;
CREATE TRIGGER service_requests_resident_completion_guard
BEFORE UPDATE OF status ON public.service_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.guard_service_request_resident_completion();
