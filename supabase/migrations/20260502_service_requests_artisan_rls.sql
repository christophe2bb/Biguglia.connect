-- ============================================================
-- Migration : RLS correcte pour que l'artisan voit ses devis privés
-- ============================================================
-- PROBLÈME identifié :
--   La policy "service_requests_select_participants" (20260416_profiles_rls_final.sql)
--   contient : auth.uid() = artisan_id
--   MAIS artisan_id est un UUID qui référence artisan_profiles.id (pas profiles.id !)
--   → l'artisan connecté (auth.uid() = profiles.id) ne peut donc jamais voir
--     le devis qui lui est adressé via artisan_id.
--
-- SOLUTION : remplacer par un EXISTS sur artisan_profiles pour relier
--   artisan_profiles.id = artisan_id  AND artisan_profiles.user_id = auth.uid()
--
-- La policy "service_requests_select_parties_v2" (20260502_service_requests_artisan_id.sql)
-- est déjà correcte — cette migration s'assure qu'elle est bien la seule active.
--
-- Idempotent : DROP IF EXISTS + CREATE pour toutes les policies concernées.
-- ============================================================

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- ── Supprimer TOUTES les anciennes policies SELECT (pour repartir proprement) ──
DROP POLICY IF EXISTS "service_requests_select_participants"    ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_parties"        ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_parties_v2"     ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_public"         ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select"                ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_own"            ON public.service_requests;
DROP POLICY IF EXISTS "Voir ses propres demandes"              ON public.service_requests;

-- ── Créer la policy correcte en une seule règle lisible ──────────────────────
-- Trois cas autorisés :
--   1. Le résident auteur de la demande
--   2. L'artisan ciblé (artisan_profiles.user_id = auth.uid())
--   3. Admin / modérateur
--   4. Demandes publiques (artisan_id IS NULL) — visibles par tous les authentifiés
CREATE POLICY "service_requests_select_v3"
  ON public.service_requests
  FOR SELECT
  USING (
    -- Cas 1 : le résident auteur peut toujours voir sa propre demande
    auth.uid() = resident_id

    -- Cas 2 : l'artisan ciblé peut voir le devis privé qui lui est adressé
    --   IMPORTANT : artisan_id référence artisan_profiles.id (≠ profiles.id)
    --   On doit donc passer par artisan_profiles.user_id pour relier à auth.uid()
    OR (
      artisan_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.artisan_profiles ap
        WHERE ap.id = artisan_id
          AND ap.user_id = auth.uid()
      )
    )

    -- Cas 3 : admin / modérateur
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'moderator')
    )

    -- Cas 4 : demandes publiques (sans artisan ciblé) visibles par tout utilisateur connecté
    OR (artisan_id IS NULL AND auth.uid() IS NOT NULL)
  );

-- ── Vérification ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename   = 'service_requests'
    AND cmd         = 'SELECT';

  RAISE NOTICE 'service_requests — policies SELECT actives : %', v_count;

  IF v_count > 1 THEN
    RAISE WARNING 'Plusieurs policies SELECT détectées — vérifier les doublons !';
  END IF;
END $$;
