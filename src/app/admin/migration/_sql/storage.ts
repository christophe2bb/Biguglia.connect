/**
 * admin/migration/_sql/storage.ts
 */
export const BUCKET_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Création bucket Storage "photos"
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Créer le bucket public "photos" (si inexistant)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760,  -- 10 MB max par fichier
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif'];

-- 2. Policies RLS sur le bucket storage.objects
-- On supprime les anciennes policies d'abord pour éviter les conflits
DROP POLICY IF EXISTS "photos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "photos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_delete" ON storage.objects;
-- Anciennes versions (noms alternatifs)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- Lecture publique (tout le monde peut voir les photos)
CREATE POLICY "photos_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Upload autorisé pour les utilisateurs connectés
CREATE POLICY "photos_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Mise à jour (upsert) pour les utilisateurs connectés
CREATE POLICY "photos_auth_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Suppression par le propriétaire du fichier
CREATE POLICY "photos_owner_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos' AND auth.uid() = owner);

-- Vérification finale
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'photos';
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'photos%';`;

