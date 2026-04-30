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
--   • CREATE INDEX IF NOT EXISTS  → pas de verrou, idempotent
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
CREATE INDEX IF NOT EXISTS idx_artisan_profiles_user_id
  ON public.artisan_profiles (user_id);  -- FK → profiles

CREATE INDEX IF NOT EXISTS idx_artisan_profiles_trade_category_id
  ON public.artisan_profiles (trade_category_id);  -- FK → trade_categories

-- ---------------------------------------------------------------------------
-- 2. service_requests
--    resident_id → profiles        (filtre principal de la policy SELECT)
--    artisan_id  → artisan_profiles (supprimé dans migration_B lot 4 car idx_scan=0
--                                    à ce moment ; le trafic a augmenté depuis)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_service_requests_resident_id
  ON public.service_requests (resident_id);  -- FK → profiles

CREATE INDEX IF NOT EXISTS idx_service_requests_artisan_id
  ON public.service_requests (artisan_id);  -- FK → artisan_profiles

-- ---------------------------------------------------------------------------
-- 3. listings
--    user_id              → profiles          (FK originale, utilisée dans les policies)
--    category_id          → listing_categories (filtre de recherche)
--    reserved_by_user_id  → profiles          (nullable, filtre réservations)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_user_id
  ON public.listings (user_id);  -- FK → profiles

CREATE INDEX IF NOT EXISTS idx_listings_category_id
  ON public.listings (category_id);  -- FK → listing_categories

CREATE INDEX IF NOT EXISTS idx_listings_reserved_by_user_id
  ON public.listings (reserved_by_user_id)  -- FK → profiles (nullable)
  WHERE reserved_by_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. reviews
--    artisan_id  → artisan_profiles  (filtre principal : reviews d'un artisan)
--    reviewer_id → profiles          (unicité + policy DELETE)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reviews_artisan_id
  ON public.reviews (artisan_id);  -- FK → artisan_profiles

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
  ON public.reviews (reviewer_id);  -- FK → profiles

-- ---------------------------------------------------------------------------
-- 5. favorite_artisans
--    user_id    → profiles          (lookup "mes favoris")
--    artisan_id → artisan_profiles  (lookup "qui m'a mis en favori")
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_favorite_artisans_user_id
  ON public.favorite_artisans (user_id);  -- FK → profiles

CREATE INDEX IF NOT EXISTS idx_favorite_artisans_artisan_id
  ON public.favorite_artisans (artisan_id);  -- FK → artisan_profiles

-- ---------------------------------------------------------------------------
-- 6. reports
--    reporter_id → profiles  (policy SELECT "voir ses propres signalements")
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
  ON public.reports (reporter_id);  -- FK → profiles

-- ---------------------------------------------------------------------------
-- 7. event_saves
--    event_id → events  (seul user_id est indexé ; event_id manque)
--    Utilisé dans : DELETE cascade depuis events, lookup "sauvegardé par event"
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_event_saves_event_id
  ON public.event_saves (event_id);  -- FK → events

-- ---------------------------------------------------------------------------
-- 8. association_needs
--    created_by → profiles  (policy UPDATE/DELETE + filtre "mes besoins")
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_asso_needs_created_by
  ON public.association_needs (created_by)  -- FK → profiles (nullable)
  WHERE created_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 9. lf_comments
--    author_id → profiles  (seul item_id est indexé via lf_comments_item_idx)
--    Utilisé dans : DELETE cascade, policy INSERT/DELETE
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lf_comments_author_id
  ON public.lf_comments (author_id)  -- FK → profiles (nullable)
  WHERE author_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 10. lf_matches
--     suggested_by → profiles  (nullable ; utilisé dans les vérifications admin)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lf_matches_suggested_by
  ON public.lf_matches (suggested_by)  -- FK → profiles (nullable)
  WHERE suggested_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 11. listing_status_history
--     changed_by → profiles  (nullable ; seul listing_id est indexé)
--     Utilisé dans : policy INSERT (auth.uid() = changed_by), filtres admin
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lsh_changed_by
  ON public.listing_status_history (changed_by)  -- FK → profiles (nullable)
  WHERE changed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 12. listing_reports
--     reporter_id → profiles  (seuls listing_id et status sont indexés)
--     Utilisé dans : policy SELECT/DELETE, DELETE cascade depuis profiles
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listing_reports_reporter_id
  ON public.listing_reports (reporter_id);  -- FK → profiles

-- ---------------------------------------------------------------------------
-- 13. help_request_status_history
--     changed_by → profiles  (seul help_request_id est indexé)
--     Utilisé dans : DELETE cascade, filtres admin
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_help_status_history_changed_by
  ON public.help_request_status_history (changed_by)  -- FK → profiles (nullable)
  WHERE changed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 14. moderation_queue
--     reviewed_by → profiles  (seuls author_id/status/risk_score sont indexés)
--     Utilisé dans : filtres admin "modéré par", DELETE cascade depuis profiles
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_modqueue_reviewed_by
  ON public.moderation_queue (reviewed_by)  -- FK → profiles (nullable)
  WHERE reviewed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 15. outing_status_history
--     outing_id  → group_outings  (supprimé dans migration_B : outing_status_history_outing_idx)
--     changed_by → profiles       (jamais indexé)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_outing_status_history_outing_id
  ON public.outing_status_history (outing_id);  -- FK → group_outings

CREATE INDEX IF NOT EXISTS idx_outing_status_history_changed_by
  ON public.outing_status_history (changed_by)  -- FK → profiles (nullable)
  WHERE changed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 16. collection_views
--     item_id → collection_items  (seul viewer_id est indexé via
--                                   idx_collection_views_viewer_id)
--     Utilisé dans : COUNT vues par item, DELETE cascade depuis collection_items
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_collection_views_item_id
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
