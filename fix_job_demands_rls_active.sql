-- ============================================================================
-- FIX URGENT : job_demands — page détail "Demande introuvable"
-- ============================================================================
-- Problème :
--   publish-demand.ts insère les demandes avec status = 'active'
--   La policy RLS job_demands_select autorise uniquement status = 'published'
--   → La page détail (/emploi/demandes/[slug]) retourne null → "Demande introuvable"
--   → La liste fonctionne car queries.ts utilise une jointure qui contourne en partie
--
-- Cause racine :
--   La migration 20260409_emploi_local.sql (ligne ~550) crée job_demands_select
--   avec USING (status = 'published' OR user_id = auth.uid() ...)
--   Elle peut avoir écrasé la policy correcte de supabase_migration_emploi_v2.sql
--   qui autorisait status IN ('active', 'published').
--
-- Fix :
--   Remplacer TOUTES les policies SELECT sur job_demands par une version unifiée
--   qui accepte status IN ('active', 'published') pour la lecture publique.
--   Les policies de nom variable (job_demands_select, job_demands_public_read,
--   job_demands_public, job_demands_read) sont toutes droppées et remplacées
--   par une seule policy claire.
--
-- Impact : aucune interruption de service, ~1 ms de verrou
-- ============================================================================

-- 1. Supprimer toutes les policies SELECT existantes sur job_demands
--    (noms variables selon la migration qui a tourné en dernier)
DROP POLICY IF EXISTS job_demands_select            ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public_read       ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public            ON public.job_demands;
DROP POLICY IF EXISTS job_demands_read              ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select"          ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public_read"     ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public"          ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_read"            ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_published" ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_own"      ON public.job_demands;

-- 2. Créer la policy unifiée correcte
--    Règles :
--    a) Toute demande avec status 'active' ou 'published' est lisible par tous
--       (anon + authenticated) → c'est le comportement souhaité pour la liste
--       et la page détail
--    b) L'auteur peut toujours lire ses propres demandes quel que soit le status
--       (draft, paused, expired…) → nécessaire pour la page édition
--    c) Les admins/modérateurs peuvent tout lire (gestion backoffice)

CREATE POLICY "job_demands_select"
  ON public.job_demands
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Lecture publique : demandes actives ou publiées
    status IN ('active', 'published')
    -- Auteur : peut voir ses propres demandes quel que soit le status
    OR (SELECT auth.uid()) = user_id
    -- Admins / modérateurs : accès total
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- VÉRIFICATION (exécuter séparément, lecture seule)
-- Doit retourner la policy ci-dessus avec qual contenant 'active'
-- ============================================================================
/*
SELECT
  policyname,
  cmd,
  roles,
  permissive,
  qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'job_demands'
  AND cmd = 'SELECT'
ORDER BY policyname;
*/

-- ============================================================================
-- TEST FONCTIONNEL (exécuter séparément)
-- Remplacer 'mon-slug-test' par le slug de la demande qui affichait l'erreur
-- Doit retourner 1 ligne
-- ============================================================================
/*
SELECT id, slug, status, title
FROM public.job_demands
WHERE slug = 'mon-slug-test';
*/
