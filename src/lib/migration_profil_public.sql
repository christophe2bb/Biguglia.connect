-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : Assurer la lisibilité publique des profils
-- Permet aux visiteurs non connectés de voir les profils (colonnes non sensibles)
-- ─────────────────────────────────────────────────────────────────────────────

-- Supprimer les anciennes politiques de lecture si elles existent
DROP POLICY IF EXISTS "Profils publics en lecture" ON profiles;
DROP POLICY IF EXISTS "Public profiles readable" ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;

-- Recréer la politique permissive pour la lecture publique
-- USING (true) = tout le monde peut lire (connecté ou non)
CREATE POLICY "Profils publics en lecture" ON profiles
  FOR SELECT USING (true);

-- S'assurer que RLS est bien activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Vérification
DO $$
BEGIN
  RAISE NOTICE 'Migration profil_public appliquée : lecture publique des profils autorisée.';
END $$;
