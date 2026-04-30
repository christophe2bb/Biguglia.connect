-- ============================================================================
-- MIGRATION 20260501_misc_tables_rls  (v2 — corrigé après audit complet)
-- ★ Tables diverses : colonnes manquantes + RLS ★
--
-- Tables concernées :
--   1. lf_status_history      — historique statut objets perdu/trouvé
--      ★ CORRECTION : code utilise 'reason' (pas 'note')
--        select: id, old_status, new_status, changed_by, reason, created_at
--   2. promenade_likes        — likes sur promenades
--   3. local_events           — table d'événements locaux (si séparée de events)
--   4. event_date_history     — historique changements de date événements
--      ★ CORRECTION : code utilise old_event_date, new_event_date,
--        old_start_time, new_start_time, reason (pas old_date, new_date)
--   5. outing_organizer_summary — vue résumé organisateur sorties
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. lf_status_history — historique statut objets perdu/trouvé
--    Code utilise : id, old_status, new_status, changed_by, reason, created_at
--    FK nommée : lf_status_history_changed_by_fkey (pour jointure profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lf_status_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID        NOT NULL REFERENCES public.lost_found_items(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT        NOT NULL,
  changed_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason       TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Alias pour compatibilité avec requêtes ORDER BY created_at
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter reason si la table existait avec 'note' à la place
-- (migration précédente avait 'note', le code utilise 'reason')
ALTER TABLE public.lf_status_history
  ADD COLUMN IF NOT EXISTS reason     TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Si 'note' existe et 'reason' n'était pas rempli, migrer les données
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lf_status_history'
      AND column_name = 'note'
  ) THEN
    UPDATE public.lf_status_history
    SET reason = note
    WHERE reason IS NULL AND note IS NOT NULL;
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_lf_status_history_created_at ON public.lf_status_history (created_at DESC);


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
-- 3. local_events — alias/table d'événements locaux
--    Code utilise : .from('local_events').select('*').eq('id', id)
--                   .from('local_events').update(updates).eq('id', id)
--    La table peut être une table séparée ou identique à 'events'.
--    On la crée seulement si elle n'existe pas déjà (ni comme table, ni comme vue).
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
    EXECUTE $v$
      CREATE TABLE IF NOT EXISTS public.local_events (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        title           TEXT        NOT NULL,
        description     TEXT,
        event_date      TIMESTAMPTZ,
        start_time      TEXT,
        end_time        TEXT,
        location        TEXT,
        author_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
        status          TEXT        NOT NULL DEFAULT 'active',
        category        TEXT,
        sector_id       TEXT,
        is_free         BOOLEAN     NOT NULL DEFAULT true,
        price           NUMERIC(10,2),
        cover_url       TEXT,
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
--    ★ CORRECTION : code utilise old_event_date, new_event_date,
--      old_start_time, new_start_time, reason (pas old_date, new_date)
--    Extrait de useEventDetail.ts :
--      { event_id, old_event_date, new_event_date,
--        old_start_time, new_start_time, changed_by, reason }
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_date_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  old_event_date TIMESTAMPTZ,
  new_event_date TIMESTAMPTZ NOT NULL,
  old_start_time TEXT,
  new_start_time TEXT,
  changed_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason         TEXT,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes si la table existait avec l'ancien schéma
-- (old_date/new_date → old_event_date/new_event_date)
ALTER TABLE public.event_date_history
  ADD COLUMN IF NOT EXISTS old_event_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS new_event_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS old_start_time TEXT,
  ADD COLUMN IF NOT EXISTS new_start_time TEXT,
  ADD COLUMN IF NOT EXISTS reason         TEXT,
  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ NOT NULL DEFAULT now();

-- Migrer données si ancienne colonne old_date / new_date existait
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'event_date_history'
      AND column_name = 'old_date'
  ) THEN
    UPDATE public.event_date_history
    SET old_event_date = old_date
    WHERE old_event_date IS NULL AND old_date IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'event_date_history'
      AND column_name = 'new_date'
  ) THEN
    UPDATE public.event_date_history
    SET new_event_date = new_date
    WHERE new_event_date IS NULL AND new_date IS NOT NULL;
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_event_date_history_created_at ON public.event_date_history (created_at DESC);


-- ============================================================================
-- 5. outing_organizer_summary — vue résumé pour l'organisateur
--    Code utilise : id, organizer_id, title, outing_date, status,
--                   sector_id, difficulty, kids_friendly, dogs_allowed,
--                   participants_count, created_at, updated_at
-- ============================================================================
DO $$
BEGIN
  -- Recréer la vue si elle n'existe pas (ou la remplacer si elle est obsolète)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'group_outings'
  ) THEN
    -- DROP d'abord pour éviter l'erreur "cannot change name of view column"
    -- (CREATE OR REPLACE VIEW ne peut pas modifier l'ordre/nom des colonnes existantes)
    EXECUTE $v$
      DROP VIEW IF EXISTS public.outing_organizer_summary;
    $v$;

    EXECUTE $v$
      CREATE VIEW public.outing_organizer_summary
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
        COUNT(op.id) AS participants_count,
        go.created_at,
        go.updated_at
      FROM public.group_outings go
      LEFT JOIN public.outing_participants op ON op.outing_id = go.id
      GROUP BY go.id;
    $v$;

    EXECUTE $v$
      GRANT SELECT ON public.outing_organizer_summary TO authenticated;
    $v$;

    RAISE NOTICE 'Vue outing_organizer_summary recréée';
  ELSE
    RAISE NOTICE 'Table group_outings absente — vue outing_organizer_summary ignorée';
  END IF;
END $$;


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
