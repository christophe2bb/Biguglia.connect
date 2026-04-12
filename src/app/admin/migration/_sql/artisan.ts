/**
 * admin/migration/_sql/artisan.ts
 */
export const ARTISAN_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Artisans : colonnes documents & vérification
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

-- 0. Fonction helper rôle utilisateur (recrée si manquante)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 1. Colonnes manquantes sur artisan_profiles
ALTER TABLE artisan_profiles
  ADD COLUMN IF NOT EXISTS artisan_type TEXT DEFAULT 'professionnel'
    CHECK (artisan_type IN ('professionnel', 'particulier')),
  ADD COLUMN IF NOT EXISTS doc_kbis_url TEXT,
  ADD COLUMN IF NOT EXISTS doc_insurance_url TEXT,
  ADD COLUMN IF NOT EXISTS doc_id_url TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. Recréer les policies RLS sur artisan_profiles
--    (DROP IF EXISTS pour éviter les conflits)
DROP POLICY IF EXISTS "Artisans vérifiés visibles" ON artisan_profiles;
CREATE POLICY "Artisans vérifiés visibles" ON artisan_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'artisan_verified')
    OR user_id = auth.uid()
    OR current_user_role() IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Artisan crée son profil" ON artisan_profiles;
CREATE POLICY "Artisan crée son profil" ON artisan_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Artisan modifie son profil" ON artisan_profiles;
CREATE POLICY "Artisan modifie son profil" ON artisan_profiles
  FOR UPDATE USING (auth.uid() = user_id OR current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin supprime profil artisan" ON artisan_profiles;
CREATE POLICY "Admin supprime profil artisan" ON artisan_profiles
  FOR DELETE USING (current_user_role() = 'admin');

-- 3. Policy UPDATE sur profiles pour que l'admin puisse changer le rôle
DROP POLICY IF EXISTS "Admin modifie tous les profils" ON profiles;
CREATE POLICY "Admin modifie tous les profils" ON profiles
  FOR ALL USING (current_user_role() = 'admin');

-- 4. Bucket sécurisé pour les documents justificatifs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Policies RLS sur le bucket documents
DROP POLICY IF EXISTS "Artisan lit ses documents" ON storage.objects;
CREATE POLICY "Artisan lit ses documents" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR current_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "Artisan uploade ses documents" ON storage.objects;
CREATE POLICY "Artisan uploade ses documents" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Artisan supprime ses documents" ON storage.objects;
CREATE POLICY "Artisan supprime ses documents" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR current_user_role() = 'admin'
    )
  );
`;

