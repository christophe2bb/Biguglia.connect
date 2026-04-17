-- ============================================================================
-- MIGRATION 20260417_fix_admin_access
--
-- Problème : depuis la migration 20260416_profiles_rls_final, les admins
-- ne peuvent plus accéder à /administration.
--
-- Cause identifiée :
--   La colonne `role` dans public.profiles est de type enum `user_role`.
--   La fonction is_moderator_or_admin() compare avec des littéraux TEXT :
--     role IN ('admin', 'moderator')
--   PostgreSQL peut lever une erreur de cast implicite selon les versions,
--   ou la fonction peut renvoyer false si le cast TEXT→user_role échoue.
--
--   De plus, la policy SELECT sur profiles :
--     USING (auth.uid() = id OR is_moderator_or_admin())
--   provoque une récursion potentielle même avec SECURITY DEFINER si le
--   planner PostgreSQL décide de réévaluer via RLS.
--
-- Correctifs :
--   1. Recréer is_moderator_or_admin() avec cast explicite role::text
--   2. Simplifier la policy SELECT profiles : auth.uid() = id SEULEMENT
--      (les admins utilisent la vue public_profiles ou le client admin)
--   3. Ajouter une policy SELECT séparée pour admin/moderator
-- ============================================================================

-- ── 1. Corriger is_moderator_or_admin() avec cast explicite ─────────────────
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'moderator')
  );
$$;

-- ── 2. Recréer la policy SELECT profiles (plus simple, sans récursion) ───────
--
-- Stratégie : deux policies séparées plutôt qu'une seule avec OR
--   Policy 1 : chaque user lit son propre profil (auth.uid() = id)
--   Policy 2 : admin/moderator lit tous les profils (is_moderator_or_admin())
--
-- PostgreSQL évalue les policies RLS avec un OR implicite entre elles.
-- Deux policies séparées évitent la récursion de la policy unique.
--
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin"        ON public.profiles;

-- Policy 1 : lecture de son propre profil
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2 : lecture par admin/moderator (via fonction SECURITY DEFINER)
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (is_moderator_or_admin());

-- ── 3. S'assurer que les policies INSERT/UPDATE existent toujours ─────────────
-- (idempotent — DROP IF EXISTS avant CREATE)
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"   ON public.profiles;
CREATE POLICY "Utilisateurs créent leur propre profil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON public.profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin modifie tous les profils" ON public.profiles;
CREATE POLICY "Admin modifie tous les profils"
  ON public.profiles
  FOR UPDATE
  USING (is_moderator_or_admin());

-- ── 4. Recharger PostgREST ────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Vérification post-exécution ───────────────────────────────────────────────
-- Coller dans un 2e onglet SQL :
--
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
--   -- Attendu : profiles_select_own (SELECT) + profiles_select_admin (SELECT)
--   --           + Utilisateurs créent... (INSERT) + 2 × UPDATE
--
--   SELECT public.is_moderator_or_admin();
--   -- Connecté en tant qu'admin → doit retourner true
--   -- Connecté en tant que user  → doit retourner false
