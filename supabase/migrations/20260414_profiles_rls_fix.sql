-- ============================================================
-- MIGRATION 20260414_profiles_rls_fix
-- ⚠️  NEUTRALISÉ — REMPLACÉ PAR 20260416_profiles_rls_final.sql
-- ============================================================
-- Ce fichier contenait les policies INSERT/UPDATE sur profiles,
-- dupliquées depuis 20260414_admin_full_fix.sql.
--
-- SOURCE DE VÉRITÉ UNIQUE : supabase/migrations/20260416_profiles_rls_final.sql
--   → CREATE FUNCTION is_moderator_or_admin()
--   → SELECT policy : auth.uid() = id OR is_moderator_or_admin()
--   → INSERT policy : WITH CHECK (auth.uid() = id)
--   → UPDATE policies : propre profil + admin/modérateur
--   → Vue public_profiles
--
-- Ce bloc supprime uniquement les résidus pour éviter les conflits
-- si ce fichier est rejoué avant _final.sql.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profils lisibles par tous"                  ON profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"                 ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"                   ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"             ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"            ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"                 ON profiles;
DROP POLICY IF EXISTS "Profiles select policy"                     ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"              ON profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"                ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"               ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"     ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil"  ON profiles;
DROP POLICY IF EXISTS "Admin modifie tous les profils"             ON profiles;

-- Colonne role (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

NOTIFY pgrst, 'reload schema';
