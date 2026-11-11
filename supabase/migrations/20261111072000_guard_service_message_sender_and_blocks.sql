-- Services / Messagerie : impossible d'usurper le sender_id via l'API
-- directe Supabase ou de contourner un blocage dans un fil artisan/devis.
-- Les autres types de conversations ne sont pas changés par le trigger.
DROP POLICY IF EXISTS messages_sender_identity_guard ON public.messages;
CREATE POLICY messages_sender_identity_guard
ON public.messages AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_blocked_service_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.conversation_participants cp
      ON cp.conversation_id = c.id
    JOIN public.user_blocks b
      ON (
        (b.user_id = NEW.sender_id AND b.target_user_id = cp.user_id)
        OR
        (b.target_user_id = NEW.sender_id AND b.user_id = cp.user_id)
      )
    WHERE c.id = NEW.conversation_id
      AND c.related_type::text IN ('artisan', 'service_request')
      AND cp.user_id IS DISTINCT FROM NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Messagerie : correspondant bloqué'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$fn$;

REVOKE ALL ON FUNCTION public.guard_blocked_service_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS messages_guard_blocked_service_message ON public.messages;
CREATE TRIGGER messages_guard_blocked_service_message
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.guard_blocked_service_message();
