-- Applied to Supabase production on 2026-11-10 (migration 20261110204421).
-- The artisan may view and change the STATUS of a request sent to them,
-- but cannot delete the resident's request or modify its personal contents.
CREATE OR REPLACE FUNCTION public.guard_service_request_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
BEGIN
 IF CURRENT_USER IN ('postgres','service_role') OR public.is_moderator_or_admin() THEN RETURN NEW; END IF;
 IF NEW.resident_id IS DISTINCT FROM OLD.resident_id OR NEW.artisan_id IS DISTINCT FROM OLD.artisan_id THEN
   RAISE EXCEPTION 'Participants de la demande non modifiables' USING ERRCODE='42501';
 END IF;
 IF (SELECT auth.uid()) IS DISTINCT FROM OLD.resident_id THEN
   IF NOT EXISTS (SELECT 1 FROM public.artisan_profiles ap
     WHERE ap.id=OLD.artisan_id AND ap.user_id=(SELECT auth.uid())) THEN
     RAISE EXCEPTION 'Accès interdit' USING ERRCODE='42501';
   END IF;
   IF (to_jsonb(NEW)-'status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at') THEN
     RAISE EXCEPTION 'Artisan autorisé à modifier uniquement le statut' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS service_requests_guard_ownership ON public.service_requests;
CREATE TRIGGER service_requests_guard_ownership BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_service_request_ownership();
DROP POLICY IF EXISTS service_requests_delete_artisan ON public.service_requests;
