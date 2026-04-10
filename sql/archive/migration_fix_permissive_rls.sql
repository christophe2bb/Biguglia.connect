-- ============================================================
-- MIGRATION: Fix Overly Permissive RLS Policies
-- Date: 2026-04-08
-- Description: Replace WITH CHECK (true) policies with proper user checks
-- ============================================================

-- Policies with WITH CHECK (true) bypass RLS security for INSERT operations.
-- We replace them with proper authentication checks.

-- =====================================================
-- 1. collection_views - Allow authenticated users only
-- =====================================================

DROP POLICY IF EXISTS "Vues insert" ON public.collection_views;

CREATE POLICY "collection_views_insert" ON public.collection_views
  FOR INSERT
  WITH CHECK (
    -- Only authenticated users can insert views
    auth.uid() IS NOT NULL
    -- Optional: ensure user_id matches authenticated user
    -- AND (user_id IS NULL OR user_id = auth.uid())
  );

-- =====================================================
-- 2. notifications - User can only insert for themselves
-- =====================================================

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- User can only create notifications for themselves
    -- OR if they are admin/moderator (system notifications)
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- 3. profiles - User creates their own profile on signup
-- =====================================================

DROP POLICY IF EXISTS "allow_insert" ON public.profiles;

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- User can only create a profile for their own auth.uid()
    id = auth.uid()
  );

-- =====================================================
-- Verification: Check policies are properly restricted
-- =====================================================

DO $$
DECLARE
  policy_rec RECORD;
  permissive_count INTEGER := 0;
BEGIN
  FOR policy_rec IN 
    SELECT 
      schemaname,
      tablename,
      policyname,
      qual,
      with_check
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('collection_views', 'notifications', 'profiles')
    AND cmd = 'INSERT'
  LOOP
    -- Check if WITH CHECK is still 'true'
    IF policy_rec.with_check = 'true' THEN
      permissive_count := permissive_count + 1;
      RAISE WARNING 'Policy %.%.% still has WITH CHECK (true)!', 
        policy_rec.schemaname, 
        policy_rec.tablename, 
        policy_rec.policyname;
    ELSE
      RAISE NOTICE 'Policy %.%.% is now properly restricted ✓', 
        policy_rec.schemaname, 
        policy_rec.tablename, 
        policy_rec.policyname;
    END IF;
  END LOOP;
  
  IF permissive_count > 0 THEN
    RAISE EXCEPTION 'Some INSERT policies still have WITH CHECK (true)! (% policies)', permissive_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All 3 INSERT policies are now properly restricted';
  END IF;
END $$;
