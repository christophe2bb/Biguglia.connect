/**
 * admin/migration/_sql/community.ts
 */
export const COLLECTION_COMMENTS_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Discussion sur articles de collection
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

-- Table des commentaires publics sur les articles de collection
CREATE TABLE IF NOT EXISTS collection_item_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id    UUID NOT NULL REFERENCES collection_items(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index performances
CREATE INDEX IF NOT EXISTS collection_item_comments_item_idx   ON collection_item_comments(item_id);
CREATE INDEX IF NOT EXISTS collection_item_comments_author_idx ON collection_item_comments(author_id);
CREATE INDEX IF NOT EXISTS collection_item_comments_date_idx   ON collection_item_comments(created_at DESC);

-- RLS
ALTER TABLE collection_item_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut lire les commentaires collection" ON collection_item_comments;
CREATE POLICY "Tout le monde peut lire les commentaires collection"
  ON collection_item_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Membres authentifiés peuvent commenter" ON collection_item_comments;
CREATE POLICY "Membres authentifiés peuvent commenter"
  ON collection_item_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut modifier son commentaire" ON collection_item_comments;
CREATE POLICY "Auteur peut modifier son commentaire"
  ON collection_item_comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut supprimer son commentaire" ON collection_item_comments;
CREATE POLICY "Auteur peut supprimer son commentaire"
  ON collection_item_comments FOR DELETE
  USING (auth.uid() = author_id);

-- Vérification
SELECT COUNT(*) AS nb_commentaires FROM collection_item_comments;
`;

export const COMMUNITY_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Communautés thématiques (Phase 1 MVP)
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

-- 1. Table des adhésions aux thèmes
CREATE TABLE IF NOT EXISTS theme_memberships (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_slug     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','hidden')),
  visibility     TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','members_only','private')),
  allow_messages BOOLEAN NOT NULL DEFAULT true,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, theme_slug)
);

CREATE INDEX IF NOT EXISTS theme_memberships_theme_idx  ON theme_memberships(theme_slug);
CREATE INDEX IF NOT EXISTS theme_memberships_user_idx   ON theme_memberships(user_id);
CREATE INDEX IF NOT EXISTS theme_memberships_active_idx ON theme_memberships(theme_slug, status) WHERE status = 'active';

ALTER TABLE theme_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique adhésions" ON theme_memberships;
CREATE POLICY "Lecture publique adhésions" ON theme_memberships FOR SELECT USING (true);
DROP POLICY IF EXISTS "Créer sa propre adhésion" ON theme_memberships;
CREATE POLICY "Créer sa propre adhésion" ON theme_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Modifier sa propre adhésion" ON theme_memberships;
CREATE POLICY "Modifier sa propre adhésion" ON theme_memberships FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Supprimer sa propre adhésion" ON theme_memberships;
CREATE POLICY "Supprimer sa propre adhésion" ON theme_memberships FOR DELETE USING (auth.uid() = user_id);

-- 2. Table des mini-profils thématiques
CREATE TABLE IF NOT EXISTS theme_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_slug    TEXT NOT NULL,
  bio           TEXT,
  interests     TEXT[] DEFAULT '{}',
  looking_for   TEXT,
  offering      TEXT,
  availability  TEXT,
  level         TEXT,
  tags          TEXT[] DEFAULT '{}',
  location_zone TEXT,
  custom_fields JSONB DEFAULT '{}',
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, theme_slug)
);

CREATE INDEX IF NOT EXISTS theme_profiles_theme_idx ON theme_profiles(theme_slug);
CREATE INDEX IF NOT EXISTS theme_profiles_user_idx  ON theme_profiles(user_id);

ALTER TABLE theme_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique profils thème" ON theme_profiles;
CREATE POLICY "Lecture publique profils thème" ON theme_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Créer son propre profil thème" ON theme_profiles;
CREATE POLICY "Créer son propre profil thème" ON theme_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Modifier son propre profil thème" ON theme_profiles;
CREATE POLICY "Modifier son propre profil thème" ON theme_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Supprimer son propre profil thème" ON theme_profiles;
CREATE POLICY "Supprimer son propre profil thème" ON theme_profiles FOR DELETE USING (auth.uid() = user_id);

-- Vérification
SELECT
  (SELECT COUNT(*) FROM theme_memberships) AS nb_adhesions,
  (SELECT COUNT(*) FROM theme_profiles)    AS nb_profils_theme;
`;

export const DISCUSSIONS_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Discussions communautaires (Phase 2)
-- Coller dans Supabase > SQL Editor > Run
-- ⚠️  Exécuter APRÈS le SQL Communautés (theme_memberships, theme_profiles)
-- ============================================================

-- 1. Table des discussions publiques thématiques
CREATE TABLE IF NOT EXISTS theme_discussions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_slug   TEXT NOT NULL,
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  likes_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS theme_discussions_theme_idx  ON theme_discussions(theme_slug);
CREATE INDEX IF NOT EXISTS theme_discussions_author_idx ON theme_discussions(author_id);
CREATE INDEX IF NOT EXISTS theme_discussions_date_idx   ON theme_discussions(theme_slug, created_at DESC);

ALTER TABLE theme_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique discussions" ON theme_discussions;
CREATE POLICY "Lecture publique discussions"
  ON theme_discussions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Membres peuvent publier" ON theme_discussions;
CREATE POLICY "Membres peuvent publier"
  ON theme_discussions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut modifier" ON theme_discussions;
CREATE POLICY "Auteur peut modifier"
  ON theme_discussions FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut supprimer" ON theme_discussions;
CREATE POLICY "Auteur peut supprimer"
  ON theme_discussions FOR DELETE
  USING (auth.uid() = author_id);

-- 2. Table des likes de discussions
CREATE TABLE IF NOT EXISTS theme_discussion_likes (
  discussion_id UUID NOT NULL REFERENCES theme_discussions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

CREATE INDEX IF NOT EXISTS theme_discussion_likes_user_idx ON theme_discussion_likes(user_id);

ALTER TABLE theme_discussion_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique likes" ON theme_discussion_likes;
CREATE POLICY "Lecture publique likes"
  ON theme_discussion_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Membres peuvent liker" ON theme_discussion_likes;
CREATE POLICY "Membres peuvent liker"
  ON theme_discussion_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Membres peuvent unliker" ON theme_discussion_likes;
CREATE POLICY "Membres peuvent unliker"
  ON theme_discussion_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Fonction trigger pour mettre à jour le compteur de likes
CREATE OR REPLACE FUNCTION update_discussion_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE theme_discussions SET likes_count = likes_count + 1 WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE theme_discussions SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_likes_count_trigger ON theme_discussion_likes;
CREATE TRIGGER update_likes_count_trigger
  AFTER INSERT OR DELETE ON theme_discussion_likes
  FOR EACH ROW EXECUTE FUNCTION update_discussion_likes_count();

-- 4. Vérification
SELECT
  (SELECT COUNT(*) FROM theme_discussions) AS nb_discussions,
  (SELECT COUNT(*) FROM theme_discussion_likes) AS nb_likes;
`;

