/**
 * admin/migration/_sql/realtime.ts
 */
export const REALTIME_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Activation Realtime instantané (v2)
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. REPLICA IDENTITY FULL (pour que UPDATE transmette la ligne complète)
ALTER TABLE messages                  REPLICA IDENTITY FULL;
ALTER TABLE notifications             REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE conversations             REPLICA IDENTITY FULL;

-- 2. Ajouter les tables à la publication Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- 3. Corriger les politiques RLS pour Realtime
--    Supabase Realtime ne peut pas évaluer les JOIN dans les policies SELECT.
--    On remplace la policy messages par une version sans JOIN.

-- Supprimer l'ancienne policy messages
DROP POLICY IF EXISTS "Voir messages de ses conversations" ON messages;

-- Nouvelle policy : utilise sender_id + conversation_id via sous-requête simple
CREATE POLICY "Voir messages de ses conversations" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Supprimer et recréer la policy conversation_participants pour Realtime
-- (simple : pas de sous-requête récursive sur la même table → évite 42P17)
DROP POLICY IF EXISTS "Voir participants de ses conversations" ON conversation_participants;

CREATE POLICY "Voir participants de ses conversations" ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

-- 4. Vérification (doit retourner 4 lignes)
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages','notifications','conversation_participants','conversations')
ORDER BY tablename;`;

