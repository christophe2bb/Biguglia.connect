-- =============================================================================
-- MIGRATION 3/3 : Suppression des index inutilisés et dupliqués (92 + 4)
-- =============================================================================
-- OBJECTIF : Alléger la BDD en supprimant des index jamais utilisés par
--   le query planner depuis le dernier RESET des stats (pg_stat_reset).
--
-- ⚠️  ATTENTION AVANT D'APPLIQUER :
--   1. Ces index n'ont pas été utilisés depuis le dernier reset des stats.
--      Si votre BDD est récente, attendez 1-2 semaines de trafic réel.
--   2. Vérifiez via : SELECT * FROM pg_stat_user_indexes
--      WHERE relname = '<table>' AND idx_scan > 0 ORDER BY idx_scan DESC;
--   3. Les index de recherche plein-texte (*_search_idx) peuvent être utiles
--      même si les stats indiquent 0 — vérifiez avant de supprimer.
--   4. DROP INDEX CONCURRENTLY ne bloque pas les écritures.
--   5. IF NOT EXISTS n'existe pas pour DROP — utilisez IF EXISTS.
--
-- RECOMMANDATION : Appliquez par groupes de 10, en vérifiant les perf entre.
-- =============================================================================


-- ── Indexes non-utilisés (SÛRS — pas d'index de recherche fulltext) ─────────
DROP INDEX CONCURRENTLY IF EXISTS public.asso_sector_idx;  -- table: associations
DROP INDEX CONCURRENTLY IF EXISTS public.idx_cfav_item;  -- table: collection_favorites
DROP INDEX CONCURRENTLY IF EXISTS public.collection_item_comments_author_idx;  -- table: collection_item_comments
DROP INDEX CONCURRENTLY IF EXISTS public.collection_item_comments_date_idx;  -- table: collection_item_comments
DROP INDEX CONCURRENTLY IF EXISTS public.collect_sector_idx;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_author_stat;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_author_status;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_city;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_featured;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_mode;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_modstatus;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_rarity;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_shipping;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ci_status;  -- table: collection_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_coffer_item;  -- table: collection_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_cview_item;  -- table: collection_views
DROP INDEX CONCURRENTLY IF EXISTS public.conversations_created_by_idx;  -- table: conversations
DROP INDEX CONCURRENTLY IF EXISTS public.conversations_owner_id_idx;  -- table: conversations
DROP INDEX CONCURRENTLY IF EXISTS public.conversations_status_idx;  -- table: conversations
DROP INDEX CONCURRENTLY IF EXISTS public.idx_conversations_exchange;  -- table: conversations
DROP INDEX CONCURRENTLY IF EXISTS public.equip_sector_idx;  -- table: equipment_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_eq_category;  -- table: equipment_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_eq_owner;  -- table: equipment_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_eq_status;  -- table: equipment_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_eqloan_borrower;  -- table: equipment_loans
DROP INDEX CONCURRENTLY IF EXISTS public.idx_eqloan_status;  -- table: equipment_loans
DROP INDEX CONCURRENTLY IF EXISTS public.idx_eqreq_requester;  -- table: equipment_requests
DROP INDEX CONCURRENTLY IF EXISTS public.idx_eqreq_status;  -- table: equipment_requests
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ec_event_id;  -- table: event_comments
DROP INDEX CONCURRENTLY IF EXISTS public.idx_edh_event_id;  -- table: event_date_history
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ep_event;  -- table: event_participants
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ep_event_id;  -- table: event_participants
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ep_user;  -- table: event_participants
DROP INDEX CONCURRENTLY IF EXISTS public.idx_esh_event_id;  -- table: event_status_history
DROP INDEX CONCURRENTLY IF EXISTS public.events_sector_idx;  -- table: events
DROP INDEX CONCURRENTLY IF EXISTS public.idx_events_author;  -- table: events
DROP INDEX CONCURRENTLY IF EXISTS public.idx_events_category;  -- table: events
DROP INDEX CONCURRENTLY IF EXISTS public.idx_events_date;  -- table: events
DROP INDEX CONCURRENTLY IF EXISTS public.idx_events_status;  -- table: events
DROP INDEX CONCURRENTLY IF EXISTS public.forum_topics_hot_idx;  -- table: forum_topics
DROP INDEX CONCURRENTLY IF EXISTS public.forum_topics_status_idx;  -- table: forum_topics
DROP INDEX CONCURRENTLY IF EXISTS public.help_sector_idx;  -- table: help_requests
DROP INDEX CONCURRENTLY IF EXISTS public.idx_interactions_conv;  -- table: interactions
DROP INDEX CONCURRENTLY IF EXISTS public.idx_item_ratings_user;  -- table: item_ratings
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_demands_category;  -- table: job_demands
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_demands_published_at;  -- table: job_demands
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_demands_sector;  -- table: job_demands
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_demands_slug;  -- table: job_demands
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_demands_user;  -- table: job_demands
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_offers_category;  -- table: job_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_offers_published_at;  -- table: job_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_offers_sector;  -- table: job_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_offers_slug;  -- table: job_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_offers_status;  -- table: job_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_offers_urgent;  -- table: job_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_job_offers_user;  -- table: job_offers
DROP INDEX CONCURRENTLY IF EXISTS public.idx_listings_category;  -- table: listings
DROP INDEX CONCURRENTLY IF EXISTS public.listing_sector_idx;  -- table: listings
DROP INDEX CONCURRENTLY IF EXISTS public.lfi_sector_idx;  -- table: lost_found_items
DROP INDEX CONCURRENTLY IF EXISTS public.idx_modhist_content;  -- table: moderation_history
DROP INDEX CONCURRENTLY IF EXISTS public.idx_modhist_queue;  -- table: moderation_history
DROP INDEX CONCURRENTLY IF EXISTS public.idx_modqueue_author;  -- table: moderation_queue
DROP INDEX CONCURRENTLY IF EXISTS public.idx_modqueue_risk;  -- table: moderation_queue
DROP INDEX CONCURRENTLY IF EXISTS public.idx_modqueue_submitted;  -- table: moderation_queue
DROP INDEX CONCURRENTLY IF EXISTS public.outing_status_history_outing_idx;  -- table: outing_status_history
DROP INDEX CONCURRENTLY IF EXISTS public.idx_profiles_status;  -- table: profiles
DROP INDEX CONCURRENTLY IF EXISTS public.promenades_sector_idx;  -- table: promenades
DROP INDEX CONCURRENTLY IF EXISTS public.idx_reports_status;  -- table: reports
DROP INDEX CONCURRENTLY IF EXISTS public.reports_status_idx;  -- table: reports
DROP INDEX CONCURRENTLY IF EXISTS public.reports_target_id_idx;  -- table: reports
DROP INDEX CONCURRENTLY IF EXISTS public.reports_target_type_idx;  -- table: reports
DROP INDEX CONCURRENTLY IF EXISTS public.idx_rtags_review;  -- table: review_tags
DROP INDEX CONCURRENTLY IF EXISTS public.idx_reviews_source;  -- table: reviews
DROP INDEX CONCURRENTLY IF EXISTS public.idx_reviews_target;  -- table: reviews
DROP INDEX CONCURRENTLY IF EXISTS public.idx_service_requests_artisan;  -- table: service_requests
DROP INDEX CONCURRENTLY IF EXISTS public.theme_memberships_theme_idx;  -- table: theme_memberships
DROP INDEX CONCURRENTLY IF EXISTS public.theme_memberships_user_idx;  -- table: theme_memberships
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ti_receiver;  -- table: trust_interactions
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ti_requester;  -- table: trust_interactions
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ti_review;  -- table: trust_interactions
DROP INDEX CONCURRENTLY IF EXISTS public.idx_ti_source;  -- table: trust_interactions
DROP INDEX CONCURRENTLY IF EXISTS public.idx_user_blocks_user_id;  -- table: user_blocks
DROP INDEX CONCURRENTLY IF EXISTS public.idx_user_favorites_user_id;  -- table: user_favorites

-- ── Indexes de recherche fulltext (*_search_idx) — VÉRIFIEZ avant de DROP ──
-- Ces index GIN/tsvector peuvent accélérer la recherche même si stats=0.
-- Ne les supprimez QUE si vous n'utilisez pas la recherche fulltext Postgres.

-- DROP INDEX CONCURRENTLY IF EXISTS public.artisan_search_idx;  -- table: artisan_profiles
-- DROP INDEX CONCURRENTLY IF EXISTS public.asso_search_idx;  -- table: associations
-- DROP INDEX CONCURRENTLY IF EXISTS public.equipment_search_idx;  -- table: equipment_items
-- DROP INDEX CONCURRENTLY IF EXISTS public.events_search_idx;  -- table: events
-- DROP INDEX CONCURRENTLY IF EXISTS public.forum_search_idx;  -- table: forum_posts
-- DROP INDEX CONCURRENTLY IF EXISTS public.forum_topics_search_idx;  -- table: forum_topics
-- DROP INDEX CONCURRENTLY IF EXISTS public.outings_search_idx;  -- table: group_outings
-- DROP INDEX CONCURRENTLY IF EXISTS public.help_search_idx;  -- table: help_requests
-- DROP INDEX CONCURRENTLY IF EXISTS public.listings_search_idx;  -- table: listings
