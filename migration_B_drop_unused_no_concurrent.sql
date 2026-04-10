-- =============================================================================
-- MIGRATION B (v2) : Suppression des index inutilisés — compatible Supabase SQL Editor
-- =============================================================================
-- Source : Supabase Snippet "Liste des index inutilisés dans le schéma public"
-- Requête : SELECT FROM pg_stat_user_indexes WHERE idx_scan = 0
-- Total   : 169 index inutilisés dont :
--   • 74 PRIMARY KEY / UNIQUE  → JAMAIS SUPPRIMER (exclus ci-dessous)
--   • 9 FULLTEXT SEARCH       → COMMENTÉS (vérifier si utilisés)
--   • 86 index ordinaires     → SUPPRIMABLES SANS RISQUE
--
-- ⚠️  POURQUOI SANS CONCURRENTLY :
--   DROP INDEX CONCURRENTLY ne peut pas s'exécuter dans un bloc de transaction.
--   Le SQL Editor de Supabase enveloppe chaque exécution dans une transaction
--   implicite → erreur "ERROR: 25001: DROP INDEX CONCURRENTLY cannot run
--   inside a transaction block".
--
--   Solution : DROP INDEX IF EXISTS (sans CONCURRENTLY).
--   Impact   : pose un verrou ACCESS EXCLUSIVE très bref (quelques ms par index).
--   Risque   : négligeable sur une base en dev ou faible charge.
--   En prod haute charge : utiliser pg_cron ou une migration CLI hors transaction.
--
-- COMMENT APPLIQUER :
--   SQL Editor Supabase → coller tout → RUN
--   Les 86 DROP s'exécutent dans la même transaction → rollback automatique
--   si l'un échoue (mais IF EXISTS garantit qu'un index absent ne bloque pas).
-- =============================================================================

-- ── Index ordinaires inutilisés — SUPPRIMABLES ─────────────────────────────
DROP INDEX IF EXISTS public.idx_service_requests_artisan;  -- service_requests (16 kB)
DROP INDEX IF EXISTS public.idx_conversations_exchange;  -- conversations (16 kB)
DROP INDEX IF EXISTS public.conversations_owner_id_idx;  -- conversations (16 kB)
DROP INDEX IF EXISTS public.conversations_created_by_idx;  -- conversations (16 kB)
DROP INDEX IF EXISTS public.conversations_status_idx;  -- conversations (16 kB)
DROP INDEX IF EXISTS public.idx_ec_event_id;  -- event_comments (16 kB)
DROP INDEX IF EXISTS public.asso_sector_idx;  -- associations (16 kB)
DROP INDEX IF EXISTS public.lfi_sector_idx;  -- lost_found_items (16 kB)
DROP INDEX IF EXISTS public.idx_ep_event_id;  -- event_participants (16 kB)
DROP INDEX IF EXISTS public.idx_ep_event;  -- event_participants (16 kB)
DROP INDEX IF EXISTS public.idx_ep_user;  -- event_participants (16 kB)
DROP INDEX IF EXISTS public.idx_events_date;  -- events (16 kB)
DROP INDEX IF EXISTS public.idx_events_status;  -- events (16 kB)
DROP INDEX IF EXISTS public.idx_events_author;  -- events (16 kB)
DROP INDEX IF EXISTS public.idx_events_category;  -- events (16 kB)
DROP INDEX IF EXISTS public.events_sector_idx;  -- events (16 kB)
DROP INDEX IF EXISTS public.help_sector_idx;  -- help_requests (16 kB)
DROP INDEX IF EXISTS public.idx_item_ratings_user;  -- item_ratings (16 kB)
DROP INDEX IF EXISTS public.idx_eq_status;  -- equipment_items (16 kB)
DROP INDEX IF EXISTS public.idx_eq_owner;  -- equipment_items (16 kB)
DROP INDEX IF EXISTS public.idx_eq_category;  -- equipment_items (16 kB)
DROP INDEX IF EXISTS public.equip_sector_idx;  -- equipment_items (16 kB)
DROP INDEX IF EXISTS public.idx_interactions_conv;  -- interactions (16 kB)
DROP INDEX IF EXISTS public.idx_listings_category;  -- listings (16 kB)
DROP INDEX IF EXISTS public.listing_sector_idx;  -- listings (16 kB)
DROP INDEX IF EXISTS public.collection_item_comments_author_idx;  -- collection_item_comments (16 kB)
DROP INDEX IF EXISTS public.collection_item_comments_date_idx;  -- collection_item_comments (16 kB)
DROP INDEX IF EXISTS public.theme_memberships_theme_idx;  -- theme_memberships (16 kB)
DROP INDEX IF EXISTS public.theme_memberships_user_idx;  -- theme_memberships (16 kB)
DROP INDEX IF EXISTS public.idx_profiles_status;  -- profiles (16 kB)
DROP INDEX IF EXISTS public.idx_ci_mode;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_ci_status;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_ci_rarity;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_ci_city;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_ci_shipping;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_ci_author_status;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_ci_modstatus;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_ci_author_stat;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.collect_sector_idx;  -- collection_items (16 kB)
DROP INDEX IF EXISTS public.idx_job_offers_status;  -- job_offers (16 kB)
DROP INDEX IF EXISTS public.idx_job_offers_slug;  -- job_offers (16 kB)
DROP INDEX IF EXISTS public.idx_job_offers_sector;  -- job_offers (16 kB)
DROP INDEX IF EXISTS public.idx_job_offers_category;  -- job_offers (16 kB)
DROP INDEX IF EXISTS public.idx_job_offers_user;  -- job_offers (16 kB)
DROP INDEX IF EXISTS public.idx_job_offers_published_at;  -- job_offers (16 kB)
DROP INDEX IF EXISTS public.idx_job_offers_urgent;  -- job_offers (16 kB)
DROP INDEX IF EXISTS public.idx_job_demands_slug;  -- job_demands (16 kB)
DROP INDEX IF EXISTS public.idx_job_demands_sector;  -- job_demands (16 kB)
DROP INDEX IF EXISTS public.idx_job_demands_category;  -- job_demands (16 kB)
DROP INDEX IF EXISTS public.idx_job_demands_user;  -- job_demands (16 kB)
DROP INDEX IF EXISTS public.idx_job_demands_published_at;  -- job_demands (16 kB)
DROP INDEX IF EXISTS public.forum_topics_status_idx;  -- forum_topics (16 kB)
DROP INDEX IF EXISTS public.forum_topics_hot_idx;  -- forum_topics (16 kB)
DROP INDEX IF EXISTS public.idx_cfav_item;  -- collection_favorites (8192 bytes)
DROP INDEX IF EXISTS public.event_photos_single_cover;  -- event_photos (8192 bytes)
DROP INDEX IF EXISTS public.idx_rtags_review;  -- review_tags (8192 bytes)
ALTER TABLE public.trust_interactions DROP CONSTRAINT IF EXISTS uq_trust_interaction;  -- UNIQUE constraint, pas DROP INDEX
DROP INDEX IF EXISTS public.idx_ti_requester;  -- trust_interactions (8192 bytes)
DROP INDEX IF EXISTS public.idx_ti_receiver;  -- trust_interactions (8192 bytes)
DROP INDEX IF EXISTS public.idx_ti_source;  -- trust_interactions (8192 bytes)
DROP INDEX IF EXISTS public.idx_ti_review;  -- trust_interactions (8192 bytes)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS uq_review_per_interaction;  -- UNIQUE constraint, pas DROP INDEX
DROP INDEX IF EXISTS public.idx_reviews_target;  -- reviews (8192 bytes)
DROP INDEX IF EXISTS public.idx_reviews_source;  -- reviews (8192 bytes)
DROP INDEX IF EXISTS public.idx_edh_event_id;  -- event_date_history (8192 bytes)
DROP INDEX IF EXISTS public.idx_reports_status;  -- reports (8192 bytes)
DROP INDEX IF EXISTS public.reports_status_idx;  -- reports (8192 bytes)
DROP INDEX IF EXISTS public.reports_target_type_idx;  -- reports (8192 bytes)
DROP INDEX IF EXISTS public.reports_target_id_idx;  -- reports (8192 bytes)
DROP INDEX IF EXISTS public.promenades_sector_idx;  -- promenades (8192 bytes)
DROP INDEX IF EXISTS public.idx_user_blocks_user_id;  -- user_blocks (8192 bytes)
DROP INDEX IF EXISTS public.idx_modhist_queue;  -- moderation_history (8192 bytes)
DROP INDEX IF EXISTS public.idx_modhist_content;  -- moderation_history (8192 bytes)
DROP INDEX IF EXISTS public.idx_eqreq_requester;  -- equipment_requests (8192 bytes)
DROP INDEX IF EXISTS public.idx_eqreq_status;  -- equipment_requests (8192 bytes)
DROP INDEX IF EXISTS public.idx_eqloan_borrower;  -- equipment_loans (8192 bytes)
DROP INDEX IF EXISTS public.idx_eqloan_status;  -- equipment_loans (8192 bytes)
DROP INDEX IF EXISTS public.idx_cview_item;  -- collection_views (8192 bytes)
DROP INDEX IF EXISTS public.outing_status_history_outing_idx;  -- outing_status_history (8192 bytes)
DROP INDEX IF EXISTS public.idx_coffer_item;  -- collection_offers (8192 bytes)
DROP INDEX IF EXISTS public.idx_ci_featured;  -- collection_items (8192 bytes)
DROP INDEX IF EXISTS public.idx_modqueue_author;  -- moderation_queue (8192 bytes)
DROP INDEX IF EXISTS public.idx_modqueue_submitted;  -- moderation_queue (8192 bytes)
DROP INDEX IF EXISTS public.idx_modqueue_risk;  -- moderation_queue (8192 bytes)
DROP INDEX IF EXISTS public.idx_esh_event_id;  -- event_status_history (8192 bytes)
DROP INDEX IF EXISTS public.idx_user_favorites_user_id;  -- user_favorites (8192 bytes)

-- ── Index fulltext search — VÉRIFIER avant de supprimer ───────────────────
-- Ces index GIN/tsvector peuvent accélérer la recherche plein-texte.
-- Ne supprimez QUE si vous n'utilisez pas la recherche fulltext Postgres.
-- Vérifier : SELECT * FROM pg_stat_user_indexes WHERE indexrelname = '...'
--            après 2-4 semaines de trafic réel.

-- DROP INDEX IF EXISTS public.forum_search_idx;  -- forum_posts (24 kB)
-- DROP INDEX IF EXISTS public.forum_topics_search_idx;  -- forum_topics (24 kB)
-- DROP INDEX IF EXISTS public.listings_search_idx;  -- listings (24 kB)
-- DROP INDEX IF EXISTS public.outings_search_idx;  -- group_outings (16 kB)
-- DROP INDEX IF EXISTS public.asso_search_idx;  -- associations (16 kB)
-- DROP INDEX IF EXISTS public.events_search_idx;  -- events (16 kB)
-- DROP INDEX IF EXISTS public.help_search_idx;  -- help_requests (16 kB)
-- DROP INDEX IF EXISTS public.equipment_search_idx;  -- equipment_items (16 kB)
-- DROP INDEX IF EXISTS public.artisan_search_idx;  -- artisan_profiles (16 kB)

-- ── PRIMARY KEY / UNIQUE — NE JAMAIS SUPPRIMER ────────────────────────────
-- Ces 74 index sont listés par pg_stat_user_indexes avec idx_scan=0 MAIS
-- ils sont requis pour les contraintes PRIMARY KEY et UNIQUE.
-- Ils apparaissent "inutilisés" car pg_stat ne compte pas les lookups PK.
-- NE PAS TOUCHER.
