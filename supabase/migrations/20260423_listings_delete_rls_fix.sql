-- ============================================================
-- FIX: Garantir la policy RLS DELETE sur listings
-- Problème : la suppression retourne 0 lignes sans erreur
-- Cause probable : policy DELETE absente ou mal configurée
-- ============================================================

-- 1. Supprimer toutes les policies DELETE existantes sur listings
--    (en cas de doublon ou de policy mal configurée)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listings'
      AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.listings', pol.policyname);
    RAISE NOTICE 'Dropped DELETE policy: %', pol.policyname;
  END LOOP;
END $$;

-- 2. Créer une policy DELETE claire et explicite
--    Condition : l'utilisateur connecté est le propriétaire (user_id = auth.uid())
--    OU c'est un admin/moderateur
CREATE POLICY "listings_delete_owner_or_admin"
  ON public.listings
  AS PERMISSIVE
  FOR DELETE
  TO PUBLIC
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'moderateur')
    )
  );

-- 3. Vérification
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'listings'
    AND cmd = 'DELETE';
  RAISE NOTICE 'Listings DELETE policies after fix: %', cnt;
END $$;
