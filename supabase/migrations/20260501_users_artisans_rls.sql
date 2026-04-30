-- ============================================================================
-- MIGRATION 20260501_users_artisans_rls
-- ★ Tables utilisateurs/artisans : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. user_favorites   — favoris utilisateur (artisans, profils)
--   2. user_blocks      — blocages utilisateur
--   3. artisan_reviews  — avis sur artisans (alias de reviews)
--   4. review_tags      — tags associés aux avis
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. user_favorites
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id      UUID,
  target_type    TEXT,
  target_user_id UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colonnes manquantes si la table existait déjà sans elles
ALTER TABLE public.user_favorites
  ADD COLUMN IF NOT EXISTS target_id      UUID,
  ADD COLUMN IF NOT EXISTS target_type    TEXT,
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_favorites_select" ON public.user_favorites;
DROP POLICY IF EXISTS "user_favorites_insert" ON public.user_favorites;
DROP POLICY IF EXISTS "user_favorites_delete" ON public.user_favorites;

CREATE POLICY "user_favorites_select" ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id OR is_moderator_or_admin());
CREATE POLICY "user_favorites_insert" ON public.user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_favorites_delete" ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Index sur user_id (colonne existante depuis le début)
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites (user_id);

-- Index sur colonnes ajoutées dynamiquement → via EXECUTE pour éviter
-- l'erreur de compilation PostgreSQL "column does not exist"
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'user_favorites'
      AND indexname = 'idx_user_favorites_target_user_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_user_favorites_target_user_id
      ON public.user_favorites (target_user_id)
      WHERE target_user_id IS NOT NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'user_favorites'
      AND indexname = 'idx_user_favorites_target_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_user_favorites_target_id
      ON public.user_favorites (target_id)
      WHERE target_id IS NOT NULL';
  END IF;
END $$;


-- ============================================================================
-- 2. user_blocks
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_insert" ON public.user_blocks;
DROP POLICY IF EXISTS "user_blocks_delete" ON public.user_blocks;

CREATE POLICY "user_blocks_select" ON public.user_blocks FOR SELECT
  USING (auth.uid() = user_id OR is_moderator_or_admin());
CREATE POLICY "user_blocks_insert" ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_blocks_delete" ON public.user_blocks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_user_id        ON public.user_blocks (user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_target_user_id ON public.user_blocks (target_user_id);


-- ============================================================================
-- 3. artisan_reviews — alias/vue de reviews pour compatibilité
--    Le code utilise 'artisan_reviews' uniquement pour COUNT (*) dans
--    /artisans-biguglia et /services-biguglia → si la table n'existe pas,
--    créer une vue sur reviews.
-- ============================================================================
DO $$
BEGIN
  -- Créer la vue si ni la table ni la vue n'existent déjà
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'artisan_reviews'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'artisan_reviews'
  ) THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.artisan_reviews
        WITH (security_invoker = true)
      AS SELECT * FROM public.reviews
      WHERE artisan_id IS NOT NULL;

      GRANT SELECT ON public.artisan_reviews TO authenticated, anon;
    $v$;
    RAISE NOTICE 'Vue artisan_reviews créée sur reviews';
  ELSE
    RAISE NOTICE 'artisan_reviews déjà présent — OK';
  END IF;
END $$;


-- ============================================================================
-- 4. review_tags — tags associés aux avis
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.review_tags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  UUID        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  tag        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.review_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_tags_select" ON public.review_tags;
DROP POLICY IF EXISTS "review_tags_insert" ON public.review_tags;
DROP POLICY IF EXISTS "review_tags_delete" ON public.review_tags;

CREATE POLICY "review_tags_select" ON public.review_tags FOR SELECT USING (true);
CREATE POLICY "review_tags_insert" ON public.review_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.reviewer_id = auth.uid())
);
CREATE POLICY "review_tags_delete" ON public.review_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.reviewer_id = auth.uid())
  OR is_moderator_or_admin()
);

CREATE INDEX IF NOT EXISTS idx_review_tags_review_id ON public.review_tags (review_id);


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
