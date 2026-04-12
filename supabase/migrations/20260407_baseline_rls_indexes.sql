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
