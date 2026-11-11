-- À appliquer AVANT le déploiement du code utilisant confirm_conversation_exchange.
-- Requête transactionnelle testée en ROLLBACK le 10/11/2026.
-- La fonction est accessible uniquement au rôle serveur service_role.
-- Le serveur contrôle lui aussi l'appartenance avant de l'appeler.
-- Ne pas déléguer la décision du statut final au navigateur.

CREATE OR REPLACE FUNCTION public.confirm_conversation_exchange(
  p_conversation_id uuid, p_actor_id uuid
) RETURNS TABLE(exchange_status text, confirmed_by uuid[], confirmed_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_conv public.conversations%ROWTYPE;
  v_confirmed uuid[];
  v_status text;
  v_completed_at timestamptz;
  v_count integer;
  v_all boolean;
BEGIN
  IF p_conversation_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Paramètres incomplets' USING ERRCODE='22023';
  END IF;

  SELECT c.* INTO v_conv FROM public.conversations c
  WHERE c.id=p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation introuvable' USING ERRCODE='P0002';
  END IF;

  SELECT count(DISTINCT cp.user_id) INTO v_count
  FROM public.conversation_participants cp
  WHERE cp.conversation_id=p_conversation_id;
  IF v_count<>2 THEN
    RAISE EXCEPTION 'Deux participants sont requis' USING ERRCODE='23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id=p_conversation_id AND cp.user_id=p_actor_id
  ) THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE='42501';
  END IF;

  IF v_conv.exchange_status='done' THEN
    RETURN QUERY SELECT v_conv.exchange_status, v_conv.exchange_confirmed_by,
                        v_conv.exchange_confirmed_at;
    RETURN;
  END IF;

  v_confirmed:=COALESCE(v_conv.exchange_confirmed_by,ARRAY[]::uuid[]);
  IF NOT(p_actor_id=ANY(v_confirmed)) THEN
    v_confirmed:=array_append(v_confirmed,p_actor_id);
  END IF;

  SELECT bool_and(cp.user_id=ANY(v_confirmed)) INTO v_all
  FROM public.conversation_participants cp
  WHERE cp.conversation_id=p_conversation_id;

  v_status:=CASE WHEN COALESCE(v_all,false)
                   THEN 'done' ELSE 'pending_confirmation' END;
  v_completed_at:=CASE WHEN v_status='done'
                         THEN COALESCE(v_conv.exchange_confirmed_at,now())
                         ELSE NULL END;

  UPDATE public.conversations c
  SET exchange_status=v_status,
      exchange_confirmed_by=v_confirmed,
      exchange_confirmed_at=v_completed_at
  WHERE c.id=p_conversation_id;

  RETURN QUERY SELECT v_status,v_confirmed,v_completed_at;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.confirm_conversation_exchange(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_conversation_exchange(uuid,uuid)
  TO service_role;

-- Contrôles recette : 1re confirmation → pending_confirmation avec 1 UUID ;
-- 2e confirmation → done avec 2 UUID ; réitération → idempotente ;
-- anonyme et authentifié sans service_role → EXECUTE refusé.
