-- ============================================================
-- BIGUGLIA CONNECT — Migration thèmes forum personnalisés
-- Promenades & Nature — Thèmes de discussion
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Colonne `theme` sur forum_posts (si absente)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'general';

-- Index pour filtrage rapide côté serveur
CREATE INDEX IF NOT EXISTS idx_forum_posts_theme
  ON public.forum_posts(theme);

CREATE INDEX IF NOT EXISTS idx_forum_posts_category_theme
  ON public.forum_posts(category_id, theme);

-- ────────────────────────────────────────────────────────────
-- 2. Table des thèmes personnalisés (créés par les utilisateurs)
--
--    Logique :
--    • Les thèmes système (is_custom = false) sont créés par un admin
--      et ne peuvent pas être supprimés par un utilisateur.
--    • Les thèmes custom (is_custom = true) appartiennent à un auteur
--      et peuvent être supprimés/modifiés par ce dernier.
--    • Un thème custom est lié à une catégorie forum (ex. "promenades").
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_themes (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id  UUID        REFERENCES public.forum_categories(id) ON DELETE CASCADE NOT NULL,
  author_id    UUID        REFERENCES public.profiles(id)          ON DELETE SET NULL,
  slug         TEXT        NOT NULL,                -- ex. "itineraires", "chien", "mon-theme"
  label        TEXT        NOT NULL,                -- ex. "Itinéraires", "Mon thème"
  emoji        TEXT        NOT NULL DEFAULT '💬',
  description  TEXT,                               -- courte description (= sub)
  is_custom    BOOLEAN     NOT NULL DEFAULT true,  -- false = thème système
  is_approved  BOOLEAN     NOT NULL DEFAULT false, -- true = visible publiquement
  display_order INT        NOT NULL DEFAULT 99,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- ────────────────────────────────────────────────────────────
-- 3. Thèmes système (prédéfinis) — catégorie "promenades"
--    Insérés automatiquement ; is_custom = false, is_approved = true
-- ────────────────────────────────────────────────────────────
INSERT INTO public.forum_themes
  (category_id, author_id, slug, label, emoji, description, is_custom, is_approved, display_order)
SELECT
  fc.id,
  NULL,
  t.slug,
  t.label,
  t.emoji,
  t.description,
  false,   -- thème système
  true,    -- approuvé par défaut
  t.ord
FROM public.forum_categories fc
CROSS JOIN (VALUES
  ('itineraires', 'Itinéraires',    '🗺️', 'Partage de parcours',   1),
  ('nature',      'Nature & faune', '🌿', 'Observations terrain',  2),
  ('alertes',     'Alertes terrain','⚠️', 'Chemins, météo',        3),
  ('chien',       'Balades chien',  '🐕', 'Conseils & spots',      4),
  ('famille',     'Famille',        '👨‍👩‍👧', 'Sorties enfants',       5),
  ('photo',       'Spots photo',    '📸', 'Bons plans photo',      6),
  ('velo',        'Vélo & VTT',     '🚴', 'Circuits cyclables',    7),
  ('questions',   'Questions',      '❓', 'Aide & conseils',       8)
) AS t(slug, label, emoji, description, ord)
WHERE fc.slug = 'promenades'
ON CONFLICT (category_id, slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. RLS — Sécurité au niveau des lignes
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.forum_themes ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les thèmes approuvés
CREATE POLICY "forum_themes_select_approved"
  ON public.forum_themes FOR SELECT
  USING (is_approved = true);

-- L'auteur peut voir ses propres thèmes en attente
CREATE POLICY "forum_themes_select_own"
  ON public.forum_themes FOR SELECT
  USING (auth.uid() = author_id);

-- Un utilisateur connecté peut créer un thème custom
CREATE POLICY "forum_themes_insert"
  ON public.forum_themes FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND is_custom = true
    AND is_approved = false   -- soumis, pas encore approuvé
  );

-- L'auteur peut modifier son thème custom non encore approuvé
CREATE POLICY "forum_themes_update_own"
  ON public.forum_themes FOR UPDATE
  USING (auth.uid() = author_id AND is_custom = true);

-- L'auteur peut supprimer son thème custom
CREATE POLICY "forum_themes_delete_own"
  ON public.forum_themes FOR DELETE
  USING (auth.uid() = author_id AND is_custom = true);

-- Admin peut tout faire
CREATE POLICY "forum_themes_admin"
  ON public.forum_themes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. Table forum_post_themes (liaison N-N post ↔ thème)
--    Permet à un post d'avoir plusieurs thèmes à terme.
--    Pour l'instant on garde aussi la colonne `theme` (TEXT)
--    sur forum_posts pour la compatibilité + performance.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_post_themes (
  post_id   UUID REFERENCES public.forum_posts(id)   ON DELETE CASCADE NOT NULL,
  theme_id  UUID REFERENCES public.forum_themes(id)  ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (post_id, theme_id)
);

ALTER TABLE public.forum_post_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_post_themes_select"
  ON public.forum_post_themes FOR SELECT USING (true);

CREATE POLICY "forum_post_themes_insert"
  ON public.forum_post_themes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forum_posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. Vue utilitaire — posts avec leur thème résolu
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_forum_posts_with_theme AS
SELECT
  p.*,
  COALESCE(
    ft.label,
    p.theme,
    'general'
  ) AS theme_label,
  COALESCE(ft.emoji, '💬') AS theme_emoji
FROM public.forum_posts p
LEFT JOIN public.forum_themes ft
  ON ft.slug = p.theme
  AND ft.category_id = p.category_id;

-- ────────────────────────────────────────────────────────────
-- 7. Fonction RPC pour obtenir les comptages par thème
--    Appelable côté client via supabase.rpc('get_theme_counts', { cat_id })
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_theme_counts(p_category_id UUID)
RETURNS TABLE(theme TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(theme, 'general') AS theme,
    COUNT(*)::BIGINT            AS count
  FROM public.forum_posts
  WHERE category_id = p_category_id
    AND is_closed   = false
  GROUP BY COALESCE(theme, 'general');
$$;

-- Accès en lecture seule pour les utilisateurs authentifiés et anonymes
GRANT EXECUTE ON FUNCTION public.get_theme_counts(UUID) TO anon, authenticated;
