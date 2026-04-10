-- ============================================================================
-- FIX URGENT : job_demands — page détail "Demande introuvable"
-- ============================================================================
-- Cause racine identifiée :
--   L'ENUM job_status = ('draft','published','paused','expired','filled','archived')
--   'active' N'EXISTE PAS dans l'ENUM → INSERT échoue côté Supabase
--   publish-demand.ts utilisait status:'active' → aucune ligne insérée en base
--   Le slug retourné était un uuid local fictif, jamais persisté
--
-- Double fix :
--   1. MIGRATION DES DONNÉES : passer les éventuelles lignes 'active' → 'published'
--      (ne fait rien si aucune ligne n'a ce statut invalide)
--   2. POLICY RLS : harmoniser pour accepter uniquement 'published' (seule valeur
--      valide pour les demandes publiées dans l'ENUM)
--
-- Code corrigé séparément : publish-demand.ts status:'active' → 'published'
-- ============================================================================

-- 1. Migration des données existantes avec status invalide
--    (au cas où des lignes ont quand même été insérées avec un ENUM étendu)
UPDATE public.job_demands
SET status = 'published', updated_at = now()
WHERE status::text = 'active';

-- 2. Supprimer toutes les policies SELECT existantes sur job_demands
DROP POLICY IF EXISTS job_demands_select             ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public_read        ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public             ON public.job_demands;
DROP POLICY IF EXISTS job_demands_read               ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select"           ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public_read"      ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public"           ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_read"             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_published" ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_own"       ON public.job_demands;

-- 3. Policy RLS unifiée et correcte
CREATE POLICY "job_demands_select"
  ON public.job_demands
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Lecture publique : demandes publiées (seul statut valide de l'ENUM pour public)
    status = 'published'
    -- Auteur : accès à ses propres demandes quel que soit le status
    OR (SELECT auth.uid()) = user_id
    -- Admins / modérateurs
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
