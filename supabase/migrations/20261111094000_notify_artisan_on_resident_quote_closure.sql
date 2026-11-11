-- Services / Devis privés : tenir l'artisan informé lorsque le résident
-- annule ou clôture sa demande. Préserve l'avis après intervention terminée
-- et la notification du résident lorsqu'un autre participant change l'état.
CREATE OR REPLACE FUNCTION public.sync_service_request_status_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  artisan_user uuid;
  artisan_business text;
  actor uuid := auth.uid();
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.artisan_id IS NOT NULL THEN
    SELECT ap.user_id, ap.business_name
    INTO artisan_user, artisan_business
    FROM public.artisan_profiles ap
    WHERE ap.id = NEW.artisan_id;
  END IF;

  -- Action du résident : avertir l'artisan concerné, sans doublon vers
  -- l'acteur. Les anciennes conversations restent consultables.
  IF NEW.artisan_id IS NOT NULL
     AND actor = NEW.resident_id
     AND artisan_user IS NOT NULL
     AND artisan_user IS DISTINCT FROM NEW.resident_id
     AND NEW.status IN ('completed', 'cancelled') THEN
    INSERT INTO public.notifications(user_id, type, title, message, link)
    VALUES (
      artisan_user, 'request_update',
      CASE WHEN NEW.status = 'cancelled'
        THEN '❌ Demande de devis annulée'
        ELSE '✅ Demande de devis clôturée' END,
      'Le résident a ' || CASE WHEN NEW.status = 'cancelled'
        THEN 'annulé' ELSE 'clôturé' END || ' la demande « '
        || left(NEW.title, 100) || ' ».',
      '/demandes/' || NEW.id::text
    );
  END IF;

  -- Action de l'artisan ou de la modération : prévenir le résident.
  IF actor IS DISTINCT FROM NEW.resident_id THEN
    INSERT INTO public.notifications(user_id,type,title,message,link)
    VALUES (
      NEW.resident_id, 'request_update', '📋 Demande mise à jour',
      'Votre demande « ' || left(NEW.title, 100) || ' » est maintenant : ' || NEW.status::text,
      '/demandes/' || NEW.id::text
    );
  END IF;

  -- Conserver la logique existante : le devis terminé débloque l'avis.
  IF NEW.status = 'completed' AND NEW.artisan_id IS NOT NULL THEN
    IF artisan_user IS NOT NULL AND artisan_user IS DISTINCT FROM NEW.resident_id THEN
      INSERT INTO public.trust_interactions(
        source_type,source_id,requester_id,receiver_id,interaction_type,
        status,review_unlocked,completed_at
      ) VALUES(
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
$function$;

-- Cette fonction interne est appelée par un trigger, jamais par les comptes web.
REVOKE ALL ON FUNCTION public.sync_service_request_status_side_effects()
  FROM PUBLIC, anon, authenticated;
