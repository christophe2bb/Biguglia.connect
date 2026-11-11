-- Services : interdire les messages directs quand un participant du fil
-- est suspendu, supprimé ou désactivé. Cette garde fonctionne aussi pour
-- les INSERT qui contournent les routes Next.js.
-- Ne modifie ni les messages ni les conversations existants.
CREATE OR REPLACE FUNCTION public.guard_inactive_service_conversation_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_related_type text;
BEGIN
  SELECT c.related_type::text INTO v_related_type
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  IF v_related_type IS DISTINCT FROM 'service_request'
     AND v_related_type IS DISTINCT FROM 'artisan' THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.sender_id
      AND p.status::text = 'active'
      AND p.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Envoi interdit : compte expéditeur inactif'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    LEFT JOIN public.profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = NEW.conversation_id
      AND (
        p.id IS NULL
        OR p.status::text IS DISTINCT FROM 'active'
        OR p.is_active IS DISTINCT FROM TRUE
      )
  ) THEN
    RAISE EXCEPTION 'Envoi interdit : participant inactif'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_inactive_service_conversation_participants()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS messages_guard_inactive_service_parties ON public.messages;
CREATE TRIGGER messages_guard_inactive_service_parties
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.guard_inactive_service_conversation_participants();