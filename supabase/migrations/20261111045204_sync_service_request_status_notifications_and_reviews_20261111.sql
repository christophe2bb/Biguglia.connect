-- Déjà exécuté dans Supabase le 11 novembre 2026 (version 20261111045204).
-- La notification du résident et le déblocage d'une interaction de confiance
-- ne sont pas exécutés depuis le navigateur (RLS interdit les INSERT pour autrui).
-- Effets métier déclenchés uniquement APRÈS changement de statut validé.
CREATE OR REPLACE FUNCTION public.sync_service_request_status_side_effects()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $func$
DECLARE
  artisan_user uuid;
  artisan_business text;
  actor uuid := auth.uid();
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF actor IS DISTINCT FROM NEW.resident_id THEN
    INSERT INTO public.notifications(user_id,type,title,message,link)
    VALUES(
      NEW.resident_id,'request_update','📋 Demande mise à jour',
      'Votre demande "' || left(NEW.title,100) || '" est maintenant : ' || NEW.status::text,
      '/demandes/' || NEW.id::text
    );
  END IF;
  IF NEW.status='completed' AND NEW.artisan_id IS NOT NULL THEN
    SELECT ap.user_id,ap.business_name INTO artisan_user,artisan_business
    FROM public.artisan_profiles ap WHERE ap.id=NEW.artisan_id;
    IF artisan_user IS NOT NULL AND artisan_user IS DISTINCT FROM NEW.resident_id THEN
      INSERT INTO public.trust_interactions(
        source_type,source_id,requester_id,receiver_id,interaction_type,
        status,review_unlocked,completed_at
      ) VALUES (
        'service_request',NEW.id,NEW.resident_id,artisan_user,
        'service_request','done',true,now()
      )
      ON CONFLICT (source_type,source_id,requester_id) DO UPDATE SET
        status='done',review_unlocked=true,
        completed_at=COALESCE(public.trust_interactions.completed_at,now());
      INSERT INTO public.notifications(user_id,type,title,message,link)
      VALUES(
        NEW.resident_id,'review_request','⭐ Donnez votre avis !',
        'L’intervention de ' || COALESCE(artisan_business,'votre artisan') || ' est terminée.',
        '/dashboard/avis'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$func$;
REVOKE EXECUTE ON FUNCTION public.sync_service_request_status_side_effects()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS service_request_status_side_effects ON public.service_requests;
CREATE TRIGGER service_request_status_side_effects
AFTER UPDATE OF status ON public.service_requests
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.sync_service_request_status_side_effects();
-- Vérifié dans ROLLBACK : artisan marque viewed puis completed ; le résident
-- reçoit deux notifications d'état, une invitation à noter, et l'interaction
-- service_request devient done + review_unlocked=true.
