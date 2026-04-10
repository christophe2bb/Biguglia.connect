-- =============================================================================
-- MIGRATION B — LOT 3/4 : Events + Profiles + Trust/Reviews
-- =============================================================================
-- Appliquer en TROISIÈME — après validation du lot 2
-- Moment recommandé : heures creuses uniquement
-- Risque : modéré-élevé — events et profiles sont des tables centrales
--          Vérifier l'appli après chaque lot avant de continuer
-- =============================================================================

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
DROP INDEX IF EXISTS public.uq_trust_interaction;
DROP INDEX IF EXISTS public.idx_ti_requester;
DROP INDEX IF EXISTS public.idx_ti_receiver;
DROP INDEX IF EXISTS public.idx_ti_source;
DROP INDEX IF EXISTS public.idx_ti_review;

-- ── Reviews ───────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.uq_review_per_interaction;
DROP INDEX IF EXISTS public.idx_reviews_target;
DROP INDEX IF EXISTS public.idx_reviews_source;

-- ── User blocks / favorites ───────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_user_blocks_user_id;
DROP INDEX IF EXISTS public.idx_user_favorites_user_id;

