-- Audit Services : ne jamais laisser une ancienne politique permissive
-- annuler les contrôles de statut, d'appartenance ou d'identité.
-- La migration ne modifie aucune donnée utilisateur.
--
-- Service requests : l'unique politique INSERT stricte demeure
-- service_requests_insert_integrity (résident courant, statut submitted,
-- artisan vérifié, pas d'auto-demande).
DROP POLICY IF EXISTS "service_requests_insert_resident"
  ON public.service_requests;

-- Photos : l'unique politique INSERT stricte demeure
-- service_request_photos_valid_location (bonne demande et URL du bucket adapté).
DROP POLICY IF EXISTS "Résident ajoute photos"
  ON public.service_request_photos;

-- Messages : deux anciennes politiques permissives s'additionnaient par OR
-- (participant OU sender_id=auth.uid), ce qui autorisait le spoofing.
-- Une politique unique exige désormais les DEUX conditions.
DROP POLICY IF EXISTS "messages_insert_participant"
  ON public.messages;
DROP POLICY IF EXISTS "messages_sender_identity_guard"
  ON public.messages;

CREATE POLICY messages_insert_authenticated_participant_identity
ON public.messages
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = (SELECT auth.uid())
  )
);
