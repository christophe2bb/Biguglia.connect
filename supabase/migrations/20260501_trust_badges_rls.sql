-- ============================================================================
-- MIGRATION 20260501_trust_badges_rls  (v2 — corrigé après audit complet)
-- ★ Tables trust/badges/interactions/ratings : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. trust_profile_stats — statistiques de confiance par profil
--      ★ Colonnes manquantes d'après _types.ts :
--         interactions_total, interactions_done, interactions_cancelled,
--         interactions_disputed, reviews_received, avg_communication,
--         avg_reliability, avg_punctuality, avg_quality, recommend_pct,
--         dist_1..dist_5, last_computed_at
--   2. profile_badges — badges obtenus
--      ★ Colonne manquante : awarded_by (utilisé dans upsert de _queries.ts)
--   3. interactions — interactions entre utilisateurs
--      ★ Colonnes manquantes d'après InteractionButton.tsx et _types.ts :
--         started_at, conversation_id, interaction_type, accepted_at,
--         status_history, review_requester_done, review_receiver_done
--   4. item_ratings — notes sur les objets/services
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. trust_profile_stats
--    Colonnes attendues d'après TrustProfileStats dans _types.ts :
--    profile_id, interactions_total, interactions_done, interactions_cancelled,
--    interactions_disputed, reviews_received, avg_rating, avg_communication,
--    avg_reliability, avg_punctuality, avg_quality, recommend_pct,
--    dist_1..dist_5, trust_score, last_computed_at
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trust_profile_stats (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  trust_score           INT         NOT NULL DEFAULT 0,
  interactions_total    INT         NOT NULL DEFAULT 0,
  interactions_done     INT         NOT NULL DEFAULT 0,
  interactions_cancelled INT        NOT NULL DEFAULT 0,
  interactions_disputed INT         NOT NULL DEFAULT 0,
  reviews_received      INT         NOT NULL DEFAULT 0,
  avg_rating            NUMERIC(3,2) DEFAULT NULL,
  avg_communication     NUMERIC(3,2) DEFAULT NULL,
  avg_reliability       NUMERIC(3,2) DEFAULT NULL,
  avg_punctuality       NUMERIC(3,2) DEFAULT NULL,
  avg_quality           NUMERIC(3,2) DEFAULT NULL,
  recommend_pct         NUMERIC(5,2) DEFAULT NULL,
  dist_1                INT         NOT NULL DEFAULT 0,
  dist_2                INT         NOT NULL DEFAULT 0,
  dist_3                INT         NOT NULL DEFAULT 0,
  dist_4                INT         NOT NULL DEFAULT 0,
  dist_5                INT         NOT NULL DEFAULT 0,
  reviews_count         INT         NOT NULL DEFAULT 0,
  interactions_count    INT         NOT NULL DEFAULT 0,
  help_count            INT         NOT NULL DEFAULT 0,
  events_count          INT         NOT NULL DEFAULT 0,
  listings_count        INT         NOT NULL DEFAULT 0,
  forum_count           INT         NOT NULL DEFAULT 0,
  last_computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colonnes manquantes si la table existait déjà (version précédente plus simple)
ALTER TABLE public.trust_profile_stats
  ADD COLUMN IF NOT EXISTS interactions_total    INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactions_done     INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactions_cancelled INT        NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interactions_disputed INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_received      INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_communication     NUMERIC(3,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_reliability       NUMERIC(3,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_punctuality       NUMERIC(3,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_quality           NUMERIC(3,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recommend_pct         NUMERIC(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dist_1                INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dist_2                INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dist_3                INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dist_4                INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dist_5                INT         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_computed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT now();

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
--    Code utilise : profile_id, badge_code, awarded_by (dans upsert de _queries.ts)
--    awarded_by 'system' | 'admin' — colonne manquante dans v1
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_code  TEXT        NOT NULL,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  awarded_by  TEXT        NOT NULL DEFAULT 'system',
  UNIQUE (profile_id, badge_code)
);

-- Colonne manquante si la table existait déjà sans awarded_by
ALTER TABLE public.profile_badges
  ADD COLUMN IF NOT EXISTS awarded_by TEXT NOT NULL DEFAULT 'system';

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
--    Colonnes attendues d'après TrustInteraction (_types.ts) + InteractionButton.tsx :
--    source_type, source_id, requester_id, receiver_id, interaction_type,
--    status, review_unlocked, review_requester_done, review_receiver_done,
--    conversation_id, status_history (JSONB), started_at, accepted_at,
--    completed_at, updated_at
--    UNIQUE utilisé dans upsert : (source_type, source_id, requester_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interactions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type           TEXT        NOT NULL,
  source_id             UUID,
  interaction_type      TEXT        NOT NULL DEFAULT 'transaction',
  status                TEXT        NOT NULL DEFAULT 'requested',
  review_unlocked             BOOLEAN NOT NULL DEFAULT false,
  review_requester_done       BOOLEAN NOT NULL DEFAULT false,
  review_receiver_done        BOOLEAN NOT NULL DEFAULT false,
  conversation_id       UUID,
  status_history        JSONB       NOT NULL DEFAULT '[]',
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at           TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, requester_id)
);

-- Colonnes manquantes si la table existait déjà sans elles
ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS interaction_type      TEXT        NOT NULL DEFAULT 'transaction',
  ADD COLUMN IF NOT EXISTS conversation_id       UUID,
  ADD COLUMN IF NOT EXISTS status_history        JSONB       NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS accepted_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ NOT NULL DEFAULT now();

-- Contrainte unique sur (source_type, source_id, requester_id) si elle n'existe pas
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'interactions_source_type_source_id_requester_id_key'
      AND conrelid = 'public.interactions'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.interactions
        ADD CONSTRAINT interactions_source_type_source_id_requester_id_key
        UNIQUE (source_type, source_id, requester_id);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Contrainte unique interactions déjà existante ou conflit de données — ignoré';
    END;
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_interactions_started_at   ON public.interactions (started_at DESC);
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
