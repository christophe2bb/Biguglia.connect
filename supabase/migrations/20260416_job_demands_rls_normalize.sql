-- ============================================================================
-- MIGRATION 20260416_job_demands_rls_normalize
-- ★ SOURCE DE VÉRITÉ UNIQUE pour la policy SELECT de job_demands ★
--
-- Problème résolu : deux fichiers définissaient "job_demands_select" avec
-- des USING() différents, créant une ambiguïté sur le comportement réel :
--
--   20260408_fixes_rls_categories.sql  → USING (status = 'published')
--   20260409_emploi_local.sql          → USING (status IN ('active','published'))
--
-- Ces deux fichiers ont été NEUTRALISÉS (CREATE POLICY supprimé).
--
-- COMPORTEMENT CANONIQUE RETENU :
--   • status IN ('active', 'published') → lecture publique (anon + authenticated)
--     Raison : publish-demand.ts insère avec status='active', pas 'published'.
--              Exclure 'active' cachait toutes les nouvelles annonces publiées.
--   • auth.uid() = user_id             → auteur voit ses propres annonces
--     (draft, paused, expired, rejected…)
--   • is_moderator_or_admin()          → admins/modérateurs voient tout
--
-- IDEMPOTENT : DROP IF EXISTS avant chaque CREATE
-- ============================================================================


-- ── 1. Supprimer toutes les variantes historiques de la policy SELECT
DROP POLICY IF EXISTS job_demands_select             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select"           ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public_read        ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public_read"      ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public"           ON public.job_demands;
DROP POLICY IF EXISTS job_demands_read               ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_read"             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_published" ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_own"       ON public.job_demands;

-- ── 2. Policy SELECT canonique
CREATE POLICY "job_demands_select"
  ON public.job_demands
  FOR SELECT
  USING (
    -- Lecture publique : 'active' (état après publish-demand.ts) OU 'published'
    status IN ('active', 'published')
    -- Auteur : accès à ses propres annonces quel que soit le statut
    OR auth.uid() = user_id
    -- Admins / modérateurs : accès complet
    OR is_moderator_or_admin()
  );


-- ── 3. Recharger PostgREST
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'job_demands' AND cmd = 'SELECT';
-- Attendu : une seule ligne "job_demands_select"
--           qual contient : status IN ('active','published') OR auth.uid() = user_id OR ...
-- ============================================================================
