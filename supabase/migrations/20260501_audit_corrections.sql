-- ============================================================================
-- MIGRATION 20260501_audit_corrections
-- ★ Corrections issues de l'audit complet du 2026-04-30 ★
--
-- Corrections après vérification exhaustive code → DB :
--   1. trust_interactions — colonnes manquantes :
--      requester_review_allowed, receiver_review_allowed
--      (utilisées dans useLFActions.ts et dashboard/perdu-trouve/page.tsx)
--   2. reviews — colonnes manquantes :
--      reviewer_id (alias de author_id, utilisé dans admin/contenu)
--      would_recommend (utilisé dans AvisClient.tsx)
--   3. lf_status_history — s'assure que 'reason' existe (pas seulement 'note')
--      et que la FK est nommée lf_status_history_changed_by_fkey
--   4. forum_topics — s'assure que reply_count et reaction_count existent
--   5. artisan_profiles — colonne 'artisan_type' (utilisée dans admin/stats)
--
-- IDEMPOTENT : ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS
-- ============================================================================


-- ============================================================================
-- 1. trust_interactions — colonnes requester_review_allowed / receiver_review_allowed
-- ============================================================================
ALTER TABLE public.trust_interactions
  ADD COLUMN IF NOT EXISTS requester_review_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS receiver_review_allowed  BOOLEAN NOT NULL DEFAULT false;


-- ============================================================================
-- 2. reviews — colonnes manquantes
--    • reviewer_id : alias de author_id (certains fichiers anciens l'utilisent)
--    • would_recommend : utilisé dans AvisClient.tsx select/insert
--    • artisan_id : utilisé dans artisans/[id] pages
--    • moderation_status : utilisé dans trust/_queries.ts et _sql/trust.ts
-- ============================================================================
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewer_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS would_recommend   BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS artisan_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS source_type       TEXT,
  ADD COLUMN IF NOT EXISTS source_id         UUID,
  ADD COLUMN IF NOT EXISTS interaction_id    UUID,
  ADD COLUMN IF NOT EXISTS target_user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dim_communication INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dim_reliability   INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dim_punctuality   INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dim_quality       INT DEFAULT NULL;

-- Index manquants sur reviews
CREATE INDEX IF NOT EXISTS idx_reviews_artisan_id      ON public.reviews (artisan_id) WHERE artisan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_target_user_id  ON public.reviews (target_user_id) WHERE target_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_author_id       ON public.reviews (author_id) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id     ON public.reviews (reviewer_id) WHERE reviewer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_moderation      ON public.reviews (moderation_status);


-- ============================================================================
-- 3. artisan_profiles — colonne artisan_type (utilisée dans admin/stats)
--    admin/stats/route.ts : .select('id, artisan_type, trade_category:trade_categories(name, icon)')
-- ============================================================================
ALTER TABLE public.artisan_profiles
  ADD COLUMN IF NOT EXISTS artisan_type TEXT DEFAULT 'freelance';

CREATE INDEX IF NOT EXISTS idx_artisan_profiles_artisan_type
  ON public.artisan_profiles (artisan_type) WHERE artisan_type IS NOT NULL;


-- ============================================================================
-- 4. forum_topics — s'assurer que toutes les colonnes existent
--    (au cas où la table existait avant la migration 20260501_forum_advanced_rls)
-- ============================================================================
ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS reply_count    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reaction_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reply_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_hot         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility     TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();


-- ============================================================================
-- 5. events — colonnes manquantes utilisées dans le code
--    useEventDetail.ts utilise : start_time, archived_at
--    modifier/page.tsx utilise : cover_url
-- ============================================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS start_time   TEXT,
  ADD COLUMN IF NOT EXISTS end_time     TEXT,
  ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cover_url    TEXT,
  ADD COLUMN IF NOT EXISTS sector_id    TEXT;

CREATE INDEX IF NOT EXISTS idx_events_sector_id ON public.events (sector_id) WHERE sector_id IS NOT NULL;


-- ============================================================================
-- 6. profiles — colonnes manquantes utilisées dans le code
--    trust/_queries.ts utilise : avatar_url, phone
--    awardAutomaticBadges: phone, avatar_url, role, created_at
--    admin API: trust_level, is_active
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles (is_active) WHERE is_active = true;


-- ============================================================================
-- 7. listings — colonnes manquantes utilisées dans l'API admin
--    admin/users/route.ts join: .from('listings').select('author_id')
--    admin/stats/route.ts: .select('id, status, created_at, category:listing_categories(name)')
-- ============================================================================
-- Rien à ajouter (listing_categories déjà existant dans le schéma de base)


-- ============================================================================
-- 8. notifications — colonne 'is_read' (confirmé dans code, pas 'read_at')
--    migration 20260418_perf_indexes utilise is_read = false (déjà corrigé)
-- ============================================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (user_id, is_read) WHERE is_read = false;


-- ============================================================================
-- 9. admin_action_logs — colonnes utilisées dans admin/logs API
--    .select('id, actor_id, actor_role, action, target_table, target_id, ...')
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role   TEXT,
  action       TEXT        NOT NULL,
  target_table TEXT,
  target_id    UUID,
  payload      JSONB,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_action_logs_select" ON public.admin_action_logs;
DROP POLICY IF EXISTS "admin_action_logs_insert" ON public.admin_action_logs;

CREATE POLICY "admin_action_logs_select" ON public.admin_action_logs
  FOR SELECT USING (is_moderator_or_admin());
CREATE POLICY "admin_action_logs_insert" ON public.admin_action_logs
  FOR INSERT WITH CHECK (is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_admin_logs_actor_id     ON public.admin_action_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_table ON public.admin_action_logs (target_table);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at   ON public.admin_action_logs (created_at DESC);


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
