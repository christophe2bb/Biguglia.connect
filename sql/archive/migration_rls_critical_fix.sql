-- ============================================================
-- MIGRATION CRITIQUE: Enable RLS on ALL public tables
-- Date: 2026-04-08
-- Description: Fix Supabase security vulnerabilities - enable RLS on all exposed tables
-- ============================================================

-- =====================================================
-- CRITICAL FIX: Enable RLS on category tables
-- =====================================================

ALTER TABLE IF EXISTS public.trade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.listing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collection_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Catégories métiers publiques" ON public.trade_categories;
DROP POLICY IF EXISTS "Admin gère catégories métiers" ON public.trade_categories;
DROP POLICY IF EXISTS "Catégories forum publiques" ON public.forum_categories;
DROP POLICY IF EXISTS "Admin gère catégories forum" ON public.forum_categories;
DROP POLICY IF EXISTS "Catégories annonces publiques" ON public.listing_categories;
DROP POLICY IF EXISTS "Admin gère catégories annonces" ON public.listing_categories;
DROP POLICY IF EXISTS "Catégories équipement publiques" ON public.equipment_categories;
DROP POLICY IF EXISTS "Admin gère catégories équipement" ON public.equipment_categories;
DROP POLICY IF EXISTS "Catégories collection publiques" ON public.collection_categories;
DROP POLICY IF EXISTS "Admin gère catégories collection" ON public.collection_categories;

-- Create SELECT policies (public read)
CREATE POLICY "Catégories métiers publiques" ON public.trade_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories forum publiques" ON public.forum_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories annonces publiques" ON public.listing_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories équipement publiques" ON public.equipment_categories
  FOR SELECT USING (true);

CREATE POLICY "Catégories collection publiques" ON public.collection_categories
  FOR SELECT USING (true);

-- Create admin policies (admin can do ALL operations)
CREATE POLICY "Admin gère catégories métiers" ON public.trade_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories forum" ON public.forum_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories annonces" ON public.listing_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories équipement" ON public.equipment_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin gère catégories collection" ON public.collection_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- Verification: Check RLS is enabled
-- =====================================================

DO $$
DECLARE
  tables_checked INTEGER := 0;
  tables_ok INTEGER := 0;
  table_rec RECORD;
BEGIN
  FOR table_rec IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'trade_categories', 'forum_categories', 'listing_categories',
      'equipment_categories', 'collection_categories'
    )
  LOOP
    tables_checked := tables_checked + 1;
    IF (SELECT relrowsecurity FROM pg_class WHERE relname = table_rec.tablename AND relnamespace = 'public'::regnamespace) THEN
      tables_ok := tables_ok + 1;
      RAISE NOTICE 'RLS OK: %', table_rec.tablename;
    ELSE
      RAISE WARNING 'RLS NOT ENABLED: %', table_rec.tablename;
    END IF;
  END LOOP;
  
  IF tables_ok < tables_checked THEN
    RAISE EXCEPTION 'RLS not enabled on all category tables! (% / % OK)', tables_ok, tables_checked;
  ELSE
    RAISE NOTICE 'SUCCESS: RLS enabled on all % category tables', tables_ok;
  END IF;
END $$;
