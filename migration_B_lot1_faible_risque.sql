-- =============================================================================
-- MIGRATION B — LOT 1/4 : Index à faible risque (tables peu critiques)
-- =============================================================================
-- Appliquer en PREMIER — tables à trafic modéré ou faible
-- Moment recommandé : n'importe quand, même en heure normale
-- Verrou : ACCESS EXCLUSIVE ~1-2 ms par index
-- Rollback : automatique si erreur (IF EXISTS garantit qu'un absent ne bloque pas)
-- =============================================================================

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

