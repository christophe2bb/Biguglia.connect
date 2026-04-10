-- =============================================================================
-- MIGRATION B — LOT 2/4 : Forum + Listings + Jobs
-- =============================================================================
-- Appliquer en DEUXIÈME — après validation du lot 1
-- Moment recommandé : heures creuses (nuit, week-end)
-- Risque : modéré — ces tables ont du trafic en lecture mais les index
--          supprimés ont idx_scan = 0 (jamais utilisés par le planificateur)
-- =============================================================================

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

