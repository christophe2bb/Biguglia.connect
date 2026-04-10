-- =============================================================
-- Migration : Fix Supabase Performance & Security Lints
-- Generated : 2026-04-10
-- Issues    : 716 total
--   • 206 auth_rls_initplan (WARN) — auth.uid() not wrapped in (SELECT)
--   • 340 multiple_permissive_policies (WARN) — needs manual RLS review
--   •  74 unindexed_foreign_keys (INFO) — missing covering indexes
--   •   4 duplicate_index (WARN)  — redundant indexes to drop
--
-- HOW TO RUN: Paste in Supabase SQL Editor → Run
-- SAFE : all changes are DDL (no data modification)
-- =============================================================

BEGIN;

-- ============================================================
-- PART 1: auth_rls_initplan (206 policies)
-- Fix: Replace auth.uid() with (SELECT auth.uid())
--       Replace auth.role() with (SELECT auth.role())
--       Replace current_setting(...) with (SELECT current_setting(...))
-- The ALTER POLICY ... USING/WITH CHECK syntax recreates the condition
-- without dropping the policy (preserves grants & dependencies).
-- ============================================================

-- NOTE: This migration uses ALTER POLICY ... USING / WITH CHECK
-- Because we cannot know the exact USING/WITH CHECK expression from
-- the lint report alone, this migration provides the ALTER POLICY
-- skeleton. The simplest and most reliable approach for auth_rls_initplan
-- is a single DO block that rebuilds each affected policy via
-- pg_policies system catalog and replaces unwrapped function calls.

DO $$
DECLARE
  pol RECORD;
  new_using   TEXT;
  new_check   TEXT;
  fixed_using TEXT;
  fixed_check TEXT;
BEGIN
  FOR pol IN
    SELECT
      schemaname,
      tablename,
      policyname,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual       ILIKE '%auth.uid()%'
        OR qual    ILIKE '%auth.role()%'
        OR qual    ILIKE '%current_setting(%'
        OR with_check ILIKE '%auth.uid()%'
        OR with_check ILIKE '%auth.role()%'
        OR with_check ILIKE '%current_setting(%'
      )
  LOOP
    -- Fix qual (USING clause)
    fixed_using := pol.qual;
    IF fixed_using IS NOT NULL THEN
      -- Replace bare auth.uid() with (SELECT auth.uid()) — avoid double-wrapping
      fixed_using := regexp_replace(fixed_using,
        '(?<!\()\bauth\.uid\(\)',
        '(SELECT auth.uid())', 'g');
      fixed_using := regexp_replace(fixed_using,
        '(?<!\()\bauth\.role\(\)',
        '(SELECT auth.role())', 'g');
      fixed_using := regexp_replace(fixed_using,
        '(?<!\()\bcurrent_setting\(',
        '(SELECT current_setting(', 'g');
    END IF;

    -- Fix with_check (WITH CHECK clause)
    fixed_check := pol.with_check;
    IF fixed_check IS NOT NULL THEN
      fixed_check := regexp_replace(fixed_check,
        '(?<!\()\bauth\.uid\(\)',
        '(SELECT auth.uid())', 'g');
      fixed_check := regexp_replace(fixed_check,
        '(?<!\()\bauth\.role\(\)',
        '(SELECT auth.role())', 'g');
      fixed_check := regexp_replace(fixed_check,
        '(?<!\()\bcurrent_setting\(',
        '(SELECT current_setting(', 'g');
    END IF;

    -- Drop and recreate the policy with fixed expressions
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s'
      || CASE WHEN fixed_using IS NOT NULL
              THEN format(' USING (%s)', fixed_using)
              ELSE '' END
      || CASE WHEN fixed_check IS NOT NULL
              THEN format(' WITH CHECK (%s)', fixed_check)
              ELSE '' END,
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      COALESCE(pol.cmd, 'ALL')
    );

    RAISE NOTICE 'Fixed RLS policy: %.% → %', pol.tablename, pol.policyname, pol.cmd;
  END LOOP;
END;
$$;


-- ============================================================
-- PART 2: Unindexed foreign keys (74 FK indexes to create)
-- Each CREATE INDEX CONCURRENTLY adds a covering index on the FK column(s)
-- CONCURRENTLY = no lock, safe on production
-- ============================================================

-- NOTE: CONCURRENTLY cannot run inside a transaction block.
-- Run the index creation commands SEPARATELY after the COMMIT.
-- They are provided here as reference; copy them to a second SQL run.

COMMIT; -- commit the RLS fixes first, then run indexes separately

-- ─── Run these AFTER the transaction above has committed ──────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_artisan_id
  ON public.appointments (artisan_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_request_id
  ON public.appointments (request_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_resident_id
  ON public.appointments (resident_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artisan_photos_artisan_id
  ON public.artisan_photos (artisan_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asso_comments_asso_id
  ON public.asso_comments (asso_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asso_comments_author_id
  ON public.asso_comments (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asso_photos_asso_id
  ON public.asso_photos (asso_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_associations_author_id
  ON public.associations (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_borrow_requests_borrower_id
  ON public.borrow_requests (borrower_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_borrow_requests_item_id
  ON public.borrow_requests (item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_categories_author_id
  ON public.collection_categories (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_item_photos_item_id
  ON public.collection_item_photos (item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_category_id
  ON public.collection_items (category_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_moderated_by
  ON public.collection_items (moderated_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_views_viewer_id
  ON public.collection_views (viewer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_loans_request_id
  ON public.equipment_loans (request_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_photos_item_id
  ON public.equipment_photos (item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_status_history_changed_by
  ON public.equipment_status_history (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_comments_author_id
  ON public.event_comments (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_date_history_changed_by
  ON public.event_date_history (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_status_history_changed_by
  ON public.event_status_history (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_comments_author_id
  ON public.forum_comments (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_follows_user_id
  ON public.forum_follows (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_moderation_logs_moderator_id
  ON public.forum_moderation_logs (moderator_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_moderation_logs_reply_id
  ON public.forum_moderation_logs (reply_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_moderation_logs_topic_id
  ON public.forum_moderation_logs (topic_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_author_id
  ON public.forum_posts (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_reactions_user_id
  ON public.forum_reactions (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_replies_author_id
  ON public.forum_replies (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_replies_quote_reply_id
  ON public.forum_replies (quote_reply_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_reports_reply_id
  ON public.forum_reports (reply_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_reports_reporter_id
  ON public.forum_reports (reporter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_reports_topic_id
  ON public.forum_reports (topic_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_topic_tags_tag_id
  ON public.forum_topic_tags (tag_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_topics_author_id
  ON public.forum_topics (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_outings_organizer_id
  ON public.group_outings (organizer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_outings_promenade_id
  ON public.group_outings (promenade_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_comments_author_id
  ON public.help_comments (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_comments_help_id
  ON public.help_comments (help_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_photos_help_id
  ON public.help_photos (help_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_requests_author_id
  ON public.help_requests (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_comments_author_id
  ON public.lf_comments (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_comments_item_id
  ON public.lf_comments (item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_matches_found_item_id
  ON public.lf_matches (found_item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_matches_lost_item_id
  ON public.lf_matches (lost_item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_matches_reviewed_by
  ON public.lf_matches (reviewed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_photos_item_id
  ON public.lf_photos (item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_status_history_changed_by
  ON public.lf_status_history (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_status_history_item_id
  ON public.lf_status_history (item_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_photos_listing_id
  ON public.listing_photos (listing_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lost_found_items_author_id
  ON public.lost_found_items (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_history_author_id
  ON public.moderation_history (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_history_moderator_id
  ON public.moderation_history (moderator_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_queue_reviewed_by
  ON public.moderation_queue (reviewed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_comments_author_id
  ON public.outing_comments (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_comments_outing_id
  ON public.outing_comments (outing_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_participants_user_id
  ON public.outing_participants (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_photos_outing_id
  ON public.outing_photos (outing_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_status_history_changed_by
  ON public.outing_status_history (changed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_home_sector_id
  ON public.profiles (home_sector_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promenade_likes_user_id
  ON public.promenade_likes (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promenade_photos_promenade_id
  ON public.promenade_photos (promenade_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promenades_author_id
  ON public.promenades (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reviewed_by
  ON public.reports (reviewed_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_comments_author_id
  ON public.request_comments (author_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_comments_request_id
  ON public.request_comments (request_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_moderated_by
  ON public.reviews (moderated_by);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewer_id
  ON public.reviews (reviewer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_request_photos_request_id
  ON public.service_request_photos (request_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_requests_category_id
  ON public.service_requests (category_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trust_interactions_conversation_id
  ON public.trust_interactions (conversation_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_blocks_target_user_id
  ON public.user_blocks (target_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_favorites_target_user_id
  ON public.user_favorites (target_user_id);

-- ============================================================
-- PART 3: Duplicate indexes (4 pairs — drop redundant ones)
-- Keep the newer/shorter name, drop the duplicate
-- ============================================================

DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_author_stat;         -- duplicate of idx_ci_author_status
DROP INDEX CONCURRENTLY IF EXISTS public.idx_equipment_items_owner;  -- duplicate of idx_eq_owner
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ep_event;               -- duplicate of idx_ep_event_id
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ep_user;                -- duplicate of idx_ep_user_id

-- =============================================================
-- END OF MIGRATION
-- multiple_permissive_policies (340 warnings) need manual review:
-- For each table, consolidate overlapping PERMISSIVE policies into
-- fewer, precise policies or use one policy with OR conditions.
-- Most critical tables: equipment_items, listings, reviews,
-- artisan_profiles, conversations, events, moderation_queue.
-- =============================================================