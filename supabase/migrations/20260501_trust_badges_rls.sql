-- ============================================================================
-- MIGRATION 20260501_trust_badges_rls
-- ★ Tables trust/badges/interactions/ratings : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. trust_profile_stats — statistiques de confiance par profil
--   2. profile_badges      — badges obtenus par les utilisateurs
--   3. interactions        — interactions entre utilisateurs (échanges)
--   4. item_ratings        — notes sur les objets/services
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. trust_profile_stats
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trust_profile_stats (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  trust_score         INT         NOT NULL DEFAULT 0,
  reviews_count       INT         NOT NULL DEFAULT 0,
  avg_rating          NUMERIC(3,2) DEFAULT NULL,
  interactions_count  INT         NOT NULL DEFAULT 0,
  help_count          INT         NOT NULL DEFAULT 0,
  events_count        INT         NOT NULL DEFAULT 0,
  listings_count      INT         NOT NULL DEFAULT 0,
  forum_count         INT         NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_profile_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_profile_stats_select" ON public.trust_profile_stats;
DROP POLICY IF EXISTS "trust_profile_stats_insert" ON public.trust_profile_stats;
DROP POLICY IF EXISTS "trust_profile_stats_update" ON public.trust_profile_stats;

CREATE POLICY "trust_profile_stats_select" ON public.trust_profile_stats FOR SELECT USING (true);
CREATE POLICY "trust_profile_stats_insert" ON public.trust_profile_stats FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR is_moderator_or_admin());
CREATE POLICY "trust_profile_stats_update" ON public.trust_profile_stats FOR UPDATE
  USING (auth.uid() = profile_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_trust_profile_stats_profile_id ON public.trust_profile_stats (profile_id);
CREATE INDEX IF NOT EXISTS idx_trust_profile_stats_score      ON public.trust_profile_stats (trust_score DESC);


-- ============================================================================
-- 2. profile_badges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_code  TEXT        NOT NULL,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, badge_code)
);

ALTER TABLE public.profile_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_badges_select" ON public.profile_badges;
DROP POLICY IF EXISTS "profile_badges_insert" ON public.profile_badges;
DROP POLICY IF EXISTS "profile_badges_delete" ON public.profile_badges;

CREATE POLICY "profile_badges_select" ON public.profile_badges FOR SELECT USING (true);
CREATE POLICY "profile_badges_insert" ON public.profile_badges FOR INSERT
  WITH CHECK (auth.uid() = profile_id OR is_moderator_or_admin());
CREATE POLICY "profile_badges_delete" ON public.profile_badges FOR DELETE
  USING (is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_profile_badges_profile_id ON public.profile_badges (profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_badges_badge_code ON public.profile_badges (badge_code);


-- ============================================================================
-- 3. interactions — échanges entre utilisateurs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type       TEXT        NOT NULL,
  source_id         UUID,
  status            TEXT        NOT NULL DEFAULT 'pending',
  review_unlocked         BOOLEAN NOT NULL DEFAULT false,
  review_requester_done   BOOLEAN NOT NULL DEFAULT false,
  review_receiver_done    BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactions_select" ON public.interactions;
DROP POLICY IF EXISTS "interactions_insert" ON public.interactions;
DROP POLICY IF EXISTS "interactions_update" ON public.interactions;
DROP POLICY IF EXISTS "interactions_delete" ON public.interactions;

CREATE POLICY "interactions_select" ON public.interactions FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id OR is_moderator_or_admin());
CREATE POLICY "interactions_insert" ON public.interactions FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "interactions_update" ON public.interactions FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id OR is_moderator_or_admin());
CREATE POLICY "interactions_delete" ON public.interactions FOR DELETE
  USING (auth.uid() = requester_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_interactions_requester_id ON public.interactions (requester_id);
CREATE INDEX IF NOT EXISTS idx_interactions_receiver_id  ON public.interactions (receiver_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status       ON public.interactions (status);
CREATE INDEX IF NOT EXISTS idx_interactions_source       ON public.interactions (source_type, source_id) WHERE source_id IS NOT NULL;


-- ============================================================================
-- 4. item_ratings — notes sur objets/services
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.item_ratings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID        NOT NULL,
  item_type   TEXT        NOT NULL,
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating      INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, item_type, user_id)
);

ALTER TABLE public.item_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "item_ratings_select" ON public.item_ratings;
DROP POLICY IF EXISTS "item_ratings_insert" ON public.item_ratings;
DROP POLICY IF EXISTS "item_ratings_update" ON public.item_ratings;
DROP POLICY IF EXISTS "item_ratings_delete" ON public.item_ratings;

CREATE POLICY "item_ratings_select" ON public.item_ratings FOR SELECT USING (true);
CREATE POLICY "item_ratings_insert" ON public.item_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "item_ratings_update" ON public.item_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "item_ratings_delete" ON public.item_ratings FOR DELETE USING (auth.uid() = user_id OR is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_item_ratings_item    ON public.item_ratings (item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_item_ratings_user_id ON public.item_ratings (user_id);


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
