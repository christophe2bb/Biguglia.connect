-- ============================================================
-- Migration : colonne "theme" sur forum_posts
-- Permet de classer les échanges Promenades par thème
-- ============================================================
-- Idempotent : ALTER COLUMN IF NOT EXISTS via DO block

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'forum_posts'
      AND column_name  = 'theme'
  ) THEN
    ALTER TABLE public.forum_posts
      ADD COLUMN theme TEXT DEFAULT 'general' NOT NULL;

    -- Index pour filtrage rapide par thème
    CREATE INDEX idx_forum_posts_theme ON public.forum_posts(theme);

    RAISE NOTICE 'Colonne theme ajoutée à forum_posts';
  ELSE
    RAISE NOTICE 'Colonne theme déjà présente — migration ignorée';
  END IF;
END $$;
