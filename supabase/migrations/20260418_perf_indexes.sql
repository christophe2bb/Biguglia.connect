-- ============================================================================
-- MIGRATION 20260418_perf_indexes
-- ★ Index de performance pour messages, notifications et conversations ★
--
-- Contexte :
--   • GET /api/messages/unread fait un filtre sur conversation_id + created_at
--   • GET /api/notifications fait un filtre sur user_id
--   • Ces index réduisent les seq-scan sur les tables les plus fréquemment
--     interrogées par le client de polling.
--
-- Impacts attendus :
--   • messages     : filtre par conversation_id  →  index composite
--   • messages     : tri / filtre par created_at →  index sur created_at
--   • notifications: filtre par user_id          →  index sur user_id
--   • notifications: filtre combiné user_id + read_at pour les non-lues
--   • conversation_participants : lookup par user_id (utilisé dans policies)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. messages — index composite principal  (conversation_id, created_at DESC)
--    Utilisé par :
--      SELECT … FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id_created_at
  ON public.messages (conversation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. messages — index sur created_at seul
--    Utilisé par les requêtes de polling non-lu : WHERE created_at > $last_check
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. messages — index sur sender_id  (JOINs avec profiles)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

-- ---------------------------------------------------------------------------
-- 4. notifications — index sur user_id  (filtre principal de toutes les requêtes)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- 5. notifications — index composite (user_id, read_at) pour les non-lues
--    Requête type : WHERE user_id = $1 AND read_at IS NULL
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_unread
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- 6. notifications — index sur created_at  (tri chronologique)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. conversation_participants — index sur user_id
--    Utilisé dans les policies RLS et les JOINs de la messagerie
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_user_id
  ON public.conversation_participants (user_id);

-- ---------------------------------------------------------------------------
-- 8. conversation_participants — index sur conversation_id
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_conversation_id
  ON public.conversation_participants (conversation_id);

-- ---------------------------------------------------------------------------
-- 9. conversations — index sur updated_at  (tri de la liste de conversations)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations (updated_at DESC);

-- ============================================================================
-- Résumé des index créés (si non déjà existants) :
--   idx_messages_conversation_id_created_at
--   idx_messages_created_at
--   idx_messages_sender_id
--   idx_notifications_user_id
--   idx_notifications_user_id_unread  (partial index)
--   idx_notifications_created_at
--   idx_conversation_participants_user_id
--   idx_conversation_participants_conversation_id
--   idx_conversations_updated_at
-- ============================================================================
