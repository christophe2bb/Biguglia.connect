-- ============================================================================
-- MIGRATION 20260502_missing_tables_fix
-- ★ Création des tables manquantes détectées par l'audit du 2026-05-01 ★
--
-- Tables absentes de la base alors qu'elles sont référencées :
--   1. trust_badges      — badges de confiance attribués aux utilisateurs
--                          (référencée dans migration 20260501_trust_badges_rls)
--   2. artisan_appointments — rendez-vous pris avec les artisans
--                          (type Appointment dans src/types/artisans.ts)
--
-- IDEMPOTENT : CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS
-- ============================================================================


-- ============================================================================
-- 1. trust_badges — badges de confiance
--    Référencée dans _config.ts admin/migration et types/trust
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trust_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_code  TEXT        NOT NULL,
  badge_label TEXT,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  awarded_by  TEXT        NOT NULL DEFAULT 'system',
  UNIQUE (profile_id, badge_code)
);

ALTER TABLE public.trust_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_badges_select"  ON public.trust_badges;
DROP POLICY IF EXISTS "trust_badges_insert"  ON public.trust_badges;
DROP POLICY IF EXISTS "trust_badges_delete"  ON public.trust_badges;

CREATE POLICY "trust_badges_select" ON public.trust_badges
  FOR SELECT USING (true);

CREATE POLICY "trust_badges_insert" ON public.trust_badges
  FOR INSERT WITH CHECK (auth.uid() = profile_id OR is_moderator_or_admin());

CREATE POLICY "trust_badges_delete" ON public.trust_badges
  FOR DELETE USING (is_moderator_or_admin());

CREATE INDEX IF NOT EXISTS idx_trust_badges_profile_id ON public.trust_badges (profile_id);
CREATE INDEX IF NOT EXISTS idx_trust_badges_badge_code ON public.trust_badges (badge_code);


-- ============================================================================
-- 2. artisan_appointments — rendez-vous artisans
--    Type Appointment dans src/types/artisans.ts :
--    id, request_id?, resident_id, artisan_id, proposed_date, proposed_time,
--    notes?, status, created_at, updated_at
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.artisan_appointments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     UUID        REFERENCES public.service_requests(id) ON DELETE SET NULL,
  resident_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artisan_id     UUID        NOT NULL REFERENCES public.artisan_profiles(id) ON DELETE CASCADE,
  proposed_date  DATE        NOT NULL,
  proposed_time  TEXT        NOT NULL DEFAULT '',
  notes          TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','accepted','declined','rescheduled','completed','cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artisan_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artisan_appointments_select"  ON public.artisan_appointments;
DROP POLICY IF EXISTS "artisan_appointments_insert"  ON public.artisan_appointments;
DROP POLICY IF EXISTS "artisan_appointments_update"  ON public.artisan_appointments;
DROP POLICY IF EXISTS "artisan_appointments_delete"  ON public.artisan_appointments;

-- Lecture : résident concerné, artisan concerné, admins
CREATE POLICY "artisan_appointments_select" ON public.artisan_appointments
  FOR SELECT USING (
    auth.uid() = resident_id
    OR EXISTS (
      SELECT 1 FROM public.artisan_profiles ap
      WHERE ap.id = artisan_appointments.artisan_id
        AND ap.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- Création : uniquement par le résident (ou admin)
CREATE POLICY "artisan_appointments_insert" ON public.artisan_appointments
  FOR INSERT WITH CHECK (auth.uid() = resident_id OR is_moderator_or_admin());

-- Modification : résident ou artisan concerné, ou admin
CREATE POLICY "artisan_appointments_update" ON public.artisan_appointments
  FOR UPDATE USING (
    auth.uid() = resident_id
    OR EXISTS (
      SELECT 1 FROM public.artisan_profiles ap
      WHERE ap.id = artisan_appointments.artisan_id
        AND ap.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- Suppression : résident propriétaire ou admin
CREATE POLICY "artisan_appointments_delete" ON public.artisan_appointments
  FOR DELETE USING (auth.uid() = resident_id OR is_moderator_or_admin());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_artisan_appointments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_artisan_appointments_updated_at ON public.artisan_appointments;
CREATE TRIGGER trg_artisan_appointments_updated_at
  BEFORE UPDATE ON public.artisan_appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_artisan_appointments_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_artisan_appointments_resident_id ON public.artisan_appointments (resident_id);
CREATE INDEX IF NOT EXISTS idx_artisan_appointments_artisan_id  ON public.artisan_appointments (artisan_id);
CREATE INDEX IF NOT EXISTS idx_artisan_appointments_status      ON public.artisan_appointments (status);
CREATE INDEX IF NOT EXISTS idx_artisan_appointments_date        ON public.artisan_appointments (proposed_date DESC);


-- ============================================================================
NOTIFY pgrst, 'reload schema';
-- ============================================================================
