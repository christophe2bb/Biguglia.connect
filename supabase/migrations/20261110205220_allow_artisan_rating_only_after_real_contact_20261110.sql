-- Applied to Supabase production 10 Nov 2026 as migration 20261110205220.
-- Store the verified artisan rating eligibility rule in source control.
-- An artisan cannot rate themselves; a client must have sent an actual
-- message in a conversation involving the correct artisan profile.
-- Other types retain their existing eligibility rules.
CREATE OR REPLACE FUNCTION public.can_rate_item(p_target_type text, p_target_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_author_id UUID; v_status TEXT; v_date DATE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  -- Auteur ne peut pas noter son propre item
  CASE p_target_type
    WHEN 'artisan'         THEN SELECT user_id INTO v_author_id FROM public.artisan_profiles WHERE id=p_target_id;
    WHEN 'listing'         THEN SELECT user_id      INTO v_author_id FROM listings        WHERE id = p_target_id;
    WHEN 'equipment'       THEN SELECT owner_id     INTO v_author_id FROM equipment_items WHERE id = p_target_id;
    WHEN 'help_request'    THEN SELECT author_id    INTO v_author_id FROM help_requests   WHERE id = p_target_id;
    WHEN 'association'     THEN SELECT author_id    INTO v_author_id FROM associations    WHERE id = p_target_id;
    WHEN 'collection_item' THEN SELECT author_id    INTO v_author_id FROM collection_items WHERE id = p_target_id;
    WHEN 'event'           THEN SELECT author_id    INTO v_author_id FROM local_events    WHERE id = p_target_id;
    WHEN 'outing'          THEN SELECT organizer_id INTO v_author_id FROM group_outings   WHERE id = p_target_id;
    ELSE v_author_id := NULL;
  END CASE;
  IF v_author_id = v_uid THEN RETURN FALSE; END IF;
  -- Artisan : seule une personne ayant contacté le propriétaire dans une
  -- conversation contextuelle peut noter. Un profil propriétaire ne peut
  -- jamais s'auto-noter, même si la conversation est incomplète.
  IF p_target_type='artisan' THEN
    IF v_author_id IS NULL OR v_author_id=v_uid THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.conversation_participants cv ON cv.conversation_id=c.id AND cv.user_id=v_uid
      JOIN public.conversation_participants ca ON ca.conversation_id=c.id AND ca.user_id=v_author_id
      WHERE c.related_type='artisan'::public.related_type AND c.related_id=p_target_id
        AND EXISTS (SELECT 1 FROM public.messages m WHERE m.conversation_id=c.id AND m.sender_id=v_uid)
    );
  END IF;
  -- Libre : perdu/trouve, promenade
  IF p_target_type IN ('lost_found', 'promenade') THEN RETURN TRUE; END IF;
  -- Evenement : inscrit + date passee
  IF p_target_type = 'event' THEN
    SELECT event_date INTO v_date FROM local_events WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (SELECT 1 FROM event_participations WHERE event_id = p_target_id AND user_id = v_uid);
  END IF;
  -- Sortie : inscrit + date passee
  IF p_target_type = 'outing' THEN
    SELECT outing_date INTO v_date FROM group_outings WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (SELECT 1 FROM outing_participants WHERE outing_id = p_target_id AND user_id = v_uid);
  END IF;
  -- Demande artisan
  IF p_target_type = 'service_request' THEN
    RETURN EXISTS (SELECT 1 FROM service_requests WHERE id = p_target_id AND resident_id = v_uid);
  END IF;
  -- Tous les autres : interaction terminee (review_unlocked = true)
  -- OU fallback : conversation avec exchange_status=done
  RETURN EXISTS (
    SELECT 1 FROM interactions
    WHERE source_type = p_target_type
      AND source_id   = p_target_id
      AND (requester_id = v_uid OR receiver_id = v_uid)
      AND review_unlocked = TRUE
  ) OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.related_type    = p_target_type
      AND c.related_id      = p_target_id
      AND c.exchange_status = 'done'
      AND cp.user_id        = v_uid
  );
END;
$function$;
