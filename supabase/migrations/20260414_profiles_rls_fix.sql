-- ============================================================
-- FIX CRITIQUE : RLS sur la table profiles
-- ============================================================
-- Problème : AuthProvider et ProtectedPage font un SELECT sur
-- la table profiles avec la clé anon. Si RLS est activé sans
-- policy SELECT, tous les SELECT retournent NULL → profil non
-- chargé → l'utilisateur ne peut jamais accéder à /admin
-- (ProtectedPage boucle en skeleton).
--
-- Solution : créer une policy qui autorise :
--   - Tout le monde à lire les profils publics
--   - Chaque utilisateur à lire son propre profil complet
-- ============================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer toutes les anciennes policies SELECT en conflit
DROP POLICY IF EXISTS "Profils publics en lecture" ON profiles;
DROP POLICY IF EXISTS "Public profiles readable" ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON profiles;

-- 3. Créer une policy permissive : tout le monde peut lire tous les profils
-- (nécessaire pour que les pages de profil public fonctionnent ET pour que
-- chaque utilisateur puisse lire son propre profil avec la clé anon)
CREATE POLICY "Profils lisibles par tous" ON profiles
  FOR SELECT USING (true);

-- 4. Policy INSERT : chaque utilisateur peut créer son propre profil
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil" ON profiles;
CREATE POLICY "Utilisateurs créent leur propre profil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Policy UPDATE : chaque utilisateur peut modifier son propre profil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 6. Policy UPDATE admin : l'admin peut modifier n'importe quel profil
-- (nécessaire pour changer les rôles via l'interface admin)
DROP POLICY IF EXISTS "Admin modifie tous les profils" ON profiles;
CREATE POLICY "Admin modifie tous les profils" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderator')
    )
  );

-- 7. S'assurer que la colonne role existe avec les bonnes valeurs par défaut
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 8. Rafraîchir le cache PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- INSTRUCTION MANUELLE : Donner le rôle admin à l'admin
-- ============================================================
-- Après avoir exécuté ce script, vérifiez votre rôle :
--
--   SELECT id, email, role FROM profiles
--   WHERE email = 'chris20600@outlook.fr';
--
-- Si role != 'admin', exécutez :
--
--   UPDATE profiles SET role = 'admin'
--   WHERE email = 'chris20600@outlook.fr';
--
-- ============================================================
