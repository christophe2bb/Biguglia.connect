-- ============================================================
-- MIGRATION: Fix infinite recursion in conversation RLS policies
-- Date: 2026-04-10
-- Problem: The RLS policy on conversation_participants has a self-referencing
--          subquery (cp2 alias on the same table), causing infinite recursion.
--          This breaks ALL operations on conversations, conversation_participants,
--          and messages tables with error code 42P17.
-- 
-- Solution: Replace the self-referencing policy with a simple user_id check.
--           The "user can see other participants of their conversations" case
--           is handled by allowing users to see ALL participants of conversations
--           they belong to, using a SECURITY DEFINER function to avoid recursion.
-- ============================================================

-- ── Step 1: Drop all existing policies on affected tables ──────────────────

DROP POLICY IF EXISTS "Voir ses conversations" ON conversations;
DROP POLICY IF EXISTS "Créer conversation" ON conversations;
DROP POLICY IF EXISTS "Voir participants de ses conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Rejoindre conversation" ON conversation_participants;
DROP POLICY IF EXISTS "Mettre à jour sa participation" ON conversation_participants;
DROP POLICY IF EXISTS "Voir messages de ses conversations" ON messages;
DROP POLICY IF EXISTS "Envoyer message" ON messages;
DROP POLICY IF EXISTS "Supprimer son message" ON messages;

-- ── Step 2: Create a SECURITY DEFINER function to check conversation membership
-- This function runs with elevated privileges and does NOT trigger RLS policies,
-- breaking the recursion cycle.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID) TO authenticated;

-- ── Step 3: Create a SECURITY DEFINER function to get user's conversation IDs ──

CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(p_user_id UUID)
RETURNS TABLE(conversation_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.conversation_id
  FROM public.conversation_participants cp
  WHERE cp.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_conversation_ids(UUID) TO authenticated;

-- ── Step 4: Recreate policies using the SECURITY DEFINER functions ─────────────

-- CONVERSATIONS policies
CREATE POLICY "Voir ses conversations" ON conversations
  FOR SELECT USING (
    public.is_conversation_participant(id, auth.uid())
    OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
  );

CREATE POLICY "Créer conversation" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Mettre à jour conversation" ON conversations
  FOR UPDATE USING (
    public.is_conversation_participant(id, auth.uid())
    OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
  );

-- CONVERSATION_PARTICIPANTS policies
-- KEY FIX: Use the SECURITY DEFINER function instead of a self-referencing subquery
CREATE POLICY "Voir participants de ses conversations" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_conversation_participant(conversation_id, auth.uid())
    OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
  );

CREATE POLICY "Rejoindre conversation" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Mettre à jour sa participation" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Quitter conversation" ON conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- MESSAGES policies
CREATE POLICY "Voir messages de ses conversations" ON messages
  FOR SELECT USING (
    public.is_conversation_participant(conversation_id, auth.uid())
    OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'moderator'))
  );

CREATE POLICY "Envoyer message" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY "Supprimer son message" ON messages
  FOR DELETE USING (
    auth.uid() = sender_id
  );

-- ── Step 5: Verify no more recursion ──────────────────────────────────────────
-- After applying this migration, test with:
-- SELECT * FROM conversation_participants WHERE user_id = auth.uid() LIMIT 1;
-- Expected: No more "infinite recursion detected" error (42P17)
