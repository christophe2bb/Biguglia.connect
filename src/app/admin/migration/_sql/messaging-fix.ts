/**
 * admin/migration/_sql/messaging-fix.ts
 * SQL — Fix messagerie (BLOC 1 + BLOC 2)
 */

export const CONV_FIX_BLOC1 = `-- ============================================================
-- BIGUGLIA CONNECT — Fix messagerie BLOC 1/2
-- Ajouter les valeurs manquantes dans l'ENUM related_type
--
-- ⚠️  IMPORTANT : coller CE BLOC SEUL dans un nouvel onglet SQL Editor
--    (ALTER TYPE ADD VALUE ne peut pas s'exécuter dans une transaction)
-- ============================================================
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'listing';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'equipment';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'help_request';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'lost_found';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'association';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'outing';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'collection_item';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'service_request';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'general';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'community';

-- Vérification : doit afficher les 11 valeurs
SELECT enumlabel AS valeur FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'related_type'
ORDER BY e.enumsortorder;
`;

export const CONV_FIX_BLOC2 = `-- ============================================================
-- BIGUGLIA CONNECT — Fix messagerie BLOC 2/2
-- Fonction SECURITY DEFINER + CHECK + RLS policies
--
-- Exécuter APRÈS le BLOC 1 (dans un nouvel onglet SQL Editor)
-- ============================================================

-- 1. Mettre à jour le CHECK pour autoriser toutes les valeurs + NULL
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_related_type_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_related_type_check
  CHECK (
    related_type IS NULL
    OR related_type::text IN (
      'service_request', 'listing', 'equipment', 'general',
      'help_request', 'collection_item', 'lost_found',
      'association', 'outing', 'event', 'community'
    )
  );

-- 2. Valeur par défaut = 'general'
ALTER TABLE conversations
  ALTER COLUMN related_type SET DEFAULT 'general';

-- 3. Fonction SECURITY DEFINER : contourne les RLS pour créer une conversation
--    Appelée via supabase.rpc('create_conversation_with_message', {...})
CREATE OR REPLACE FUNCTION create_conversation_with_message(
  p_subject        TEXT,
  p_related_type   TEXT DEFAULT 'general',
  p_related_id     TEXT DEFAULT NULL,   -- TEXT pour accepter UUID ou slug (ex: 'collectionneurs')
  p_owner_id       UUID DEFAULT NULL,
  p_initial_msg    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_conv_id    UUID;
  v_related_id UUID := NULL;   -- UUID cast (NULL si p_related_id est un slug texte)
BEGIN
  -- Vérification : utilisateur connecté obligatoire
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Vérification : pas de contact avec soi-même
  IF p_owner_id IS NOT NULL AND v_user_id = p_owner_id THEN
    RAISE EXCEPTION 'SELF_CONTACT';
  END IF;

  -- Tenter de caster p_related_id en UUID (échoue silencieusement si c'est un slug texte)
  BEGIN
    IF p_related_id IS NOT NULL THEN
      v_related_id := p_related_id::UUID;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_related_id := NULL;  -- slug communauté (ex: 'collectionneurs') → pas d'UUID
  END;

  -- Chercher conversation existante isolée par (related_type, related_id OU subject)
  IF p_owner_id IS NOT NULL THEN
    IF v_related_id IS NOT NULL THEN
      -- Isolation stricte : même related_type ET même related_id (UUID)
      SELECT c.id INTO v_conv_id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_owner_id
      WHERE c.related_type::text = p_related_type
        AND c.related_id = v_related_id
      ORDER BY c.updated_at DESC
      LIMIT 1;
    ELSIF p_related_id IS NOT NULL THEN
      -- Slug communauté : isolation par (related_type, subject)
      SELECT c.id INTO v_conv_id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_owner_id
      WHERE c.related_type::text = p_related_type
        AND c.subject = p_subject
      ORDER BY c.updated_at DESC
      LIMIT 1;
    ELSE
      -- Pas de related_id : cherche conv générale entre les deux (sans related_id)
      SELECT c.id INTO v_conv_id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_owner_id
      WHERE c.related_id IS NULL
      ORDER BY c.updated_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- Conversation existante → la retourner
  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Créer la nouvelle conversation (related_id = NULL si slug communauté)
  INSERT INTO conversations (subject, related_type, related_id)
  VALUES (
    p_subject,
    COALESCE(p_related_type, 'general')::related_type,
    v_related_id    -- NULL pour les slugs communauté, UUID pour les vraies ressources
  )
  RETURNING id INTO v_conv_id;

  -- Ajouter les participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  IF p_owner_id IS NOT NULL AND p_owner_id != v_user_id THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, p_owner_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  -- Insérer le message initial
  IF p_initial_msg IS NOT NULL AND p_initial_msg != '' THEN
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (v_conv_id, v_user_id, p_initial_msg);
  END IF;

  RETURN v_conv_id;
END;
$$;

-- Autoriser les utilisateurs authentifiés à appeler cette fonction
GRANT EXECUTE ON FUNCTION create_conversation_with_message TO authenticated;

-- Fonction pour récupérer le profil de l'autre participant (contourne RLS)
-- Nécessaire car la RLS sur conversation_participants filtre sur user_id = auth.uid()
-- IMPORTANT : utiliser des aliases qualifiés pour éviter l'ambiguïté de "user_id"
-- entre la colonne de table et la variable PL/pgSQL (erreur 42702)
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
  -- Alias explicite p.id AS user_id pour éviter 42702 (ambiguous column reference)
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

-- 4. RLS conversations (pour la lecture/mise à jour)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Créer une conversation" ON conversations;
CREATE POLICY "Créer une conversation" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Voir ses conversations" ON conversations;
CREATE POLICY "Voir ses conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Modifier ses conversations" ON conversations;
CREATE POLICY "Modifier ses conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

-- 5. RLS conversation_participants (simple, sans récursion)
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ajouter des participants" ON conversation_participants;
CREATE POLICY "Ajouter des participants" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Voir participants de ses conversations" ON conversation_participants;
CREATE POLICY "Voir participants de ses conversations" ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Supprimer ses participations" ON conversation_participants;
CREATE POLICY "Supprimer ses participations" ON conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- 6. RLS messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voir messages de ses conversations" ON messages;
CREATE POLICY "Voir messages de ses conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Envoyer un message" ON messages;
CREATE POLICY "Envoyer un message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- 7. Recharge PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'Fix BLOC 2 appliqué avec succès — fonction create_conversation_with_message créée' AS resultat;
`;

