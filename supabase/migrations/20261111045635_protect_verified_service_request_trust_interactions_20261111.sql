-- Déjà appliqué à Supabase : 20261111045635.
-- Une interaction service_request créée après clôture est une preuve métier.
-- Seuls les flags d'avis des participants peuvent ensuite changer.
-- Les rôles système et la modération conservent les droits de correction.
CREATE OR REPLACE FUNCTION public.guard_service_request_trust_interaction()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $fn$
BEGIN
  IF CURRENT_USER IN ('postgres','service_role') OR public.is_moderator_or_admin() THEN
    RETURN NEW;
  END IF;
  IF OLD.source_type='service_request' OR NEW.source_type='service_request' THEN
    IF (to_jsonb(NEW)-'review_requester_done'-'review_receiver_done'-'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD)-'review_requester_done'-'review_receiver_done'-'updated_at') THEN
      RAISE EXCEPTION 'Interaction de service vérifiée non modifiable'
        USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;$fn$;
DROP TRIGGER IF EXISTS trg_guard_service_request_trust_interaction
ON public.trust_interactions;
CREATE TRIGGER trg_guard_service_request_trust_interaction
BEFORE UPDATE ON public.trust_interactions FOR EACH ROW
EXECUTE FUNCTION public.guard_service_request_trust_interaction();
-- Test SQL ROLLBACK : participant peut signaler son avis réalisé ;
-- ne peut ni changer le destinataire ni désactiver review_unlocked.
