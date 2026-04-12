/**
 * admin/migration/_sql/profiles.ts
 */
export const PROFIL_PUBLIC_SQL = `-- ============================================================
-- FIX RLS : Lisibilité publique des profils (/profil/[id])
-- Permet aux visiteurs non connectés de voir les profils publics
-- ============================================================

-- Supprimer les anciennes politiques de lecture
DROP POLICY IF EXISTS "Profils publics en lecture" ON profiles;
DROP POLICY IF EXISTS "Public profiles readable" ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles" ON profiles;

-- Recréer une politique permissive (connecté OU non connecté)
CREATE POLICY "Profils publics en lecture" ON profiles
  FOR SELECT USING (true);

-- S'assurer que RLS est bien activé sur la table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ✅ Résultat : /profil/[id] fonctionne pour tout visiteur
`;

