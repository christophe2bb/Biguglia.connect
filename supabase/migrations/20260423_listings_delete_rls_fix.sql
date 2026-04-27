-- ============================================================
-- FIX: Garantir la policy RLS DELETE sur listings
-- Problème : la suppression retourne 0 lignes sans erreur
-- Cause probable : policy DELETE absente ou mal configurée
--
-- ⚠️  COMPORTEMENT DESTRUCTIF VOLONTAIRE
-- ⚠️  Cette migration REMPLACE la totalité des policies DELETE
-- ⚠️  existantes sur public.listings par une policy unique et
-- ⚠️  canonique ("listings_delete_owner_or_admin").
--
-- Rationale : les anciens noms connus (établis dans la migration
-- baseline 20260407) étaient 'listings_delete' et
-- 'listings_delete_own'. L'une ou l'autre pouvait être absente,
-- présente en doublon, ou inactive, ce qui produisait les
-- suppressions silencieuses observées en production.
--
-- Après cette migration, une seule policy DELETE existe :
--   "listings_delete_owner_or_admin"
--   USING (auth.uid() = user_id OR is_moderator_or_admin())
--
-- Si une policy DELETE supplémentaire avait été ajoutée
-- manuellement entre la baseline et ce correctif, elle sera
-- supprimée et son comportement devra être reproduit dans
-- une nouvelle migration post-20260423.
-- ============================================================

-- 1. Remplacement de TOUTES les policies DELETE sur listings
--    par une policy unique et canonique.
--    Policies supprimées (noms historiques + tout doublon) :
--      - 'listings_delete'          (baseline 20260407)
--      - 'listings_delete_own'      (baseline 20260407)
--      - toute autre policy DELETE présente à l'exécution
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
--    OU c'est un admin/moderator (via is_moderator_or_admin())
CREATE POLICY "listings_delete_owner_or_admin"
  ON public.listings
  AS PERMISSIVE
  FOR DELETE
  TO PUBLIC
  USING (
    auth.uid() = user_id
    OR is_moderator_or_admin()
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
