-- =============================================================================
-- MIGRATION B — LOT 4/4 : Conversations + Modération + Reports (tables sensibles)
-- =============================================================================
-- Appliquer en DERNIER — uniquement après validation complète des lots 1-2-3
-- Moment recommandé : nuit, trafic quasi nul
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
-- =============================================================================

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

