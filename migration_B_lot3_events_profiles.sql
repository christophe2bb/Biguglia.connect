-- =============================================================================
-- MIGRATION B — LOT 3/4 : Events + Profiles + Trust/Reviews (v2)
-- =============================================================================
-- Appliquer en TROISIÈME — après validation du lot 2
-- Moment recommandé : heures creuses uniquement
-- Risque : modéré-élevé — events et profiles sont des tables centrales
--          Vérifier l'appli après chaque lot avant de continuer
--
-- CORRECTION v2 :
--   uq_trust_interaction et uq_review_per_interaction sont des contraintes UNIQUE
--   (pas des index simples). DROP INDEX échoue avec ERROR 2BP01.
--   Fix : ALTER TABLE DROP CONSTRAINT IF EXISTS au lieu de DROP INDEX.
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
-- ⚠️  uq_trust_interaction est une CONTRAINTE UNIQUE, pas un index simple.
--     DROP INDEX échoue avec : "cannot drop index because constraint requires it"
--     → utiliser ALTER TABLE DROP CONSTRAINT
ALTER TABLE public.trust_interactions DROP CONSTRAINT IF EXISTS uq_trust_interaction;
DROP INDEX IF EXISTS public.idx_ti_requester;
DROP INDEX IF EXISTS public.idx_ti_receiver;
DROP INDEX IF EXISTS public.idx_ti_source;
DROP INDEX IF EXISTS public.idx_ti_review;

-- ── Reviews ───────────────────────────────────────────────────────────────────
-- ⚠️  uq_review_per_interaction est aussi une CONTRAINTE UNIQUE
--     → ALTER TABLE DROP CONSTRAINT
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS uq_review_per_interaction;
DROP INDEX IF EXISTS public.idx_reviews_target;
DROP INDEX IF EXISTS public.idx_reviews_source;

-- ── User blocks / favorites ───────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_user_blocks_user_id;
DROP INDEX IF EXISTS public.idx_user_favorites_user_id;

