-- ============================================================
-- FIX RLS Forum Posts & Comments
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques forum_posts (si elles existent)
DROP POLICY IF EXISTS "forum_posts_select_all" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_insert_auth" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_update_own" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_delete_own" ON forum_posts;

-- 3. Recréer les politiques forum_posts proprement
-- Lecture : tout le monde peut lire
CREATE POLICY "forum_posts_select_all"
  ON forum_posts FOR SELECT
  USING (TRUE);

-- Création : utilisateur authentifié seulement, auteur = lui-même
CREATE POLICY "forum_posts_insert_auth"
  ON forum_posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Modification : auteur ou admin/modérateur
CREATE POLICY "forum_posts_update_own"
  ON forum_posts FOR UPDATE
  USING (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

-- Suppression : auteur ou admin/modérateur
CREATE POLICY "forum_posts_delete_own"
  ON forum_posts FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());

-- 4. Supprimer les anciennes politiques forum_comments
DROP POLICY IF EXISTS "forum_comments_select_all" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_insert_auth" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_update_own" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_delete_own" ON forum_comments;

-- 5. Recréer les politiques forum_comments
CREATE POLICY "forum_comments_select_all"
  ON forum_comments FOR SELECT
  USING (TRUE);

CREATE POLICY "forum_comments_insert_auth"
  ON forum_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "forum_comments_update_own"
  ON forum_comments FOR UPDATE
  USING (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

CREATE POLICY "forum_comments_delete_own"
  ON forum_comments FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());

-- 6. Vérifier que la fonction is_moderator_or_admin existe
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Vérification — affiche les politiques actives
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('forum_posts', 'forum_comments')
ORDER BY tablename, cmd;
