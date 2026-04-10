-- =============================================================================
-- MIGRATION B — LOT 3/4 : Events + Profiles + Trust/Reviews (v3)
-- =============================================================================
-- Appliquer en TROISIÈME — après validation du lot 2
-- Moment recommandé : heures creuses uniquement
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

