-- ============================================================================
-- MIGRATION 20260416_profiles_rls_hardening
-- Biguglia Connect — Durcissement RLS table profiles
-- ============================================================================
-- PROBLÈME : les migrations 20260414_profiles_rls_fix.sql et
--   20260414_admin_full_fix.sql créaient "Profils lisibles par tous"
--   USING(true) → email, phone, role, status lisibles par tout anonyme.
--
-- SOLUTION :
--   1. Policy SELECT stricte : propre profil OU admin/modérateur
--   2. Vue public_profiles (id, full_name, avatar_url, role, created_at)
--      accessible aux utilisateurs connectés uniquement — pas aux anon
--   3. Les mutations INSERT/UPDATE/DELETE restent inchangées
--
-- IMPACT APPLICATIF :
--   • AuthProvider : lit son propre profil après auth.getUser() → OK
--   • Forum/topics : lire l'auteur → migré vers public_profiles
--   • trust/_queries.ts : phone lu uniquement sur profil propre → OK
--   • dashboard/avis + interactions : full_name + avatar connecté → OK
--   • Pages admin : utilisent adminClient (service role, bypass RLS) → OK
--
-- IDEMPOTENT : peut être relancé plusieurs fois sans erreur
-- ============================================================================


-- ============================================================================
-- PARTIE 1 — Fonction utilitaire is_moderator_or_admin()
-- (idem migration précédente, on la recrée proprement)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
  );
$$;


-- ============================================================================
-- PARTIE 2 — RLS table profiles
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ── Supprimer toutes les policies SELECT héritées (y compris les permissives)
DROP POLICY IF EXISTS "Profils lisibles par tous"            ON profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"           ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"             ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"       ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"      ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"        ON profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"          ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"           ON profiles;
DROP POLICY IF EXISTS "Profiles select policy"               ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"         ON profiles;

-- ── Nouvelle policy SELECT — accès restreint
--    • Propre profil → toutes les colonnes (email, phone, etc.)
--    • Admin/modérateur → tous les profils (nécessaire pour l'UI admin)
--    • Tout autre utilisateur connecté → bloqué sur la table brute profiles
--      il passe par la vue public_profiles pour les données non sensibles
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR is_moderator_or_admin()
  );

-- ── INSERT : chaque utilisateur crée son propre profil
DROP POLICY IF EXISTS "Users can insert own profile"            ON profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"  ON profiles;
CREATE POLICY "Utilisateurs créent leur propre profil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── UPDATE : chaque utilisateur modifie son propre profil
DROP POLICY IF EXISTS "Users can update own profile"                ON profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil"   ON profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── UPDATE admin : admins/modérateurs modifient n'importe quel profil
DROP POLICY IF EXISTS "Admin modifie tous les profils" ON profiles;
CREATE POLICY "Admin modifie tous les profils"
  ON profiles FOR UPDATE
  USING (is_moderator_or_admin());


-- ============================================================================
-- PARTIE 3 — Vue public_profiles
-- Expose uniquement les champs affichables publiquement (pas email, phone,
-- legal_consent, status interne).
-- Accessible aux utilisateurs authentifiés uniquement (pas aux anon).
-- ============================================================================

DROP VIEW IF EXISTS public_profiles;

CREATE OR REPLACE VIEW public_profiles
  WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM profiles;

-- Accorder uniquement aux utilisateurs connectés
GRANT SELECT ON public_profiles TO authenticated;

-- S'assurer que les anon n'ont pas accès (révocation explicite)
REVOKE ALL ON public_profiles FROM anon;


-- ============================================================================
-- PARTIE 4 — Vérification post-exécution
-- ============================================================================
-- Coller et exécuter dans SQL Editor pour valider :
--
--   -- Test 1 : anon ne peut plus lire les profils
--   SET ROLE anon;
--   SELECT id, email, phone FROM profiles LIMIT 3;
--   -- Attendu : 0 lignes (policy interdit SELECT pour anon)
--
--   -- Test 2 : anon ne peut pas non plus lire public_profiles
--   SELECT id, full_name FROM public_profiles LIMIT 3;
--   -- Attendu : permission denied ou 0 lignes
--
--   -- Test 3 : vérifier la policy active
--   RESET ROLE;
--   SELECT policyname, cmd, qual
--   FROM pg_policies
--   WHERE tablename = 'profiles'
--   ORDER BY cmd, policyname;
--   -- Attendu : "profiles_select_own_or_admin" pour SELECT
--
--   -- Test 4 : vue visible pour un utilisateur connecté (pas anon)
--   -- (depuis l'app, après connexion)
--   SELECT id, full_name, avatar_url FROM public_profiles LIMIT 5;
--   -- Attendu : lignes sans email ni phone

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- FIN — Résultat attendu :
--   • email/phone/legal_consent NON accessibles aux anon
--   • email/phone/legal_consent NON accessibles aux autres utilisateurs connectés
--   • Propre profil → accès complet (AuthProvider fonctionne)
--   • Admins → accès complet (UI admin fonctionne)
--   • Forum, artisans → passent par public_profiles (id, full_name, avatar_url, role)
-- ============================================================================
