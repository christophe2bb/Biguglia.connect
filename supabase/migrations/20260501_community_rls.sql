-- ============================================================================
-- MIGRATION 20260501_community_rls
-- ★ Tables communauté : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. theme_memberships     — membres d'un thème communautaire
--   2. theme_profiles        — profil d'un membre dans un thème
--   3. theme_discussions     — discussions dans un thème
--   4. theme_discussion_likes — likes sur les discussions
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. theme_memberships
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.theme_memberships (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id   TEXT        NOT NULL,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (theme_id, user_id)
);

ALTER TABLE public.theme_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "theme_memberships_select" ON public.theme_memberships;
DROP POLICY IF EXISTS "theme_memberships_insert" ON public.theme_memberships;
DROP POLICY IF EXISTS "theme_memberships_delete" ON public.theme_memberships;

CREATE POLICY "theme_memberships_select" ON public.theme_memberships FOR SELECT USING (true);
CREATE POLICY "theme_memberships_insert" ON public.theme_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "theme_memberships_delete" ON public.theme_memberships FOR DELETE USING (auth.uid() = user_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_theme_memberships_theme_id ON public.theme_memberships (theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_memberships_user_id  ON public.theme_memberships (user_id);


-- ============================================================================
-- 2. theme_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.theme_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id      TEXT        NOT NULL,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio           TEXT,
  tags          TEXT[]      DEFAULT '{}',
  level         TEXT,
  looking_for   TEXT,
  offering      TEXT,
  location_zone TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (theme_id, user_id)
);

ALTER TABLE public.theme_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "theme_profiles_select" ON public.theme_profiles;
DROP POLICY IF EXISTS "theme_profiles_insert" ON public.theme_profiles;
DROP POLICY IF EXISTS "theme_profiles_update" ON public.theme_profiles;
DROP POLICY IF EXISTS "theme_profiles_delete" ON public.theme_profiles;

CREATE POLICY "theme_profiles_select" ON public.theme_profiles FOR SELECT USING (true);
CREATE POLICY "theme_profiles_insert" ON public.theme_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "theme_profiles_update" ON public.theme_profiles FOR UPDATE USING (auth.uid() = user_id OR is_moderator_or_admin());
CREATE POLICY "theme_profiles_delete" ON public.theme_profiles FOR DELETE USING (auth.uid() = user_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_theme_profiles_theme_id ON public.theme_profiles (theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_profiles_user_id  ON public.theme_profiles (user_id);


-- ============================================================================
-- 3. theme_discussions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.theme_discussions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id    TEXT        NOT NULL,
  author_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  is_pinned   BOOLEAN     NOT NULL DEFAULT false,
  likes_count INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "theme_discussions_select" ON public.theme_discussions;
DROP POLICY IF EXISTS "theme_discussions_insert" ON public.theme_discussions;
DROP POLICY IF EXISTS "theme_discussions_update" ON public.theme_discussions;
DROP POLICY IF EXISTS "theme_discussions_delete" ON public.theme_discussions;

CREATE POLICY "theme_discussions_select" ON public.theme_discussions FOR SELECT USING (true);
CREATE POLICY "theme_discussions_insert" ON public.theme_discussions FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "theme_discussions_update" ON public.theme_discussions FOR UPDATE USING (auth.uid() = author_id OR is_moderator_or_admin());
CREATE POLICY "theme_discussions_delete" ON public.theme_discussions FOR DELETE USING (auth.uid() = author_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_theme_discussions_theme_id   ON public.theme_discussions (theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_discussions_author_id  ON public.theme_discussions (author_id);
CREATE INDEX IF NOT EXISTS idx_theme_discussions_is_pinned  ON public.theme_discussions (is_pinned) WHERE is_pinned = true;


-- ============================================================================
-- 4. theme_discussion_likes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.theme_discussion_likes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID        NOT NULL REFERENCES public.theme_discussions(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discussion_id, user_id)
);

ALTER TABLE public.theme_discussion_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "theme_discussion_likes_select" ON public.theme_discussion_likes;
DROP POLICY IF EXISTS "theme_discussion_likes_insert" ON public.theme_discussion_likes;
DROP POLICY IF EXISTS "theme_discussion_likes_delete" ON public.theme_discussion_likes;

CREATE POLICY "theme_discussion_likes_select" ON public.theme_discussion_likes FOR SELECT USING (true);
CREATE POLICY "theme_discussion_likes_insert" ON public.theme_discussion_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "theme_discussion_likes_delete" ON public.theme_discussion_likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_theme_disc_likes_discussion_id ON public.theme_discussion_likes (discussion_id);
CREATE INDEX IF NOT EXISTS idx_theme_disc_likes_user_id       ON public.theme_discussion_likes (user_id);


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
