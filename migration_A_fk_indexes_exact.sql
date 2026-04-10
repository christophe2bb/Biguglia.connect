-- =============================================================================
-- MIGRATION A : Index manquants sur clés étrangères (données RÉELLES Supabase)
-- =============================================================================
-- Source : Supabase Snippet "Find Missing Indexes on Foreign Keys"
-- Requête : SELECT table_name, column_name, foreign_table, constraint_name
--           FROM information_schema... WHERE NOT EXISTS index...
-- Total   : 64 FK sans index
-- SAFE    : CREATE INDEX CONCURRENTLY IF NOT EXISTS — zéro verrou écriture
-- APPLIQUER : SQL Editor Supabase → coller tout → RUN
--             (Supabase gère CONCURRENTLY automatiquement)
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_artisan_id
  ON public.appointments (artisan_id);  -- FK → artisan_profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_resident_id
  ON public.appointments (resident_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_request_id
  ON public.appointments (request_id);  -- FK → service_requests

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artisan_photos_artisan_id
  ON public.artisan_photos (artisan_id);  -- FK → artisan_profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asso_comments_author_id
  ON public.asso_comments (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asso_comments_asso_id
  ON public.asso_comments (asso_id);  -- FK → associations

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asso_photos_asso_id
  ON public.asso_photos (asso_id);  -- FK → associations

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_associations_author_id
  ON public.associations (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_borrow_requests_item_id
  ON public.borrow_requests (item_id);  -- FK → equipment_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_borrow_requests_borrower_id
  ON public.borrow_requests (borrower_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_categories_author_id
  ON public.collection_categories (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_item_photos_item_id
  ON public.collection_item_photos (item_id);  -- FK → collection_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_category_id
  ON public.collection_items (category_id);  -- FK → collection_categories

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_moderated_by
  ON public.collection_items (moderated_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_views_viewer_id
  ON public.collection_views (viewer_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_loans_request_id
  ON public.equipment_loans (request_id);  -- FK → equipment_requests

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_photos_item_id
  ON public.equipment_photos (item_id);  -- FK → equipment_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_status_history_changed_by
  ON public.equipment_status_history (changed_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_comments_author_id
  ON public.event_comments (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_comments_author_id
  ON public.forum_comments (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_moderation_logs_reply_id
  ON public.forum_moderation_logs (reply_id);  -- FK → forum_replies

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_moderation_logs_moderator_id
  ON public.forum_moderation_logs (moderator_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_moderation_logs_topic_id
  ON public.forum_moderation_logs (topic_id);  -- FK → forum_topics

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_author_id
  ON public.forum_posts (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_replies_quote_reply_id
  ON public.forum_replies (quote_reply_id);  -- FK → forum_replies

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_replies_author_id
  ON public.forum_replies (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_reports_reporter_id
  ON public.forum_reports (reporter_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_reports_topic_id
  ON public.forum_reports (topic_id);  -- FK → forum_topics

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_reports_reply_id
  ON public.forum_reports (reply_id);  -- FK → forum_replies

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_topics_author_id
  ON public.forum_topics (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_outings_promenade_id
  ON public.group_outings (promenade_id);  -- FK → promenades

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_outings_organizer_id
  ON public.group_outings (organizer_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_comments_author_id
  ON public.help_comments (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_comments_help_id
  ON public.help_comments (help_id);  -- FK → help_requests

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_photos_help_id
  ON public.help_photos (help_id);  -- FK → help_requests

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_requests_author_id
  ON public.help_requests (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_comments_author_id
  ON public.lf_comments (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_comments_item_id
  ON public.lf_comments (item_id);  -- FK → lost_found_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_matches_found_item_id
  ON public.lf_matches (found_item_id);  -- FK → lost_found_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_matches_reviewed_by
  ON public.lf_matches (reviewed_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_matches_lost_item_id
  ON public.lf_matches (lost_item_id);  -- FK → lost_found_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_photos_item_id
  ON public.lf_photos (item_id);  -- FK → lost_found_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_status_history_changed_by
  ON public.lf_status_history (changed_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_status_history_item_id
  ON public.lf_status_history (item_id);  -- FK → lost_found_items

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_photos_listing_id
  ON public.listing_photos (listing_id);  -- FK → listings

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lost_found_items_author_id
  ON public.lost_found_items (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_history_author_id
  ON public.moderation_history (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_history_moderator_id
  ON public.moderation_history (moderator_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_queue_reviewed_by
  ON public.moderation_queue (reviewed_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_comments_outing_id
  ON public.outing_comments (outing_id);  -- FK → group_outings

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_comments_author_id
  ON public.outing_comments (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_photos_outing_id
  ON public.outing_photos (outing_id);  -- FK → group_outings

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_status_history_changed_by
  ON public.outing_status_history (changed_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_home_sector_id
  ON public.profiles (home_sector_id);  -- FK → sectors

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promenade_photos_promenade_id
  ON public.promenade_photos (promenade_id);  -- FK → promenades

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promenades_author_id
  ON public.promenades (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reviewed_by
  ON public.reports (reviewed_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_comments_author_id
  ON public.request_comments (author_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_request_comments_request_id
  ON public.request_comments (request_id);  -- FK → service_requests

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_moderated_by
  ON public.reviews (moderated_by);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_request_photos_request_id
  ON public.service_request_photos (request_id);  -- FK → service_requests

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_requests_category_id
  ON public.service_requests (category_id);  -- FK → trade_categories

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trust_interactions_conversation_id
  ON public.trust_interactions (conversation_id);  -- FK → conversations

