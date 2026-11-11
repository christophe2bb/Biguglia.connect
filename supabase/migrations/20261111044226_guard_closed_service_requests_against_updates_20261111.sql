-- Déjà exécuté dans Supabase de production le 11/11/2026 (20261111044226).
-- Une demande terminée/annulée ne peut être éditée ou réouverte par API
-- par ses utilisateurs. Modération et service_role conservent leur recours.
-- Les actions d'artisan sur une demande en cours restent autorisées.
CREATE OR REPLACE FUNCTION public.guard_service_request_ownership()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $fn$
BEGIN
  IF CURRENT_USER IN ('postgres', 'service_role') OR public.is_moderator_or_admin() THEN RETURN NEW; END IF;
  IF OLD.status IN ('completed','cancelled') THEN
    RAISE EXCEPTION 'Demande close : modification impossible' USING ERRCODE='42501';
  END IF;
  IF NEW.resident_id IS DISTINCT FROM OLD.resident_id
      OR NEW.artisan_id IS DISTINCT FROM OLD.artisan_id THEN
    RAISE EXCEPTION 'Participants de la demande non modifiables' USING ERRCODE='42501';
  END IF;
  IF (SELECT auth.uid()) IS DISTINCT FROM OLD.resident_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.artisan_profiles ap
      WHERE ap.id=OLD.artisan_id AND ap.user_id=(SELECT auth.uid())
    ) THEN
      RAISE EXCEPTION 'Accès interdit' USING ERRCODE='42501';
    END IF;
    IF (to_jsonb(NEW)-'status'-'updated_at')
        IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at') THEN
      RAISE EXCEPTION 'Artisan autorisé à modifier uniquement le statut' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
-- Test SQL rollback : une demande ouverte est modifiable par le propriétaire ;
-- demande completed refuse la modification ; demande cancelled refuse sa réouverture.
