-- Déjà appliqué à Supabase de production le 10/11/2026 via migration
-- 20261110172310 ; conservé ici pour aligner l'historique du dépôt.
--
-- Bug confirmé : lors d'un INSERT de deux participants, les deux triggers
-- AFTER INSERT tentent d'insérer la même paire. "ON CONFLICT ON CONSTRAINT
-- conversation_pairs_unique" ne gère pas la collision PRIMARY KEY
-- conversation_pairs_pkey et pouvait produire des conversations incomplètes.
--
-- Correction : gérer toutes les contraintes d'unicité sur la paire,
-- sans modifier ni supprimer les conversations/messages existants.

CREATE OR REPLACE FUNCTION public.fn_maintain_conversation_pairs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
  v_other_user uuid;
  v_type public.related_type;
  v_related_id uuid;
BEGIN
  SELECT cp.user_id INTO v_other_user
  FROM public.conversation_participants AS cp
  WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id <> NEW.user_id
  ORDER BY cp.user_id LIMIT 1;
  IF v_other_user IS NULL THEN RETURN NEW; END IF;

  SELECT c.related_type, c.related_id INTO v_type, v_related_id
  FROM public.conversations AS c WHERE c.id = NEW.conversation_id;

  INSERT INTO public.conversation_pairs(
    conversation_id, participant_a, participant_b, related_type, related_id
  ) VALUES(
    NEW.conversation_id,
    LEAST(NEW.user_id, v_other_user),
    GREATEST(NEW.user_id, v_other_user),
    COALESCE(v_type, 'general'::public.related_type),
    v_related_id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$fn$;

-- Vérification transactionnelle réalisée : 2 participants insérés ensemble,
-- exactement 1 paire créée, puis ROLLBACK.
-- NOTE : les anciennes conversations à 0/1 participant ne sont PAS
-- réparées automatiquement : certaines peuvent correspondre à un départ
-- volontaire. Leur restauration requiert une règle métier validée.
