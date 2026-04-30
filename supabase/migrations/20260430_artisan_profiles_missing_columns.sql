-- =============================================================================
-- Migration : artisan_profiles — colonnes manquantes
-- =============================================================================
-- Problème :
--   Le code référence plusieurs colonnes qui n'existent pas dans la table
--   artisan_profiles en base de données :
--     • is_verified     — flag de vérification (boolean)
--     • trade_name      — nom du métier (dénormalisé depuis trade_categories)
--     • location        — localisation textuelle de l'artisan
--     • intervention_zone — zone d'intervention
--
--   Conséquence : toute requête Supabase sélectionnant ces colonnes renvoie
--   HTTP 400 ("column does not exist"), vidant les pages /artisans et widgets.
--
-- Solution :
--   1. ADD COLUMN pour les 4 colonnes manquantes
--   2. Backfill is_verified depuis profiles.role
--   3. Trigger de synchronisation is_verified ↔ profiles.role
--   4. RLS : politique SELECT publique pour artisans vérifiés
--
-- Rollback :
--   ALTER TABLE public.artisan_profiles
--     DROP COLUMN IF EXISTS is_verified,
--     DROP COLUMN IF EXISTS trade_name,
--     DROP COLUMN IF EXISTS location,
--     DROP COLUMN IF EXISTS intervention_zone;
--   DROP TRIGGER IF EXISTS trg_sync_artisan_is_verified ON public.profiles;
--   DROP FUNCTION IF EXISTS public.fn_sync_artisan_is_verified();
-- =============================================================================

-- ── 1. Colonnes manquantes ────────────────────────────────────────────────────

ALTER TABLE public.artisan_profiles
  ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trade_name       TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location         TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intervention_zone TEXT   DEFAULT NULL;

COMMENT ON COLUMN public.artisan_profiles.is_verified IS
  'TRUE quand l''artisan a été validé par un admin/modérateur. '
  'Maintenu en sync avec profiles.role via le trigger trg_sync_artisan_is_verified.';

COMMENT ON COLUMN public.artisan_profiles.trade_name IS
  'Nom du métier (dénormalisé depuis trade_categories.name pour accès direct sans JOIN).';

COMMENT ON COLUMN public.artisan_profiles.location IS
  'Localisation textuelle de l''artisan (ville, quartier, adresse partielle).';

COMMENT ON COLUMN public.artisan_profiles.intervention_zone IS
  'Zone géographique d''intervention (ex: "Biguglia, Lucciana, Borgo").';

-- ── 2. Backfill is_verified ───────────────────────────────────────────────────
-- Tous les artisans dont le profil est 'artisan_verified' → is_verified = TRUE

UPDATE public.artisan_profiles ap
   SET is_verified = TRUE
  FROM public.profiles p
 WHERE ap.user_id = p.id
   AND p.role = 'artisan_verified'
   AND ap.is_verified IS DISTINCT FROM TRUE;

-- ── 3. Trigger de synchronisation préventive ─────────────────────────────────
-- Maintient is_verified automatiquement quand le rôle change dans profiles.

CREATE OR REPLACE FUNCTION public.fn_sync_artisan_is_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'artisan_verified' THEN
    UPDATE public.artisan_profiles
       SET is_verified = TRUE
     WHERE user_id = NEW.id;
  ELSIF OLD.role = 'artisan_verified' THEN
    UPDATE public.artisan_profiles
       SET is_verified = FALSE
     WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_artisan_is_verified ON public.profiles;

CREATE TRIGGER trg_sync_artisan_is_verified
  AFTER UPDATE OF role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_artisan_is_verified();

-- ── 4. RLS : s'assurer que les artisans vérifiés sont lisibles publiquement ──
-- (la politique existante "Artisans vérifiés visibles" filtre probablement sur
--  is_verified = true qui était FALSE pour tous → aucune ligne retournée)

-- On crée/remplace la politique pour accepter les deux critères :
-- is_verified = true OU profiles.role = 'artisan_verified'
-- (pendant la période de transition des données)

DROP POLICY IF EXISTS "Artisans vérifiés visibles" ON public.artisan_profiles;
DROP POLICY IF EXISTS "artisan_profiles_select" ON public.artisan_profiles;
DROP POLICY IF EXISTS "artisan_profiles_select_all" ON public.artisan_profiles;

CREATE POLICY "artisan_profiles_select_verified"
  ON public.artisan_profiles
  FOR SELECT
  USING (
    is_verified = TRUE
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = artisan_profiles.user_id
         AND p.role = 'artisan_verified'
    )
  );

-- ── 5. Index pour is_verified (filtres fréquents) ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_artisan_profiles_is_verified
  ON public.artisan_profiles (is_verified)
  WHERE is_verified = TRUE;

-- ── 6. Vérification ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_total        INT;
  v_verified     INT;
  v_mismatch     INT;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.artisan_profiles;
  SELECT COUNT(*) INTO v_verified FROM public.artisan_profiles WHERE is_verified = TRUE;

  SELECT COUNT(*) INTO v_mismatch
    FROM public.profiles p
   WHERE p.role = 'artisan_verified'
     AND NOT EXISTS (
       SELECT 1 FROM public.artisan_profiles ap
        WHERE ap.user_id = p.id AND ap.is_verified = TRUE
     );

  RAISE NOTICE '[artisan_profiles_missing_columns] total=%, is_verified=true=%, profils_sans_artisan_profile=%',
    v_total, v_verified, v_mismatch;

  IF v_mismatch > 0 THEN
    RAISE WARNING '[artisan_profiles_missing_columns] % profil(s) artisan_verified sans artisan_profile correspondant — ces artisans devront recréer leur profil artisan.',
      v_mismatch;
  END IF;
END;
$$;
