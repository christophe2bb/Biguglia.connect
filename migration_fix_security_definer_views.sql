-- ============================================================
-- MIGRATION CRITIQUE: Fix Security Definer Views
-- Date: 2026-04-08
-- Description: Remove SECURITY DEFINER from views to prevent RLS bypass
-- ============================================================

-- SECURITY DEFINER allows views to execute with creator's permissions,
-- bypassing Row-Level Security (RLS) policies. This is a security risk.
-- We recreate these views as SECURITY INVOKER (default) to enforce RLS.

-- =====================================================
-- 1. moderation_kpi
-- =====================================================
DROP VIEW IF EXISTS public.moderation_kpi CASCADE;

CREATE VIEW public.moderation_kpi 
SECURITY INVOKER  -- Enforce RLS with querying user's permissions
AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_count
FROM public.moderation_queue;

-- =====================================================
-- 2. outing_organizer_summary
-- =====================================================
DROP VIEW IF EXISTS public.outing_organizer_summary CASCADE;

CREATE VIEW public.outing_organizer_summary
SECURITY INVOKER
AS
SELECT 
  p.id as organizer_id,
  p.full_name,
  COUNT(DISTINCT o.id) as total_outings,
  COUNT(DISTINCT op.user_id) as total_participants,
  AVG(
    CASE 
      WHEN o.status = 'completed' THEN 5
      WHEN o.status = 'cancelled' THEN 0
      ELSE 3
    END
  ) as avg_rating
FROM public.profiles p
LEFT JOIN public.promenades o ON o.organizer_id = p.id
LEFT JOIN public.outing_participants op ON op.outing_id = o.id
GROUP BY p.id, p.full_name;

-- =====================================================
-- 3. event_organizer_summary
-- =====================================================
DROP VIEW IF EXISTS public.event_organizer_summary CASCADE;

CREATE VIEW public.event_organizer_summary
SECURITY INVOKER
AS
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

-- =====================================================
-- 4. equipment_owner_summary
-- =====================================================
DROP VIEW IF EXISTS public.equipment_owner_summary CASCADE;

CREATE VIEW public.equipment_owner_summary
SECURITY INVOKER
AS
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

-- =====================================================
-- 5. sector_stats
-- =====================================================
DROP VIEW IF EXISTS public.sector_stats CASCADE;

CREATE VIEW public.sector_stats
SECURITY INVOKER
AS
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
LEFT JOIN public.reviews r ON r.related_type = 'service_request' AND r.related_id = sr.id
GROUP BY tc.id, tc.name, tc.slug;

-- =====================================================
-- Verification: Check views are SECURITY INVOKER
-- =====================================================
DO $$
DECLARE
  view_rec RECORD;
  definer_count INTEGER := 0;
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
    IF view_rec.is_definer THEN
      definer_count := definer_count + 1;
      RAISE WARNING 'View %.% still has SECURITY DEFINER!', view_rec.schemaname, view_rec.viewname;
    ELSE
      RAISE NOTICE 'View %.% is now SECURITY INVOKER ✓', view_rec.schemaname, view_rec.viewname;
    END IF;
  END LOOP;
  
  IF definer_count > 0 THEN
    RAISE EXCEPTION 'Some views still have SECURITY DEFINER! (% views)', definer_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All 5 views are now SECURITY INVOKER';
  END IF;
END $$;
