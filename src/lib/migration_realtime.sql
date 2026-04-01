-- ============================================================
-- BIGUGLIA CONNECT — Migration Realtime instantané
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================
-- Ce script active Realtime sur les tables messages, notifications
-- et conversation_participants, et ajoute REPLICA IDENTITY FULL
-- pour que les événements UPDATE transmettent la ligne complète.
-- ============================================================

-- 1. REPLICA IDENTITY FULL sur les tables Realtime
--    (nécessaire pour que UPDATE/DELETE envoient l'ancienne + nouvelle ligne)
ALTER TABLE messages                 REPLICA IDENTITY FULL;
ALTER TABLE notifications            REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE conversations            REPLICA IDENTITY FULL;

-- 2. Ajouter les tables à la publication Supabase Realtime
--    (sans ça, postgres_changes ne reçoit rien du tout)
DO $$ BEGIN
  -- messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  -- notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  -- conversation_participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
  END IF;

  -- conversations
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- 3. Vérification — doit retourner les 4 tables
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages','notifications','conversation_participants','conversations')
ORDER BY tablename;
