-- Migration: correction RPC get_conversation_other_participant
-- Erreur corrigée : 42702 "column reference user_id is ambiguous"
-- Cause : conflit entre la variable PL/pgSQL et la colonne de table portant le même nom
-- Solution : renommer la variable en v_current_user + aliaser explicitement p.id AS user_id

CREATE OR REPLACE FUNCTION get_conversation_other_participant(p_conversation_id UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user UUID := auth.uid();
BEGIN
  -- Vérifier que l'utilisateur actuel participe à cette conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = p_conversation_id
      AND cp2.user_id = v_current_user
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Retourner le profil de l'autre participant
  -- Alias p.id AS user_id nécessaire pour éviter l'ambiguïté avec la var PL/pgSQL
  RETURN QUERY
    SELECT p.id AS user_id, p.full_name, p.avatar_url
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id != v_current_user
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_conversation_other_participant TO authenticated;
