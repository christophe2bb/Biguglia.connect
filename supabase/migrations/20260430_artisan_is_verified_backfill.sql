-- =============================================================================
-- Migration : backfill artisan_profiles.is_verified
-- =============================================================================
-- Problème :
--   L'API /api/admin/artisans/[id] (action 'approve') ne mettait pas à jour
--   artisan_profiles.is_verified lors de la validation. Corrigé dans le code
--   (PR #468), mais les artisans validés AVANT ce correctif ont toujours
--   is_verified = false → ils sont invisibles sur la page publique /artisans
--   et dans les widgets communautaires.
--
-- Solution :
--   Synchroniser is_verified avec profiles.role :
--     • role = 'artisan_verified' → is_verified = true
--     • role = 'resident' ou 'artisan_pending' → is_verified = false
--
-- Trigger préventif :
--   On ajoute un trigger AFTER UPDATE sur profiles qui maintient
--   artisan_profiles.is_verified en sync automatique avec le rôle.
--   Cela rend le correctif applicatif redondant (défense en profondeur).
--
-- Rollback :
--   DROP TRIGGER IF EXISTS trg_sync_artisan_is_verified ON public.profiles;
--   DROP FUNCTION IF EXISTS public.fn_sync_artisan_is_verified();
--   -- (le backfill ne peut pas être rollbacké sans sauvegarde préalable)
-- =============================================================================

-- ── 1. Backfill immédiat ─────────────────────────────────────────────────────
-- Tous les artisans dont le profil est 'artisan_verified' → is_verified = true

UPDATE public.artisan_profiles ap
   SET is_verified = TRUE
  FROM public.profiles p
 WHERE ap.user_id = p.id
   AND p.role = 'artisan_verified'
   AND ap.is_verified IS DISTINCT FROM TRUE;

-- Tous les artisans dont le profil N'EST PLUS 'artisan_verified' → is_verified = false

UPDATE public.artisan_profiles ap
   SET is_verified = FALSE
  FROM public.profiles p
 WHERE ap.user_id = p.id
   AND p.role <> 'artisan_verified'
   AND ap.is_verified IS DISTINCT FROM FALSE;

-- ── 2. Trigger de synchronisation préventive ─────────────────────────────────
-- Maintient is_verified automatiquement quand le rôle change dans profiles.

CREATE OR REPLACE FUNCTION public.fn_sync_artisan_is_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ne traiter que les changements de rôle impliquant artisan_verified
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  IF NEW.role = 'artisan_verified' THEN
    UPDATE public.artisan_profiles
       SET is_verified = TRUE
     WHERE user_id = NEW.id;
  ELSIF OLD.role = 'artisan_verified' THEN
    -- L'artisan perd sa vérification (rejet, rétrogradation)
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

-- ── 3. Vérification ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_verified_profiles  INT;
  v_verified_artisans  INT;
  v_mismatch           INT;
BEGIN
  SELECT COUNT(*) INTO v_verified_profiles
    FROM public.profiles
   WHERE role = 'artisan_verified';

  SELECT COUNT(*) INTO v_verified_artisans
    FROM public.artisan_profiles
   WHERE is_verified = TRUE;

  SELECT COUNT(*) INTO v_mismatch
    FROM public.artisan_profiles ap
    JOIN public.profiles p ON p.id = ap.user_id
   WHERE p.role = 'artisan_verified' AND ap.is_verified IS DISTINCT FROM TRUE;

  RAISE NOTICE '[artisan_backfill] profiles artisan_verified=%, artisan_profiles.is_verified=true=%, désynchronisés=%',
    v_verified_profiles, v_verified_artisans, v_mismatch;

  IF v_mismatch > 0 THEN
    RAISE WARNING '[artisan_backfill] % artisan(s) encore désynchronisés — vérifier manuellement.', v_mismatch;
  END IF;
END;
$$;
