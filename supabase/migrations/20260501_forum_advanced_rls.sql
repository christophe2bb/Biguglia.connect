-- ============================================================================
-- MIGRATION 20260501_forum_advanced_rls  (v2 — corrigé après audit complet)
-- ★ Tables forum avancées : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. forum_sectors     — ajout slug, icon, color manquants (utilisés dans tout le code)
--   2. forum_topics      — colonnes manquantes (category_id, reply_count, is_hot, last_reply_at,
--                          visibility, reaction_count, views, is_pinned, status, tags)
--   3. forum_replies     — table réponses v2 (reaction_count ajouté)
--   4. forum_reactions   — réactions emoji
--   5. forum_follows     — abonnements topics
--   6. forum_topic_photos — photos attachées aux topics
--   7. forum_topic_tags  — tags associés aux topics
--   8. forum_moderation_logs — logs de modération
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. forum_sectors — secteurs géographiques du forum
--    ATTENTION : le code utilise sector:forum_sectors(id, name, slug, icon, color)
--    La table doit avoir slug, icon, color.
--    On l'a créée avec TEXT PK dans la v1, mais le code s'attend à des slugs + icônes.
--    On ajoute les colonnes manquantes si la table existe déjà via TEXT PK.
-- ============================================================================
DO $$ BEGIN
  -- Ajouter slug si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'forum_sectors' AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.forum_sectors ADD COLUMN slug TEXT;
    -- Backfill : utiliser id comme slug initial si id est TEXT
    UPDATE public.forum_sectors SET slug = id WHERE slug IS NULL;
    ALTER TABLE public.forum_sectors ALTER COLUMN slug SET NOT NULL;
    -- Contrainte unique sur slug
    ALTER TABLE public.forum_sectors ADD CONSTRAINT forum_sectors_slug_key UNIQUE (slug);
  END IF;

  -- Ajouter icon si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'forum_sectors' AND column_name = 'icon'
  ) THEN
    ALTER TABLE public.forum_sectors ADD COLUMN icon TEXT NOT NULL DEFAULT '📍';
  END IF;

  -- Ajouter color si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'forum_sectors' AND column_name = 'color'
  ) THEN
    ALTER TABLE public.forum_sectors ADD COLUMN color TEXT NOT NULL DEFAULT 'gray';
  END IF;

  -- Ajouter description si absent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'forum_sectors' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.forum_sectors ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Créer la table si elle n'existe pas du tout (cas fresh install)
CREATE TABLE IF NOT EXISTS public.forum_sectors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL UNIQUE,
  description   TEXT        NOT NULL DEFAULT '',
  icon          TEXT        NOT NULL DEFAULT '📍',
  color         TEXT        NOT NULL DEFAULT 'gray',
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

CREATE INDEX IF NOT EXISTS idx_forum_sectors_slug ON public.forum_sectors (slug);
CREATE INDEX IF NOT EXISTS idx_forum_sectors_order ON public.forum_sectors (display_order);

-- Données initiales secteurs Biguglia (INSERT avec slug + icon + color)
INSERT INTO public.forum_sectors (name, slug, description, icon, color, display_order) VALUES
  ('Les Collines',        'les-collines', 'Quartier résidentiel sur les hauteurs', '⛰️',  'emerald', 1),
  ('Figabruna',           'figabruna',    'Secteur sud de Biguglia',               '🌊',  'blue',    2),
  ('Village de Biguglia', 'village',      'Cœur historique du village',            '🏘️', 'amber',   3),
  ('Pineto',              'pineto',       'Secteur Pineto',                        '🌿', 'green',   4),
  ('Général',             'general',      'Discussion ouverte pour tout Biguglia', '💬',  'gray',    5)
ON CONFLICT (slug) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  icon          = EXCLUDED.icon,
  color         = EXCLUDED.color,
  display_order = EXCLUDED.display_order;


-- ============================================================================
-- 2. forum_topics — colonnes manquantes
-- ============================================================================
ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS views          INT       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pinned      BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_hot         BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status         TEXT      NOT NULL DEFAULT 'ouvert',
  ADD COLUMN IF NOT EXISTS sector_id      UUID      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags           TEXT[]    DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reply_count    INT       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reaction_count INT       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reply_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visibility     TEXT      NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- RLS forum_topics
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_topics_select"  ON public.forum_topics;
DROP POLICY IF EXISTS "forum_topics_insert"  ON public.forum_topics;
DROP POLICY IF EXISTS "forum_topics_update"  ON public.forum_topics;
DROP POLICY IF EXISTS "forum_topics_delete"  ON public.forum_topics;

CREATE POLICY "forum_topics_select"  ON public.forum_topics FOR SELECT USING (
  status != 'masque' OR is_moderator_or_admin()
);
CREATE POLICY "forum_topics_insert"  ON public.forum_topics FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_topics_update"  ON public.forum_topics FOR UPDATE USING (auth.uid() = author_id OR is_moderator_or_admin());
CREATE POLICY "forum_topics_delete"  ON public.forum_topics FOR DELETE USING (auth.uid() = author_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_forum_topics_author_id   ON public.forum_topics (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_status      ON public.forum_topics (status);
CREATE INDEX IF NOT EXISTS idx_forum_topics_sector_id   ON public.forum_topics (sector_id) WHERE sector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_topics_is_pinned   ON public.forum_topics (is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_forum_topics_is_hot      ON public.forum_topics (is_hot, reply_count DESC) WHERE is_hot = true;
CREATE INDEX IF NOT EXISTS idx_forum_topics_last_reply  ON public.forum_topics (last_reply_at DESC) WHERE last_reply_at IS NOT NULL;

-- Trigger updated_at forum_topics
CREATE OR REPLACE FUNCTION fn_forum_topics_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_forum_topics_updated_at ON public.forum_topics;
CREATE TRIGGER trg_forum_topics_updated_at
  BEFORE UPDATE ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION fn_forum_topics_updated_at();


-- ============================================================================
-- 3. forum_replies — table réponses v2
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id       UUID        NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        TEXT        NOT NULL,
  is_solution    BOOLEAN     NOT NULL DEFAULT false,
  reaction_count INT         NOT NULL DEFAULT 0,
  quote_reply_id UUID        REFERENCES public.forum_replies(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter reaction_count si la table existait déjà sans cette colonne
ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS reaction_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_replies_select" ON public.forum_replies;
DROP POLICY IF EXISTS "forum_replies_insert" ON public.forum_replies;
DROP POLICY IF EXISTS "forum_replies_update" ON public.forum_replies;
DROP POLICY IF EXISTS "forum_replies_delete" ON public.forum_replies;

CREATE POLICY "forum_replies_select" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_replies_update" ON public.forum_replies FOR UPDATE USING (auth.uid() = author_id OR is_moderator_or_admin());
CREATE POLICY "forum_replies_delete" ON public.forum_replies FOR DELETE USING (auth.uid() = author_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic_id    ON public.forum_replies (topic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id   ON public.forum_replies (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_is_solution ON public.forum_replies (is_solution) WHERE is_solution = true;

-- Trigger : incrémenter reply_count sur forum_topics
CREATE OR REPLACE FUNCTION fn_forum_reply_count_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_topics
    SET reply_count = reply_count + 1, last_reply_at = now()
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_topics
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_forum_reply_count ON public.forum_replies;
CREATE TRIGGER trg_forum_reply_count
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION fn_forum_reply_count_update();


-- ============================================================================
-- 4. forum_reactions — réactions emoji
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
-- 5. forum_follows — abonnements topics
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
