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
