-- ============================================================
-- MIGRATION : Colonnes documents artisan + politiques RLS forum
-- À exécuter dans Supabase → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. AJOUT DES COLONNES MANQUANTES DANS artisan_profiles
-- ============================================================
-- Ces colonnes sont utilisées par le code mais absentes du schéma initial.

ALTER TABLE artisan_profiles
  ADD COLUMN IF NOT EXISTS doc_kbis_url       TEXT,
  ADD COLUMN IF NOT EXISTS doc_insurance_url  TEXT,
  ADD COLUMN IF NOT EXISTS doc_id_url         TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT;

-- Vérification :
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'artisan_profiles'
-- ORDER BY ordinal_position;


-- ============================================================
-- 2. POLITIQUE STORAGE : bucket "photos" accessible aux authentifiés
-- ============================================================
-- Le bucket "photos" doit exister et être PUBLIC dans Supabase Storage.
-- Si ce n'est pas encore fait, créez-le dans Storage → New bucket → nom : photos, public : true

-- Politique d'upload (INSERT) pour les utilisateurs authentifiés :
INSERT INTO storage.buckets (id, name, public)
  VALUES ('photos', 'photos', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Politiques storage (recréation propre)
DROP POLICY IF EXISTS "photos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "photos_auth_insert"   ON storage.objects;
DROP POLICY IF EXISTS "photos_auth_update"   ON storage.objects;
DROP POLICY IF EXISTS "photos_auth_delete"   ON storage.objects;

CREATE POLICY "photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "photos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "photos_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "photos_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);


-- ============================================================
-- 3. CORRECTION DES POLITIQUES RLS DU FORUM
-- ============================================================

-- S'assurer que RLS est activé
ALTER TABLE forum_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques incomplètes
DROP POLICY IF EXISTS "forum_posts_select_all"    ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_insert_auth"   ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_update_own"    ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_delete_own"    ON forum_posts;

DROP POLICY IF EXISTS "forum_comments_select_all"  ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_insert_auth" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_update_own"  ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_delete_own"  ON forum_comments;

-- Recréer les politiques forum_posts
CREATE POLICY "forum_posts_select_all"
  ON forum_posts FOR SELECT USING (TRUE);

CREATE POLICY "forum_posts_insert_auth"
  ON forum_posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "forum_posts_update_own"
  ON forum_posts FOR UPDATE
  USING  (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

CREATE POLICY "forum_posts_delete_own"
  ON forum_posts FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());

-- Recréer les politiques forum_comments
CREATE POLICY "forum_comments_select_all"
  ON forum_comments FOR SELECT USING (TRUE);

CREATE POLICY "forum_comments_insert_auth"
  ON forum_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "forum_comments_update_own"
  ON forum_comments FOR UPDATE
  USING  (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

CREATE POLICY "forum_comments_delete_own"
  ON forum_comments FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());


-- ============================================================
-- 4. VÉRIFICATION FINALE
-- ============================================================

-- Vérifier les colonnes de artisan_profiles :
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'artisan_profiles'
ORDER BY ordinal_position;

-- Vérifier les politiques actives :
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('forum_posts', 'forum_comments', 'artisan_profiles')
ORDER BY tablename, cmd;
