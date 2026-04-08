-- ============================================================
-- MIGRATION CRITIQUE: Fix Security Definer Views
-- Date: 2026-04-08
-- Description: Remove SECURITY DEFINER from views to prevent RLS bypass
-- ============================================================

-- SECURITY DEFINER allows views to execute with creator's permissions,
-- bypassing Row-Level Security (RLS) policies. This is a security risk.
-- We recreate these views WITHOUT SECURITY DEFINER (default behavior enforces RLS).

-- Note: We only recreate views that currently exist in the database.
-- Optional migration tables (promenades, local_events, etc.) may not exist yet.

-- =====================================================
-- 1. moderation_kpi (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'moderation_kpi') THEN
    DROP VIEW IF EXISTS public.moderation_kpi CASCADE;
    
    CREATE VIEW public.moderation_kpi AS
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_count
    FROM public.moderation_queue;
    
    RAISE NOTICE '✓ moderation_kpi recreated';
  ELSE
    RAISE NOTICE '⊗ moderation_kpi does not exist (skipped)';
  END IF;
END $$;

-- =====================================================
-- 2. equipment_owner_summary (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'equipment_owner_summary') THEN
    DROP VIEW IF EXISTS public.equipment_owner_summary CASCADE;
    
    CREATE VIEW public.equipment_owner_summary AS
    SELECT 
      p.id as owner_id,
      p.full_name,
      COUNT(DISTINCT ei.id) as total_items,
      COUNT(DISTINCT br.id) as total_requests,
      COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'approved') as approved_requests,
      AVG(
        CASE 
          WHEN br.status = 'approved' THEN 5
          WHEN br.status = 'rejected' THEN 0
          ELSE 3
        END
      ) as avg_rating
    FROM public.profiles p
    LEFT JOIN public.equipment_items ei ON ei.owner_id = p.id
    LEFT JOIN public.borrow_requests br ON br.item_id = ei.id
    GROUP BY p.id, p.full_name;
    
    RAISE NOTICE '✓ equipment_owner_summary recreated';
  ELSE
    RAISE NOTICE '⊗ equipment_owner_summary does not exist (skipped)';
  END IF;
END $$;

-- =====================================================
-- 3. sector_stats (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'sector_stats') THEN
    DROP VIEW IF EXISTS public.sector_stats CASCADE;
    
    CREATE VIEW public.sector_stats AS
    SELECT 
      tc.name as sector_name,
      tc.slug as sector_slug,
      COUNT(DISTINCT ap.id) as total_artisans,
      COUNT(DISTINCT sr.id) as total_requests,
      COUNT(DISTINCT sr.id) FILTER (WHERE sr.status = 'completed') as completed_requests,
      AVG(r.rating) as avg_rating
    FROM public.trade_categories tc
    LEFT JOIN public.artisan_profiles ap ON ap.trade_category_id = tc.id
    LEFT JOIN public.service_requests sr ON sr.artisan_id = ap.id
    LEFT JOIN public.reviews r ON r.artisan_id = ap.id
    GROUP BY tc.id, tc.name, tc.slug;
    
    RAISE NOTICE '✓ sector_stats recreated';
  ELSE
    RAISE NOTICE '⊗ sector_stats does not exist (skipped)';
  END IF;
END $$;

-- =====================================================
-- 4. outing_organizer_summary (if exists, with correct column)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'outing_organizer_summary') THEN
    DROP VIEW IF EXISTS public.outing_organizer_summary CASCADE;
    
    -- Check if promenades table exists and has author_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'promenades' 
               AND column_name = 'author_id') THEN
      CREATE VIEW public.outing_organizer_summary AS
      SELECT 
        p.id as organizer_id,
        p.full_name,
        COUNT(DISTINCT o.id) as total_outings,
        COUNT(DISTINCT op.user_id) as total_participants,
        AVG(
          CASE 
            WHEN o.status = 'archived' THEN 3
            ELSE 4
          END
        ) as avg_rating
      FROM public.profiles p
      LEFT JOIN public.promenades o ON o.author_id = p.id  -- author_id not organizer_id
      LEFT JOIN public.outing_participants op ON op.outing_id = o.id
      GROUP BY p.id, p.full_name;
    END IF;
    
    RAISE NOTICE '✓ outing_organizer_summary recreated';
  ELSE
    RAISE NOTICE '⊗ outing_organizer_summary does not exist (skipped)';
  END IF;
END $$;

-- =====================================================
-- 5. event_organizer_summary (if exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'event_organizer_summary') THEN
    DROP VIEW IF EXISTS public.event_organizer_summary CASCADE;
    
    -- Check if local_events table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'local_events') THEN
      CREATE VIEW public.event_organizer_summary AS
      SELECT 
        p.id as organizer_id,
        p.full_name,
        COUNT(DISTINCT e.id) as total_events,
        COUNT(DISTINCT ep.user_id) as total_participants,
        AVG(
          CASE 
            WHEN e.status = 'completed' THEN 5
            WHEN e.status = 'cancelled' THEN 0
            ELSE 3
          END
        ) as avg_rating
      FROM public.profiles p
      LEFT JOIN public.local_events e ON e.organizer_id = p.id
      LEFT JOIN public.event_participations ep ON ep.event_id = e.id
      GROUP BY p.id, p.full_name;
    END IF;
    
    RAISE NOTICE '✓ event_organizer_summary recreated';
  ELSE
    RAISE NOTICE '⊗ event_organizer_summary does not exist (skipped)';
  END IF;
END $$;

-- =====================================================
-- Verification: Check views are NOT SECURITY DEFINER
-- =====================================================
DO $$
DECLARE
  view_rec RECORD;
  definer_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  FOR view_rec IN 
    SELECT 
      schemaname, 
      viewname,
      CASE 
        WHEN definition LIKE '%SECURITY DEFINER%' THEN true
        ELSE false
      END as is_definer
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND viewname IN (
      'moderation_kpi',
      'outing_organizer_summary',
      'event_organizer_summary',
      'equipment_owner_summary',
      'sector_stats'
    )
  LOOP
    total_count := total_count + 1;
    IF view_rec.is_definer THEN
      definer_count := definer_count + 1;
      RAISE WARNING 'View %.% still has SECURITY DEFINER!', view_rec.schemaname, view_rec.viewname;
    ELSE
      RAISE NOTICE 'View %.% is now secure (no SECURITY DEFINER) ✓', view_rec.schemaname, view_rec.viewname;
    END IF;
  END LOOP;
  
  IF definer_count > 0 THEN
    RAISE EXCEPTION 'Some views still have SECURITY DEFINER! (% of %)', definer_count, total_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All % existing views are now secure (no SECURITY DEFINER)', total_count;
  END IF;
END $$;
