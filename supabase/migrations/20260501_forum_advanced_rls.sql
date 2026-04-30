-- ============================================================================
-- MIGRATION 20260501_forum_advanced_rls
-- ★ Tables forum avancées : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. forum_topics      — colonnes manquantes (views, is_pinned, status, sector_id)
--   2. forum_replies     — table réponses v2 (topic_id, author_id, content, is_solution, quote_reply_id)
--   3. forum_reactions   — réactions emoji (topic_id, reply_id, user_id, emoji)
--   4. forum_follows     — abonnements topics (topic_id, user_id, notify_replies)
--   5. forum_sectors     — secteurs géographiques du forum (id, name, display_order)
--   6. forum_topic_photos — photos attachées aux topics
--   7. forum_topic_tags  — tags associés aux topics
--   8. forum_moderation_logs — logs de modération (moderator_id, topic_id, action, reason)
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. forum_topics — colonnes manquantes
-- ============================================================================
ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS views       INT       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pinned   BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status      TEXT      NOT NULL DEFAULT 'ouvert',
  ADD COLUMN IF NOT EXISTS sector_id   TEXT      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags        TEXT[]    DEFAULT '{}';

-- RLS forum_topics
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_topics_select"  ON public.forum_topics;
DROP POLICY IF EXISTS "forum_topics_insert"  ON public.forum_topics;
DROP POLICY IF EXISTS "forum_topics_update"  ON public.forum_topics;
DROP POLICY IF EXISTS "forum_topics_delete"  ON public.forum_topics;

CREATE POLICY "forum_topics_select"  ON public.forum_topics FOR SELECT USING (true);
CREATE POLICY "forum_topics_insert"  ON public.forum_topics FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_topics_update"  ON public.forum_topics FOR UPDATE USING (auth.uid() = author_id OR is_moderator_or_admin());
CREATE POLICY "forum_topics_delete"  ON public.forum_topics FOR DELETE USING (auth.uid() = author_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_forum_topics_author_id  ON public.forum_topics (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_status     ON public.forum_topics (status);
CREATE INDEX IF NOT EXISTS idx_forum_topics_sector_id  ON public.forum_topics (sector_id) WHERE sector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_topics_is_pinned  ON public.forum_topics (is_pinned) WHERE is_pinned = true;


-- ============================================================================
-- 2. forum_replies — table réponses v2
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id       UUID        NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        TEXT        NOT NULL,
  is_solution    BOOLEAN     NOT NULL DEFAULT false,
  quote_reply_id UUID        REFERENCES public.forum_replies(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_replies_select" ON public.forum_replies;
DROP POLICY IF EXISTS "forum_replies_insert" ON public.forum_replies;
DROP POLICY IF EXISTS "forum_replies_update" ON public.forum_replies;
DROP POLICY IF EXISTS "forum_replies_delete" ON public.forum_replies;

CREATE POLICY "forum_replies_select" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_replies_update" ON public.forum_replies FOR UPDATE USING (auth.uid() = author_id OR is_moderator_or_admin());
CREATE POLICY "forum_replies_delete" ON public.forum_replies FOR DELETE USING (auth.uid() = author_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic_id   ON public.forum_replies (topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id  ON public.forum_replies (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_is_solution ON public.forum_replies (is_solution) WHERE is_solution = true;


-- ============================================================================
-- 3. forum_reactions — réactions emoji
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_reactions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id   UUID        REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  reply_id   UUID        REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT forum_reactions_target_check CHECK (
    (topic_id IS NOT NULL AND reply_id IS NULL) OR
    (topic_id IS NULL AND reply_id IS NOT NULL)
  )
);

ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_reactions_select" ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_reactions_insert" ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_reactions_delete" ON public.forum_reactions;

CREATE POLICY "forum_reactions_select" ON public.forum_reactions FOR SELECT USING (true);
CREATE POLICY "forum_reactions_insert" ON public.forum_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_reactions_delete" ON public.forum_reactions FOR DELETE USING (auth.uid() = user_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_forum_reactions_topic_id  ON public.forum_reactions (topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_reactions_reply_id  ON public.forum_reactions (reply_id) WHERE reply_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_reactions_user_id   ON public.forum_reactions (user_id);


-- ============================================================================
-- 4. forum_follows — abonnements topics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_follows (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id       UUID        NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_replies BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (topic_id, user_id)
);

ALTER TABLE public.forum_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_follows_select" ON public.forum_follows;
DROP POLICY IF EXISTS "forum_follows_insert" ON public.forum_follows;
DROP POLICY IF EXISTS "forum_follows_delete" ON public.forum_follows;

CREATE POLICY "forum_follows_select" ON public.forum_follows FOR SELECT USING (auth.uid() = user_id OR is_moderator_or_admin());
CREATE POLICY "forum_follows_insert" ON public.forum_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_follows_delete" ON public.forum_follows FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_forum_follows_topic_id ON public.forum_follows (topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_follows_user_id  ON public.forum_follows (user_id);


-- ============================================================================
-- 5. forum_sectors — secteurs géographiques du forum
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_sectors (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  display_order INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_sectors_select" ON public.forum_sectors;
DROP POLICY IF EXISTS "forum_sectors_insert" ON public.forum_sectors;
DROP POLICY IF EXISTS "forum_sectors_update" ON public.forum_sectors;
DROP POLICY IF EXISTS "forum_sectors_delete" ON public.forum_sectors;

CREATE POLICY "forum_sectors_select" ON public.forum_sectors FOR SELECT USING (true);
CREATE POLICY "forum_sectors_insert" ON public.forum_sectors FOR INSERT WITH CHECK (is_moderator_or_admin());
CREATE POLICY "forum_sectors_update" ON public.forum_sectors FOR UPDATE USING (is_moderator_or_admin());
CREATE POLICY "forum_sectors_delete" ON public.forum_sectors FOR DELETE USING (is_moderator_or_admin());

-- Données initiales secteurs Biguglia
INSERT INTO public.forum_sectors (id, name, display_order) VALUES
  ('village',    'Village',     1),
  ('collines',   'Collines',    2),
  ('figabruna',  'Figabruna',   3),
  ('pineto',     'Pineto',      4),
  ('general',    'Général',     5)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 6. forum_topic_photos — photos des topics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_topic_photos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id      UUID        NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  display_order INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_topic_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_topic_photos_select" ON public.forum_topic_photos;
DROP POLICY IF EXISTS "forum_topic_photos_insert" ON public.forum_topic_photos;
DROP POLICY IF EXISTS "forum_topic_photos_delete" ON public.forum_topic_photos;

CREATE POLICY "forum_topic_photos_select" ON public.forum_topic_photos FOR SELECT USING (true);
CREATE POLICY "forum_topic_photos_insert" ON public.forum_topic_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.forum_topics WHERE id = topic_id AND author_id = auth.uid())
);
CREATE POLICY "forum_topic_photos_delete" ON public.forum_topic_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.forum_topics WHERE id = topic_id AND author_id = auth.uid())
  OR is_moderator_or_admin()
);

CREATE INDEX IF NOT EXISTS idx_forum_topic_photos_topic_id ON public.forum_topic_photos (topic_id, display_order);


-- ============================================================================
-- 7. forum_topic_tags — tags associés aux topics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_tags (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT  NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "forum_tags_select" ON public.forum_tags;
CREATE POLICY "forum_tags_select" ON public.forum_tags FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.forum_topic_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id   UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES public.forum_tags(id) ON DELETE CASCADE,
  UNIQUE (topic_id, tag_id)
);

ALTER TABLE public.forum_topic_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_topic_tags_select" ON public.forum_topic_tags;
DROP POLICY IF EXISTS "forum_topic_tags_insert" ON public.forum_topic_tags;
DROP POLICY IF EXISTS "forum_topic_tags_delete" ON public.forum_topic_tags;

CREATE POLICY "forum_topic_tags_select" ON public.forum_topic_tags FOR SELECT USING (true);
CREATE POLICY "forum_topic_tags_insert" ON public.forum_topic_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.forum_topics WHERE id = topic_id AND author_id = auth.uid())
  OR is_moderator_or_admin()
);
CREATE POLICY "forum_topic_tags_delete" ON public.forum_topic_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.forum_topics WHERE id = topic_id AND author_id = auth.uid())
  OR is_moderator_or_admin()
);

CREATE INDEX IF NOT EXISTS idx_forum_topic_tags_topic_id ON public.forum_topic_tags (topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_tags_tag_id   ON public.forum_topic_tags (tag_id);


-- ============================================================================
-- 8. forum_moderation_logs — logs de modération
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_moderation_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id     UUID        REFERENCES public.forum_topics(id) ON DELETE SET NULL,
  reply_id     UUID        REFERENCES public.forum_replies(id) ON DELETE SET NULL,
  action       TEXT        NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_moderation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_modlogs_select" ON public.forum_moderation_logs;
DROP POLICY IF EXISTS "forum_modlogs_insert" ON public.forum_moderation_logs;

CREATE POLICY "forum_modlogs_select" ON public.forum_moderation_logs FOR SELECT USING (is_moderator_or_admin());
CREATE POLICY "forum_modlogs_insert" ON public.forum_moderation_logs FOR INSERT WITH CHECK (is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_forum_modlogs_moderator_id ON public.forum_moderation_logs (moderator_id);
CREATE INDEX IF NOT EXISTS idx_forum_modlogs_topic_id     ON public.forum_moderation_logs (topic_id) WHERE topic_id IS NOT NULL;


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
