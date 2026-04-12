-- =============================================================
-- MIGRATION 20260408 — Correctifs RLS : forum, job_demands,
--   activation RLS tables categories
-- Biguglia Connect — a executer dans Supabase SQL Editor
-- Regroupe : fix-forum-rls, fix_job_demands_rls_active,
--            migration_enable_rls_categories
-- =============================================================

-- =============================================================
-- PARTIE 1 : Fix RLS forum posts et comments
-- =============================================================
-- ============================================================
-- FIX RLS Forum Posts & Comments
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques forum_posts (si elles existent)
DROP POLICY IF EXISTS "forum_posts_select_all" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_insert_auth" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_update_own" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_delete_own" ON forum_posts;

-- 3. Recréer les politiques forum_posts proprement
-- Lecture : tout le monde peut lire
CREATE POLICY "forum_posts_select_all"
  ON forum_posts FOR SELECT
  USING (TRUE);

-- Création : utilisateur authentifié seulement, auteur = lui-même
CREATE POLICY "forum_posts_insert_auth"
  ON forum_posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Modification : auteur ou admin/modérateur
CREATE POLICY "forum_posts_update_own"
  ON forum_posts FOR UPDATE
  USING (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

-- Suppression : auteur ou admin/modérateur
CREATE POLICY "forum_posts_delete_own"
  ON forum_posts FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());

-- 4. Supprimer les anciennes politiques forum_comments
DROP POLICY IF EXISTS "forum_comments_select_all" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_insert_auth" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_update_own" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_delete_own" ON forum_comments;

-- 5. Recréer les politiques forum_comments
CREATE POLICY "forum_comments_select_all"
  ON forum_comments FOR SELECT
  USING (TRUE);

CREATE POLICY "forum_comments_insert_auth"
  ON forum_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "forum_comments_update_own"
  ON forum_comments FOR UPDATE
  USING (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

CREATE POLICY "forum_comments_delete_own"
  ON forum_comments FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());

-- 6. Vérifier que la fonction is_moderator_or_admin existe
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Vérification — affiche les politiques actives
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('forum_posts', 'forum_comments')
ORDER BY tablename, cmd;

-- =============================================================
-- PARTIE 2 : Fix RLS job_demands (page detail)
-- =============================================================
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

-- =============================================================
-- PARTIE 3 : Activation RLS tables categories
-- =============================================================
-- ============================================================
-- MIGRATION: Enable RLS on category tables
-- Date: 2026-04-08
-- Description: Fix critical security vulnerability - enable RLS on forum_categories and trade_categories
-- ============================================================

-- Enable RLS on tables (if not already enabled)
ALTER TABLE public.trade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Catégories métiers publiques" ON public.trade_categories;
DROP POLICY IF EXISTS "Admin gère catégories métiers" ON public.trade_categories;
DROP POLICY IF EXISTS "Catégories forum publiques" ON public.forum_categories;
DROP POLICY IF EXISTS "Admin gère catégories forum" ON public.forum_categories;

-- Create policies for trade_categories
CREATE POLICY "Catégories métiers publiques" ON public.trade_categories
  FOR SELECT
  USING (true);  -- Lecture publique

CREATE POLICY "Admin gère catégories métiers" ON public.trade_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );  -- Seuls les admins peuvent modifier/supprimer

-- Create policies for forum_categories
CREATE POLICY "Catégories forum publiques" ON public.forum_categories
  FOR SELECT
  USING (true);  -- Lecture publique

CREATE POLICY "Admin gère catégories forum" ON public.forum_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );  -- Seuls les admins peuvent modifier/supprimer

-- Verify RLS is enabled (this will error if RLS is not enabled, which is what we want)
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'trade_categories' AND relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'RLS not enabled on trade_categories after migration!';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'forum_categories' AND relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'RLS not enabled on forum_categories after migration!';
  END IF;
  RAISE NOTICE 'RLS successfully enabled on trade_categories and forum_categories';
END $$;
