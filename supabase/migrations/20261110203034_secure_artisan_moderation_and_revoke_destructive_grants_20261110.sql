-- Applied to production 2026-11-10 as migration 20261110203034.
-- Prevent artisan self-verification, permit pending owners to read their profile,
-- and revoke unneeded TRUNCATE/TRIGGER privileges from client SQL roles.
CREATE OR REPLACE FUNCTION public.guard_artisan_publication_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
BEGIN
  IF CURRENT_USER IN ('postgres','service_role') OR public.current_user_role() = 'admin' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_verified,false) OR COALESCE(NEW.is_featured,false)
       OR NEW.verification_notes IS NOT NULL OR NEW.rejection_reason IS NOT NULL THEN
       RAISE EXCEPTION 'Validation artisan réservée à la modération' USING ERRCODE='42501';
    END IF;
  ELSE
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
       OR NEW.verification_notes IS DISTINCT FROM OLD.verification_notes
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
       RAISE EXCEPTION 'Validation artisan réservée à la modération' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS artisan_profiles_guard_moderation ON public.artisan_profiles;
CREATE TRIGGER artisan_profiles_guard_moderation
BEFORE INSERT OR UPDATE ON public.artisan_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_artisan_publication_fields();

DROP POLICY IF EXISTS artisan_profiles_select_own_pending ON public.artisan_profiles;
CREATE POLICY artisan_profiles_select_own_pending ON public.artisan_profiles
FOR SELECT TO authenticated USING(user_id=(select auth.uid()));

DO $body$
DECLARE t record;
BEGIN
 FOR t IN SELECT n.nspname AS s,c.relname AS tbl
          FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relkind IN ('r','p')
 LOOP
   EXECUTE format('REVOKE TRUNCATE, TRIGGER ON TABLE %I.%I FROM PUBLIC,anon,authenticated',t.s,t.tbl);
 END LOOP;
END;
$body$;
