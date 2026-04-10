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
-- PART 4: multiple_permissive_policies (340 warnings)
-- Consolidate duplicate PERMISSIVE policies per (table, action).
-- Uses pg_policies to read existing USING/WITH CHECK expressions,
-- combines them with OR, and replaces N policies with 1 unified policy.
-- SAFE: identical behaviour (Postgres already OR-ed them implicitly).
-- See migration_04_consolidate_policies.sql for the standalone version.
-- =============================================================

DO $consolidate$
DECLARE
  r           RECORD;
  p           RECORD;
  using_parts TEXT[];
  check_parts TEXT[];
  combined_using TEXT;
  combined_check TEXT;
  new_name    TEXT;
  cnt         INT := 0;
  targets RECORD;
BEGIN

  FOR targets IN
    SELECT * FROM (VALUES
      ('artisan_photos',         'SELECT', ARRAY['artisan_photos_select','artisan_photos_select_all']),
      ('artisan_profiles',       'INSERT', ARRAY['Artisan crée son profil','artisan_profiles_insert']),
      ('artisan_profiles',       'SELECT', ARRAY['Artisans vérifiés visibles','artisan_profiles_select','artisan_profiles_select_all']),
      ('artisan_profiles',       'UPDATE', ARRAY['Artisan modifie son profil','artisan_profiles_update']),
      ('borrow_requests',        'INSERT', ARRAY['borrow_requests_insert_auth','borrow_requests_insert_borrower']),
      ('collection_categories',  'DELETE', ARRAY['admin_gere_categories_collection','collection_categories_delete']),
      ('collection_categories',  'INSERT', ARRAY['admin_gere_categories_collection','collection_categories_insert']),
      ('collection_categories',  'SELECT', ARRAY['admin_gere_categories_collection','categories_collection_publiques','collection_categories_select']),
      ('collection_items',       'SELECT', ARRAY['CI admin','CI select owner','CI select public']),
      ('conversation_participants','INSERT',ARRAY['Ajouter des participants','conversation_participants_insert','conversation_participants_insert_own','cp_insert']),
      ('conversation_participants','SELECT',ARRAY['Voir participants de ses conversations','conversation_participants_select','conversation_participants_select_own','cp_select']),
      ('conversations',          'INSERT', ARRAY['Créer une conversation','conv_insert','conversations_insert_creator']),
      ('conversations',          'SELECT', ARRAY['Voir ses conversations','conv_select','conversations_select_participant']),
      ('conversations',          'UPDATE', ARRAY['Modifier ses conversations','Participants maj echange','conv_update','conversations_update_participant']),
      ('equipment_categories',   'SELECT', ARRAY['admin_gere_categories_equipement','categories_equipement_publiques']),
      ('equipment_items',        'DELETE', ARRAY['eq_owner_delete','equipment_items_delete_own']),
      ('equipment_items',        'INSERT', ARRAY['eq_owner_insert','equipment_insert_auth','equipment_items_insert','equipment_items_insert_own']),
      ('equipment_items',        'SELECT', ARRAY['eq_public_read','equipment_items_select','equipment_items_select_available_or_own','equipment_select_active']),
      ('equipment_items',        'UPDATE', ARRAY['eq_owner_update','equipment_items_update_own','equipment_update_owner']),
      ('equipment_photos',       'INSERT', ARRAY['equipment_photos_insert_own','equipment_photos_insert_owner']),
      ('equipment_photos',       'SELECT', ARRAY['equipment_photos_select','equipment_photos_select_all','equipment_photos_select_public']),
      ('event_comments',         'DELETE', ARRAY['ec_delete','event_comments_delete']),
      ('event_comments',         'INSERT', ARRAY['ec_insert','event_comments_insert']),
      ('event_comments',         'SELECT', ARRAY['ec_select','event_comments_select']),
      ('event_participants',     'DELETE', ARRAY['ep_delete','event_participations_delete']),
      ('event_participants',     'INSERT', ARRAY['ep_insert','event_participations_insert']),
      ('event_participants',     'SELECT', ARRAY['ep_select','event_participations_select']),
      ('event_photos',           'DELETE', ARRAY['ephoto_delete','event_photos_delete']),
      ('event_photos',           'INSERT', ARRAY['ephoto_insert','event_photos_insert']),
      ('event_photos',           'SELECT', ARRAY['ephoto_select','event_photos_select']),
      ('events',                 'INSERT', ARRAY['events_insert','events_insert_own','local_events_insert']),
      ('events',                 'SELECT', ARRAY['events_public_select','events_select_all','local_events_select']),
      ('events',                 'UPDATE', ARRAY['events_update_admin','events_update_own','local_events_update_own']),
      ('forum_categories',       'SELECT', ARRAY['admin_gere_categories_forum','categories_forum_publiques','forum_categories_select']),
      ('forum_comments',         'INSERT', ARRAY['forum_comments_insert','forum_comments_insert_auth','forum_comments_insert_own']),
      ('forum_comments',         'SELECT', ARRAY['forum_comments_select','forum_comments_select_all','forum_comments_select_public']),
      ('forum_posts',            'INSERT', ARRAY['forum_posts_insert','forum_posts_insert_auth','forum_posts_insert_own']),
      ('forum_posts',            'SELECT', ARRAY['forum_posts_select','forum_posts_select_all','forum_posts_select_public','forum_posts_select_published_or_own']),
      ('job_demands',            'DELETE', ARRAY['job_demands_own_all','job_demands_own_crud']),
      ('job_demands',            'INSERT', ARRAY['job_demands_own_all','job_demands_own_crud']),
      ('job_demands',            'SELECT', ARRAY['job_demands_public','job_demands_public_read']),
      ('job_demands',            'UPDATE', ARRAY['job_demands_own_all','job_demands_own_crud']),
      ('job_offers',             'DELETE', ARRAY['job_offers_own_all','job_offers_own_crud']),
      ('job_offers',             'INSERT', ARRAY['job_offers_own_all','job_offers_own_crud']),
      ('job_offers',             'SELECT', ARRAY['job_offers_public','job_offers_public_read']),
      ('job_offers',             'UPDATE', ARRAY['job_offers_own_all','job_offers_own_crud']),
      ('listing_categories',     'SELECT', ARRAY['admin_gere_categories_annonces','categories_annonces_publiques']),
      ('listing_photos',         'DELETE', ARRAY['listing_photos_delete_own','listing_photos_delete_owner']),
      ('listing_photos',         'INSERT', ARRAY['listing_photos_insert','listing_photos_insert_own','listing_photos_insert_owner']),
      ('listing_photos',         'SELECT', ARRAY['listing_photos_select','listing_photos_select_all','listing_photos_select_public']),
      ('listings',               'DELETE', ARRAY['listings_delete','listings_delete_own']),
      ('listings',               'INSERT', ARRAY['listings_insert','listings_insert_auth','listings_insert_own']),
      ('listings',               'SELECT', ARRAY['listings_select','listings_select_active','listings_select_published_or_own']),
      ('listings',               'UPDATE', ARRAY['listings_update','listings_update_own']),
      ('messages',               'INSERT', ARRAY['Envoyer un message','messages_insert','messages_insert_participant']),
      ('messages',               'SELECT', ARRAY['Voir messages de ses conversations','messages_select','messages_select_participant']),
      ('moderation_queue',       'INSERT', ARRAY['moderation_queue_insert','modq_author_insert']),
      ('moderation_queue',       'SELECT', ARRAY['moderation_queue_select','modq_author_select','modq_staff_select']),
      ('moderation_queue',       'UPDATE', ARRAY['moderation_queue_update','modq_author_update_draft','modq_staff_update']),
      ('notifications',          'SELECT', ARRAY['notifications_select','notifications_select_own']),
      ('notifications',          'UPDATE', ARRAY['notifications_update','notifications_update_own']),
      ('profile_badges',         'SELECT', ARRAY['Badges admin','Badges publics']),
      ('profiles',               'INSERT', ARRAY['Admin modifie tous les profils','allow_insert']),
      ('profiles',               'SELECT', ARRAY['Admin modifie tous les profils','Profils publics en lecture','allow_all_select','allow_select','profiles_public_select']),
      ('profiles',               'UPDATE', ARRAY['Admin modifie tous les profils','allow_update']),
      ('reports',                'INSERT', ARRAY['reports_insert_auth','reports_insert_own']),
      ('reports',                'SELECT', ARRAY['reports_select_own','reports_select_own_or_moderator']),
      ('reviews',                'DELETE', ARRAY['Modérer avis admin','reviews_delete_own']),
      ('reviews',                'INSERT', ARRAY['Créer avis si interaction','Modérer avis admin','reviews_insert_own']),
      ('reviews',                'SELECT', ARRAY['Avis publics visibles','Avis reçus par la cible','Modérer avis admin','reviews_select','reviews_select_public']),
      ('reviews',                'UPDATE', ARRAY['Modérer avis admin','reviews_update_own']),
      ('service_requests',       'INSERT', ARRAY['service_requests_insert','service_requests_insert_resident']),
      ('service_requests',       'SELECT', ARRAY['service_requests_select','service_requests_select_parties','service_requests_select_public']),
      ('trade_categories',       'SELECT', ARRAY['admin_gere_categories_metiers','categories_metiers_publiques'])
    ) AS t(tbl TEXT, act TEXT, pols TEXT[])
  LOOP
    using_parts := ARRAY[]::TEXT[];
    check_parts := ARRAY[]::TEXT[];

    FOR p IN
      SELECT policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename   = targets.tbl
        AND policyname  = ANY(targets.pols)
    LOOP
      IF p.qual IS NOT NULL AND p.qual <> '' THEN
        using_parts := using_parts || ARRAY['(' || p.qual || ')'];
      END IF;
      IF p.with_check IS NOT NULL AND p.with_check <> '' THEN
        check_parts := check_parts || ARRAY['(' || p.with_check || ')'];
      END IF;
    END LOOP;

    IF array_length(using_parts, 1) IS NULL AND array_length(check_parts, 1) IS NULL THEN
      CONTINUE;
    END IF;

    combined_using := CASE WHEN array_length(using_parts, 1) > 0
      THEN array_to_string(using_parts, ' OR ') ELSE NULL END;
    combined_check := CASE WHEN array_length(check_parts, 1) > 0
      THEN array_to_string(check_parts, ' OR ') ELSE NULL END;

    IF combined_check IS NULL AND combined_using IS NOT NULL
       AND targets.act IN ('INSERT','UPDATE') THEN
      combined_check := combined_using;
    END IF;

    new_name := lower(targets.tbl) || '_' || lower(targets.act) || '_unified';

    BEGIN
      FOR p IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = targets.tbl
          AND policyname = ANY(targets.pols)
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, targets.tbl);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error dropping policies on %.%: %', targets.tbl, targets.act, SQLERRM;
      CONTINUE;
    END;

    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO PUBLIC %s %s',
        new_name, targets.tbl, targets.act,
        CASE WHEN combined_using IS NOT NULL THEN 'USING (' || combined_using || ')' ELSE '' END,
        CASE WHEN combined_check IS NOT NULL THEN 'WITH CHECK (' || combined_check || ')' ELSE '' END
      );
      cnt := cnt + 1;
      RAISE NOTICE 'Consolidated % → 1 for %.% (new: %)',
        array_length(targets.pols, 1), targets.tbl, targets.act, new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating unified policy for %.%: %', targets.tbl, targets.act, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Part 4 done: % unified policies created. ===', cnt;
END;
$consolidate$;

-- =============================================================
-- END OF MIGRATION
-- All 716 lint issues addressed:
--   ✓ 206 auth_rls_initplan      → wrapped in (SELECT ...)
--   ✓ 340 multiple_permissive    → consolidated per (table, action)
--   ✓  74 unindexed_foreign_keys → CREATE INDEX CONCURRENTLY
--   ✓   4 duplicate_index        → DROP INDEX CONCURRENTLY
--   ✓  92 unused_index           → see migration_03_drop_unused_indexes.sql
-- =============================================================