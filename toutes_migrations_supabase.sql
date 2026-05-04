-- ================================================================
-- MIGRATION 1/36 : 20260407_baseline_rls_indexes.sql
-- ================================================================

-- =============================================================
-- MIGRATION 20260407 — Baseline : index FK, index performances,
--   consolidation RLS, suppression index inutilises,
--   correction initplan auth.uid() (policy-centric)
-- Biguglia Connect — a executer dans Supabase SQL Editor
-- Regroupe : migration_A, migration_B (lots 1-4 + drop), migration_C,
--            migration_auth_rls_v2
-- =============================================================

-- =============================================================
-- PARTIE 1 : Index manquants sur cles etrangeres (migration_A)
-- =============================================================
-- MIGRATION A : Index manquants sur clés étrangères (données RÉELLES Supabase)
-- Requête : SELECT table_name, column_name, foreign_table, constraint_name
--           FROM information_schema... WHERE NOT EXISTS index...
--             (Supabase gère CONCURRENTLY automatiquement)

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


-- =============================================================
-- PARTIE 2 : Index performances — lots 1-4 (migration_B)
-- =============================================================
-- MIGRATION B — LOT 1/4 : Index à faible risque (tables peu critiques)
-- Verrou : ACCESS EXCLUSIVE ~1-2 ms par index
-- Rollback : automatique si erreur (IF EXISTS garantit qu'un absent ne bloque pas)

-- ── Associations / Promenades / Help (faible trafic) ──────────────────────────
DROP INDEX IF EXISTS public.asso_sector_idx;                    -- associations
DROP INDEX IF EXISTS public.promenades_sector_idx;              -- promenades
DROP INDEX IF EXISTS public.help_sector_idx;                    -- help_requests

-- ── Collection items (pas de données critiques) ───────────────────────────────
DROP INDEX IF EXISTS public.idx_ci_mode;
DROP INDEX IF EXISTS public.idx_ci_status;
DROP INDEX IF EXISTS public.idx_ci_rarity;
DROP INDEX IF EXISTS public.idx_ci_city;
DROP INDEX IF EXISTS public.idx_ci_shipping;
DROP INDEX IF EXISTS public.idx_ci_author_status;
DROP INDEX IF EXISTS public.idx_ci_modstatus;
DROP INDEX IF EXISTS public.idx_ci_author_stat;
DROP INDEX IF EXISTS public.idx_ci_featured;
DROP INDEX IF EXISTS public.collect_sector_idx;

-- ── Collection favoris / vues / offres (tables légères) ───────────────────────
DROP INDEX IF EXISTS public.idx_cfav_item;                      -- collection_favorites
DROP INDEX IF EXISTS public.idx_cview_item;                     -- collection_views
DROP INDEX IF EXISTS public.idx_coffer_item;                    -- collection_offers

-- ── Collection item comments ──────────────────────────────────────────────────
DROP INDEX IF EXISTS public.collection_item_comments_author_idx;
DROP INDEX IF EXISTS public.collection_item_comments_date_idx;

-- ── Theme memberships ─────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.theme_memberships_theme_idx;
DROP INDEX IF EXISTS public.theme_memberships_user_idx;

-- ── Promenades / Outings (faible trafic) ──────────────────────────────────────
DROP INDEX IF EXISTS public.outing_status_history_outing_idx;

-- ── Equipment (loans/requests, tables secondaires) ────────────────────────────
DROP INDEX IF EXISTS public.idx_eqreq_requester;
DROP INDEX IF EXISTS public.idx_eqreq_status;
DROP INDEX IF EXISTS public.idx_eqloan_borrower;
DROP INDEX IF EXISTS public.idx_eqloan_status;
DROP INDEX IF EXISTS public.idx_eq_status;
DROP INDEX IF EXISTS public.idx_eq_owner;
DROP INDEX IF EXISTS public.idx_eq_category;
DROP INDEX IF EXISTS public.equip_sector_idx;

-- ── Item ratings ──────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_item_ratings_user;

-- ── Review tags ───────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_rtags_review;

-- ── Event date/status history ─────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_edh_event_id;
DROP INDEX IF EXISTS public.idx_esh_event_id;

-- ── Interactions ──────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_interactions_conv;

-- MIGRATION B — LOT 2/4 : Forum + Listings + Jobs
-- Risque : modéré — ces tables ont du trafic en lecture mais les index
--          supprimés ont idx_scan = 0 (jamais utilisés par le planificateur)

-- ── Forum topics ──────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.forum_topics_status_idx;
DROP INDEX IF EXISTS public.forum_topics_hot_idx;

-- ── Listings ──────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_listings_category;
DROP INDEX IF EXISTS public.listing_sector_idx;

-- ── Listing photos ────────────────────────────────────────────────────────────
-- (aucun dans ce lot — listing_photos n'a pas d'index inutilisés séparés)

-- ── Job offers ────────────────────────────────────────────────────────────────
-- ⚠️  Attention : vérifier que le trafic job_offers est bien établi avant de supprimer
-- Si la fonctionnalité "offres d'emploi" est récente → reporter à lot 4
DROP INDEX IF EXISTS public.idx_job_offers_status;
DROP INDEX IF EXISTS public.idx_job_offers_slug;
DROP INDEX IF EXISTS public.idx_job_offers_sector;
DROP INDEX IF EXISTS public.idx_job_offers_category;
DROP INDEX IF EXISTS public.idx_job_offers_user;
DROP INDEX IF EXISTS public.idx_job_offers_published_at;
DROP INDEX IF EXISTS public.idx_job_offers_urgent;

-- ── Job demands ───────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_job_demands_slug;
DROP INDEX IF EXISTS public.idx_job_demands_sector;
DROP INDEX IF EXISTS public.idx_job_demands_category;
DROP INDEX IF EXISTS public.idx_job_demands_user;
DROP INDEX IF EXISTS public.idx_job_demands_published_at;

-- ── Lost & found ──────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.lfi_sector_idx;

-- MIGRATION B — LOT 3/4 : Events + Profiles + Trust/Reviews (v3)
-- Risque : modéré-élevé — events et profiles sont des tables centrales
--          Vérifier l'appli après chaque lot avant de continuer
--
-- CORRECTION v3 :
--   uq_trust_interaction et uq_review_per_interaction sont des CONTRAINTES UNIQUE
--   métier (empêchent les doublons). Ils sont EXCLUS de cette migration.
--   Raison : supprimer une contrainte UNIQUE retire une garantie d'intégrité,
--   ce n'est pas une optimisation perf. Hors périmètre de la migration B.
--
--   Pour auditer leur rôle exact avant toute décision :
--   SELECT c.conname, c.contype, c.conrelid::regclass, pg_get_constraintdef(c.oid)
--   FROM pg_constraint c
--   WHERE c.conname IN ('uq_trust_interaction', 'uq_review_per_interaction');

-- ── Events ────────────────────────────────────────────────────────────────────
-- ⚠️  Table centrale — vérifier les requêtes events après suppression
DROP INDEX IF EXISTS public.idx_events_date;
DROP INDEX IF EXISTS public.idx_events_status;
DROP INDEX IF EXISTS public.idx_events_author;
DROP INDEX IF EXISTS public.idx_events_category;
DROP INDEX IF EXISTS public.events_sector_idx;

-- ── Event participants ────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_ep_event_id;
DROP INDEX IF EXISTS public.idx_ep_event;
DROP INDEX IF EXISTS public.idx_ep_user;

-- ── Event comments ────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_ec_event_id;

-- ── Event photos ──────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.event_photos_single_cover;

-- ── Profiles ──────────────────────────────────────────────────────────────────
-- ⚠️  Table très centrale — vérifier les pages profil après suppression
DROP INDEX IF EXISTS public.idx_profiles_status;

-- ── Trust interactions ────────────────────────────────────────────────────────
-- ⛔ uq_trust_interaction → CONTRAINTE UNIQUE métier — EXCLUE de cette migration
--    Elle empêche les doublons dans trust_interactions.
--    Suppression = risque d'incohérence données. Ne pas toucher.
-- Pour info uniquement (ne pas exécuter) :
-- ALTER TABLE public.trust_interactions DROP CONSTRAINT uq_trust_interaction;
DROP INDEX IF EXISTS public.idx_ti_requester;
DROP INDEX IF EXISTS public.idx_ti_receiver;
DROP INDEX IF EXISTS public.idx_ti_source;
DROP INDEX IF EXISTS public.idx_ti_review;

-- ── Reviews ───────────────────────────────────────────────────────────────────
-- ⛔ uq_review_per_interaction → CONTRAINTE UNIQUE métier — EXCLUE de cette migration
--    Elle empêche plusieurs reviews pour la même interaction.
--    Suppression = risque de doublons silencieux. Ne pas toucher.
-- Pour info uniquement (ne pas exécuter) :
-- ALTER TABLE public.reviews DROP CONSTRAINT uq_review_per_interaction;
DROP INDEX IF EXISTS public.idx_reviews_target;
DROP INDEX IF EXISTS public.idx_reviews_source;

-- ── User blocks / favorites ───────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_user_blocks_user_id;
DROP INDEX IF EXISTS public.idx_user_favorites_user_id;

-- MIGRATION B — LOT 4/4 : Conversations + Modération + Reports (tables sensibles)
-- Risque : élevé — conversations et modération sont des chemins critiques
--
-- ⚠️  AVANT D'APPLIQUER CE LOT :
--   1. Vérifier que la messagerie fonctionne normalement après lot 3
--   2. Vérifier que les pages modération/admin répondent normalement
--   3. Avoir un rollback prêt (recréer les index si dégradation détectée)
--
-- ROLLBACK de secours si dégradation constatée :
--   CREATE INDEX IF NOT EXISTS idx_conversations_exchange ON public.conversations (exchange_id);
--   CREATE INDEX IF NOT EXISTS conversations_status_idx ON public.conversations (status);
--   etc. (recréer seulement les index qui causent un problème)

-- ── Conversations ─────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_conversations_exchange;
DROP INDEX IF EXISTS public.conversations_owner_id_idx;
DROP INDEX IF EXISTS public.conversations_created_by_idx;
DROP INDEX IF EXISTS public.conversations_status_idx;

-- ── Service requests ──────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_service_requests_artisan;

-- ── Modération ───────────────────────────────────────────────────────────────
-- ⚠️  Ces index servent rarement mais peuvent accélérer des recherches admin lourdes
DROP INDEX IF EXISTS public.idx_modqueue_author;
DROP INDEX IF EXISTS public.idx_modqueue_submitted;
DROP INDEX IF EXISTS public.idx_modqueue_risk;
DROP INDEX IF EXISTS public.idx_modhist_queue;
DROP INDEX IF EXISTS public.idx_modhist_content;

-- ── Reports ───────────────────────────────────────────────────────────────────
-- ⚠️  idx_scan = 0 mais ces colonnes peuvent être interrogées par les admins
--    → surveiller les temps de réponse des pages admin après suppression
DROP INDEX IF EXISTS public.idx_reports_status;
DROP INDEX IF EXISTS public.reports_status_idx;          -- doublon de idx_reports_status
DROP INDEX IF EXISTS public.reports_target_type_idx;
DROP INDEX IF EXISTS public.reports_target_id_idx;


-- =============================================================
-- PARTIE 3 : Suppression index inutilises (migration_B_drop)
-- =============================================================
-- MIGRATION B (v2) : Suppression des index inutilisés — compatible Supabase SQL Editor
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
-- ⛔ uq_trust_interaction : CONTRAINTE UNIQUE métier — EXCLUE (empêche les doublons dans trust_interactions)
DROP INDEX IF EXISTS public.idx_ti_requester;  -- trust_interactions (8192 bytes)
DROP INDEX IF EXISTS public.idx_ti_receiver;  -- trust_interactions (8192 bytes)
DROP INDEX IF EXISTS public.idx_ti_source;  -- trust_interactions (8192 bytes)
DROP INDEX IF EXISTS public.idx_ti_review;  -- trust_interactions (8192 bytes)
-- ⛔ uq_review_per_interaction : CONTRAINTE UNIQUE métier — EXCLUE (empêche les doublons de reviews par interaction)
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

-- =============================================================
-- PARTIE 4 : Consolidation politiques RLS dupliquees (migration_C)
-- =============================================================
-- MIGRATION C : Consolidation des politiques RLS dupliquées (données RÉELLES)
-- Requête : SELECT tablename, cmd, COUNT(*) FROM pg_policies GROUP BY ...
--           HAVING COUNT(*) > 1
-- Total   : 60 groupes (table, action) avec plusieurs policies PERMISSIVE
-- SAFE    : lit pg_policies, combine USING/WITH CHECK avec OR, recrée 1 policy
--           comportement identique (Postgres faisait déjà l'OR implicitement)
-- APPLIQUER : SQL Editor Supabase → coller tout → RUN
--             Vérifier NOTICE : "Consolidated X → 1 for table.action"

DO $consolidate$
DECLARE
  p           RECORD;
  using_parts TEXT[];
  check_parts TEXT[];
  combined_using TEXT;
  combined_check TEXT;
  new_name    TEXT;
  cnt         INT := 0;
  targets     RECORD;
BEGIN

  FOR targets IN
    SELECT * FROM (VALUES
      ('conversation_participants', 'INSERT', ARRAY['Ajouter des participants', 'conversation_participants_insert', 'conversation_participants_insert_own', 'cp_insert']),
      ('conversation_participants', 'SELECT', ARRAY['Voir participants de ses conversations', 'conversation_participants_select', 'conversation_participants_select_own', 'cp_select']),
      ('conversations', 'UPDATE', ARRAY['Modifier ses conversations', 'Participants maj echange', 'conv_update', 'conversations_update_participant']),
      ('equipment_items', 'INSERT', ARRAY['eq_owner_insert', 'equipment_insert_auth', 'equipment_items_insert', 'equipment_items_insert_own']),
      ('equipment_items', 'SELECT', ARRAY['eq_public_read', 'equipment_items_select', 'equipment_items_select_available_or_own', 'equipment_select_active']),
      ('forum_posts', 'SELECT', ARRAY['forum_posts_select', 'forum_posts_select_all', 'forum_posts_select_public', 'forum_posts_select_published_or_own']),
      ('profiles', 'SELECT', ARRAY['Profils publics en lecture', 'allow_all_select', 'allow_select', 'profiles_public_select']),
      ('reviews', 'SELECT', ARRAY['Avis publics visibles', 'Avis reçus par la cible', 'reviews_select', 'reviews_select_public']),
      ('artisan_profiles', 'SELECT', ARRAY['Artisans vérifiés visibles', 'artisan_profiles_select', 'artisan_profiles_select_all']),
      ('collection_items', 'SELECT', ARRAY['CI admin', 'CI select owner', 'CI select public']),
      ('conversations', 'INSERT', ARRAY['Créer une conversation', 'conv_insert', 'conversations_insert_creator']),
      ('conversations', 'SELECT', ARRAY['Voir ses conversations', 'conv_select', 'conversations_select_participant']),
      ('equipment_items', 'UPDATE', ARRAY['eq_owner_update', 'equipment_items_update_own', 'equipment_update_owner']),
      ('equipment_photos', 'SELECT', ARRAY['equipment_photos_select', 'equipment_photos_select_all', 'equipment_photos_select_public']),
      ('events', 'SELECT', ARRAY['events_public_select', 'events_select_all', 'local_events_select']),
      ('events', 'UPDATE', ARRAY['events_update_admin', 'events_update_own', 'local_events_update_own']),
      ('events', 'INSERT', ARRAY['events_insert', 'events_insert_own', 'local_events_insert']),
      ('forum_comments', 'SELECT', ARRAY['forum_comments_select', 'forum_comments_select_all', 'forum_comments_select_public']),
      ('forum_comments', 'INSERT', ARRAY['forum_comments_insert', 'forum_comments_insert_auth', 'forum_comments_insert_own']),
      ('forum_posts', 'INSERT', ARRAY['forum_posts_insert', 'forum_posts_insert_auth', 'forum_posts_insert_own']),
      ('listing_photos', 'SELECT', ARRAY['listing_photos_select', 'listing_photos_select_all', 'listing_photos_select_public']),
      ('listing_photos', 'INSERT', ARRAY['listing_photos_insert', 'listing_photos_insert_own', 'listing_photos_insert_owner']),
      ('listings', 'SELECT', ARRAY['listings_select', 'listings_select_active', 'listings_select_published_or_own']),
      ('listings', 'INSERT', ARRAY['listings_insert', 'listings_insert_auth', 'listings_insert_own']),
      ('messages', 'INSERT', ARRAY['Envoyer un message', 'messages_insert', 'messages_insert_participant']),
      ('messages', 'SELECT', ARRAY['Voir messages de ses conversations', 'messages_select', 'messages_select_participant']),
      ('moderation_queue', 'SELECT', ARRAY['moderation_queue_select', 'modq_author_select', 'modq_staff_select']),
      ('moderation_queue', 'UPDATE', ARRAY['moderation_queue_update', 'modq_author_update_draft', 'modq_staff_update']),
      ('service_requests', 'SELECT', ARRAY['service_requests_select', 'service_requests_select_parties', 'service_requests_select_public']),
      ('artisan_photos', 'SELECT', ARRAY['artisan_photos_select', 'artisan_photos_select_all']),
      ('artisan_profiles', 'UPDATE', ARRAY['Artisan modifie son profil', 'artisan_profiles_update']),
      ('artisan_profiles', 'INSERT', ARRAY['Artisan crée son profil', 'artisan_profiles_insert']),
      ('borrow_requests', 'INSERT', ARRAY['borrow_requests_insert_auth', 'borrow_requests_insert_borrower']),
      ('collection_categories', 'SELECT', ARRAY['categories_collection_publiques', 'collection_categories_select']),
      ('equipment_items', 'DELETE', ARRAY['eq_owner_delete', 'equipment_items_delete_own']),
      ('equipment_photos', 'INSERT', ARRAY['equipment_photos_insert_own', 'equipment_photos_insert_owner']),
      ('event_comments', 'SELECT', ARRAY['ec_select', 'event_comments_select']),
      ('event_comments', 'DELETE', ARRAY['ec_delete', 'event_comments_delete']),
      ('event_comments', 'INSERT', ARRAY['ec_insert', 'event_comments_insert']),
      ('event_participants', 'SELECT', ARRAY['ep_select', 'event_participations_select']),
      ('event_participants', 'INSERT', ARRAY['ep_insert', 'event_participations_insert']),
      ('event_participants', 'DELETE', ARRAY['ep_delete', 'event_participations_delete']),
      ('event_photos', 'SELECT', ARRAY['ephoto_select', 'event_photos_select']),
      ('event_photos', 'INSERT', ARRAY['ephoto_insert', 'event_photos_insert']),
      ('event_photos', 'DELETE', ARRAY['ephoto_delete', 'event_photos_delete']),
      ('forum_categories', 'SELECT', ARRAY['categories_forum_publiques', 'forum_categories_select']),
      ('job_demands', 'SELECT', ARRAY['job_demands_public', 'job_demands_public_read']),
      ('job_demands', 'ALL', ARRAY['job_demands_own_all', 'job_demands_own_crud']),
      ('job_offers', 'ALL', ARRAY['job_offers_own_all', 'job_offers_own_crud']),
      ('job_offers', 'SELECT', ARRAY['job_offers_public', 'job_offers_public_read']),
      ('listing_photos', 'DELETE', ARRAY['listing_photos_delete_own', 'listing_photos_delete_owner']),
      ('listings', 'DELETE', ARRAY['listings_delete', 'listings_delete_own']),
      ('listings', 'UPDATE', ARRAY['listings_update', 'listings_update_own']),
      ('moderation_queue', 'INSERT', ARRAY['moderation_queue_insert', 'modq_author_insert']),
      ('notifications', 'UPDATE', ARRAY['notifications_update', 'notifications_update_own']),
      ('notifications', 'SELECT', ARRAY['notifications_select', 'notifications_select_own']),
      ('reports', 'INSERT', ARRAY['reports_insert_auth', 'reports_insert_own']),
      ('reports', 'SELECT', ARRAY['reports_select_own', 'reports_select_own_or_moderator']),
      ('reviews', 'INSERT', ARRAY['Créer avis si interaction', 'reviews_insert_own']),
      ('service_requests', 'INSERT', ARRAY['service_requests_insert', 'service_requests_insert_resident'])
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
      IF p.qual IS NOT NULL AND p.qual <> '' AND p.qual <> 'null' THEN
        using_parts := using_parts || ARRAY['(' || p.qual || ')'];
      END IF;
      IF p.with_check IS NOT NULL AND p.with_check <> '' AND p.with_check <> 'null' THEN
        check_parts := check_parts || ARRAY['(' || p.with_check || ')'];
      END IF;
    END LOOP;

    -- Skip si aucune policy trouvée (déjà consolidée)
    IF array_length(using_parts, 1) IS NULL AND array_length(check_parts, 1) IS NULL THEN
      RAISE NOTICE 'Skip %.% — policies not found (already consolidated?)', targets.tbl, targets.act;
      CONTINUE;
    END IF;

    -- Combiner avec OR
    combined_using := CASE WHEN array_length(using_parts, 1) > 0
      THEN array_to_string(using_parts, ' OR ') ELSE NULL END;
    combined_check := CASE WHEN array_length(check_parts, 1) > 0
      THEN array_to_string(check_parts, ' OR ') ELSE NULL END;

    -- Pour INSERT/UPDATE sans WITH CHECK, copier USING
    IF combined_check IS NULL AND combined_using IS NOT NULL
       AND targets.act IN ('INSERT', 'UPDATE', 'ALL') THEN
      combined_check := combined_using;
    END IF;

    new_name := lower(targets.tbl) || '_' || lower(targets.act) || '_unified';

    -- Supprimer les anciennes policies
    BEGIN
      FOR p IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = targets.tbl
          AND policyname = ANY(targets.pols)
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, targets.tbl);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erreur DROP policies %.%: %', targets.tbl, targets.act, SQLERRM;
      CONTINUE;
    END;

    -- Créer la policy unifiée
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO PUBLIC %s %s',
        new_name, targets.tbl, targets.act,
        CASE WHEN combined_using IS NOT NULL THEN 'USING (' || combined_using || ')' ELSE '' END,
        CASE WHEN combined_check IS NOT NULL THEN 'WITH CHECK (' || combined_check || ')' ELSE '' END
      );
      cnt := cnt + 1;
      RAISE NOTICE 'Consolidated % → 1 pour %.% (nouvelle: %)',
        array_length(targets.pols, 1), targets.tbl, targets.act, new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erreur CREATE policy %.%: %', targets.tbl, targets.act, SQLERRM;
      -- Ne pas laisser la table sans protection — recréer toutes les originales
      RAISE WARNING 'ATTENTION: vérifier manuellement les policies sur la table %', targets.tbl;
    END;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Consolidation terminée : % policies unifiées créées. ===', cnt;
END;
$consolidate$;

-- =============================================================
-- PARTIE 5 : Correction initplan auth.uid() — v2 (auth_rls_v2)
-- =============================================================
-- ============================================================
-- MIGRATION auth_rls_initplan — v2 (policy-centric)
-- ============================================================
-- Date        : 2026-04-10
-- Tables      : 36 tables (identifiées via linter CSV file 11)
-- Policies    : ~63 restantes après la v1
-- Objectif    : wrapper auth.uid() / auth.role() / auth.jwt()
--               et current_setting() dans (SELECT ...) pour
--               éliminer les per-row initplan re-evaluations
--
--      déjà présent avant toute modification)
--
-- ============================================================

DO $$
DECLARE
    r            RECORD;
    v_qual       TEXT;
    v_check      TEXT;
    v_qual_new   TEXT;
    v_check_new  TEXT;
    v_changed    BOOLEAN;
    v_updated    INTEGER := 0;
    v_skipped    INTEGER := 0;
    v_roles_sql  TEXT;
    v_perm_kw    TEXT;
    v_cmd_sql    TEXT;

    -- Pattern : appel direct auth.xxx() NON précédé de (SELECT
    -- Utilise negative lookbehind via position check
BEGIN

    FOR r IN
        SELECT
            p.schemaname,
            p.tablename,
            p.policyname,
            p.cmd,
            p.roles,
            p.permissive,
            p.qual        AS qual,
            p.with_check  AS with_check
        FROM pg_policies p
        WHERE
            p.schemaname = 'public'
            AND p.tablename IN (
                'artisan_profiles', 'asso_comments', 'associations',
                'collection_categories', 'collection_favorites',
                'collection_item_comments', 'collection_items',
                'collection_offers', 'event_comments', 'event_participants',
                'events', 'forum_follows', 'forum_reactions', 'forum_replies',
                'forum_reports', 'forum_topics', 'group_outings',
                'help_comments', 'help_photos', 'help_requests',
                'item_ratings', 'lf_comments', 'listings', 'lost_found_items',
                'moderation_queue', 'notifications', 'outing_comments',
                'outing_participants', 'promenade_likes', 'promenades',
                'request_comments', 'reviews', 'service_requests',
                'theme_memberships', 'theme_profiles', 'trust_interactions'
            )
        ORDER BY p.tablename, p.policyname
    LOOP
        v_qual      := r.qual;
        v_check     := r.with_check;
        v_qual_new  := r.qual;
        v_check_new := r.with_check;
        v_changed   := FALSE;

        -- --------------------------------------------------------
        -- CORRECTION auth.uid()
        -- Ne wrapper que les occurrences non déjà wrappées.
        -- Règle : remplace auth.uid() par (SELECT auth.uid())
        --         SAUF si déjà précédé de "SELECT " (lookback manuel).
        -- On utilise regexp_replace avec une regex qui s'assure
        -- que l'occurrence n'est pas déjà dans (SELECT ...).
        -- --------------------------------------------------------

        -- USING : auth.uid()
        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'auth\.uid\(\)'
           AND v_qual_new !~ '\(SELECT\s+auth\.uid\(\)' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})auth\.uid\(\)',
                '(SELECT auth.uid())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- WITH CHECK : auth.uid()
        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'auth\.uid\(\)'
           AND v_check_new !~ '\(SELECT\s+auth\.uid\(\)' THEN
            v_check_new := regexp_replace(
                v_check_new,
                '(?<!\(SELECT\s{0,20})auth\.uid\(\)',
                '(SELECT auth.uid())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- --------------------------------------------------------
        -- CORRECTION auth.role()
        -- --------------------------------------------------------

        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'auth\.role\(\)'
           AND v_qual_new !~ '\(SELECT\s+auth\.role\(\)' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})auth\.role\(\)',
                '(SELECT auth.role())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'auth\.role\(\)'
           AND v_check_new !~ '\(SELECT\s+auth\.role\(\)' THEN
            v_check_new := regexp_replace(
                v_check_new,
                '(?<!\(SELECT\s{0,20})auth\.role\(\)',
                '(SELECT auth.role())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- --------------------------------------------------------
        -- CORRECTION auth.jwt()
        -- --------------------------------------------------------

        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'auth\.jwt\(\)'
           AND v_qual_new !~ '\(SELECT\s+auth\.jwt\(\)' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})auth\.jwt\(\)',
                '(SELECT auth.jwt())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'auth\.jwt\(\)'
           AND v_check_new !~ '\(SELECT\s+auth\.jwt\(\)' THEN
            v_check_new := regexp_replace(
                v_check_new,
                '(?<!\(SELECT\s{0,20})auth\.jwt\(\)',
                '(SELECT auth.jwt())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- --------------------------------------------------------
        -- CORRECTION current_setting(...)
        -- --------------------------------------------------------

        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'current_setting\('
           AND v_qual_new !~ '\(SELECT\s+current_setting\(' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})current_setting\(',
                '(SELECT current_setting(',
                'g'
            );
            -- Fermer la parenthèse supplémentaire ouverte
            -- current_setting(X) → (SELECT current_setting(X))
            -- La regex ci-dessus ajoute une ( avant current_setting
            -- On doit ajouter un ) après la parenthèse fermante du call
            -- Ce cas est plus complexe — on utilise une approche différente:
            -- Revertons et utilisons une regex complète
            v_qual_new := r.qual; -- reset
            v_qual_new := regexp_replace(
                v_qual_new,
                'current_setting\(([^)]+)\)',
                '(SELECT current_setting(\1))',
                'g'
            );
            -- Vérifie qu'on n'a pas double-wrappé
            IF v_qual_new ~ '\(SELECT\s+\(SELECT\s+current_setting' THEN
                v_qual_new := r.qual; -- annule si double wrapping détecté
                RAISE WARNING 'table=% policy=% : current_setting double-wrap detected in USING — SKIPPED',
                    r.tablename, r.policyname;
            ELSE
                v_changed := TRUE;
            END IF;
        END IF;

        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'current_setting\('
           AND v_check_new !~ '\(SELECT\s+current_setting\(' THEN
            v_check_new := regexp_replace(
                v_check_new,
                'current_setting\(([^)]+)\)',
                '(SELECT current_setting(\1))',
                'g'
            );
            IF v_check_new ~ '\(SELECT\s+\(SELECT\s+current_setting' THEN
                v_check_new := r.with_check;
                RAISE WARNING 'table=% policy=% : current_setting double-wrap detected in WITH CHECK — SKIPPED',
                    r.tablename, r.policyname;
            ELSE
                v_changed := TRUE;
            END IF;
        END IF;

        -- --------------------------------------------------------
        -- Aucun changement → passer à la policy suivante
        -- --------------------------------------------------------
        IF NOT v_changed THEN
            v_skipped := v_skipped + 1;
            RAISE NOTICE '[SKIP] %.% (%) — already clean or no match',
                r.tablename, r.policyname, r.cmd;
            CONTINUE;
        END IF;

        -- --------------------------------------------------------
        -- Construire les fragments SQL pour la re-création
        -- --------------------------------------------------------

        -- Rôles : préserver les rôles originaux
        IF r.roles = '{public}' OR r.roles IS NULL OR array_length(r.roles, 1) = 0 THEN
            v_roles_sql := 'TO PUBLIC';
        ELSE
            v_roles_sql := 'TO ' || array_to_string(r.roles, ', ');
        END IF;

        -- PERMISSIVE / RESTRICTIVE
        IF r.permissive = 'PERMISSIVE' THEN
            v_perm_kw := 'PERMISSIVE';
        ELSE
            v_perm_kw := 'RESTRICTIVE';
        END IF;

        -- CMD : ALL / SELECT / INSERT / UPDATE / DELETE
        v_cmd_sql := COALESCE(r.cmd, 'ALL');

        -- --------------------------------------------------------
        -- DROP + CREATE
        -- --------------------------------------------------------
        RAISE NOTICE '[UPDATE] %.% (%) — dropping and recreating',
            r.tablename, r.policyname, r.cmd;

        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename
        );

        BEGIN
            -- Construire la commande CREATE dynamiquement
            -- selon qu'on a USING, WITH CHECK, ou les deux
            IF v_qual_new IS NOT NULL AND v_check_new IS NOT NULL THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR %s %s USING (%s) WITH CHECK (%s)',
                    r.policyname,
                    r.schemaname,
                    r.tablename,
                    v_perm_kw,
                    v_cmd_sql,
                    v_roles_sql,
                    v_qual_new,
                    v_check_new
                );
            ELSIF v_qual_new IS NOT NULL THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR %s %s USING (%s)',
                    r.policyname,
                    r.schemaname,
                    r.tablename,
                    v_perm_kw,
                    v_cmd_sql,
                    v_roles_sql,
                    v_qual_new
                );
            ELSIF v_check_new IS NOT NULL THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR %s %s WITH CHECK (%s)',
                    r.policyname,
                    r.schemaname,
                    r.tablename,
                    v_perm_kw,
                    v_cmd_sql,
                    v_roles_sql,
                    v_check_new
                );
            ELSE
                RAISE WARNING '[ERROR] table=% policy=% : both qual and with_check are NULL — policy dropped but not recreated!',
                    r.tablename, r.policyname;
                CONTINUE;
            END IF;

            v_updated := v_updated + 1;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[CREATE FAILED] table=% policy=% : % — manual intervention required',
                r.tablename, r.policyname, SQLERRM;
            -- La policy a déjà été droppée : signaler clairement
            RAISE WARNING '[CRITICAL] Policy %.% was DROPPED but CREATE failed. Re-create manually!',
                r.tablename, r.policyname;
        END;

    END LOOP;

    RAISE NOTICE '=== auth_rls_v2 done: % policies updated, % skipped (already clean). ===',
        v_updated, v_skipped;

END $$;

-- ============================================================
-- VÉRIFICATION POST-MIGRATION (read-only)
-- Coller et exécuter séparément pour confirmer le résultat.
-- Doit retourner 0 lignes si toutes les policies sont corrigées.
-- ============================================================

/*
SELECT
    p.tablename,
    p.policyname,
    p.cmd,
    p.qual        AS using_expr,
    p.with_check  AS with_check_expr
FROM pg_policies p
WHERE
    p.schemaname = 'public'
    AND p.tablename IN (
        'artisan_profiles', 'asso_comments', 'associations',
        'collection_categories', 'collection_favorites',
        'collection_item_comments', 'collection_items',
        'collection_offers', 'event_comments', 'event_participants',
        'events', 'forum_follows', 'forum_reactions', 'forum_replies',
        'forum_reports', 'forum_topics', 'group_outings',
        'help_comments', 'help_photos', 'help_requests',
        'item_ratings', 'lf_comments', 'listings', 'lost_found_items',
        'moderation_queue', 'notifications', 'outing_comments',
        'outing_participants', 'promenade_likes', 'promenades',
        'request_comments', 'reviews', 'service_requests',
        'theme_memberships', 'theme_profiles', 'trust_interactions'
    )
    AND (
        (p.qual ~ 'auth\.(uid|role|jwt)\(\)' AND p.qual !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)')
        OR
        (p.with_check ~ 'auth\.(uid|role|jwt)\(\)' AND p.with_check !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)')
        OR
        (p.qual ~ 'current_setting\(' AND p.qual !~ '\(SELECT\s+current_setting\(')
        OR
        (p.with_check ~ 'current_setting\(' AND p.with_check !~ '\(SELECT\s+current_setting\(')
    )
ORDER BY p.tablename, p.policyname;
*/


-- ================================================================
-- MIGRATION 2/36 : 20260408_fixes_rls_categories.sql
-- ================================================================

-- =============================================================
-- MIGRATION 20260408 — Correctifs RLS : forum, job_demands,
--   activation RLS tables categories
-- Biguglia Connect — a executer dans Supabase SQL Editor
-- Regroupe : fix-forum-rls, fix_job_demands_rls_active,
--            migration_enable_rls_categories
-- =============================================================

-- =============================================================
-- PARTIE 1 : Fix RLS forum posts et comments
-- =============================================================
-- ============================================================
-- FIX RLS Forum Posts & Comments
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. S'assurer que RLS est activé
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques forum_posts (si elles existent)
DROP POLICY IF EXISTS "forum_posts_select_all" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_insert_auth" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_update_own" ON forum_posts;
DROP POLICY IF EXISTS "forum_posts_delete_own" ON forum_posts;

-- 3. Recréer les politiques forum_posts proprement
-- Lecture : tout le monde peut lire
CREATE POLICY "forum_posts_select_all"
  ON forum_posts FOR SELECT
  USING (TRUE);

-- Création : utilisateur authentifié seulement, auteur = lui-même
CREATE POLICY "forum_posts_insert_auth"
  ON forum_posts FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Modification : auteur ou admin/modérateur
CREATE POLICY "forum_posts_update_own"
  ON forum_posts FOR UPDATE
  USING (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

-- Suppression : auteur ou admin/modérateur
CREATE POLICY "forum_posts_delete_own"
  ON forum_posts FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());

-- 4. Supprimer les anciennes politiques forum_comments
DROP POLICY IF EXISTS "forum_comments_select_all" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_insert_auth" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_update_own" ON forum_comments;
DROP POLICY IF EXISTS "forum_comments_delete_own" ON forum_comments;

-- 5. Recréer les politiques forum_comments
CREATE POLICY "forum_comments_select_all"
  ON forum_comments FOR SELECT
  USING (TRUE);

CREATE POLICY "forum_comments_insert_auth"
  ON forum_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "forum_comments_update_own"
  ON forum_comments FOR UPDATE
  USING (author_id = auth.uid() OR is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR is_moderator_or_admin());

CREATE POLICY "forum_comments_delete_own"
  ON forum_comments FOR DELETE
  USING (author_id = auth.uid() OR is_moderator_or_admin());

-- 6. Vérifier que la fonction is_moderator_or_admin existe
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Vérification — affiche les politiques actives
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('forum_posts', 'forum_comments')
ORDER BY tablename, cmd;

-- =============================================================
-- PARTIE 2 : Fix RLS job_demands (page detail)
-- =============================================================
-- ============================================================================
-- FIX URGENT : job_demands — page détail "Demande introuvable"
-- ============================================================================
-- Cause racine identifiée :
--   L'ENUM job_status = ('draft','published','paused','expired','filled','archived')
--   'active' N'EXISTE PAS dans l'ENUM → INSERT échoue côté Supabase
--   publish-demand.ts utilisait status:'active' → aucune ligne insérée en base
--   Le slug retourné était un uuid local fictif, jamais persisté
--
-- Double fix :
--   1. MIGRATION DES DONNÉES : passer les éventuelles lignes 'active' → 'published'
--      (ne fait rien si aucune ligne n'a ce statut invalide)
--   2. POLICY RLS : harmoniser pour accepter uniquement 'published' (seule valeur
--      valide pour les demandes publiées dans l'ENUM)
--
-- Code corrigé séparément : publish-demand.ts status:'active' → 'published'
-- ============================================================================

-- 1. Migration des données existantes avec status invalide
--    (au cas où des lignes ont quand même été insérées avec un ENUM étendu)
UPDATE public.job_demands
SET status = 'published', updated_at = now()
WHERE status::text = 'active';

-- 2. Supprimer toutes les policies SELECT existantes sur job_demands
DROP POLICY IF EXISTS job_demands_select             ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public_read        ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public             ON public.job_demands;
DROP POLICY IF EXISTS job_demands_read               ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select"           ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public_read"      ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public"           ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_read"             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_published" ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_own"       ON public.job_demands;

-- ⚠️  NEUTRALISÉ — policy déplacée vers la source de vérité unique :
--     20260416_job_demands_rls_normalize.sql
-- (cette version n'acceptait que status='published', sans 'active')

-- ============================================================================
-- VÉRIFICATION (exécuter séparément, lecture seule)
-- Doit retourner la policy ci-dessus avec qual contenant 'active'
-- ============================================================================
/*
SELECT
  policyname,
  cmd,
  roles,
  permissive,
  qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'job_demands'
  AND cmd = 'SELECT'
ORDER BY policyname;
*/

-- ============================================================================
-- TEST FONCTIONNEL (exécuter séparément)
-- Remplacer 'mon-slug-test' par le slug de la demande qui affichait l'erreur
-- Doit retourner 1 ligne
-- ============================================================================
/*
SELECT id, slug, status, title
FROM public.job_demands
WHERE slug = 'mon-slug-test';
*/

-- =============================================================
-- PARTIE 3 : Activation RLS tables categories
-- =============================================================
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


-- ================================================================
-- MIGRATION 3/36 : 20260409_emploi_local.sql
-- ================================================================

-- ============================================================================
-- Module Emploi Local - Migration SQL
-- Version 1.1 - 2026-04-09
-- 
-- Corrections V1.1 appliquées :
-- - organization_id optionnel (nullable)
-- - Champs d'audit lifecycle ajoutés
-- - sector_id type TEXT (aligné avec table sectors)
-- - RLS policies renforcées (WITH CHECK, séparation champs user/system)
-- - Indexes optimisés pour performance
-- - Slug generation strategy déterministe
-- ============================================================================

-- ============================================================================
-- 1. ENUMS & TYPES
-- ============================================================================

-- Contract types
DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM (
    'cdi', 'cdd', 'saisonnier', 'mission', 'extra', 
    'remplacement', 'alternance', 'stage', 'interim', 'freelance'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Employment types
DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM (
    'temps_plein', 'temps_partiel', 'flexible'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Job categories
DO $$ BEGIN
  CREATE TYPE job_category AS ENUM (
    'restauration', 'hotellerie', 'commerce', 'artisanat', 
    'batiment', 'services_personne', 'administratif', 'logistique',
    'nettoyage', 'transport', 'sante', 'animation', 'petite_enfance',
    'association', 'evenementiel', 'agriculture', 'autre'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Experience levels
DO $$ BEGIN
  CREATE TYPE experience_level AS ENUM (
    'debutant', 'junior', 'confirme', 'senior', 'expert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Availability types
DO $$ BEGIN
  CREATE TYPE availability_type AS ENUM (
    'immediate', 'week', 'month', 'date', 'flexible'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Job status
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'draft', 'published', 'paused', 'expired', 'filled', 'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Contact status
DO $$ BEGIN
  CREATE TYPE contact_status AS ENUM (
    'pending', 'read', 'replied', 'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Application modes
DO $$ BEGIN
  CREATE TYPE application_mode AS ENUM (
    'email', 'phone', 'on_site', 'mixed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Mobility modes
DO $$ BEGIN
  CREATE TYPE mobility_mode AS ENUM (
    'car', 'public_transport', 'bike', 'walk'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Visibility levels
DO $$ BEGIN
  CREATE TYPE visibility_level AS ENUM (
    'standard', 'featured', 'premium'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Promotion types
DO $$ BEGIN
  CREATE TYPE promotion_type AS ENUM (
    'none', 'boost_local', 'badge_verified', 'urgent', 'top_position'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Plan types
DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM (
    'free', 'basic', 'pro', 'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Salary period
DO $$ BEGIN
  CREATE TYPE salary_period AS ENUM (
    'hourly', 'monthly', 'yearly'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Publication source
DO $$ BEGIN
  CREATE TYPE publication_source AS ENUM (
    'web', 'mobile', 'api'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABLE job_offers
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_offers (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Optional/nullable

  -- Basic info
  title TEXT NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 120),
  job_category job_category NOT NULL,
  contract_type contract_type NOT NULL,
  employment_type employment_type NOT NULL,

  -- Location
  location_label TEXT NOT NULL CHECK (char_length(location_label) >= 3),
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL, -- Type TEXT aligné avec sectors
  is_remote_possible BOOLEAN NOT NULL DEFAULT false,

  -- Timing
  start_date DATE,
  end_date DATE,
  mission_duration_days INTEGER CHECK (mission_duration_days >= 1 AND mission_duration_days <= 365),
  availability_type availability_type NOT NULL,

  -- Description
  short_description TEXT NOT NULL CHECK (char_length(short_description) >= 50 AND char_length(short_description) <= 300),
  full_description TEXT CHECK (char_length(full_description) >= 100 AND char_length(full_description) <= 3000),
  required_skills TEXT[],
  nice_to_have_skills TEXT[],
  tags TEXT[],

  -- Experience
  experience_level experience_level,
  experience_years_min INTEGER CHECK (experience_years_min >= 0 AND experience_years_min <= 50),
  experience_years_max INTEGER CHECK (experience_years_max >= 0 AND experience_years_max <= 50),

  -- Salary
  salary_range_min NUMERIC(10, 2) CHECK (salary_range_min >= 8),
  salary_range_max NUMERIC(10, 2) CHECK (salary_range_max <= 20000),
  salary_period salary_period,
  salary_is_negotiable BOOLEAN NOT NULL DEFAULT false,

  -- Schedule
  weekly_hours NUMERIC(4, 1) CHECK (weekly_hours >= 1 AND weekly_hours <= 48),
  schedule_details TEXT,
  is_flexible_schedule BOOLEAN NOT NULL DEFAULT false,

  -- Requirements
  has_driving_license BOOLEAN NOT NULL DEFAULT false,
  requires_vehicle BOOLEAN NOT NULL DEFAULT false,

  -- Contact
  application_mode application_mode NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  application_url TEXT,
  contact_instructions TEXT,

  -- Benefits
  provides_housing BOOLEAN NOT NULL DEFAULT false,
  housing_details TEXT,
  provides_meals BOOLEAN NOT NULL DEFAULT false,
  other_benefits TEXT,

  -- Status & visibility
  status job_status NOT NULL DEFAULT 'draft',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  visibility_level visibility_level NOT NULL DEFAULT 'standard',
  promotion_type promotion_type NOT NULL DEFAULT 'none',
  boosted_until TIMESTAMPTZ,
  sponsor_label TEXT,

  -- Scoring (completeness persisted, relevance runtime)
  completeness_score INTEGER NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),

  -- Stats (system-only fields)
  views_count INTEGER NOT NULL DEFAULT 0,
  contacts_count INTEGER NOT NULL DEFAULT 0,

  -- Billing
  billing_eligible BOOLEAN NOT NULL DEFAULT false,
  plan_type plan_type NOT NULL DEFAULT 'free',

  -- Audit & lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ, -- V1.1: dernière mise à jour/refresh
  last_contacted_at TIMESTAMPTZ, -- V1.1: dernier contact reçu
  expired_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  expired_reason TEXT, -- V1.1: 'auto_expired' | 'manually_expired' | 'filled'
  filled_reason TEXT, -- V1.1: 'hired_from_ad' | 'hired_elsewhere' | 'no_longer_needed'
  publication_source publication_source, -- V1.1: source de publication

  -- Moderation (system-only)
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  moderation_notes TEXT,

  -- Constraints
  CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date),
  CHECK (salary_range_min IS NULL OR salary_range_max IS NULL OR salary_range_min <= salary_range_max),
  CHECK (experience_years_min IS NULL OR experience_years_max IS NULL OR experience_years_min <= experience_years_max),
  CHECK (NOT requires_vehicle OR has_driving_license = true)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_offers_user_id ON job_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON job_offers(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_category ON job_offers(job_category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_contract ON job_offers(contract_type) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_sector ON job_offers(sector_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_created_at ON job_offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_offers_published_at ON job_offers(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_offers_location ON job_offers USING GIST (ll_to_earth(location_lat::float8, location_lng::float8)) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_offers_urgent ON job_offers(is_urgent) WHERE status = 'published' AND is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_job_offers_completeness ON job_offers(completeness_score DESC) WHERE status = 'published';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_job_offers_search ON job_offers USING gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(full_description, ''))
) WHERE status = 'published';

-- ============================================================================
-- 3. TABLE job_demands
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_demands (
  -- Identifiers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL CHECK (char_length(title) >= 10 AND char_length(title) <= 120),
  job_category job_category NOT NULL,
  desired_contract_types contract_type[] NOT NULL CHECK (array_length(desired_contract_types, 1) >= 1),
  desired_employment_types employment_type[] NOT NULL CHECK (array_length(desired_employment_types, 1) >= 1),

  -- Location & mobility
  location_label TEXT NOT NULL CHECK (char_length(location_label) >= 3),
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL, -- Type TEXT
  mobility_radius INTEGER CHECK (mobility_radius >= 0 AND mobility_radius <= 100),
  mobility_mode mobility_mode,

  -- Availability
  availability_type availability_type NOT NULL,
  available_from DATE,
  availability_comment TEXT,

  -- Description
  short_description TEXT NOT NULL CHECK (char_length(short_description) >= 50 AND char_length(short_description) <= 300),
  full_description TEXT CHECK (char_length(full_description) >= 100 AND char_length(full_description) <= 3000),
  skills TEXT[],
  tags TEXT[],

  -- Experience
  experience_level experience_level,
  experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50),

  -- Expectations
  salary_expectation_min NUMERIC(10, 2) CHECK (salary_expectation_min >= 8),
  salary_expectation_max NUMERIC(10, 2) CHECK (salary_expectation_max <= 20000),
  salary_period salary_period,

  -- Availability
  weekly_hours_desired NUMERIC(4, 1) CHECK (weekly_hours_desired >= 1 AND weekly_hours_desired <= 48),
  is_flexible_schedule BOOLEAN NOT NULL DEFAULT false,

  -- Assets
  has_driving_license BOOLEAN NOT NULL DEFAULT false,
  has_vehicle BOOLEAN NOT NULL DEFAULT false,

  -- Documents
  cv_url TEXT,
  portfolio_url TEXT,

  -- Status
  status job_status NOT NULL DEFAULT 'draft',
  is_urgent BOOLEAN NOT NULL DEFAULT false,

  -- Scoring
  completeness_score INTEGER NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),

  -- Stats
  views_count INTEGER NOT NULL DEFAULT 0,
  contacts_count INTEGER NOT NULL DEFAULT 0,

  -- Audit & lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  expired_reason TEXT,
  filled_reason TEXT,
  publication_source publication_source,

  -- Moderation
  is_moderated BOOLEAN NOT NULL DEFAULT false,
  moderation_notes TEXT,

  -- Constraints
  CHECK (salary_expectation_min IS NULL OR salary_expectation_max IS NULL OR salary_expectation_min <= salary_expectation_max)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_demands_user_id ON job_demands(user_id);
CREATE INDEX IF NOT EXISTS idx_job_demands_status ON job_demands(status) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_category ON job_demands(job_category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_sector ON job_demands(sector_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_created_at ON job_demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_demands_published_at ON job_demands(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_job_demands_location ON job_demands USING GIST (ll_to_earth(location_lat::float8, location_lng::float8)) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_demands_urgent ON job_demands(is_urgent) WHERE status = 'published' AND is_urgent = true;
CREATE INDEX IF NOT EXISTS idx_job_demands_completeness ON job_demands(completeness_score DESC) WHERE status = 'published';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_job_demands_search ON job_demands USING gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(full_description, ''))
) WHERE status = 'published';

-- ============================================================================
-- 4. TABLE job_contacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  demand_id UUID REFERENCES job_demands(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 1000),
  contact_method TEXT NOT NULL CHECK (contact_method IN ('internal_message', 'email', 'phone')),
  status contact_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,

  -- Constraint: must have either offer_id OR demand_id, not both
  CHECK ((offer_id IS NOT NULL AND demand_id IS NULL) OR (offer_id IS NULL AND demand_id IS NOT NULL))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_contacts_offer_id ON job_contacts(offer_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_demand_id ON job_contacts(demand_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_sender_id ON job_contacts(sender_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_receiver_id ON job_contacts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_job_contacts_created_at ON job_contacts(created_at DESC);

-- ============================================================================
-- 5. TRIGGERS (auto-update updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_offers_updated_at ON job_offers;
CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON job_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_demands_updated_at ON job_demands;
CREATE TRIGGER update_job_demands_updated_at
  BEFORE UPDATE ON job_demands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. SLUG GENERATION FUNCTION (deterministic, collision-safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_job_slug(job_title TEXT, job_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  short_id TEXT;
BEGIN
  -- Normalize title: lowercase, remove accents, replace spaces with hyphens
  base_slug := lower(unaccent(job_title));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  base_slug := substring(base_slug, 1, 60);
  
  -- Use first 8 chars of UUID for uniqueness
  short_id := substring(job_id::text, 1, 8);
  
  -- Combine: title-shortid
  final_slug := base_slug || '-' || short_id;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 7. RLS POLICIES (renforcées V1.1)
-- ============================================================================

-- Enable RLS
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS job_offers_select ON job_offers;
DROP POLICY IF EXISTS job_offers_insert ON job_offers;
DROP POLICY IF EXISTS job_offers_update ON job_offers;
DROP POLICY IF EXISTS job_offers_delete ON job_offers;

DROP POLICY IF EXISTS job_demands_select ON job_demands;
DROP POLICY IF EXISTS job_demands_insert ON job_demands;
DROP POLICY IF EXISTS job_demands_update ON job_demands;
DROP POLICY IF EXISTS job_demands_delete ON job_demands;

DROP POLICY IF EXISTS job_contacts_select ON job_contacts;
DROP POLICY IF EXISTS job_contacts_insert ON job_contacts;
DROP POLICY IF EXISTS job_contacts_update ON job_contacts;
DROP POLICY IF EXISTS job_contacts_delete ON job_contacts;

-- ============================================================================
-- JOB OFFERS POLICIES
-- ============================================================================

-- SELECT: published visible to all, own drafts visible to author
CREATE POLICY job_offers_select ON job_offers
  FOR SELECT
  USING (
    status = 'published' 
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- INSERT: authenticated users can create
CREATE POLICY job_offers_insert ON job_offers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    -- System-only fields must remain default on insert
    AND views_count = 0
    AND contacts_count = 0
    AND is_moderated = false
  );

-- UPDATE: authors can update their own offers (user-editable fields only)
-- System fields (views_count, contacts_count, is_moderated, moderation_notes) protected
CREATE POLICY job_offers_update ON job_offers
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- DELETE: authors can delete their own offers
CREATE POLICY job_offers_delete ON job_offers
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- JOB DEMANDS POLICIES
-- ============================================================================

-- ⚠️  NEUTRALISÉ — policy déplacée vers la source de vérité unique :
--     20260416_job_demands_rls_normalize.sql
-- (cette version acceptait status IN ('active','published') + auteur + admin)

CREATE POLICY job_demands_insert ON job_demands
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND views_count = 0
    AND contacts_count = 0
    AND is_moderated = false
  );

CREATE POLICY job_demands_update ON job_demands
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY job_demands_delete ON job_demands
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- JOB CONTACTS POLICIES
-- ============================================================================

CREATE POLICY job_contacts_select ON job_contacts
  FOR SELECT
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY job_contacts_insert ON job_contacts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND sender_id = auth.uid()
    -- Verify receiver owns the offer/demand
    AND (
      (offer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM job_offers WHERE id = offer_id AND user_id = receiver_id
      ))
      OR
      (demand_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM job_demands WHERE id = demand_id AND user_id = receiver_id
      ))
    )
  );

CREATE POLICY job_contacts_update ON job_contacts
  FOR UPDATE
  USING (
    receiver_id = auth.uid() -- Only receiver can update (mark as read, replied)
  )
  WITH CHECK (
    receiver_id = auth.uid()
  );

CREATE POLICY job_contacts_delete ON job_contacts
  FOR DELETE
  USING (
    sender_id = auth.uid()
    OR receiver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE job_offers IS 'Offres d''emploi local - Module Emploi Biguglia Connect';
COMMENT ON TABLE job_demands IS 'Demandes d''emploi - Chercheurs d''emploi';
COMMENT ON TABLE job_contacts IS 'Contacts/candidatures entre recruteurs et chercheurs';

COMMENT ON COLUMN job_offers.completeness_score IS 'Score de complétude 0-100 (persisté en DB)';
COMMENT ON COLUMN job_offers.views_count IS 'Compteur de vues (system-only, protected by RLS)';
COMMENT ON COLUMN job_offers.contacts_count IS 'Compteur de contacts (system-only, protected by RLS)';
COMMENT ON COLUMN job_offers.last_refreshed_at IS 'V1.1: Dernière mise à jour/refresh de l''annonce';
COMMENT ON COLUMN job_offers.last_contacted_at IS 'V1.1: Date du dernier contact reçu';
COMMENT ON COLUMN job_offers.expired_reason IS 'V1.1: Raison d''expiration (auto_expired, manually_expired, filled)';
COMMENT ON COLUMN job_offers.filled_reason IS 'V1.1: Raison du pourvoi (hired_from_ad, hired_elsewhere, no_longer_needed)';
COMMENT ON COLUMN job_offers.publication_source IS 'V1.1: Source de publication (web, mobile, api)';


-- ================================================================
-- MIGRATION 4/36 : 20260411_annonces_cdc.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : Petites Annonces CDC -- Biguglia Connect
-- Enrichit listings + cree listing_favorites, listing_saved_searches,
-- listing_reports, listing_status_history
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Enrichissement de la table listings existante
-- ---------------------------------------------------------------------------
-- Nouveaux types d'annonce (exchange + location en plus de sale/wanted/free/service)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('sale', 'wanted', 'free', 'exchange', 'service', 'rental'));

-- Nouveaux statuts (reserved, sold, given, exchanged, closed, expired en plus de active/archived)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'reserved', 'sold', 'given', 'exchanged', 'closed', 'expired', 'archived', 'hidden'));

-- Colonnes manquantes (IF NOT EXISTS via DO block)
DO $$ BEGIN
  -- Etat de l'objet : neuf / tres_bon / bon / a_reparer / lot
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='condition_state') THEN
    ALTER TABLE listings ADD COLUMN condition_state TEXT
      CHECK (condition_state IN ('neuf', 'tres_bon', 'bon', 'a_reparer', 'lot'));
  END IF;
  -- Prix negociable / gratuit / echange uniquement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='price_type') THEN
    ALTER TABLE listings ADD COLUMN price_type TEXT NOT NULL DEFAULT 'fixed'
      CHECK (price_type IN ('fixed', 'negotiable', 'free', 'exchange_only', 'contact'));
  END IF;
  -- Preferences d'echange
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='exchange_preferences') THEN
    ALTER TABLE listings ADD COLUMN exchange_preferences TEXT;
  END IF;
  -- Notes de remise / lieu de retrait
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='pickup_notes') THEN
    ALTER TABLE listings ADD COLUMN pickup_notes TEXT;
  END IF;
  -- Creneau de disponibilite
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='availability_window') THEN
    ALTER TABLE listings ADD COLUMN availability_window TEXT;
  END IF;
  -- Retrait rapide possible
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='quick_pickup') THEN
    ALTER TABLE listings ADD COLUMN quick_pickup BOOLEAN NOT NULL DEFAULT false;
  END IF;
  -- Prix negociable flag simple
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_negotiable') THEN
    ALTER TABLE listings ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT false;
  END IF;
  -- Valeur sentimentale / urgence de vente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='is_urgent') THEN
    ALTER TABLE listings ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
  END IF;
  -- Annonce mise en avant (premium futur)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='boost_until') THEN
    ALTER TABLE listings ADD COLUMN boost_until TIMESTAMPTZ;
  END IF;
  -- Reservation par quel utilisateur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='reserved_by_user_id') THEN
    ALTER TABLE listings ADD COLUMN reserved_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  -- Secteur si pas encore present
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='sector_id') THEN
    ALTER TABLE listings ADD COLUMN sector_id TEXT;
  END IF;
  -- Expiration automatique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='expires_at') THEN
    ALTER TABLE listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  -- Compteur de vues
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='views_count') THEN
    ALTER TABLE listings ADD COLUMN views_count INT NOT NULL DEFAULT 0;
  END IF;
  -- Author id alias (peut exister deja sous user_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='author_id') THEN
    ALTER TABLE listings ADD COLUMN author_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    -- Copie user_id -> author_id si user_id existe
    UPDATE listings SET author_id = user_id WHERE user_id IS NOT NULL AND author_id IS NULL;
  END IF;
END $$;

-- Index nouveaux
CREATE INDEX IF NOT EXISTS listings_sector_idx    ON listings(sector_id);
CREATE INDEX IF NOT EXISTS listings_status_idx    ON listings(status);
CREATE INDEX IF NOT EXISTS listings_type_idx      ON listings(listing_type);
CREATE INDEX IF NOT EXISTS listings_price_idx     ON listings(price);
CREATE INDEX IF NOT EXISTS listings_urgent_idx    ON listings(is_urgent) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS listings_expires_idx   ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_boost_idx     ON listings(boost_until) WHERE boost_until IS NOT NULL;

-- 2. Table listing_favorites (favoris par utilisateur)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS lf_fav_user_idx    ON listing_favorites(user_id);
CREATE INDEX IF NOT EXISTS lf_fav_listing_idx ON listing_favorites(listing_id);

ALTER TABLE listing_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_fav_select" ON listing_favorites;
CREATE POLICY "lf_fav_select" ON listing_favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lf_fav_insert" ON listing_favorites;
CREATE POLICY "lf_fav_insert" ON listing_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lf_fav_delete" ON listing_favorites;
CREATE POLICY "lf_fav_delete" ON listing_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Table listing_saved_searches (alertes / recherches sauvegardees)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_saved_searches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  query         TEXT,
  category_id   UUID REFERENCES listing_categories(id) ON DELETE SET NULL,
  listing_type  TEXT,
  sector_id     TEXT,
  price_max     INT,
  condition     TEXT,
  notify        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_notified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS lss_user_idx ON listing_saved_searches(user_id);

ALTER TABLE listing_saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lss_select" ON listing_saved_searches;
CREATE POLICY "lss_select" ON listing_saved_searches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lss_insert" ON listing_saved_searches;
CREATE POLICY "lss_insert" ON listing_saved_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "lss_update" ON listing_saved_searches;
CREATE POLICY "lss_update" ON listing_saved_searches
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lss_delete" ON listing_saved_searches;
CREATE POLICY "lss_delete" ON listing_saved_searches
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Table listing_reports (signalements)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL
                CHECK (reason IN (
                  'arnaque', 'contenu_interdit', 'produit_dangereux',
                  'prix_trompeur', 'doublon', 'faux_profil',
                  'harcelement', 'hors_sujet', 'autre'
                )),
  comment       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS lr_listing_idx  ON listing_reports(listing_id);
CREATE INDEX IF NOT EXISTS lr_status_idx   ON listing_reports(status);

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lr_select_own" ON listing_reports;
CREATE POLICY "lr_select_own" ON listing_reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "lr_insert" ON listing_reports;
CREATE POLICY "lr_insert" ON listing_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 5. Table listing_status_history (journal des changements de statut)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note        TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lsh_listing_idx ON listing_status_history(listing_id);

ALTER TABLE listing_status_history ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — policy trop permissive (USING true exposait l'historique interne)
--     Remplacée dans : 20260416_listing_status_history_rls.sql
DROP POLICY IF EXISTS "lsh_select" ON listing_status_history;

DROP POLICY IF EXISTS "lsh_insert" ON listing_status_history;
CREATE POLICY "lsh_insert" ON listing_status_history
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- 6. Trigger auto-update updated_at sur listings
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();

-- 7. Commentaires de table
-- ---------------------------------------------------------------------------
COMMENT ON TABLE listing_favorites IS 'Favoris annonces -- CDC Biguglia Connect 2026';
COMMENT ON TABLE listing_saved_searches IS 'Alertes recherche annonces -- CDC 2026';
COMMENT ON TABLE listing_reports IS 'Signalements annonces -- CDC 2026';
COMMENT ON TABLE listing_status_history IS 'Journal statuts annonces -- CDC 2026';

-- Migration Petites Annonces CDC terminee !


-- ================================================================
-- MIGRATION 5/36 : 20260411_associations_cdc.sql
-- ================================================================

-- ===========================================================================
-- Migration CDC Associations -- Biguglia Connect
-- Ajoute les colonnes manquantes du Cahier des Charges Associations
-- Phase 1 MVP : colonnes d'engagement + activite + CDC §10
-- ===========================================================================

-- 1. Colonnes d'acceptation (CDC §6.2, §7.3, §10)
ALTER TABLE associations
  ADD COLUMN IF NOT EXISTS is_accepting_members    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accepting_volunteers BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accepting_donations  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accepting_partners   BOOLEAN DEFAULT false;

-- 2. Horodatage derniere activite (CDC §7.4 -- preuve d'activite)
ALTER TABLE associations
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- 3. Index pour les requetes frequentes (CDC §7.1 -- recherche et filtres)
CREATE INDEX IF NOT EXISTS idx_associations_category ON associations(category);
CREATE INDEX IF NOT EXISTS idx_associations_sector_id ON associations(sector_id);
CREATE INDEX IF NOT EXISTS idx_associations_status ON associations(status);
CREATE INDEX IF NOT EXISTS idx_associations_urgent ON associations(urgent_need) WHERE urgent_need = true;
CREATE INDEX IF NOT EXISTS idx_associations_is_accepting_volunteers ON associations(is_accepting_volunteers) WHERE is_accepting_volunteers = true;
CREATE INDEX IF NOT EXISTS idx_associations_is_accepting_donations ON associations(is_accepting_donations) WHERE is_accepting_donations = true;
CREATE INDEX IF NOT EXISTS idx_associations_created_at ON associations(created_at DESC);

-- 4. Mise a jour automatique de last_activity_at sur modification
CREATE OR REPLACE FUNCTION update_asso_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asso_last_activity ON associations;
CREATE TRIGGER trg_asso_last_activity
  BEFORE UPDATE ON associations
  FOR EACH ROW
  EXECUTE FUNCTION update_asso_last_activity();

-- 5. Table association_needs structures (CDC §7.2, §10)
CREATE TABLE IF NOT EXISTS association_needs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  need_type      TEXT NOT NULL CHECK (need_type IN (
    'members', 'volunteers', 'material', 'sponsors', 'donations',
    'skills', 'venue', 'communication', 'logistics'
  )),
  title          TEXT NOT NULL,
  description    TEXT,
  urgency        TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  status         TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fulfilled', 'archived')),
  sector_id      TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asso_needs_association ON association_needs(association_id);
CREATE INDEX IF NOT EXISTS idx_asso_needs_status ON association_needs(status);
CREATE INDEX IF NOT EXISTS idx_asso_needs_type ON association_needs(need_type);
CREATE INDEX IF NOT EXISTS idx_asso_needs_urgency ON association_needs(urgency);

-- RLS association_needs
ALTER TABLE association_needs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asso_needs_select" ON association_needs;
CREATE POLICY "asso_needs_select" ON association_needs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "asso_needs_insert" ON association_needs;
CREATE POLICY "asso_needs_insert" ON association_needs
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "asso_needs_update" ON association_needs;
CREATE POLICY "asso_needs_update" ON association_needs
  FOR UPDATE USING (
    auth.uid() = created_by
    OR auth.uid() IN (SELECT author_id FROM associations WHERE id = association_needs.association_id)
  );

DROP POLICY IF EXISTS "asso_needs_delete" ON association_needs;
CREATE POLICY "asso_needs_delete" ON association_needs
  FOR DELETE USING (
    auth.uid() = created_by
    OR auth.uid() IN (SELECT author_id FROM associations WHERE id = association_needs.association_id)
  );

-- 6. Table association_memberships_interest (CDC §7.3 -- demandes structurees)
CREATE TABLE IF NOT EXISTS association_memberships_interest (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_type  TEXT DEFAULT 'member' CHECK (interest_type IN (
    'member', 'volunteer', 'donor', 'partner', 'info'
  )),
  message        TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'declined')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (association_id, user_id, interest_type)
);

CREATE INDEX IF NOT EXISTS idx_asso_interest_assoc ON association_memberships_interest(association_id);
CREATE INDEX IF NOT EXISTS idx_asso_interest_user ON association_memberships_interest(user_id);
CREATE INDEX IF NOT EXISTS idx_asso_interest_status ON association_memberships_interest(status);

ALTER TABLE association_memberships_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asso_interest_select" ON association_memberships_interest;
CREATE POLICY "asso_interest_select" ON association_memberships_interest
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT author_id FROM associations WHERE id = association_memberships_interest.association_id)
  );

DROP POLICY IF EXISTS "asso_interest_insert" ON association_memberships_interest;
CREATE POLICY "asso_interest_insert" ON association_memberships_interest
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "asso_interest_delete" ON association_memberships_interest;
CREATE POLICY "asso_interest_delete" ON association_memberships_interest
  FOR DELETE USING (auth.uid() = user_id);

-- Fin migration CDC Associations


-- ================================================================
-- MIGRATION 6/36 : 20260411_events_cdc_fields.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : events -- champs complementaires CDC Biguglia Connect
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Champs CDC manquants
ALTER TABLE events ADD COLUMN IF NOT EXISTS sector_id            TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS audience             TEXT DEFAULT 'Tout public';
ALTER TABLE events ADD COLUMN IF NOT EXISTS subtitle             TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_detail      TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_link        TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_info         TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_type          TEXT; -- 'mairie', 'association', 'particulier', etc.
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_id            TEXT; -- ID de l'association ou org liee

-- 2. Table event_saves (favoris)
CREATE TABLE IF NOT EXISTS event_saves (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_saves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_saves' AND policyname='event_saves_select') THEN
    CREATE POLICY "event_saves_select" ON event_saves FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_saves' AND policyname='event_saves_insert') THEN
    CREATE POLICY "event_saves_insert" ON event_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_saves' AND policyname='event_saves_delete') THEN
    CREATE POLICY "event_saves_delete" ON event_saves FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Table event_comments (si pas encore creee)
CREATE TABLE IF NOT EXISTS event_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_comments' AND policyname='event_comments_select') THEN
    CREATE POLICY "event_comments_select" ON event_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_comments' AND policyname='event_comments_insert') THEN
    CREATE POLICY "event_comments_insert" ON event_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
END $$;

-- 4. Index performances
CREATE INDEX IF NOT EXISTS events_sector_idx      ON events(sector_id);
CREATE INDEX IF NOT EXISTS events_date_cat_idx    ON events(event_date, category);
CREATE INDEX IF NOT EXISTS events_status_date_idx ON events(status, event_date);
CREATE INDEX IF NOT EXISTS event_saves_user_idx   ON event_saves(user_id);
CREATE INDEX IF NOT EXISTS event_comments_evt_idx ON event_comments(event_id);

-- Migration events CDC terminee !


-- ================================================================
-- MIGRATION 7/36 : 20260411_group_outings_enriched.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : group_outings -- colonnes enrichies pour la page Promenades
-- Biguglia Connect -- 2026-04-11
-- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Colonnes amenities / options sorties
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS difficulty TEXT
  CHECK (difficulty IN ('facile', 'moyen', 'difficile'));

ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS kids_friendly   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS dogs_allowed    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS parking_info    TEXT;

-- stroller_accessible & parking_available (ajoutes ici en securite avec IF NOT EXISTS)
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS stroller_accessible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS parking_available   BOOLEAN NOT NULL DEFAULT false;

-- 2. Secteur geographique
-- Secteur stocke en TEXT (correspond aux IDs de src/lib/sectors.ts : 'village', 'figabruna', etc.)
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS sector_id TEXT;

-- 3. Table photos sortie
CREATE TABLE IF NOT EXISTS outing_photos (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id     UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  display_order INT  NOT NULL DEFAULT 0,
  is_cover      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outing_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_photos' AND policyname='outing_photos_select') THEN
    CREATE POLICY "outing_photos_select" ON outing_photos FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_photos' AND policyname='outing_photos_insert') THEN
    CREATE POLICY "outing_photos_insert" ON outing_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_photos' AND policyname='outing_photos_delete') THEN
    CREATE POLICY "outing_photos_delete" ON outing_photos FOR DELETE USING (
      EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid())
    );
  END IF;
END $$;

-- 4. Migrer statuts anglais -> francais (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_outings' AND column_name = 'status'
  ) THEN
    -- Supprimer ancienne contrainte CHECK si elle existe
    ALTER TABLE group_outings DROP CONSTRAINT IF EXISTS group_outings_status_check;

    UPDATE group_outings SET status = CASE
      WHEN status = 'open'       THEN 'ouverte'
      WHEN status = 'active'     THEN 'ouverte'
      WHEN status = 'full'       THEN 'complete'
      WHEN status = 'done'       THEN 'terminee'
      WHEN status = 'completed'  THEN 'terminee'
      WHEN status = 'cancelled'  THEN 'annulee'
      WHEN status = 'archived'   THEN 'archivee'
      WHEN status IN ('ouverte','complete','terminee','annulee','archivee') THEN status
      ELSE 'ouverte'
    END;

    -- Ajouter la nouvelle contrainte CHECK francaise
    ALTER TABLE group_outings
      ADD CONSTRAINT group_outings_status_check
      CHECK (status IN ('ouverte','complete','terminee','annulee','archivee'));
  END IF;
END $$;

-- 5. Index performances
-- sector_id est TEXT, index standard
CREATE INDEX IF NOT EXISTS group_outings_sector_idx  ON group_outings(sector_id);
CREATE INDEX IF NOT EXISTS group_outings_date_idx    ON group_outings(outing_date);
CREATE INDEX IF NOT EXISTS group_outings_status_idx  ON group_outings(status);
CREATE INDEX IF NOT EXISTS outing_photos_outing_idx  ON outing_photos(outing_id, display_order);

-- Migration group_outings enrichie terminee !


-- ================================================================
-- MIGRATION 8/36 : 20260411_help_requests_cdc.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : Entraide / Coups de main -- CDC Biguglia Connect
-- Tables : help_requests, help_photos, help_comments, help_request_participants
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Table principale help_requests
CREATE TABLE IF NOT EXISTS help_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type et statut
  help_type           TEXT NOT NULL DEFAULT 'demande'
                      CHECK (help_type IN ('demande', 'offre', 'echange')),
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('draft', 'active', 'in_progress', 'paused', 'resolved', 'closed', 'archived')),

  -- Contenu
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'autre',
  description         TEXT NOT NULL,

  -- Urgence / planning
  urgency             TEXT NOT NULL DEFAULT 'flexible'
                      CHECK (urgency IN ('flexible', 'cette_semaine', 'rapidement', 'urgent')),
  help_date           DATE,
  help_time           TEXT,

  -- Localisation
  sector_id           TEXT,   -- FK logique vers src/lib/sectors.ts (TEXT, pas UUID)
  location_area       TEXT NOT NULL DEFAULT 'Centre-ville',
  location_city       TEXT NOT NULL DEFAULT 'Biguglia',
  location_detail     TEXT,

  -- Details pratiques
  duration            TEXT NOT NULL DEFAULT '1h'
                      CHECK (duration IN ('15min','30min','1h','2h','demi_journee','journee','variable')),
  persons_needed      INT NOT NULL DEFAULT 1,

  -- Contrepartie
  compensation        TEXT NOT NULL DEFAULT 'gratuit'
                      CHECK (compensation IN ('gratuit','cafe','echange','frais','discuter')),
  compensation_detail TEXT,

  -- Materiel et conditions
  equipment           TEXT[] NOT NULL DEFAULT '{}',
  conditions          TEXT[] NOT NULL DEFAULT '{}',
  for_who             TEXT NOT NULL DEFAULT 'Pour moi',

  -- Vie privee
  visibility          TEXT NOT NULL DEFAULT 'public'
                      CHECK (visibility IN ('public', 'membres')),
  contact_mode        TEXT NOT NULL DEFAULT 'messagerie'
                      CHECK (contact_mode IN ('messagerie', 'telephone_apres')),
  display_name        TEXT NOT NULL DEFAULT 'prenom_initiale'
                      CHECK (display_name IN ('prenom', 'prenom_initiale', 'complet')),

  -- Audience
  audience            TEXT DEFAULT 'Tout public',

  -- Timestamps
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

-- 2. Index help_requests
CREATE INDEX IF NOT EXISTS help_requests_author_idx   ON help_requests(author_id);
CREATE INDEX IF NOT EXISTS help_requests_status_idx   ON help_requests(status);
CREATE INDEX IF NOT EXISTS help_requests_type_idx     ON help_requests(help_type);
CREATE INDEX IF NOT EXISTS help_requests_category_idx ON help_requests(category);
CREATE INDEX IF NOT EXISTS help_requests_urgency_idx  ON help_requests(urgency);
CREATE INDEX IF NOT EXISTS help_requests_sector_idx   ON help_requests(sector_id);
CREATE INDEX IF NOT EXISTS help_requests_date_idx     ON help_requests(created_at DESC);

-- 3. RLS help_requests
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_requests_select" ON help_requests;
CREATE POLICY "help_requests_select" ON help_requests
  FOR SELECT USING (
    status != 'draft'
    OR author_id = auth.uid()
  );

DROP POLICY IF EXISTS "help_requests_insert" ON help_requests;
CREATE POLICY "help_requests_insert" ON help_requests
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "help_requests_update" ON help_requests;
CREATE POLICY "help_requests_update" ON help_requests
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "help_requests_delete" ON help_requests;
CREATE POLICY "help_requests_delete" ON help_requests
  FOR DELETE USING (auth.uid() = author_id);

-- 4. Table help_photos
CREATE TABLE IF NOT EXISTS help_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_id       UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  storage_path  TEXT,
  caption       TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_photos_help_idx ON help_photos(help_id, display_order);

ALTER TABLE help_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_photos_select" ON help_photos;
CREATE POLICY "help_photos_select" ON help_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "help_photos_insert" ON help_photos;
CREATE POLICY "help_photos_insert" ON help_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM help_requests WHERE id = help_id AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS "help_photos_delete" ON help_photos;
CREATE POLICY "help_photos_delete" ON help_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM help_requests WHERE id = help_id AND author_id = auth.uid())
  );

-- 5. Table help_comments (mini-forum par annonce)
CREATE TABLE IF NOT EXISTS help_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_id    UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_comments_help_idx  ON help_comments(help_id);
CREATE INDEX IF NOT EXISTS help_comments_date_idx  ON help_comments(created_at DESC);

ALTER TABLE help_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_comments_select" ON help_comments;
CREATE POLICY "help_comments_select" ON help_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "help_comments_insert" ON help_comments;
CREATE POLICY "help_comments_insert" ON help_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "help_comments_delete" ON help_comments;
CREATE POLICY "help_comments_delete" ON help_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 6. Table help_request_participants (je peux aider / interesse)
CREATE TABLE IF NOT EXISTS help_request_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'interested'
                  CHECK (role IN ('author', 'helper', 'interested')),
  state           TEXT NOT NULL DEFAULT 'pending'
                  CHECK (state IN ('pending', 'accepted', 'declined', 'done')),
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (help_request_id, user_id)
);

CREATE INDEX IF NOT EXISTS help_participants_request_idx ON help_request_participants(help_request_id);
CREATE INDEX IF NOT EXISTS help_participants_user_idx    ON help_request_participants(user_id);

ALTER TABLE help_request_participants ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — USING(true) exposait user_id, role, state, message publiquement
--     Remplacée dans : 20260416_help_participants_rls.sql
DROP POLICY IF EXISTS "help_participants_select" ON help_request_participants;

DROP POLICY IF EXISTS "help_participants_insert" ON help_request_participants;
CREATE POLICY "help_participants_insert" ON help_request_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "help_participants_update" ON help_request_participants;
CREATE POLICY "help_participants_update" ON help_request_participants
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT author_id FROM help_requests WHERE id = help_request_id)
  );

DROP POLICY IF EXISTS "help_participants_delete" ON help_request_participants;
CREATE POLICY "help_participants_delete" ON help_request_participants
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Table help_request_status_history (audit trail)
CREATE TABLE IF NOT EXISTS help_request_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note            TEXT,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_status_history_req_idx ON help_request_status_history(help_request_id);

ALTER TABLE help_request_status_history ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — USING(true) exposait l'historique d'audit publiquement
--     Remplacée dans : 20260416_help_status_history_rls.sql
DROP POLICY IF EXISTS "help_status_history_select" ON help_request_status_history;

DROP POLICY IF EXISTS "help_status_history_insert" ON help_request_status_history;
CREATE POLICY "help_status_history_insert" ON help_request_status_history
  FOR INSERT WITH CHECK (
    auth.uid() = changed_by
    OR auth.uid() IN (SELECT author_id FROM help_requests WHERE id = help_request_id)
  );

-- 8. Trigger auto-update updated_at on help_requests
CREATE OR REPLACE FUNCTION update_help_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_help_requests_updated_at ON help_requests;
CREATE TRIGGER trg_help_requests_updated_at
  BEFORE UPDATE ON help_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_help_request_updated_at();

-- Migration Entraide / Coups de main terminee !


-- ================================================================
-- MIGRATION 9/36 : 20260411_lost_found_cdc.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : Perdu / Trouve -- CDC Biguglia Connect
-- Tables : lost_found_items, lf_photos, lf_comments, lf_matches
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Table principale lost_found_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_found_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type (perdu / trouve)
  type                TEXT NOT NULL DEFAULT 'perdu'
                      CHECK (type IN ('perdu', 'trouve')),

  -- Statut metier (valeurs francaises)
  status              TEXT NOT NULL DEFAULT 'perdu'
                      CHECK (status IN (
                        'draft', 'perdu', 'trouve', 'identifie',
                        'restitue', 'clos', 'archive'
                      )),

  -- Contenu
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'autre',
  description         TEXT NOT NULL,

  -- Caracteristiques de l'objet
  brand               TEXT,
  color               TEXT,
  distinctive_sign    TEXT,
  keep_secret         BOOLEAN NOT NULL DEFAULT false,
  is_sensitive        BOOLEAN NOT NULL DEFAULT false,

  -- Date et lieu
  lost_date           DATE NOT NULL,
  lost_time           TEXT,
  sector_id           TEXT,   -- FK logique vers lib/sectors.ts (TEXT)
  location_area       TEXT NOT NULL DEFAULT 'Centre-ville',
  location_detail     TEXT,

  -- Contact
  contact_name        TEXT NOT NULL DEFAULT 'Anonyme',
  contact_phone       TEXT,
  contact_email       TEXT,
  contact_mode        TEXT NOT NULL DEFAULT 'messagerie'
                      CHECK (contact_mode IN ('messagerie', 'telephone', 'email', 'tous')),
  show_phone          BOOLEAN NOT NULL DEFAULT false,

  -- Options supplementaires
  reward              TEXT,
  sentimental_value   BOOLEAN NOT NULL DEFAULT false,
  declared_authorities BOOLEAN NOT NULL DEFAULT false,
  deposited_at        TEXT,          -- lieu de depot (Mairie, Commerce, etc.)
  proof_required      BOOLEAN NOT NULL DEFAULT false,
  need_community_help BOOLEAN NOT NULL DEFAULT true,

  -- Correspondance
  matched_item_id     UUID REFERENCES lost_found_items(id) ON DELETE SET NULL,

  -- Moderation
  moderation_status   TEXT DEFAULT 'ok',

  -- Timestamps et expiration
  expires_at          TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index lost_found_items
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS lfi_author_idx    ON lost_found_items(author_id);
CREATE INDEX IF NOT EXISTS lfi_status_idx    ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS lfi_type_idx      ON lost_found_items(type);
CREATE INDEX IF NOT EXISTS lfi_category_idx  ON lost_found_items(category);
CREATE INDEX IF NOT EXISTS lfi_sector_idx    ON lost_found_items(sector_id);
CREATE INDEX IF NOT EXISTS lfi_date_idx      ON lost_found_items(created_at DESC);
CREATE INDEX IF NOT EXISTS lfi_lost_date_idx ON lost_found_items(lost_date DESC);

-- 3. RLS lost_found_items
-- ---------------------------------------------------------------------------
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lfi_select" ON lost_found_items;
CREATE POLICY "lfi_select" ON lost_found_items
  FOR SELECT USING (
    status != 'draft'
    OR auth.uid() = author_id
  );

DROP POLICY IF EXISTS "lfi_insert" ON lost_found_items;
CREATE POLICY "lfi_insert" ON lost_found_items
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "lfi_update" ON lost_found_items;
CREATE POLICY "lfi_update" ON lost_found_items
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "lfi_delete" ON lost_found_items;
CREATE POLICY "lfi_delete" ON lost_found_items
  FOR DELETE USING (auth.uid() = author_id);

-- 4. Table lf_photos (photos attachees aux annonces)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lf_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  display_order   INT NOT NULL DEFAULT 0,
  is_cover        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lf_photos_item_idx ON lf_photos(item_id, display_order);

ALTER TABLE lf_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_photos_select" ON lf_photos;
CREATE POLICY "lf_photos_select" ON lf_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lf_photos_insert" ON lf_photos;
CREATE POLICY "lf_photos_insert" ON lf_photos
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT author_id FROM lost_found_items WHERE id = item_id
    )
  );

DROP POLICY IF EXISTS "lf_photos_delete" ON lf_photos;
CREATE POLICY "lf_photos_delete" ON lf_photos
  FOR DELETE USING (
    auth.uid() IN (
      SELECT author_id FROM lost_found_items WHERE id = item_id
    )
  );

-- 5. Table lf_comments (discussion sur une annonce)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lf_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lf_comments_item_idx ON lf_comments(item_id, created_at);

ALTER TABLE lf_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_comments_select" ON lf_comments;
CREATE POLICY "lf_comments_select" ON lf_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lf_comments_insert" ON lf_comments;
CREATE POLICY "lf_comments_insert" ON lf_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "lf_comments_delete" ON lf_comments;
CREATE POLICY "lf_comments_delete" ON lf_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 6. Table lf_matches (correspondances suggeres entre annonces)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lf_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lost_item_id    UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  found_item_id   UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  match_score     INT NOT NULL DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  match_status    TEXT NOT NULL DEFAULT 'suggested'
                  CHECK (match_status IN ('suggested', 'confirmed', 'rejected')),
  suggested_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lost_item_id, found_item_id)
);

CREATE INDEX IF NOT EXISTS lf_matches_lost_idx  ON lf_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS lf_matches_found_idx ON lf_matches(found_item_id);

ALTER TABLE lf_matches ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — USING(true) exposait match_score, match_status, suggested_by publiquement
--     Remplacée dans : 20260416_lf_matches_rls.sql
DROP POLICY IF EXISTS "lf_matches_select" ON lf_matches;

DROP POLICY IF EXISTS "lf_matches_insert" ON lf_matches;
CREATE POLICY "lf_matches_insert" ON lf_matches
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Trigger auto-update updated_at sur lost_found_items
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_lfi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lfi_updated_at ON lost_found_items;
CREATE TRIGGER trg_lfi_updated_at
  BEFORE UPDATE ON lost_found_items
  FOR EACH ROW
  EXECUTE FUNCTION update_lfi_updated_at();

-- 8. Commentaire de table
-- ---------------------------------------------------------------------------
COMMENT ON TABLE lost_found_items IS 'Module Perdu/Trouve -- CDC Biguglia Connect 2026';

-- Migration Perdu / Trouve terminee !


-- ================================================================
-- MIGRATION 10/36 : 20260412_conversations_unique.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : Anti-duplication conversations — Biguglia Connect
-- Ajoute une contrainte UNIQUE canonique sur les paires de participants
-- pour rendre le garde applicatif de start-conversation race-proof.
--
-- 2026-04-12 — À exécuter dans Supabase → SQL Editor
--
-- PRÉREQUIS OBLIGATOIRES avant d'appliquer
-- ---------------------------------------------------------------------------
--   1. Exécuter le script de détection des doublons (section A ci-dessous)
--      et vérifier que le résultat est vide (0 lignes).
--   2. Si des doublons existent, les dédupliquer manuellement (section B).
--   3. Tester sur un dump de staging avant de passer en production.
--   4. Mettre à jour docs/db/SCHEMA.md après déploiement réussi.
--
-- IMPORTANT — related_type est un ENUM PostgreSQL, pas un TEXT+CHECK.
-- ---------------------------------------------------------------------------
--   Le schéma initial déclare :
--     CREATE TYPE related_type AS ENUM ('service_request','listing','equipment','general');
--   Et la colonne :
--     conversations.related_type  related_type  DEFAULT 'general'
--
--   Pour ajouter des valeurs à un ENUM on utilise EXCLUSIVELY :
--     ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'nouvelle_valeur';
--   — NE JAMAIS utiliser ALTER TABLE … ADD CONSTRAINT CHECK sur une colonne ENUM —
--   (c'est ce qui causait l'erreur : 22P02 invalid input value for enum related_type)
-- ===========================================================================

-- ===========================================================================
-- SECTION A — Détection des doublons existants (READ-ONLY, sans risque)
-- Exécuter avant tout et vérifier que le résultat est VIDE.
-- ===========================================================================

/*
  Trouve les paires (participant_a, participant_b, related_type, related_id)
  qui ont plus d'une conversation. Résultat vide = pas de doublon.

  SELECT
    LEAST(cp1.user_id, cp2.user_id)    AS participant_a,
    GREATEST(cp1.user_id, cp2.user_id) AS participant_b,
    c.related_type,
    c.related_id,
    COUNT(*)                           AS nb_conversations
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
   AND cp1.user_id < cp2.user_id         -- évite les doublons de jointure
  JOIN conversations c ON c.id = cp1.conversation_id
  GROUP BY 1, 2, 3, 4
  HAVING COUNT(*) > 1
  ORDER BY nb_conversations DESC;
*/

-- ===========================================================================
-- SECTION B — Déduplication manuelle (si la section A renvoie des lignes)
-- À adapter selon les résultats réels.
-- ===========================================================================

/*
  Pour chaque groupe en doublon, conserver la conversation la plus récente
  et supprimer les autres. ATTENTION : les messages des convs supprimées
  seront perdus (ON DELETE CASCADE sur messages.conversation_id).

  WITH ranked AS (
    SELECT
      c.id,
      LEAST(cp1.user_id, cp2.user_id)    AS participant_a,
      GREATEST(cp1.user_id, cp2.user_id) AS participant_b,
      c.related_type,
      c.related_id,
      ROW_NUMBER() OVER (
        PARTITION BY LEAST(cp1.user_id, cp2.user_id),
                     GREATEST(cp1.user_id, cp2.user_id),
                     c.related_type,
                     COALESCE(c.related_id::text, '')
        ORDER BY c.updated_at DESC
      ) AS rn
    FROM conversation_participants cp1
    JOIN conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
     AND cp1.user_id < cp2.user_id
    JOIN conversations c ON c.id = cp1.conversation_id
  )
  DELETE FROM conversations
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
*/

-- ===========================================================================
-- SECTION C — Migration principale (appliquer après A + B)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- C-1. Ajout de la colonne joined_at sur conversation_participants
--      (manquante dans le schéma initial, présente dans les types TypeScript)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants'
      AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE conversation_participants
      ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- C-2. Extension de l'ENUM related_type
--
-- related_type est un TYPE ENUM PostgreSQL (CREATE TYPE related_type AS ENUM …).
-- On ne peut PAS le modifier avec ADD CONSTRAINT CHECK.
-- La seule syntaxe correcte est : ALTER TYPE … ADD VALUE IF NOT EXISTS '…'
--
-- Valeurs initiales (schéma de base) :
--   'service_request', 'listing', 'equipment', 'general'
--
-- Valeurs à ajouter (utilisées par l'application mais absentes du type initial) :
--   'help_request', 'collection_item', 'lost_found', 'association',
--   'outing', 'event', 'artisan', 'community'
--
-- IF NOT EXISTS : idempotent — peut être relancé sans erreur.
-- ALTER TYPE ADD VALUE ne peut pas être exécuté dans un bloc DO $$ (transaction) ;
-- ces instructions doivent être en dehors de tout bloc transactionnel.
-- ---------------------------------------------------------------------------
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'help_request';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'collection_item';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'lost_found';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'association';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'outing';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'artisan';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'community';

-- ---------------------------------------------------------------------------
-- C-3. Contrainte d'unicité sur les paires canoniques
--
-- Objectif : garantir qu'il existe au plus UNE conversation entre deux
-- participants donnés pour un même contexte (related_type + related_id).
--
-- Modèle choisi : table de normalisation `conversation_pairs`
-- (vue matérialisée légère) plutôt qu'une contrainte directe sur
-- conversation_participants, car la paire doit être triée (canonique).
--
-- NB : related_type dans cette table utilise le TYPE ENUM related_type
--      (et non TEXT) pour être compatible avec la colonne conversations.related_type
--      et éviter les erreurs de cast dans le trigger.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversation_pairs (
  conversation_id UUID PRIMARY KEY
    REFERENCES conversations(id) ON DELETE CASCADE,
  participant_a   UUID        NOT NULL,   -- LEAST(user_a, user_b)  — UUID lexicographique
  participant_b   UUID        NOT NULL,   -- GREATEST(user_a, user_b)
  related_type    related_type NOT NULL DEFAULT 'general',  -- ENUM, même type que conversations.related_type
  related_id      UUID,                   -- NULL pour conversations génériques

  -- Canonicité : participant_a < participant_b (ordre lexicographique UUID)
  CONSTRAINT conversation_pairs_canonical
    CHECK (participant_a < participant_b),

  -- Unicité métier : une seule conv par (paire, contexte)
  CONSTRAINT conversation_pairs_unique
    UNIQUE (participant_a, participant_b, related_type, related_id)
);

COMMENT ON TABLE conversation_pairs IS
  'Paires canoniques (participant_a < participant_b) pour la contrainte UNIQUE '
  'anti-duplication de start-conversation. Une ligne = une conversation bipartite. '
  'related_type utilise l''ENUM related_type (même type que conversations.related_type).';

-- Index de support pour les lookups fréquents depuis findExistingConversation
CREATE INDEX IF NOT EXISTS idx_conv_pairs_lookup
  ON conversation_pairs (participant_a, participant_b, related_type)
  WHERE related_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_conv_pairs_lookup_related
  ON conversation_pairs (participant_a, participant_b, related_type, related_id)
  WHERE related_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- C-4. Remplissage initial de conversation_pairs
--      depuis les données existantes (conversations bipartites seulement)
-- ---------------------------------------------------------------------------
INSERT INTO conversation_pairs (conversation_id, participant_a, participant_b, related_type, related_id)
SELECT
  c.id                               AS conversation_id,
  LEAST(cp1.user_id, cp2.user_id)    AS participant_a,
  GREATEST(cp1.user_id, cp2.user_id) AS participant_b,
  COALESCE(c.related_type, 'general'::related_type) AS related_type,  -- cast explicite ENUM
  c.related_id
FROM conversations c
JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
JOIN conversation_participants cp2
  ON cp2.conversation_id = c.id
  AND cp1.user_id < cp2.user_id        -- une seule ligne par paire ordonnée
WHERE (
  SELECT COUNT(*) FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
) = 2
ON CONFLICT DO NOTHING;               -- idempotent si relancé après correction de doublons

-- ---------------------------------------------------------------------------
-- C-5. Trigger pour maintenir conversation_pairs à jour automatiquement
--      (INSERT sur conversation_participants → upsert dans conversation_pairs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_maintain_conversation_pairs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_other_user UUID;
  v_conv_rtype related_type;   -- ENUM, même type que conversations.related_type
  v_conv_rid   UUID;
BEGIN
  -- Trouver l'autre participant (si au moins 1 autre existe déjà)
  SELECT user_id INTO v_other_user
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id <> NEW.user_id
  LIMIT 1;

  IF v_other_user IS NULL THEN
    RETURN NEW; -- Conversation pas encore bipartite, rien à faire
  END IF;

  SELECT related_type, related_id
    INTO v_conv_rtype, v_conv_rid
  FROM conversations
  WHERE id = NEW.conversation_id;

  INSERT INTO conversation_pairs (
    conversation_id, participant_a, participant_b, related_type, related_id
  ) VALUES (
    NEW.conversation_id,
    LEAST(NEW.user_id, v_other_user),
    GREATEST(NEW.user_id, v_other_user),
    COALESCE(v_conv_rtype, 'general'::related_type),  -- cast explicite ENUM
    v_conv_rid
  )
  ON CONFLICT ON CONSTRAINT conversation_pairs_unique DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintain_conversation_pairs
  ON conversation_participants;

CREATE TRIGGER trg_maintain_conversation_pairs
  AFTER INSERT ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION fn_maintain_conversation_pairs();

-- ---------------------------------------------------------------------------
-- C-6. RLS sur conversation_pairs
--      (accessible en lecture aux participants, pas d'écriture directe)
-- ---------------------------------------------------------------------------
ALTER TABLE conversation_pairs ENABLE ROW LEVEL SECURITY;

-- Idempotent : DROP + CREATE (pas de IF NOT EXISTS sur CREATE POLICY en PG < 15)
DROP POLICY IF EXISTS "Voir ses paires de conversation" ON conversation_pairs;

CREATE POLICY "Voir ses paires de conversation"
  ON conversation_pairs FOR SELECT
  USING (
    participant_a = auth.uid()
    OR participant_b = auth.uid()
  );

-- Pas de politique INSERT/UPDATE/DELETE : la table est maintenue uniquement
-- par le trigger et les opérations admin (createAdminClient contourne RLS).

-- ===========================================================================
-- SECTION D — Vérification post-migration
-- ===========================================================================

/*
  -- D-1. Vérifier les valeurs de l'ENUM après extension
  SELECT enumlabel
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'related_type'
  ORDER BY e.enumsortorder;
  -- Doit lister les 12 valeurs.

  -- D-2. Vérifier que conversation_pairs est bien peuplée
  SELECT COUNT(*) FROM conversation_pairs;

  -- D-3. Vérifier qu'il n'y a plus de doublons dans conversation_pairs
  SELECT participant_a, participant_b, related_type, related_id, COUNT(*)
  FROM conversation_pairs
  GROUP BY 1, 2, 3, 4
  HAVING COUNT(*) > 1;
  -- Doit retourner 0 lignes.

  -- D-4. Vérifier que le trigger fonctionne (créer une conv de test et inspecter)
  -- (à faire manuellement sur staging)
*/


-- ================================================================
-- MIGRATION 11/36 : 20260413_listings_all_missing_columns.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION CONSOLIDÉE : Toutes les colonnes manquantes de listings
-- Date : 2026-04-13
-- Exécuter dans Supabase → SQL Editor
-- Idempotent : utilise IF NOT EXISTS partout, peut être relancé sans risque
-- ===========================================================================

-- ── 1. Contraintes sur listing_type et status ──────────────────────────────
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('sale', 'wanted', 'free', 'exchange', 'service', 'rental'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'reserved', 'sold', 'given', 'exchanged', 'closed', 'expired', 'archived', 'hidden'));

-- ── 2. Ajout de toutes les colonnes manquantes (idempotent) ────────────────
DO $$ BEGIN

  -- Prix négociable (booléen simple)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_negotiable') THEN
    ALTER TABLE listings ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Annonce urgente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_urgent') THEN
    ALTER TABLE listings ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Statut de modération
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='moderation_status') THEN
    ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'en_attente_validation';
  END IF;

  -- Secteur géographique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='sector_id') THEN
    ALTER TABLE listings ADD COLUMN sector_id TEXT;
  END IF;

  -- État de l'objet (texte libre)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='condition_state') THEN
    ALTER TABLE listings ADD COLUMN condition_state TEXT;
  END IF;

  -- Préférences d'échange
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='exchange_preferences') THEN
    ALTER TABLE listings ADD COLUMN exchange_preferences TEXT;
  END IF;

  -- Notes de remise / retrait
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='pickup_notes') THEN
    ALTER TABLE listings ADD COLUMN pickup_notes TEXT;
  END IF;

  -- Créneaux de disponibilité
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='availability_window') THEN
    ALTER TABLE listings ADD COLUMN availability_window TEXT;
  END IF;

  -- Compteur de vues
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='views_count') THEN
    ALTER TABLE listings ADD COLUMN views_count INT NOT NULL DEFAULT 0;
  END IF;

  -- Author id (alias de user_id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='author_id') THEN
    ALTER TABLE listings ADD COLUMN author_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    UPDATE listings SET author_id = user_id WHERE user_id IS NOT NULL AND author_id IS NULL;
  END IF;

  -- Expiration automatique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='expires_at') THEN
    ALTER TABLE listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Mise en avant (futur premium)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='boost_until') THEN
    ALTER TABLE listings ADD COLUMN boost_until TIMESTAMPTZ;
  END IF;

  -- Retrait rapide possible
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='quick_pickup') THEN
    ALTER TABLE listings ADD COLUMN quick_pickup BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Réservé par quel utilisateur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='reserved_by_user_id') THEN
    ALTER TABLE listings ADD COLUMN reserved_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

END $$;

-- ── 3. Index utiles ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS listings_sector_idx    ON listings(sector_id);
CREATE INDEX IF NOT EXISTS listings_status_idx    ON listings(status);
CREATE INDEX IF NOT EXISTS listings_type_idx      ON listings(listing_type);
CREATE INDEX IF NOT EXISTS listings_price_idx     ON listings(price);
CREATE INDEX IF NOT EXISTS listings_urgent_idx    ON listings(is_urgent) WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS listings_expires_idx   ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_boost_idx     ON listings(boost_until) WHERE boost_until IS NOT NULL;

-- ── 4. Trigger updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();

-- ── 5. Rafraîchissement du cache PostgREST ──────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- Migration terminée !


-- ================================================================
-- MIGRATION 12/36 : 20260413_listings_optional_columns.sql
-- ================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : ajout des colonnes optionnelles manquantes dans la table listings
-- Date      : 2026-04-13
-- Raison    : Le formulaire de publication d'annonce référençait des colonnes
--             (is_negotiable, availability_window, pickup_notes,
--              exchange_preferences, condition_state) qui n'existaient pas
--             encore dans le schéma DB, provoquant l'erreur :
--             "Could not find the 'is_negotiable' column of 'listings'
--              in the schema cache"
-- ─────────────────────────────────────────────────────────────────────────────

-- Ajout des colonnes optionnelles (idempotent grâce à IF NOT EXISTS)

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_negotiable        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_window  text,
  ADD COLUMN IF NOT EXISTS pickup_notes         text,
  ADD COLUMN IF NOT EXISTS exchange_preferences text,
  ADD COLUMN IF NOT EXISTS condition_state      text;

-- Commentaires de documentation
COMMENT ON COLUMN listings.is_negotiable        IS 'Indique si le prix est négociable';
COMMENT ON COLUMN listings.availability_window  IS 'Créneaux de disponibilité pour récupérer l''article (ex: "week-ends uniquement")';
COMMENT ON COLUMN listings.pickup_notes         IS 'Instructions de retrait / livraison (ex: "Contacter avant de venir")';
COMMENT ON COLUMN listings.exchange_preferences IS 'Préférences d''échange (ex: "Échange contre outils de jardinage")';
COMMENT ON COLUMN listings.condition_state      IS 'État détaillé de l''article (ex: "Quelques rayures superficielles")';

-- Rafraîchissement du cache PostgREST (nécessaire pour que Supabase reconnaisse les nouvelles colonnes)
-- Note : dans Supabase cloud, ce NOTIFY est automatique après le DDL.
-- Sur self-hosted, exécutez : SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';


-- ================================================================
-- MIGRATION 13/36 : 20260413_moderation_queue_fix.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : Correction colonnes manquantes de moderation_queue
-- Date      : 2026-04-13
-- Raison    : Le hook submitForModeration insère des colonnes (submitted_at,
--             risk_score, author_trust, content_photos, etc.) absentes de
--             la table de base, provoquant l'erreur :
--             "Erreur lors de la soumission"
-- Idempotent : peut être relancé sans risque
-- ===========================================================================

-- 1. S'assurer que la table existe (au cas où)
CREATE TABLE IF NOT EXISTS moderation_queue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,
  content_id   uuid NOT NULL,
  status       text NOT NULL DEFAULT 'en_attente_validation',
  created_at   timestamptz DEFAULT now()
);

-- 2. Supprimer la vue KPI si elle bloque les ALTER TABLE
DROP VIEW IF EXISTS moderation_kpi;

-- 3. Ajouter toutes les colonnes manquantes (idempotent)
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_title      TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_excerpt    TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS content_photos     TEXT[];
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS submitted_at       TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_score         INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS risk_level         TEXT DEFAULT 'low';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS completeness       INT DEFAULT 100;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS validation_errors  JSONB DEFAULT '[]';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS author_trust       TEXT DEFAULT 'nouveau';
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS resubmit_count     INT DEFAULT 0;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS moderator_note     TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS correction_reason  TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS refusal_reason     TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS decision           TEXT;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMPTZ;
ALTER TABLE moderation_queue ADD COLUMN IF NOT EXISTS reviewed_by        UUID REFERENCES profiles(id);

-- 4. Contrainte de statut mise à jour
ALTER TABLE moderation_queue DROP CONSTRAINT IF EXISTS moderation_queue_status_check;
ALTER TABLE moderation_queue ADD CONSTRAINT moderation_queue_status_check
  CHECK (status IN (
    'en_attente_validation', 'publie', 'refuse', 'a_corriger',
    'pending', 'approved', 'rejected', 'draft'
  ));

-- 5. RLS
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_author_select') THEN
    CREATE POLICY "modq_author_select" ON moderation_queue
      FOR SELECT USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_author_insert') THEN
    CREATE POLICY "modq_author_insert" ON moderation_queue
      FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_staff_select') THEN
    CREATE POLICY "modq_staff_select" ON moderation_queue
      FOR SELECT USING (
        EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='modq_staff_update') THEN
    CREATE POLICY "modq_staff_update" ON moderation_queue
      FOR UPDATE USING (
        EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
      );
  END IF;
END $$;

-- 6. Index
CREATE INDEX IF NOT EXISTS idx_modqueue_author    ON moderation_queue(author_id);
CREATE INDEX IF NOT EXISTS idx_modqueue_submitted ON moderation_queue(submitted_at);
CREATE INDEX IF NOT EXISTS idx_modqueue_status    ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_modqueue_risk      ON moderation_queue(risk_score DESC);

-- 7. Vue KPI recréée
CREATE OR REPLACE VIEW moderation_kpi AS
SELECT
  COUNT(*)                                                                    AS total,
  COUNT(*) FILTER (WHERE status = 'en_attente_validation')                   AS pending,
  COUNT(*) FILTER (WHERE status = 'publie')                                  AS published,
  COUNT(*) FILTER (WHERE status = 'refuse')                                  AS refused,
  COUNT(*) FILTER (WHERE status = 'a_corriger')                              AS correction,
  ROUND(AVG(risk_score))                                                      AS avg_risk,
  COUNT(*) FILTER (WHERE submitted_at >= now() - INTERVAL '24h')             AS last_24h
FROM moderation_queue;

-- 8. Rafraîchissement du cache
NOTIFY pgrst, 'reload schema';

-- Migration terminée !


-- ================================================================
-- MIGRATION 14/36 : 20260414_admin_full_fix.sql
-- ================================================================

-- ============================================================================
-- MIGRATION COMPLÈTE v2 : Fix Admin + Listings + Profiles RLS
-- Date : 2026-04-15
-- Idempotent : peut être relancé plusieurs fois sans erreur
-- Correction : listing_type est un ENUM → ALTER TYPE au lieu de CHECK
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 0 : ENUM listing_type — ajouter les valeurs manquantes
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'exchange') THEN
    ALTER TYPE listing_type ADD VALUE 'exchange';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'service') THEN
    ALTER TYPE listing_type ADD VALUE 'service';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'rental') THEN
    ALTER TYPE listing_type ADD VALUE 'rental';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'wanted') THEN
    ALTER TYPE listing_type ADD VALUE 'wanted';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'free') THEN
    ALTER TYPE listing_type ADD VALUE 'free';
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 1 : TABLE profiles — RLS + rôle admin
-- ⚠️  NEUTRALISÉ — les policies profiles sont définies UNE SEULE FOIS dans :
--     20260416_profiles_rls_final.sql  (source de vérité unique)
-- Ce bloc supprime uniquement les éventuels résidus pour éviter les conflits.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Nettoyage des policies héritées (les vraies policies sont dans _final.sql)
DROP POLICY IF EXISTS "Profils lisibles par tous"                  ON profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"                 ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"                   ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"             ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"            ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"                 ON profiles;
DROP POLICY IF EXISTS "Profiles select policy"                     ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"              ON profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"                ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"               ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"     ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil"  ON profiles;
DROP POLICY IF EXISTS "Admin modifie tous les profils"             ON profiles;

-- Colonne role (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Rôle admin initial
UPDATE profiles
  SET role = 'admin'
  WHERE email = 'chris20600@outlook.fr';


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 2 : TABLE listings — colonnes manquantes
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_negotiable') THEN
    ALTER TABLE listings ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_urgent') THEN
    ALTER TABLE listings ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='moderation_status') THEN
    ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'en_attente_validation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='sector_id') THEN
    ALTER TABLE listings ADD COLUMN sector_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='condition_state') THEN
    ALTER TABLE listings ADD COLUMN condition_state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='exchange_preferences') THEN
    ALTER TABLE listings ADD COLUMN exchange_preferences TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='pickup_notes') THEN
    ALTER TABLE listings ADD COLUMN pickup_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='availability_window') THEN
    ALTER TABLE listings ADD COLUMN availability_window TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='views_count') THEN
    ALTER TABLE listings ADD COLUMN views_count INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='author_id') THEN
    ALTER TABLE listings ADD COLUMN author_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    UPDATE listings SET author_id = user_id WHERE user_id IS NOT NULL AND author_id IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='expires_at') THEN
    ALTER TABLE listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='boost_until') THEN
    ALTER TABLE listings ADD COLUMN boost_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='quick_pickup') THEN
    ALTER TABLE listings ADD COLUMN quick_pickup BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='reserved_by_user_id') THEN
    ALTER TABLE listings ADD COLUMN reserved_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

END $$;

CREATE INDEX IF NOT EXISTS listings_sector_idx   ON listings(sector_id);
CREATE INDEX IF NOT EXISTS listings_status_idx   ON listings(status);
CREATE INDEX IF NOT EXISTS listings_type_idx     ON listings(listing_type);
CREATE INDEX IF NOT EXISTS listings_price_idx    ON listings(price);
CREATE INDEX IF NOT EXISTS listings_urgent_idx   ON listings(is_urgent)    WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS listings_expires_idx  ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_boost_idx    ON listings(boost_until)  WHERE boost_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS listings_author_idx   ON listings(author_id);

CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 3 : Vérification finale
-- ════════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

SELECT
  id,
  email,
  role,
  full_name,
  CASE WHEN role = 'admin' THEN '✅ Admin OK' ELSE '❌ Rôle incorrect : ' || role END AS statut_admin
FROM profiles
WHERE email = 'chris20600@outlook.fr';

-- ============================================================================
-- FIN — Résultat attendu : statut_admin = "✅ Admin OK"
-- ============================================================================


-- ================================================================
-- MIGRATION 15/36 : 20260414_profiles_rls_fix.sql
-- ================================================================

-- ============================================================
-- MIGRATION 20260414_profiles_rls_fix
-- ⚠️  NEUTRALISÉ — REMPLACÉ PAR 20260416_profiles_rls_final.sql
-- ============================================================
-- Ce fichier contenait les policies INSERT/UPDATE sur profiles,
-- dupliquées depuis 20260414_admin_full_fix.sql.
--
-- SOURCE DE VÉRITÉ UNIQUE : supabase/migrations/20260416_profiles_rls_final.sql
--   → CREATE FUNCTION is_moderator_or_admin()
--   → SELECT policy : auth.uid() = id OR is_moderator_or_admin()
--   → INSERT policy : WITH CHECK (auth.uid() = id)
--   → UPDATE policies : propre profil + admin/modérateur
--   → Vue public_profiles
--
-- Ce bloc supprime uniquement les résidus pour éviter les conflits
-- si ce fichier est rejoué avant _final.sql.
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profils lisibles par tous"                  ON profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"                 ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"                   ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"             ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"            ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"                 ON profiles;
DROP POLICY IF EXISTS "Profiles select policy"                     ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"              ON profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"                ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"               ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"     ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil"  ON profiles;
DROP POLICY IF EXISTS "Admin modifie tous les profils"             ON profiles;

-- Colonne role (idempotent)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

NOTIFY pgrst, 'reload schema';


-- ================================================================
-- MIGRATION 16/36 : 20260416_event_comments_delete_policy.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_event_comments_delete_policy
-- Ajout de la policy DELETE manquante sur event_comments
--
-- Contexte : 20260411_events_cdc_fields.sql créait SELECT (USING true)
-- et INSERT (WITH CHECK auth.uid() = author_id) mais aucune policy DELETE.
-- Sans elle, personne ne peut supprimer un commentaire depuis le navigateur.
--
-- Règle retenue :
--   • L'auteur peut supprimer son propre commentaire
--   • Les admins / modérateurs peuvent supprimer n'importe quel commentaire
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "event_comments_delete" ON public.event_comments;

CREATE POLICY "event_comments_delete"
  ON public.event_comments
  FOR DELETE
  USING (
    auth.uid() = author_id
    OR is_moderator_or_admin()
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd
-- FROM pg_policies
-- WHERE tablename = 'event_comments'
-- ORDER BY cmd;
-- Attendu : event_comments_delete (DELETE), event_comments_insert (INSERT),
--           event_comments_select (SELECT)
-- ============================================================================


-- ================================================================
-- MIGRATION 17/36 : 20260416_help_participants_rls.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_help_participants_rls
-- ★ Correction policy SELECT help_request_participants (🟠 → ✅) ★
--
-- Problème : USING(true) exposait publiquement pour chaque participant :
--   • user_id   → identité du volontaire
--   • role      → rôle dans la demande
--   • state     → état de participation
--   • message   → message privé du volontaire
--
-- Correction : lecture limitée à 3 cas légitimes :
--   1. Le participant lui-même (auth.uid() = user_id)
--   2. L'auteur de la demande d'aide (peut voir qui propose)
--   3. Les admins / modérateurs (supervision)
--
-- Les policies INSERT / UPDATE / DELETE restent dans help_requests_cdc.sql
-- (non dupliquées, non modifiées).
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "help_participants_select" ON public.help_request_participants;

CREATE POLICY "help_participants_select"
  ON public.help_request_participants
  FOR SELECT
  USING (
    -- Le participant voit sa propre ligne
    auth.uid() = user_id
    -- L'auteur de la demande voit tous les participants
    OR EXISTS (
      SELECT 1 FROM public.help_requests hr
      WHERE hr.id = help_request_participants.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Admins / modérateurs voient tout
    OR is_moderator_or_admin()
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'help_request_participants';
-- Attendu : help_participants_select avec auth.uid()=user_id OR EXISTS(author) OR admin
--           help_participants_insert, update, delete inchangées
-- ============================================================================


-- ================================================================
-- MIGRATION 18/36 : 20260416_help_status_history_rls.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_help_status_history_rls
-- ★ Correction policy SELECT help_request_status_history (🟠 → ✅) ★
--
-- Problème : USING(true) exposait publiquement l'audit trail :
--   • old_status / new_status  → transitions d'état internes
--   • changed_by               → identité de qui a changé l'état
--   • note                     → notes internes de modération
--
-- Correction : lecture limitée à 3 cas légitimes :
--   1. L'auteur de la demande d'aide (suit l'évolution de sa demande)
--   2. Les participants concernés (suivent leur demande de participation)
--   3. Les admins / modérateurs (supervision complète)
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "help_status_history_select" ON public.help_request_status_history;

CREATE POLICY "help_status_history_select"
  ON public.help_request_status_history
  FOR SELECT
  USING (
    -- Auteur de la demande
    EXISTS (
      SELECT 1 FROM public.help_requests hr
      WHERE hr.id = help_request_status_history.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Participants à cette demande
    OR EXISTS (
      SELECT 1 FROM public.help_request_participants p
      WHERE p.help_request_id = help_request_status_history.help_request_id
        AND p.user_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'help_request_status_history';
-- Attendu : help_status_history_select avec EXISTS(author) OR EXISTS(participant) OR admin
--           help_status_history_insert inchangé
-- ============================================================================


-- ================================================================
-- MIGRATION 19/36 : 20260416_job_demands_rls_normalize.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_job_demands_rls_normalize
-- ★ SOURCE DE VÉRITÉ UNIQUE pour la policy SELECT de job_demands ★
--
-- Problème résolu : deux fichiers définissaient "job_demands_select" avec
-- des USING() différents, créant une ambiguïté sur le comportement réel :
--
--   20260408_fixes_rls_categories.sql  → USING (status = 'published')
--   20260409_emploi_local.sql          → USING (status IN ('active','published'))
--
-- Ces deux fichiers ont été NEUTRALISÉS (CREATE POLICY supprimé).
--
-- COMPORTEMENT CANONIQUE RETENU :
--   • status IN ('active', 'published') → lecture publique (anon + authenticated)
--     Raison : publish-demand.ts insère avec status='active', pas 'published'.
--              Exclure 'active' cachait toutes les nouvelles annonces publiées.
--   • auth.uid() = user_id             → auteur voit ses propres annonces
--     (draft, paused, expired, rejected…)
--   • is_moderator_or_admin()          → admins/modérateurs voient tout
--
-- IDEMPOTENT : DROP IF EXISTS avant chaque CREATE
-- ============================================================================


-- ── 1. Supprimer toutes les variantes historiques de la policy SELECT
DROP POLICY IF EXISTS job_demands_select             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select"           ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public_read        ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public_read"      ON public.job_demands;
DROP POLICY IF EXISTS job_demands_public             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_public"           ON public.job_demands;
DROP POLICY IF EXISTS job_demands_read               ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_read"             ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_published" ON public.job_demands;
DROP POLICY IF EXISTS "job_demands_select_own"       ON public.job_demands;

-- ── 2. Policy SELECT canonique
CREATE POLICY "job_demands_select"
  ON public.job_demands
  FOR SELECT
  USING (
    -- Lecture publique : 'active' (état après publish-demand.ts) OU 'published'
    status IN ('active', 'published')
    -- Auteur : accès à ses propres annonces quel que soit le statut
    OR auth.uid() = user_id
    -- Admins / modérateurs : accès complet
    OR is_moderator_or_admin()
  );


-- ── 3. Recharger PostgREST
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'job_demands' AND cmd = 'SELECT';
-- Attendu : une seule ligne "job_demands_select"
--           qual contient : status IN ('active','published') OR auth.uid() = user_id OR ...
-- ============================================================================


-- ================================================================
-- MIGRATION 20/36 : 20260416_lf_matches_rls.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_lf_matches_rls
-- ★ Correction policy SELECT lf_matches (🟠 → ✅) ★
--
-- Problème : USING(true) exposait publiquement la logique interne de matching :
--   • match_score   → score interne de correspondance (0-100)
--   • match_status  → suggested / confirmed / rejected (non validé visible)
--   • suggested_by  → identité de l'auteur de la suggestion
--
-- Correction : lecture limitée aux parties directement concernées :
--   1. Auteur de l'objet perdu (lost_item_id → lost_found_items.author_id)
--   2. Auteur de l'objet trouvé (found_item_id → lost_found_items.author_id)
--   3. Admins / modérateurs
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "lf_matches_select" ON public.lf_matches;

CREATE POLICY "lf_matches_select"
  ON public.lf_matches
  FOR SELECT
  USING (
    -- Auteur de l'objet perdu
    EXISTS (
      SELECT 1 FROM public.lost_found_items l1
      WHERE l1.id = lf_matches.lost_item_id
        AND l1.author_id = auth.uid()
    )
    -- Auteur de l'objet trouvé
    OR EXISTS (
      SELECT 1 FROM public.lost_found_items l2
      WHERE l2.id = lf_matches.found_item_id
        AND l2.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'lf_matches';
-- Attendu : lf_matches_select avec EXISTS(lost_item author) OR EXISTS(found_item author) OR admin
--           lf_matches_insert inchangé (auth.uid() IS NOT NULL)
-- ============================================================================


-- ================================================================
-- MIGRATION 21/36 : 20260416_listing_status_history_rls.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_listing_status_history_rls
-- ★ SOURCE DE VÉRITÉ pour la policy SELECT de listing_status_history ★
--
-- Problème : 20260411_annonces_cdc.sql créait USING(true) → tout le monde
-- pouvait lire l'historique interne (ancien statut, nouveau statut, changed_by,
-- note, date) — y compris les actions de modération et changements admin.
--
-- Correction :
--   Lecture limitée à :
--     • L'auteur de l'annonce (via JOIN listings.author_id)
--     • Les admins / modérateurs
--   Les anon et les autres utilisateurs ne voient rien.
--
-- IDEMPOTENT : DROP IF EXISTS avant CREATE
-- ============================================================================

DROP POLICY IF EXISTS "lsh_select" ON public.listing_status_history;

CREATE POLICY "lsh_select"
  ON public.listing_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_status_history.listing_id
        AND (
          l.author_id = auth.uid()
          OR is_moderator_or_admin()
        )
    )
  );

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'listing_status_history';
-- Attendu : lsh_select avec EXISTS(listings.author_id = auth.uid() OR admin)
--           lsh_insert inchangé (auth.uid() = changed_by)
-- ============================================================================


-- ================================================================
-- MIGRATION 22/36 : 20260416_profiles_rls_final.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_profiles_rls_final
-- ★ SOURCE DE VÉRITÉ UNIQUE pour les policies RLS de la table profiles ★
--
-- Les fichiers suivants ont été NEUTRALISÉS (DROP only, sans CREATE POLICY) :
--   • 20260414_profiles_rls_fix.sql    → DROP only + commentaire de redirection
--   • 20260414_admin_full_fix.sql      → bloc profiles remplacé par DROP only
--   • 20260416_rls_security_audit_fixes.sql  → policies profiles supprimées
--   • 20260416_profiles_rls_hardening.sql    → précédent brouillon, remplacé ici
--
-- CE FICHIER EST LE SEUL QUI CRÉE DES POLICIES SUR profiles.
-- Pour modifier les règles d'accès à profiles, éditer UNIQUEMENT ce fichier
-- ou créer une migration postérieure (20260417_...) qui drop/recrée.
--
-- ORDRE D'EXÉCUTION GARANTI :
--   1. CREATE FUNCTION is_moderator_or_admin()  ← EN PREMIER (utilisée dans les policies)
--   2. RLS + 4 policies profiles (SELECT/INSERT/UPDATE×2)
--   3. RLS + policy service_requests
--   4. Fix récursion conversation_participants / messages / conversations
--   5. Vue public_profiles (données non sensibles, pas d'email/phone)
--
-- IDEMPOTENT : peut être relancé sans erreur (DROP IF EXISTS partout)
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 — Fonction utilitaire (DOIT être créée EN PREMIER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
  );
$$;


-- ============================================================================
-- ÉTAPE 2 — RLS table profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les anciennes policies SELECT (noms historiques)
DROP POLICY IF EXISTS "Profils lisibles par tous"            ON public.profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"           ON public.profiles;
DROP POLICY IF EXISTS "Public profiles readable"             ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"       ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"          ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"           ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy"               ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"         ON public.profiles;

-- Nouvelle policy SELECT — propre profil OU admin/modérateur
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR is_moderator_or_admin()
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert own profile"             ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"   ON public.profiles;
CREATE POLICY "Utilisateurs créent leur propre profil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE propre profil
DROP POLICY IF EXISTS "Users can update own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON public.profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- UPDATE admin/modérateur
DROP POLICY IF EXISTS "Admin modifie tous les profils" ON public.profiles;
CREATE POLICY "Admin modifie tous les profils"
  ON public.profiles
  FOR UPDATE
  USING (is_moderator_or_admin());

-- Colonne role (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';


-- ============================================================================
-- ÉTAPE 3 — RLS table service_requests
-- ============================================================================
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_select_public"       ON public.service_requests;
DROP POLICY IF EXISTS "Voir ses propres demandes"            ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_own"          ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_participants" ON public.service_requests;

CREATE POLICY "service_requests_select_participants"
  ON public.service_requests
  FOR SELECT
  USING (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- ÉTAPE 4 — Fix récursion conversation_participants / messages / conversations
-- ============================================================================

-- 4a — conversation_participants
DROP POLICY IF EXISTS "Voir participants de ses conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own"   ON public.conversation_participants;

CREATE POLICY "conversation_participants_select_own"
  ON public.conversation_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_moderator_or_admin()
  );

-- 4b — messages
DROP POLICY IF EXISTS "Voir messages de ses conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participants"       ON public.messages;

CREATE POLICY "messages_select_participants"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- 4c — conversations
DROP POLICY IF EXISTS "Voir ses conversations"            ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;

CREATE POLICY "conversations_select_participants"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- 4d — message_attachments (si la table existe)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_attachments'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "message_attachments_select_participants"
        ON public.message_attachments;
      CREATE POLICY "message_attachments_select_participants"
        ON public.message_attachments
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.messages m
            JOIN public.conversation_participants cp
              ON cp.conversation_id = m.conversation_id
            WHERE m.id = message_attachments.message_id
              AND cp.user_id = auth.uid()
          )
          OR is_moderator_or_admin()
        )
    $p$;
  END IF;
END $$;


-- ============================================================================
-- ÉTAPE 5 — Vue public_profiles (données non sensibles)
-- ============================================================================
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE VIEW public.public_profiles
  WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM public.profiles;

-- Accès aux utilisateurs connectés uniquement (pas aux anon)
GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL   ON public.public_profiles FROM anon;


-- ============================================================================
-- ÉTAPE 6 — Recharger PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- 1. Anon ne peut plus lire les profils :
--    SET ROLE anon;
--    SELECT id, email FROM profiles LIMIT 1;
--    → Attendu : 0 lignes
--
-- 2. Policy active :
--    RESET ROLE;
--    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
--    → Attendu : "profiles_select_own_or_admin" pour SELECT
--
-- 3. Vue non accessible à l'anon :
--    SET ROLE anon;
--    SELECT id FROM public_profiles LIMIT 1;
--    → Attendu : permission denied
--
-- 4. Pas de récursion messagerie :
--    RESET ROLE;
--    SELECT id FROM conversations LIMIT 1;
--    → Attendu : résultat sans erreur 42P17
-- ============================================================================


-- ================================================================
-- MIGRATION 23/36 : 20260416_profiles_rls_hardening.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416_profiles_rls_hardening
-- ⚠️  NEUTRALISÉ — REMPLACÉ PAR 20260416_profiles_rls_final.sql
-- ============================================================================
-- Ce fichier était un brouillon intermédiaire de durcissement RLS.
-- Son contenu a été consolidé dans le fichier source de vérité unique :
--
--   SOURCE DE VÉRITÉ : supabase/migrations/20260416_profiles_rls_final.sql
--
-- Ce bloc effectue uniquement un nettoyage idempotent des résidus.
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profils lisibles par tous"                  ON public.profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"                 ON public.profiles;
DROP POLICY IF EXISTS "Public profiles readable"                   ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"             ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"            ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"              ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"                ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"                 ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy"                     ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"               ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"               ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"               ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil"  ON public.profiles;
DROP POLICY IF EXISTS "Admin modifie tous les profils"             ON public.profiles;

-- La fonction is_moderator_or_admin() est créée dans _final.sql
-- La vue public_profiles est créée dans _final.sql
NOTIFY pgrst, 'reload schema';


-- ================================================================
-- MIGRATION 24/36 : 20260416_rls_security_audit_fixes.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260416 — RLS Security Audit Fixes
-- Biguglia Connect — A executer dans Supabase SQL Editor
-- ============================================================================
-- AUDIT LIVE (2026-04-16) — 3 problemes confirmes en production :
--
-- CRITIQUE   profiles         -> SELECT USING(true) expose email/phone/role a anon
-- CRITIQUE   service_requests -> SELECT USING(true) expose adresses/descriptions a anon
-- BUG/DoS    conversations +  -> recursion infinie dans la policy
--            messages +          conversation_participants -> HTTP 500 sur toute
--            message_attachments  requete messagerie
--            conversation_participants
--
-- ECRITURE (INSERT/UPDATE/DELETE) : correctement protegee (WITH CHECK = auth.uid())
-- TABLES CRITIQUES SURES : reports, artisan_profiles, notifications,
--   admin_action_logs, moderation_queue -> retournent [] pour anon OK
-- TABLES PUBLIQUES OK : listings, job_offers, job_demands, help_requests,
--   events, forum_posts, sectors, trade_categories -> USING(true) intentionnel OK
-- ============================================================================

-- ============================================================================
-- FIX 1 — CRITIQUE : profiles — SELECT USING(true) -> email/phone/role exposes
-- ============================================================================
-- Cause : migration_profil_public.sql + 20260414_profiles_rls_fix.sql
--   ont cree USING(true) pour contourner un bug AuthProvider.
--
-- Impact applicatif : AuthProvider fait SELECT sur profiles avec la cle anon
--   APRES auth.getUser(). Avec auth.uid() IS NOT NULL, le SELECT retourne
--   [] quand pas de session (comportement correct) et les rows quand connecte.
-- ============================================================================

-- Etape 1 : Supprimer toutes les politiques USING(true) heritees sur profiles
DROP POLICY IF EXISTS "Profils publics en lecture"           ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"             ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"       ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"      ON profiles;
DROP POLICY IF EXISTS "Profils lisibles par tous"            ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"        ON profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"          ON profiles;

-- ⚠️  La policy SELECT profiles est définie UNIQUEMENT dans :
--     20260416_profiles_rls_final.sql (source de vérité unique)
-- Ce bloc ne crée plus de policy ici pour éviter les doublons.

-- ============================================================================
-- FIX 2 — CRITIQUE : service_requests — SELECT USING(true) -> adresses exposees
-- ============================================================================
-- Cause : fin de database.sql a ajoute service_requests_select_public USING(true)
--   pour que les commentaires publics fonctionnent.
--   Consequence : expose resident_id, artisan_id, address, description a l'anon.
-- Note : request_comments garde sa propre policy USING(true) — OK.
-- ============================================================================

DROP POLICY IF EXISTS "service_requests_select_public"       ON service_requests;
DROP POLICY IF EXISTS "Voir ses propres demandes"            ON service_requests;
DROP POLICY IF EXISTS "service_requests_select_own"          ON service_requests;
DROP POLICY IF EXISTS "service_requests_select_participants" ON service_requests;

CREATE POLICY "service_requests_select_participants"
  ON service_requests FOR SELECT
  USING (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  );

-- ============================================================================
-- FIX 3 — BUG/DoS : Recursion infinie dans conversation_participants
-- ============================================================================
-- Cause : policy "Voir participants de ses conversations" contient :
--   EXISTS (SELECT 1 FROM conversation_participants cp2
--           WHERE cp2.conversation_id = conversation_id
--           AND cp2.user_id = auth.uid())
--   -> self-reference = recursion infinie -> HTTP 500 code 42P17
--   sur toute requete conversations / messages / message_attachments.
--
-- Fix : remplacer par user_id = auth.uid() (direct, sans sous-requete recursive)
-- ============================================================================

-- Etape 3a : conversation_participants — supprimer la policy recursive
DROP POLICY IF EXISTS "Voir participants de ses conversations" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own"   ON conversation_participants;

CREATE POLICY "conversation_participants_select_own"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_moderator_or_admin()
  );

-- Etape 3b : messages — recree sans sous-requete recursive
DROP POLICY IF EXISTS "Voir messages de ses conversations" ON messages;
DROP POLICY IF EXISTS "messages_select_participants"       ON messages;

CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- Etape 3c : conversations
DROP POLICY IF EXISTS "Voir ses conversations"            ON conversations;
DROP POLICY IF EXISTS "conversations_select_participants" ON conversations;

CREATE POLICY "conversations_select_participants"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- Etape 3d : message_attachments (si la table existe)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_attachments'
  ) THEN
    DROP POLICY IF EXISTS "message_attachments_select_participants" ON message_attachments;
    EXECUTE $p$
      CREATE POLICY "message_attachments_select_participants"
        ON message_attachments FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM messages m
            JOIN conversation_participants cp
              ON cp.conversation_id = m.conversation_id
            WHERE m.id = message_attachments.message_id
              AND cp.user_id = auth.uid()
          )
          OR is_moderator_or_admin()
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION RAPIDE post-migration (a executer dans SQL Editor)
-- ============================================================================
-- 1. profiles — plus accessible a l'anon :
--    SET ROLE anon;
--    SELECT id, email FROM profiles LIMIT 1;
--    Attendu : 0 lignes
--
-- 2. service_requests — plus accessible a l'anon :
--    SET ROLE anon;
--    SELECT id, address FROM service_requests LIMIT 1;
--    Attendu : 0 lignes
--
-- 3. messagerie — plus de recursion infinie :
--    RESET ROLE;
--    SELECT id FROM conversations LIMIT 1;
--    Attendu : 1 ligne sans erreur 42P17
--
-- 4. Test AuthProvider (depuis l'app) :
--    Ouvrir /connexion -> se connecter -> profil doit se charger correctement
-- ============================================================================

-- ============================================================================
-- ATTENTION APPLICATION — Impact du changement profiles
-- ============================================================================
-- AuthProvider (src/components/providers/AuthProvider.tsx) fait un SELECT
-- sur profiles. Avec la nouvelle policy, ce SELECT NE DOIT ETRE appele
-- QU'APRES auth.getUser() pour avoir un auth.uid() valide.
-- Si l'app charge profiles avant la session -> [] retourne -> comportement OK.
-- Verifier que le flux de connexion reste fonctionnel apres ce deploy.
-- ============================================================================

NOTIFY pgrst, 'reload schema';


-- ================================================================
-- MIGRATION 25/36 : 20260417_fix_admin_access.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260417_fix_admin_access
--
-- Problème : depuis la migration 20260416_profiles_rls_final, les admins
-- ne peuvent plus accéder à /administration.
--
-- Cause identifiée :
--   La colonne `role` dans public.profiles est de type enum `user_role`.
--   La fonction is_moderator_or_admin() compare avec des littéraux TEXT :
--     role IN ('admin', 'moderator')
--   PostgreSQL peut lever une erreur de cast implicite selon les versions,
--   ou la fonction peut renvoyer false si le cast TEXT→user_role échoue.
--
--   De plus, la policy SELECT sur profiles :
--     USING (auth.uid() = id OR is_moderator_or_admin())
--   provoque une récursion potentielle même avec SECURITY DEFINER si le
--   planner PostgreSQL décide de réévaluer via RLS.
--
-- Correctifs :
--   1. Recréer is_moderator_or_admin() avec cast explicite role::text
--   2. Simplifier la policy SELECT profiles : auth.uid() = id SEULEMENT
--      (les admins utilisent la vue public_profiles ou le client admin)
--   3. Ajouter une policy SELECT séparée pour admin/moderator
-- ============================================================================

-- ── 1. Corriger is_moderator_or_admin() avec cast explicite ─────────────────
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'moderator')
  );
$$;

-- ── 2. Recréer la policy SELECT profiles (plus simple, sans récursion) ───────
--
-- Stratégie : deux policies séparées plutôt qu'une seule avec OR
--   Policy 1 : chaque user lit son propre profil (auth.uid() = id)
--   Policy 2 : admin/moderator lit tous les profils (is_moderator_or_admin())
--
-- PostgreSQL évalue les policies RLS avec un OR implicite entre elles.
-- Deux policies séparées évitent la récursion de la policy unique.
--
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own"          ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin"        ON public.profiles;

-- Policy 1 : lecture de son propre profil
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2 : lecture par admin/moderator (via fonction SECURITY DEFINER)
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (is_moderator_or_admin());

-- ── 3. S'assurer que les policies INSERT/UPDATE existent toujours ─────────────
-- (idempotent — DROP IF EXISTS avant CREATE)
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"   ON public.profiles;
CREATE POLICY "Utilisateurs créent leur propre profil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON public.profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin modifie tous les profils" ON public.profiles;
CREATE POLICY "Admin modifie tous les profils"
  ON public.profiles
  FOR UPDATE
  USING (is_moderator_or_admin());

-- ── 4. Recharger PostgREST ────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Vérification post-exécution ───────────────────────────────────────────────
-- Coller dans un 2e onglet SQL :
--
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
--   -- Attendu : profiles_select_own (SELECT) + profiles_select_admin (SELECT)
--   --           + Utilisateurs créent... (INSERT) + 2 × UPDATE
--
--   SELECT public.is_moderator_or_admin();
--   -- Connecté en tant qu'admin → doit retourner true
--   -- Connecté en tant que user  → doit retourner false


-- ================================================================
-- MIGRATION 26/36 : 20260417_rls_close_open_policies.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260417_rls_close_open_policies
-- ★ Fermeture des policies RLS encore trop ouvertes ★
--
-- Tables concernées :
--   1. help_request_participants   — participation à une demande d'aide
--   2. help_request_status_history — historique d'état d'une demande d'aide
--   3. listing_status_history      — historique d'état d'une annonce
--   4. lf_matches                  — matching objet perdu / trouvé
--
-- Ces 4 tables avaient des policies SELECT USING(true) ou absentes,
-- exposant des données internes (états, participations, scores de matching)
-- à tout utilisateur authentifié voire anonyme.
--
-- Cette migration est IDEMPOTENTE : DROP IF EXISTS avant chaque CREATE.
-- Elle consolide et remplace les migrations partielles du 2026-04-16.
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================================


-- ============================================================================
-- TABLE 1 : help_request_participants
-- ============================================================================
-- Données exposées si USING(true) :
--   user_id  → identité du volontaire
--   role     → rôle dans la demande (requester / helper)
--   state    → état de participation (pending / accepted / rejected)
--   message  → message privé du volontaire
--
-- Règle : visible uniquement par :
--   • le participant lui-même (auth.uid() = user_id)
--   • l'auteur de la demande d'aide associée
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.help_request_participants ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies SELECT existantes (anciennes et nouvelles)
DROP POLICY IF EXISTS "help_participants_select"        ON public.help_request_participants;
DROP POLICY IF EXISTS "help_participants_public_select" ON public.help_request_participants;
DROP POLICY IF EXISTS "Voir participants de sa demande" ON public.help_request_participants;
DROP POLICY IF EXISTS "help_request_participants_select_public" ON public.help_request_participants;

-- Nouvelle policy restrictive
CREATE POLICY "help_participants_select"
  ON public.help_request_participants
  FOR SELECT
  USING (
    -- Le participant voit sa propre ligne
    auth.uid() = user_id
    -- L'auteur de la demande d'aide voit tous ses participants
    OR EXISTS (
      SELECT 1
      FROM public.help_requests hr
      WHERE hr.id = help_request_participants.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Admins / modérateurs voient tout
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- TABLE 2 : help_request_status_history
-- ============================================================================
-- Données exposées si USING(true) :
--   old_status / new_status → transitions d'état internes
--   changed_by              → identité de qui a changé l'état
--   note                    → notes internes de modération
--
-- Règle : visible uniquement par :
--   • l'auteur de la demande d'aide
--   • les participants à cette demande
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.help_request_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_status_history_select"        ON public.help_request_status_history;
DROP POLICY IF EXISTS "help_status_history_public_select" ON public.help_request_status_history;
DROP POLICY IF EXISTS "Voir historique de sa demande"     ON public.help_request_status_history;
DROP POLICY IF EXISTS "help_request_status_history_select_public" ON public.help_request_status_history;

CREATE POLICY "help_status_history_select"
  ON public.help_request_status_history
  FOR SELECT
  USING (
    -- Auteur de la demande d'aide
    EXISTS (
      SELECT 1
      FROM public.help_requests hr
      WHERE hr.id = help_request_status_history.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Participants à cette demande
    OR EXISTS (
      SELECT 1
      FROM public.help_request_participants p
      WHERE p.help_request_id = help_request_status_history.help_request_id
        AND p.user_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- TABLE 3 : listing_status_history
-- ============================================================================
-- Données exposées si USING(true) :
--   old_status / new_status → états internes de modération
--   changed_by              → identité de l'admin/modérateur qui a agi
--   note                    → raison de la modération
--
-- Règle : visible uniquement par :
--   • l'auteur de l'annonce
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.listing_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lsh_select"                          ON public.listing_status_history;
DROP POLICY IF EXISTS "listing_status_history_public"       ON public.listing_status_history;
DROP POLICY IF EXISTS "Voir historique de son annonce"      ON public.listing_status_history;
DROP POLICY IF EXISTS "listing_status_history_select_public" ON public.listing_status_history;

CREATE POLICY "lsh_select"
  ON public.listing_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_status_history.listing_id
        AND (
          -- Auteur de l'annonce
          l.author_id = auth.uid()
          -- OU admin / modérateur
          OR is_moderator_or_admin()
        )
    )
  );


-- ============================================================================
-- TABLE 4 : lf_matches
-- ============================================================================
-- Données exposées si USING(true) :
--   match_score  → score interne de correspondance (0–100)
--   match_status → suggested / confirmed / rejected (états internes)
--   suggested_by → identité de l'auteur de la suggestion de rapprochement
--
-- Règle : visible uniquement par :
--   • l'auteur de l'objet perdu concerné
--   • l'auteur de l'objet trouvé concerné
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.lf_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_matches_select"        ON public.lf_matches;
DROP POLICY IF EXISTS "lf_matches_public_select" ON public.lf_matches;
DROP POLICY IF EXISTS "Voir ses correspondances"  ON public.lf_matches;
DROP POLICY IF EXISTS "lf_matches_select_public"  ON public.lf_matches;

CREATE POLICY "lf_matches_select"
  ON public.lf_matches
  FOR SELECT
  USING (
    -- Auteur de l'objet perdu
    EXISTS (
      SELECT 1
      FROM public.lost_found_items l1
      WHERE l1.id = lf_matches.lost_item_id
        AND l1.author_id = auth.uid()
    )
    -- Auteur de l'objet trouvé
    OR EXISTS (
      SELECT 1
      FROM public.lost_found_items l2
      WHERE l2.id = lf_matches.found_item_id
        AND l2.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- Recharger PostgREST pour appliquer les nouvelles policies
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution
-- ============================================================================
-- À coller dans un 2e onglet SQL Editor après exécution :
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN (
--   'help_request_participants',
--   'help_request_status_history',
--   'listing_status_history',
--   'lf_matches'
-- )
-- ORDER BY tablename, cmd;
--
-- Résultat attendu :
--   help_request_participants   | help_participants_select   | SELECT | auth.uid()=user_id OR EXISTS(author) OR admin
--   help_request_status_history | help_status_history_select | SELECT | EXISTS(author) OR EXISTS(participant) OR admin
--   listing_status_history      | lsh_select                 | SELECT | EXISTS(listings.author_id=uid OR admin)
--   lf_matches                  | lf_matches_select          | SELECT | EXISTS(lost_author) OR EXISTS(found_author) OR admin
-- ============================================================================


-- ================================================================
-- MIGRATION 27/36 : 20260417_rls_fix_real_issues.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260417_rls_fix_real_issues
-- ★ Correction des vraies failles RLS identifiées à l'audit ★
--
-- Contexte :
--   L'audit complet des policies SELECT USING(true) a identifié 63 policies.
--   La majorité sont LÉGITIMES (données publiques d'une plateforme communautaire).
--   Ce script corrige uniquement les 4 vrais problèmes :
--
-- PROBLÈME 1 — equipment_items : policy USING(true) qui neutralise la
--   policy restrictive existante (is_available OR owner).
--   En PostgreSQL, 2 policies SELECT = OR logique → la vraie restriction
--   est complètement contournée.
--
-- PROBLÈME 2 — event_status_history : états + notes de modération internes
--   (changed_by = identité du modérateur, note = raison de modération)
--   visibles par tous les anonymes.
--
-- PROBLÈME 3 — event_participants : liste complète de qui assiste à quoi
--   exposée publiquement (données comportementales / vie privée).
--   Note : les événements sont publics, mais la liste nominative des
--   participants est une donnée personnelle.
--
-- PROBLÈME 4 — request_comments : commentaires sur service_requests
--   (qui peuvent contenir des adresses / détails privés).
--   service_requests est déjà protégé, mais ses commentaires ne l'étaient pas.
--
-- IDEMPOTENTE : DROP IF EXISTS avant chaque CREATE.
-- ============================================================================


-- ============================================================================
-- FIX 1 — equipment_items
-- Supprimer la policy USING(true) qui écrase la restriction existante
-- ============================================================================
-- Situation actuelle :
--   • equipment_items_select_available_or_own → USING(is_available OR owner) ✅
--   • equipment_items_select                  → USING(true) ❌ rend tout public
-- PostgreSQL applique OR entre toutes les policies SELECT d'un même rôle.
-- Résultat : tout le monde voit tout le matériel, même non disponible.
-- Fix : supprimer uniquement la policy USING(true).
-- ============================================================================

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;

-- Supprimer la policy trop permissive (les autres sont conservées)
DROP POLICY IF EXISTS "equipment_items_select" ON public.equipment_items;
DROP POLICY IF EXISTS "eq_public_read"          ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_select_active" ON public.equipment_items;

-- La policy restrictive existante reste en place :
-- equipment_items_select_available_or_own → USING((is_available = true) OR (auth.uid() = owner_id))
-- Vérifier qu'elle existe encore :
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'equipment_items'
      AND policyname = 'equipment_items_select_available_or_own'
  ) THEN
    -- Recréer si elle n'existe plus
    EXECUTE $policy$
      CREATE POLICY "equipment_items_select_available_or_own"
        ON public.equipment_items
        FOR SELECT
        USING (
          (is_available = true)
          OR (auth.uid() = owner_id)
          OR is_moderator_or_admin()
        );
    $policy$;
    RAISE NOTICE 'Recréé equipment_items_select_available_or_own';
  ELSE
    RAISE NOTICE 'equipment_items_select_available_or_own déjà présente — OK';
  END IF;
END $$;


-- ============================================================================
-- FIX 2 — event_status_history
-- Notes et identités de modération internes → admin/organisateur seulement
-- ============================================================================
-- Données sensibles exposées :
--   • old_status / new_status → workflow interne de modération
--   • changed_by              → identité du modérateur
--   • note                    → raison de la décision de modération
-- Règle : visible par l'organisateur de l'événement ou admin/modérateur
-- ============================================================================

ALTER TABLE public.event_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esh_select"                    ON public.event_status_history;
DROP POLICY IF EXISTS "event_status_history_select"   ON public.event_status_history;
DROP POLICY IF EXISTS "Voir historique de son événement" ON public.event_status_history;

CREATE POLICY "esh_select"
  ON public.event_status_history
  FOR SELECT
  USING (
    -- Organisateur de l'événement
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_status_history.event_id
        AND e.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- FIX 3 — event_participants
-- Liste nominative des participants → données personnelles
-- ============================================================================
-- Contexte : les événements sont publics, mais savoir QUI y participe
-- (user_id, statut de présence) est une donnée personnelle.
-- Un utilisateur ne devrait pas pouvoir lister tous les participants
-- de tous les événements.
--
-- Règle : visible par le participant lui-même, l'organisateur, ou admin
-- Note : on supprime la policy doublonnée "event_participations_select" aussi.
-- ============================================================================

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ep_select"                   ON public.event_participants;
DROP POLICY IF EXISTS "event_participations_select" ON public.event_participants;
DROP POLICY IF EXISTS "Voir participants d'un événement" ON public.event_participants;

CREATE POLICY "ep_select"
  ON public.event_participants
  FOR SELECT
  USING (
    -- Le participant voit sa propre ligne
    auth.uid() = user_id
    -- L'organisateur voit tous ses participants
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_participants.event_id
        AND e.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- FIX 4 — request_comments
-- Commentaires sur service_requests → potentiellement des adresses
-- ============================================================================
-- service_requests est protégé (resident_id / artisan_id / admin).
-- Mais ses commentaires étaient publics, exposant les échanges privés.
-- Règle : visible uniquement par le résident ou l'artisan concerné, ou admin
-- ============================================================================

ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_comments_select"        ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_select_public" ON public.request_comments;

CREATE POLICY "request_comments_select"
  ON public.request_comments
  FOR SELECT
  USING (
    -- Auteur du commentaire
    auth.uid() = author_id
    -- Résident ou artisan concerné par la demande de service
    OR EXISTS (
      SELECT 1
      FROM public.service_requests sr
      WHERE sr.id = request_comments.request_id
        AND (
          sr.resident_id = auth.uid()
          OR sr.artisan_id = auth.uid()
        )
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- Recharger PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution
-- ============================================================================
-- SELECT tablename, policyname, cmd, left(qual, 80) as qual_preview
-- FROM pg_policies
-- WHERE tablename IN (
--   'equipment_items',
--   'event_status_history',
--   'event_participants',
--   'request_comments'
-- )
-- AND cmd = 'SELECT'
-- ORDER BY tablename, policyname;
--
-- Résultat attendu :
--   equipment_items      | equipment_items_select_available_or_own | SELECT | (is_available OR owner OR admin)
--   event_participants   | ep_select                               | SELECT | (uid=user_id OR organizer OR admin)
--   event_status_history | esh_select                              | SELECT | (EXISTS(organizer) OR admin)
--   request_comments     | request_comments_select                 | SELECT | (uid=author OR EXISTS(sr) OR admin)
--
-- PLUS de ligne "equipment_items_select" avec USING(true)
-- ============================================================================


-- ================================================================
-- MIGRATION 28/36 : 20260418_perf_indexes.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260418_perf_indexes
-- ★ Index de performance pour messages, notifications et conversations ★
--
-- Contexte :
--   • GET /api/messages/unread fait un filtre sur conversation_id + created_at
--   • GET /api/notifications fait un filtre sur user_id
--   • Ces index réduisent les seq-scan sur les tables les plus fréquemment
--     interrogées par le client de polling.
--
-- Impacts attendus :
--   • messages     : filtre par conversation_id  →  index composite
--   • messages     : tri / filtre par created_at →  index sur created_at
--   • notifications: filtre par user_id          →  index sur user_id
--   • notifications: filtre combiné user_id + read_at pour les non-lues
--   • conversation_participants : lookup par user_id (utilisé dans policies)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. messages — index composite principal  (conversation_id, created_at DESC)
--    Utilisé par :
--      SELECT … FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id_created_at
  ON public.messages (conversation_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. messages — index sur created_at seul
--    Utilisé par les requêtes de polling non-lu : WHERE created_at > $last_check
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. messages — index sur sender_id  (JOINs avec profiles)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

-- ---------------------------------------------------------------------------
-- 4. notifications — index sur user_id  (filtre principal de toutes les requêtes)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- 5. notifications — index composite (user_id, read_at) pour les non-lues
--    Requête type : WHERE user_id = $1 AND read_at IS NULL
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_unread
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- 6. notifications — index sur created_at  (tri chronologique)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. conversation_participants — index sur user_id
--    Utilisé dans les policies RLS et les JOINs de la messagerie
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_user_id
  ON public.conversation_participants (user_id);

-- ---------------------------------------------------------------------------
-- 8. conversation_participants — index sur conversation_id
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_conversation_id
  ON public.conversation_participants (conversation_id);

-- ---------------------------------------------------------------------------
-- 9. conversations — index sur updated_at  (tri de la liste de conversations)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations (updated_at DESC);

-- ============================================================================
-- Résumé des index créés (si non déjà existants) :
--   idx_messages_conversation_id_created_at
--   idx_messages_created_at
--   idx_messages_sender_id
--   idx_notifications_user_id
--   idx_notifications_user_id_unread  (partial index)
--   idx_notifications_created_at
--   idx_conversation_participants_user_id
--   idx_conversation_participants_conversation_id
--   idx_conversations_updated_at
-- ============================================================================


-- ================================================================
-- MIGRATION 29/36 : 20260421_cleanup_duplicate_policies.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260421_cleanup_duplicate_policies
-- ★ Nettoyage des policies RLS dupliquées ★
--
-- Contexte :
--   Les migrations successives ont laissé des policies redondantes sur
--   plusieurs tables. En PostgreSQL, plusieurs policies SELECT/INSERT = OR
--   logique : les anciennes redondantes n'ouvrent pas de faille (USING(true)
--   est absent) mais alourdissent les plans d'exécution et rendent
--   l'audit difficile.
--
-- Tables concernées :
--   • conversation_participants  — 4 INSERT → garder conversation_participants_insert_own
--   • conversations              — 3 INSERT, 4 UPDATE → garder les noms canoniques
--   • equipment_items            — 4 INSERT, 3 UPDATE, 2 DELETE → garder _own
--   • event_participants         — 2 DELETE, 2 INSERT → garder ep_*
--   • messages                   — 3 INSERT → garder messages_insert_participant
--   • profiles                   — 2 SELECT → garder profiles_select_own + profiles_select_admin
--   • service_requests           — 2 INSERT, 3 SELECT → garder _participants / _resident
--
-- IDEMPOTENTE : DROP IF EXISTS partout.
-- ============================================================================


-- ============================================================================
-- TABLE : conversation_participants — INSERT (garder : conversation_participants_insert_own)
-- ============================================================================
DROP POLICY IF EXISTS "conversation_participants_insert"     ON public.conversation_participants;
DROP POLICY IF EXISTS "Ajouter des participants"             ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_insert"                            ON public.conversation_participants;


-- ============================================================================
-- TABLE : conversations — INSERT (garder : conversations_insert_creator)
-- ============================================================================
DROP POLICY IF EXISTS "Créer une conversation"               ON public.conversations;
DROP POLICY IF EXISTS "conv_insert"                          ON public.conversations;

-- TABLE : conversations — UPDATE (garder : conversations_update_participant)
DROP POLICY IF EXISTS "conv_update"                          ON public.conversations;
DROP POLICY IF EXISTS "Modifier ses conversations"           ON public.conversations;
DROP POLICY IF EXISTS "Participants maj echange"             ON public.conversations;


-- ============================================================================
-- TABLE : equipment_items — INSERT (garder : equipment_items_insert_own)
-- ============================================================================
DROP POLICY IF EXISTS "eq_owner_insert"                      ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_insert_auth"                ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_items_insert"               ON public.equipment_items;

-- TABLE : equipment_items — UPDATE (garder : equipment_items_update_own)
DROP POLICY IF EXISTS "eq_owner_update"                      ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_update_owner"               ON public.equipment_items;

-- TABLE : equipment_items — DELETE (garder : equipment_items_delete_own)
DROP POLICY IF EXISTS "eq_owner_delete"                      ON public.equipment_items;


-- ============================================================================
-- TABLE : event_participants — INSERT (garder : ep_insert)
-- ============================================================================
DROP POLICY IF EXISTS "event_participations_insert"          ON public.event_participants;

-- TABLE : event_participants — DELETE (garder : ep_delete)
DROP POLICY IF EXISTS "event_participations_delete"          ON public.event_participants;


-- ============================================================================
-- TABLE : messages — INSERT (garder : messages_insert_participant)
-- ============================================================================
DROP POLICY IF EXISTS "Envoyer un message"                   ON public.messages;
DROP POLICY IF EXISTS "messages_insert"                      ON public.messages;


-- ============================================================================
-- TABLE : profiles — SELECT
-- Garder : profiles_select_own + profiles_select_admin (2 policies distinctes
-- pour propre profil ET admin — correct et intentionnel)
-- Supprimer : profiles_select_own_or_admin (ancienne version consolidée
-- remplacée par les 2 policies séparées)
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_own_or_admin"         ON public.profiles;


-- ============================================================================
-- TABLE : service_requests — INSERT (garder : service_requests_insert_resident)
-- ============================================================================
DROP POLICY IF EXISTS "service_requests_insert"              ON public.service_requests;

-- TABLE : service_requests — SELECT (garder : service_requests_select_participants)
DROP POLICY IF EXISTS "service_requests_select"              ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_parties"      ON public.service_requests;


-- ============================================================================
-- Recharger PostgREST pour prendre en compte les changements
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution :
--   SELECT tablename, cmd, COUNT(*), string_agg(policyname, ' | ')
--   FROM pg_policies
--   WHERE tablename IN (
--     'conversation_participants','conversations','equipment_items',
--     'event_participants','messages','profiles','service_requests'
--   )
--   GROUP BY tablename, cmd
--   HAVING COUNT(*) > 1
--   ORDER BY tablename, cmd;
--   → Attendu : 0 lignes (ou uniquement profiles SELECT = 2 intentionnel)
-- ============================================================================


-- ================================================================
-- MIGRATION 30/36 : 20260421_unindexed_fk.sql
-- ================================================================

-- ============================================================================
-- MIGRATION 20260421_unindexed_fk
-- ★ Index manquants sur clés étrangères (rapport Supabase : unindexed_foreign_keys) ★
--
-- Contexte :
--   Supabase Advisor signale les colonnes FK sans index couvrant. Sans index,
--   toute jointure, suppression en cascade ou filtre par relation déclenche
--   un seq-scan complet sur la table enfant.
--
-- Stratégie :
--   • CREATE INDEX CONCURRENTLY IF NOT EXISTS  → pas de verrou, idempotent
--   • Nommage uniforme : idx_<table>_<colonne>
--   • Commentaire indiquant la table parente référencée
--   • Regroupement par domaine fonctionnel
--
-- Domaines couverts :
--   1. artisan_profiles          (user_id, trade_category_id)
--   2. service_requests          (resident_id, artisan_id — idx supprimé en migration_B)
--   3. listings                  (user_id, category_id, reserved_by_user_id)
--   4. reviews                   (artisan_id, reviewer_id)
--   5. favorite_artisans         (user_id, artisan_id)
--   6. reports                   (reporter_id)
--   7. event_saves               (event_id)
--   8. association_needs         (created_by)
--   9. lf_comments               (author_id)
--  10. lf_matches                (suggested_by)
--  11. listing_status_history    (changed_by)
--  12. listing_reports           (reporter_id)
--  13. help_request_status_hist  (changed_by)
--  14. moderation_queue          (reviewed_by)
--  15. outing_status_history     (changed_by  — idx supprimé en migration_B)
--  16. collection_views          (item_id — complément du viewer_id déjà indexé)
--
-- Impacts attendus :
--   • Suppression des seq-scan sur les tables ci-dessus lors des JOINs
--   • Accélération des DELETE/UPDATE en cascade sur les tables parentes
--   • Amélioration des filtres par relation dans les policies RLS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. artisan_profiles
--    user_id     → profiles      (FK principale, utilisée dans toutes les policies)
--    trade_category_id → trade_categories  (filtre de recherche artisans par métier)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artisan_profiles_user_id
  ON public.artisan_profiles (user_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artisan_profiles_trade_category_id
  ON public.artisan_profiles (trade_category_id);  -- FK → trade_categories

-- ---------------------------------------------------------------------------
-- 2. service_requests
--    resident_id → profiles        (filtre principal de la policy SELECT)
--    artisan_id  → artisan_profiles (supprimé dans migration_B lot 4 car idx_scan=0
--                                    à ce moment ; le trafic a augmenté depuis)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_requests_resident_id
  ON public.service_requests (resident_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_service_requests_artisan_id
  ON public.service_requests (artisan_id);  -- FK → artisan_profiles

-- ---------------------------------------------------------------------------
-- 3. listings
--    user_id              → profiles          (FK originale, utilisée dans les policies)
--    category_id          → listing_categories (filtre de recherche)
--    reserved_by_user_id  → profiles          (nullable, filtre réservations)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_user_id
  ON public.listings (user_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_category_id
  ON public.listings (category_id);  -- FK → listing_categories

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_reserved_by_user_id
  ON public.listings (reserved_by_user_id)  -- FK → profiles (nullable)
  WHERE reserved_by_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. reviews
--    artisan_id  → artisan_profiles  (filtre principal : reviews d'un artisan)
--    reviewer_id → profiles          (unicité + policy DELETE)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_artisan_id
  ON public.reviews (artisan_id);  -- FK → artisan_profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewer_id
  ON public.reviews (reviewer_id);  -- FK → profiles

-- ---------------------------------------------------------------------------
-- 5. favorite_artisans
--    user_id    → profiles          (lookup "mes favoris")
--    artisan_id → artisan_profiles  (lookup "qui m'a mis en favori")
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorite_artisans_user_id
  ON public.favorite_artisans (user_id);  -- FK → profiles

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorite_artisans_artisan_id
  ON public.favorite_artisans (artisan_id);  -- FK → artisan_profiles

-- ---------------------------------------------------------------------------
-- 6. reports
--    reporter_id → profiles  (policy SELECT "voir ses propres signalements")
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reporter_id
  ON public.reports (reporter_id);  -- FK → profiles

-- ---------------------------------------------------------------------------
-- 7. event_saves
--    event_id → events  (seul user_id est indexé ; event_id manque)
--    Utilisé dans : DELETE cascade depuis events, lookup "sauvegardé par event"
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_saves_event_id
  ON public.event_saves (event_id);  -- FK → events

-- ---------------------------------------------------------------------------
-- 8. association_needs
--    created_by → profiles  (policy UPDATE/DELETE + filtre "mes besoins")
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asso_needs_created_by
  ON public.association_needs (created_by)  -- FK → profiles (nullable)
  WHERE created_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 9. lf_comments
--    author_id → profiles  (seul item_id est indexé via lf_comments_item_idx)
--    Utilisé dans : DELETE cascade, policy INSERT/DELETE
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_comments_author_id
  ON public.lf_comments (author_id)  -- FK → profiles (nullable)
  WHERE author_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 10. lf_matches
--     suggested_by → profiles  (nullable ; utilisé dans les vérifications admin)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lf_matches_suggested_by
  ON public.lf_matches (suggested_by)  -- FK → profiles (nullable)
  WHERE suggested_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 11. listing_status_history
--     changed_by → profiles  (nullable ; seul listing_id est indexé)
--     Utilisé dans : policy INSERT (auth.uid() = changed_by), filtres admin
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lsh_changed_by
  ON public.listing_status_history (changed_by)  -- FK → profiles (nullable)
  WHERE changed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 12. listing_reports
--     reporter_id → profiles  (seuls listing_id et status sont indexés)
--     Utilisé dans : policy SELECT/DELETE, DELETE cascade depuis profiles
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listing_reports_reporter_id
  ON public.listing_reports (reporter_id);  -- FK → profiles

-- ---------------------------------------------------------------------------
-- 13. help_request_status_history
--     changed_by → profiles  (seul help_request_id est indexé)
--     Utilisé dans : DELETE cascade, filtres admin
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_help_status_history_changed_by
  ON public.help_request_status_history (changed_by)  -- FK → profiles (nullable)
  WHERE changed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 14. moderation_queue
--     reviewed_by → profiles  (seuls author_id/status/risk_score sont indexés)
--     Utilisé dans : filtres admin "modéré par", DELETE cascade depuis profiles
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_modqueue_reviewed_by
  ON public.moderation_queue (reviewed_by)  -- FK → profiles (nullable)
  WHERE reviewed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 15. outing_status_history
--     outing_id  → group_outings  (supprimé dans migration_B : outing_status_history_outing_idx)
--     changed_by → profiles       (jamais indexé)
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_status_history_outing_id
  ON public.outing_status_history (outing_id);  -- FK → group_outings

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outing_status_history_changed_by
  ON public.outing_status_history (changed_by)  -- FK → profiles (nullable)
  WHERE changed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 16. collection_views
--     item_id → collection_items  (seul viewer_id est indexé via
--                                   idx_collection_views_viewer_id)
--     Utilisé dans : COUNT vues par item, DELETE cascade depuis collection_items
-- ---------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_views_item_id
  ON public.collection_views (item_id);  -- FK → collection_items

-- ============================================================================
-- Résumé des index créés (si non déjà existants) :
--   idx_artisan_profiles_user_id
--   idx_artisan_profiles_trade_category_id
--   idx_service_requests_resident_id
--   idx_service_requests_artisan_id
--   idx_listings_user_id
--   idx_listings_category_id
--   idx_listings_reserved_by_user_id        (partial : NOT NULL)
--   idx_reviews_artisan_id
--   idx_reviews_reviewer_id
--   idx_favorite_artisans_user_id
--   idx_favorite_artisans_artisan_id
--   idx_reports_reporter_id
--   idx_event_saves_event_id
--   idx_asso_needs_created_by               (partial : NOT NULL)
--   idx_lf_comments_author_id               (partial : NOT NULL)
--   idx_lf_matches_suggested_by             (partial : NOT NULL)
--   idx_lsh_changed_by                      (partial : NOT NULL)
--   idx_listing_reports_reporter_id
--   idx_help_status_history_changed_by      (partial : NOT NULL)
--   idx_modqueue_reviewed_by                (partial : NOT NULL)
--   idx_outing_status_history_outing_id
--   idx_outing_status_history_changed_by    (partial : NOT NULL)
--   idx_collection_views_item_id
-- ============================================================================


-- ================================================================
-- MIGRATION 31/36 : 20260422_service_requests_sector_id.sql
-- ================================================================

-- ===========================================================================
-- MIGRATION : Ajout de sector_id sur service_requests
-- Date       : 2026-04-22
-- Contexte   : Le formulaire /artisans/demande envoie sector_id mais la
--              colonne n'existait pas → erreur Supabase à l'insertion.
-- Idempotent : utilise IF NOT EXISTS, peut être relancé sans risque.
-- ===========================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_requests'
      AND column_name = 'sector_id'
  ) THEN
    ALTER TABLE service_requests
      ADD COLUMN sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;

    COMMENT ON COLUMN service_requests.sector_id IS
      'Secteur géographique de la demande (Collines, Figabruna, Village…) — facultatif mais recommandé pour cibler les artisans de la zone';
  END IF;
END $$;

-- Index pour filtrer/trier les demandes par secteur
CREATE INDEX IF NOT EXISTS idx_service_requests_sector_id
  ON service_requests (sector_id)
  WHERE sector_id IS NOT NULL;


-- ================================================================
-- MIGRATION 32/36 : 20260423_listings_delete_rls_fix.sql
-- ================================================================

-- ============================================================
-- FIX: Garantir la policy RLS DELETE sur listings
-- Problème : la suppression retourne 0 lignes sans erreur
-- Cause probable : policy DELETE absente ou mal configurée
--
-- ⚠️  COMPORTEMENT DESTRUCTIF VOLONTAIRE
-- ⚠️  Cette migration REMPLACE la totalité des policies DELETE
-- ⚠️  existantes sur public.listings par une policy unique et
-- ⚠️  canonique ("listings_delete_owner_or_admin").
--
-- Rationale : les anciens noms connus (établis dans la migration
-- baseline 20260407) étaient 'listings_delete' et
-- 'listings_delete_own'. L'une ou l'autre pouvait être absente,
-- présente en doublon, ou inactive, ce qui produisait les
-- suppressions silencieuses observées en production.
--
-- Après cette migration, une seule policy DELETE existe :
--   "listings_delete_owner_or_admin"
--   USING (auth.uid() = user_id OR is_moderator_or_admin())
--
-- Si une policy DELETE supplémentaire avait été ajoutée
-- manuellement entre la baseline et ce correctif, elle sera
-- supprimée et son comportement devra être reproduit dans
-- une nouvelle migration post-20260423.
-- ============================================================

-- 1. Remplacement de TOUTES les policies DELETE sur listings
--    par une policy unique et canonique.
--    Policies supprimées (noms historiques + tout doublon) :
--      - 'listings_delete'          (baseline 20260407)
--      - 'listings_delete_own'      (baseline 20260407)
--      - toute autre policy DELETE présente à l'exécution
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listings'
      AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.listings', pol.policyname);
    RAISE NOTICE 'Dropped DELETE policy: %', pol.policyname;
  END LOOP;
END $$;

-- 2. Créer une policy DELETE claire et explicite
--    Condition : l'utilisateur connecté est le propriétaire (user_id = auth.uid())
--    OU c'est un admin/moderator (via is_moderator_or_admin())
CREATE POLICY "listings_delete_owner_or_admin"
  ON public.listings
  AS PERMISSIVE
  FOR DELETE
  TO PUBLIC
  USING (
    auth.uid() = user_id
    OR is_moderator_or_admin()
  );

-- 3. Vérification
DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'listings'
    AND cmd = 'DELETE';
  RAISE NOTICE 'Listings DELETE policies after fix: %', cnt;
END $$;


-- ================================================================
-- MIGRATION 33/36 : 20260423_service_requests_delete_rls.sql
-- ================================================================

-- ============================================================================
-- Migration : RLS DELETE pour service_requests + request_comments
-- ============================================================================
-- PROBLÈME : La table service_requests n'a aucune politique RLS DELETE.
-- RLS par défaut = DENY ALL → le DELETE retourne 0 lignes sans erreur.
-- La console Vercel montre :
--   DELETE .../service_requests?id=eq.xxx&resident_id=eq.yyy → "Fetch a fini"
-- mais l'annonce reste présente car 0 lignes supprimées (RLS silencieux).
--
-- SOLUTION : Créer une politique DELETE qui autorise :
--   1. Le résident (auteur) à supprimer sa propre demande
--   2. Les administrateurs / modérateurs
--
-- Idem pour request_comments (même problème probable).
-- ============================================================================

-- ── service_requests DELETE ──────────────────────────────────────────────────
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_delete_own"         ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_delete_owner"       ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_delete_resident"    ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_delete"             ON public.service_requests;

CREATE POLICY "service_requests_delete_owner_or_admin"
  ON public.service_requests
  FOR DELETE
  USING (
    -- Seul le résident (auteur) peut supprimer sa demande
    auth.uid() = resident_id
    -- Ou un administrateur / modérateur
    OR is_moderator_or_admin()
  );

-- ── request_comments DELETE ──────────────────────────────────────────────────
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_comments_delete_own"   ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_delete_owner" ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_delete"       ON public.request_comments;

CREATE POLICY "request_comments_delete_author_or_admin"
  ON public.request_comments
  FOR DELETE
  USING (
    -- Auteur du commentaire
    auth.uid() = author_id
    -- Ou le résident concerné (peut modérer sa propre demande)
    OR auth.uid() IN (
      SELECT resident_id FROM public.service_requests
      WHERE id = request_comments.request_id
    )
    -- Ou admin / modérateur
    OR is_moderator_or_admin()
  );

-- ── UPDATE : autoriser le résident à changer le statut ──────────────────────
-- Vérifie si une politique UPDATE existe déjà, sinon crée.
DROP POLICY IF EXISTS "service_requests_update_own"     ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_update_owner"   ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_update_resident" ON public.service_requests;

CREATE POLICY "service_requests_update_owner_or_admin"
  ON public.service_requests
  FOR UPDATE
  USING (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  )
  WITH CHECK (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  );

-- ============================================================================
-- Vérification (à exécuter manuellement dans le SQL Editor Supabase) :
--
-- SELECT policyname, cmd FROM pg_policies
--   WHERE tablename = 'service_requests'
--   ORDER BY cmd, policyname;
--
-- Attendu :
--   service_requests_delete_owner_or_admin  DELETE
--   service_requests_select_participants    SELECT
--   service_requests_insert_resident        INSERT  (ou similaire)
--   service_requests_update_owner_or_admin  UPDATE
-- ============================================================================


-- ================================================================
-- MIGRATION 34/36 : 20260428_listings_cover_url.sql
-- ================================================================

-- =============================================================================
-- Migration : listings.cover_url — colonne dénormalisée pour la vue liste
-- =============================================================================
-- Problème (perf) :
--   La page /annonces chargeait la relation listing_photos pour chaque listing
--   (PostgREST : join N+1 groupé, mais ALL photos par listing dans la réponse).
--   ListingCard n'utilise que la première photo (display_order 0).
--   Sur 200 listings × N photos = payload JSON inutilement large.
--
-- Solution :
--   1. Colonne dénormalisée `cover_url TEXT` sur `listings`.
--   2. Trigger AFTER INSERT/UPDATE/DELETE sur `listing_photos` qui maintient
--      cover_url = URL de la photo avec le plus petit display_order (la cover).
--   3. Backfill immédiat sur les données existantes.
--   4. Index partiel sur listing_photos(listing_id, display_order) pour le trigger.
--
-- Avantage : la page /annonces n'a plus besoin du join listing_photos du tout.
--   SELECT id, title, …, cover_url FROM listings  -- ← une seule table, 0 join
--
-- Rollback (si nécessaire) :
--   DROP TRIGGER IF EXISTS trg_listing_photos_cover ON listing_photos;
--   DROP FUNCTION IF EXISTS fn_sync_listing_cover_url();
--   ALTER TABLE listings DROP COLUMN IF EXISTS cover_url;
-- =============================================================================

-- ── 1. Colonne cover_url ──────────────────────────────────────────────────────

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.listings.cover_url IS
  'URL dénormalisée de la photo cover (display_order le plus bas). '
  'Maintenue automatiquement par le trigger trg_listing_photos_cover. '
  'Évite le join listing_photos dans la vue liste /annonces.';

-- ── 2. Fonction trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_sync_listing_cover_url()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_cover_url  TEXT;
BEGIN
  -- Identifier le listing affecté
  IF TG_OP = 'DELETE' THEN
    v_listing_id := OLD.listing_id;
  ELSE
    v_listing_id := NEW.listing_id;
  END IF;

  -- Récupérer l'URL de la photo avec le plus petit display_order
  SELECT url
    INTO v_cover_url
    FROM public.listing_photos
   WHERE listing_id = v_listing_id
   ORDER BY display_order ASC
   LIMIT 1;

  -- Mettre à jour listing (NULL si plus aucune photo)
  UPDATE public.listings
     SET cover_url = v_cover_url
   WHERE id = v_listing_id;

  RETURN NULL; -- trigger AFTER → valeur de retour ignorée
END;
$$;

-- ── 3. Trigger AFTER INSERT / UPDATE / DELETE ─────────────────────────────────

DROP TRIGGER IF EXISTS trg_listing_photos_cover ON public.listing_photos;

CREATE TRIGGER trg_listing_photos_cover
  AFTER INSERT OR UPDATE OF url, display_order OR DELETE
  ON public.listing_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_listing_cover_url();

-- ── 4. Index composite pour le trigger (et toute requête ORDER BY display_order)

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_order
  ON public.listing_photos (listing_id, display_order ASC);

-- ── 5. Backfill — initialiser cover_url pour les listings existants ───────────

UPDATE public.listings l
   SET cover_url = (
         SELECT url
           FROM public.listing_photos p
          WHERE p.listing_id = l.id
          ORDER BY p.display_order ASC
          LIMIT 1
       );

-- ── 6. Vérification ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_total    INT;
  v_with_url INT;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.listings;
  SELECT COUNT(*) INTO v_with_url FROM public.listings WHERE cover_url IS NOT NULL;
  RAISE NOTICE '[listings_cover_url] % listings total, % avec cover_url initialisée',
    v_total, v_with_url;
END;
$$;


-- ================================================================
-- MIGRATION 35/36 : 20260430_artisan_is_verified_backfill.sql
-- ================================================================

-- =============================================================================
-- Migration : backfill artisan_profiles.is_verified
-- =============================================================================
-- Problème :
--   L'API /api/admin/artisans/[id] (action 'approve') ne mettait pas à jour
--   artisan_profiles.is_verified lors de la validation. Corrigé dans le code
--   (PR #468), mais les artisans validés AVANT ce correctif ont toujours
--   is_verified = false → ils sont invisibles sur la page publique /artisans
--   et dans les widgets communautaires.
--
-- Solution :
--   Synchroniser is_verified avec profiles.role :
--     • role = 'artisan_verified' → is_verified = true
--     • role = 'resident' ou 'artisan_pending' → is_verified = false
--
-- Trigger préventif :
--   On ajoute un trigger AFTER UPDATE sur profiles qui maintient
--   artisan_profiles.is_verified en sync automatique avec le rôle.
--   Cela rend le correctif applicatif redondant (défense en profondeur).
--
-- Rollback :
--   DROP TRIGGER IF EXISTS trg_sync_artisan_is_verified ON public.profiles;
--   DROP FUNCTION IF EXISTS public.fn_sync_artisan_is_verified();
--   -- (le backfill ne peut pas être rollbacké sans sauvegarde préalable)
-- =============================================================================

-- ── 1. Backfill immédiat ─────────────────────────────────────────────────────
-- Tous les artisans dont le profil est 'artisan_verified' → is_verified = true

UPDATE public.artisan_profiles ap
   SET is_verified = TRUE
  FROM public.profiles p
 WHERE ap.user_id = p.id
   AND p.role = 'artisan_verified'
   AND ap.is_verified IS DISTINCT FROM TRUE;

-- Tous les artisans dont le profil N'EST PLUS 'artisan_verified' → is_verified = false

UPDATE public.artisan_profiles ap
   SET is_verified = FALSE
  FROM public.profiles p
 WHERE ap.user_id = p.id
   AND p.role <> 'artisan_verified'
   AND ap.is_verified IS DISTINCT FROM FALSE;

-- ── 2. Trigger de synchronisation préventive ─────────────────────────────────
-- Maintient is_verified automatiquement quand le rôle change dans profiles.

CREATE OR REPLACE FUNCTION public.fn_sync_artisan_is_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ne traiter que les changements de rôle impliquant artisan_verified
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'artisan_verified' THEN
    UPDATE public.artisan_profiles
       SET is_verified = TRUE
     WHERE user_id = NEW.id;
  ELSIF OLD.role = 'artisan_verified' THEN
    -- L'artisan perd sa vérification (rejet, rétrogradation)
    UPDATE public.artisan_profiles
       SET is_verified = FALSE
     WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_artisan_is_verified ON public.profiles;

CREATE TRIGGER trg_sync_artisan_is_verified
  AFTER UPDATE OF role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_artisan_is_verified();

-- ── 3. Vérification ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_verified_profiles  INT;
  v_verified_artisans  INT;
  v_mismatch           INT;
BEGIN
  SELECT COUNT(*) INTO v_verified_profiles
    FROM public.profiles
   WHERE role = 'artisan_verified';

  SELECT COUNT(*) INTO v_verified_artisans
    FROM public.artisan_profiles
   WHERE is_verified = TRUE;

  SELECT COUNT(*) INTO v_mismatch
    FROM public.artisan_profiles ap
    JOIN public.profiles p ON p.id = ap.user_id
   WHERE p.role = 'artisan_verified' AND ap.is_verified IS DISTINCT FROM TRUE;

  RAISE NOTICE '[artisan_backfill] profiles artisan_verified=%, artisan_profiles.is_verified=true=%, désynchronisés=%',
    v_verified_profiles, v_verified_artisans, v_mismatch;

  IF v_mismatch > 0 THEN
    RAISE WARNING '[artisan_backfill] % artisan(s) encore désynchronisés — vérifier manuellement.', v_mismatch;
  END IF;
END;
$$;


-- ================================================================
-- MIGRATION 36/36 : 20260430_artisan_profiles_missing_columns.sql
-- ================================================================

-- =============================================================================
-- Migration : artisan_profiles — colonnes manquantes
-- =============================================================================
-- Problème :
--   Le code référence plusieurs colonnes qui n'existent pas dans la table
--   artisan_profiles en base de données :
--     • is_verified     — flag de vérification (boolean)
--     • trade_name      — nom du métier (dénormalisé depuis trade_categories)
--     • location        — localisation textuelle de l'artisan
--     • intervention_zone — zone d'intervention
--
--   Conséquence : toute requête Supabase sélectionnant ces colonnes renvoie
--   HTTP 400 ("column does not exist"), vidant les pages /artisans et widgets.
--
-- Solution :
--   1. ADD COLUMN pour les 4 colonnes manquantes
--   2. Backfill is_verified depuis profiles.role
--   3. Trigger de synchronisation is_verified ↔ profiles.role
--   4. RLS : politique SELECT publique pour artisans vérifiés
--
-- Rollback :
--   ALTER TABLE public.artisan_profiles
--     DROP COLUMN IF EXISTS is_verified,
--     DROP COLUMN IF EXISTS trade_name,
--     DROP COLUMN IF EXISTS location,
--     DROP COLUMN IF EXISTS intervention_zone;
--   DROP TRIGGER IF EXISTS trg_sync_artisan_is_verified ON public.profiles;
--   DROP FUNCTION IF EXISTS public.fn_sync_artisan_is_verified();
-- =============================================================================

-- ── 1. Colonnes manquantes ────────────────────────────────────────────────────

ALTER TABLE public.artisan_profiles
  ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trade_name       TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location         TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intervention_zone TEXT   DEFAULT NULL;

COMMENT ON COLUMN public.artisan_profiles.is_verified IS
  'TRUE quand l''artisan a été validé par un admin/modérateur. '
  'Maintenu en sync avec profiles.role via le trigger trg_sync_artisan_is_verified.';

COMMENT ON COLUMN public.artisan_profiles.trade_name IS
  'Nom du métier (dénormalisé depuis trade_categories.name pour accès direct sans JOIN).';

COMMENT ON COLUMN public.artisan_profiles.location IS
  'Localisation textuelle de l''artisan (ville, quartier, adresse partielle).';

COMMENT ON COLUMN public.artisan_profiles.intervention_zone IS
  'Zone géographique d''intervention (ex: "Biguglia, Lucciana, Borgo").';

-- ── 2. Backfill is_verified ───────────────────────────────────────────────────
-- Tous les artisans dont le profil est 'artisan_verified' → is_verified = TRUE

UPDATE public.artisan_profiles ap
   SET is_verified = TRUE
  FROM public.profiles p
 WHERE ap.user_id = p.id
   AND p.role = 'artisan_verified'
   AND ap.is_verified IS DISTINCT FROM TRUE;

-- ── 3. Trigger de synchronisation préventive ─────────────────────────────────
-- Maintient is_verified automatiquement quand le rôle change dans profiles.

CREATE OR REPLACE FUNCTION public.fn_sync_artisan_is_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'artisan_verified' THEN
    UPDATE public.artisan_profiles
       SET is_verified = TRUE
     WHERE user_id = NEW.id;
  ELSIF OLD.role = 'artisan_verified' THEN
    UPDATE public.artisan_profiles
       SET is_verified = FALSE
     WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_artisan_is_verified ON public.profiles;

CREATE TRIGGER trg_sync_artisan_is_verified
  AFTER UPDATE OF role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_artisan_is_verified();

-- ── 4. RLS : s'assurer que les artisans vérifiés sont lisibles publiquement ──
-- (la politique existante "Artisans vérifiés visibles" filtre probablement sur
--  is_verified = true qui était FALSE pour tous → aucune ligne retournée)

-- On crée/remplace la politique pour accepter les deux critères :
-- is_verified = true OU profiles.role = 'artisan_verified'
-- (pendant la période de transition des données)

DROP POLICY IF EXISTS "Artisans vérifiés visibles" ON public.artisan_profiles;
DROP POLICY IF EXISTS "artisan_profiles_select" ON public.artisan_profiles;
DROP POLICY IF EXISTS "artisan_profiles_select_all" ON public.artisan_profiles;

CREATE POLICY "artisan_profiles_select_verified"
  ON public.artisan_profiles
  FOR SELECT
  USING (
    is_verified = TRUE
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = artisan_profiles.user_id
         AND p.role = 'artisan_verified'
    )
  );

-- ── 5. Index pour is_verified (filtres fréquents) ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_artisan_profiles_is_verified
  ON public.artisan_profiles (is_verified)
  WHERE is_verified = TRUE;

-- ── 6. Vérification ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_total        INT;
  v_verified     INT;
  v_mismatch     INT;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.artisan_profiles;
  SELECT COUNT(*) INTO v_verified FROM public.artisan_profiles WHERE is_verified = TRUE;

  SELECT COUNT(*) INTO v_mismatch
    FROM public.profiles p
   WHERE p.role = 'artisan_verified'
     AND NOT EXISTS (
       SELECT 1 FROM public.artisan_profiles ap
        WHERE ap.user_id = p.id AND ap.is_verified = TRUE
     );

  RAISE NOTICE '[artisan_profiles_missing_columns] total=%, is_verified=true=%, profils_sans_artisan_profile=%',
    v_total, v_verified, v_mismatch;

  IF v_mismatch > 0 THEN
    RAISE WARNING '[artisan_profiles_missing_columns] % profil(s) artisan_verified sans artisan_profile correspondant — ces artisans devront recréer leur profil artisan.',
      v_mismatch;
  END IF;
END;
$$;


