-- ============================================================
-- MIGRATION COMPLÈTE - À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ============================================================
-- 1. COLONNES MANQUANTES DANS artisan_profiles
-- ============================================================
ALTER TABLE artisan_profiles
  ADD COLUMN IF NOT EXISTS doc_kbis_url       TEXT,
  ADD COLUMN IF NOT EXISTS doc_insurance_url  TEXT,
  ADD COLUMN IF NOT EXISTS doc_id_url         TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT;

-- ============================================================
-- 2. BUCKET "documents" PRIVÉ pour les pièces justificatives
-- ============================================================
-- Créer le bucket privé (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'documents',
    'documents',
    false,
    10485760,  -- 10 Mo max
    ARRAY['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
  )
  ON CONFLICT (id) DO UPDATE SET public = false;

-- Politiques storage bucket "documents" :
-- Seuls les utilisateurs authentifiés peuvent uploader LEURS propres docs
-- Seuls les admins peuvent lire

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "documents_insert_auth"  ON storage.objects;
DROP POLICY IF EXISTS "documents_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_admin" ON storage.objects;

-- Upload : tout utilisateur authentifié peut uploader dans son dossier
CREATE POLICY "documents_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

-- Lecture : admin uniquement (pour vérifier les pièces)
CREATE POLICY "documents_select_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      -- L'artisan peut lire ses propres documents
      auth.uid() IS NOT NULL
      AND (
        -- Admin
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- L'artisan lui-même (le chemin contient son user_id)
        (storage.foldername(name))[1] = auth.uid()::text
      )
    )
  );

-- Suppression : admin uniquement
CREATE POLICY "documents_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. POLITIQUES RLS FORUM (correction WITH CHECK manquant)
-- ============================================================
ALTER TABLE forum_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_posts_select_all"    ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_insert_auth"   ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_update_own"    ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_delete_own"    ON forum_posts;
DROP POLICY IF EXISTS "forum_comments_select_all"  ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_insert_auth" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_update_own"  ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_delete_own"  ON forum_comments;

CREATE POLICY "forum_posts_select_all"   ON forum_posts FOR SELECT USING (TRUE);
CREATE POLICY "forum_posts_insert_auth"  ON forum_posts FOR INSERT WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);
CREATE POLICY "forum_posts_update_own"   ON forum_posts FOR UPDATE USING (author_id = auth.uid() OR is_moderator_or_admin()) WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());
CREATE POLICY "forum_posts_delete_own"   ON forum_posts FOR DELETE USING (author_id = auth.uid() OR is_moderator_or_admin());

CREATE POLICY "forum_comments_select_all"   ON forum_comments FOR SELECT USING (TRUE);
CREATE POLICY "forum_comments_insert_auth"  ON forum_comments FOR INSERT WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);
CREATE POLICY "forum_comments_update_own"   ON forum_comments FOR UPDATE USING (author_id = auth.uid() OR is_moderator_or_admin()) WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());
CREATE POLICY "forum_comments_delete_own"   ON forum_comments FOR DELETE USING (author_id = auth.uid() OR is_moderator_or_admin());

-- ============================================================
-- 4. VÉRIFICATION
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'artisan_profiles'
  AND column_name IN ('doc_kbis_url','doc_insurance_url','doc_id_url','rejection_reason')
ORDER BY column_name;

SELECT id, name, public FROM storage.buckets WHERE id IN ('photos','documents');
