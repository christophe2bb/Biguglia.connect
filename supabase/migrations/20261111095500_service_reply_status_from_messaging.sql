-- Services : synchroniser la messagerie avec le suivi des demandes.
-- Une réponse du destinataire fait passer la demande "Soumise/Vue" à
-- "Répondue". Un message du résident lui-même n'est jamais une réponse.
-- Les statuts Planifiée/Terminée/Annulée restent intacts.
CREATE OR REPLACE FUNCTION public.mark_service_request_replied_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  req_id uuid;
  resident_user uuid;
  artisan_profile uuid;
  request_status public.request_status;
  assigned_artisan_user uuid;
BEGIN
  SELECT sr.id, sr.resident_id, sr.artisan_id, sr.status
    INTO req_id, resident_user, artisan_profile, request_status
    FROM public.conversations c
    JOIN public.service_requests sr ON sr.id = c.related_id
    WHERE c.id = NEW.conversation_id
      AND c.related_type = 'service_request'
    LIMIT 1;

  IF req_id IS NULL OR request_status NOT IN ('submitted', 'viewed')
     OR NEW.sender_id = resident_user THEN
    RETURN NEW;
  END IF;

  -- Un participant non autorisé ne peut pas faire évoluer la demande.
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id = NEW.sender_id
  ) THEN
    RETURN NEW;
  END IF;

  IF artisan_profile IS NOT NULL THEN
    SELECT ap.user_id INTO assigned_artisan_user
    FROM public.artisan_profiles ap WHERE ap.id = artisan_profile;
    IF assigned_artisan_user IS DISTINCT FROM NEW.sender_id THEN
      RETURN NEW;
    END IF;
  END IF;

  UPDATE public.service_requests
    SET status = 'replied'
    WHERE id = req_id AND status IN ('submitted', 'viewed');
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.mark_service_request_replied_on_message() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS messages_mark_service_request_replied ON public.messages;
CREATE TRIGGER messages_mark_service_request_replied
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mark_service_request_replied_on_message();
