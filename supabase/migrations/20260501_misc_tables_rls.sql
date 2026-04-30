-- ============================================================================
-- MIGRATION 20260501_misc_tables_rls
-- ★ Tables diverses : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. lf_status_history      — historique statut objets perdu/trouvé
--   2. promenade_likes        — likes sur promenades
--   3. local_events           — alias/vue sur events pour compatibilité
--   4. event_date_history     — historique changements de date événements
--   5. outing_organizer_summary — vue résumé organisateur sorties
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. lf_status_history — historique statut objets perdu/trouvé
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lf_status_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID        NOT NULL REFERENCES public.lost_found_items(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT        NOT NULL,
  changed_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  note         TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lf_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_status_history_select" ON public.lf_status_history;
DROP POLICY IF EXISTS "lf_status_history_insert" ON public.lf_status_history;

CREATE POLICY "lf_status_history_select" ON public.lf_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lost_found_items lfi
      WHERE lfi.id = lf_status_history.item_id
        AND lfi.author_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

CREATE POLICY "lf_status_history_insert" ON public.lf_status_history FOR INSERT
  WITH CHECK (
    auth.uid() = changed_by
    OR EXISTS (
      SELECT 1 FROM public.lost_found_items lfi
      WHERE lfi.id = item_id AND lfi.author_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

CREATE INDEX IF NOT EXISTS idx_lf_status_history_item_id    ON public.lf_status_history (item_id);
CREATE INDEX IF NOT EXISTS idx_lf_status_history_changed_by ON public.lf_status_history (changed_by) WHERE changed_by IS NOT NULL;


-- ============================================================================
-- 2. promenade_likes — likes sur promenades
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.promenade_likes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  promenade_id UUID        NOT NULL REFERENCES public.promenades(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promenade_id, user_id)
);

ALTER TABLE public.promenade_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promenade_likes_select" ON public.promenade_likes;
DROP POLICY IF EXISTS "promenade_likes_insert" ON public.promenade_likes;
DROP POLICY IF EXISTS "promenade_likes_delete" ON public.promenade_likes;

CREATE POLICY "promenade_likes_select" ON public.promenade_likes FOR SELECT USING (true);
CREATE POLICY "promenade_likes_insert" ON public.promenade_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "promenade_likes_delete" ON public.promenade_likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_promenade_likes_promenade_id ON public.promenade_likes (promenade_id);
CREATE INDEX IF NOT EXISTS idx_promenade_likes_user_id      ON public.promenade_likes (user_id);


-- ============================================================================
-- 3. local_events — alias/vue sur events pour compatibilité
--    Le code utilise 'local_events' pour update depuis la page modifier event.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'local_events'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'local_events'
  ) THEN
    -- Créer comme table si events n'est pas utilisable directement
    -- (certains projets ont local_events séparé de events)
    EXECUTE $v$
      CREATE TABLE IF NOT EXISTS public.local_events (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        title           TEXT        NOT NULL,
        description     TEXT,
        event_date      TIMESTAMPTZ,
        location        TEXT,
        author_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
        status          TEXT        NOT NULL DEFAULT 'active',
        category        TEXT,
        sector_id       TEXT,
        is_free         BOOLEAN     NOT NULL DEFAULT true,
        price           NUMERIC(10,2),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    $v$;

    EXECUTE $p$
      ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "local_events_select" ON public.local_events FOR SELECT USING (true);
      CREATE POLICY "local_events_insert" ON public.local_events FOR INSERT WITH CHECK (auth.uid() = author_id);
      CREATE POLICY "local_events_update" ON public.local_events FOR UPDATE USING (auth.uid() = author_id OR is_moderator_or_admin());
      CREATE POLICY "local_events_delete" ON public.local_events FOR DELETE USING (auth.uid() = author_id OR is_moderator_or_admin());
    $p$;

    RAISE NOTICE 'Table local_events créée';
  ELSE
    RAISE NOTICE 'local_events déjà présent — OK';
  END IF;
END $$;


-- ============================================================================
-- 4. event_date_history — historique changements de date événements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_date_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  old_date     TIMESTAMPTZ,
  new_date     TIMESTAMPTZ NOT NULL,
  changed_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason       TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_date_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_date_history_select" ON public.event_date_history;
DROP POLICY IF EXISTS "event_date_history_insert" ON public.event_date_history;

CREATE POLICY "event_date_history_select" ON public.event_date_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_date_history.event_id
        AND e.author_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

CREATE POLICY "event_date_history_insert" ON public.event_date_history FOR INSERT
  WITH CHECK (
    auth.uid() = changed_by
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.author_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

CREATE INDEX IF NOT EXISTS idx_event_date_history_event_id   ON public.event_date_history (event_id);
CREATE INDEX IF NOT EXISTS idx_event_date_history_changed_by ON public.event_date_history (changed_by) WHERE changed_by IS NOT NULL;


-- ============================================================================
-- 5. outing_organizer_summary — vue résumé pour l'organisateur
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'outing_organizer_summary'
  ) THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.outing_organizer_summary
        WITH (security_invoker = true)
      AS
      SELECT
        go.id,
        go.organizer_id,
        go.title,
        go.outing_date,
        go.status,
        go.sector_id,
        go.difficulty,
        go.kids_friendly,
        go.dogs_allowed,
        COUNT(op.id)  AS participants_count,
        go.created_at,
        go.updated_at
      FROM public.group_outings go
      LEFT JOIN public.outing_participants op ON op.outing_id = go.id
      GROUP BY go.id;

      GRANT SELECT ON public.outing_organizer_summary TO authenticated;
    $v$;
    RAISE NOTICE 'Vue outing_organizer_summary créée';
  ELSE
    RAISE NOTICE 'outing_organizer_summary déjà présente — OK';
  END IF;
END $$;


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
