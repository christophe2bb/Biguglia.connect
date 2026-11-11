-- Services / Artisans : la décision admin doit être atomique.
-- La fonction est appelée UNIQUEMENT par le client service_role du serveur
-- APRÈS le contrôle d'accès admin/modérateur dans l'API Next.js.
-- SECURITY INVOKER évite d'exposer un SECURITY DEFINER aux clients web.
CREATE OR REPLACE FUNCTION public.admin_review_artisan_profile(
  p_user_id uuid,
  p_approve boolean,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $func$
DECLARE
  v_artisan_id uuid;
  v_profile_id uuid;
BEGIN
  IF CURRENT_USER <> 'service_role' THEN
    RAISE EXCEPTION 'Accès interdit'
      USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_approve IS NULL THEN
    RAISE EXCEPTION 'Paramètres invalides'
      USING ERRCODE = '22023';
  END IF;
  IF NOT p_approve AND (
    p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 10 AND 500
  ) THEN
    RAISE EXCEPTION 'Motif de refus invalide'
      USING ERRCODE = '22023';
  END IF;

  SELECT ap.id INTO v_artisan_id
  FROM public.artisan_profiles ap
  WHERE ap.user_id = p_user_id
  FOR UPDATE;

  IF v_artisan_id IS NULL THEN
    RAISE EXCEPTION 'Dossier artisan introuvable'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
  SET role = CASE WHEN p_approve
        THEN 'artisan_verified'::public.user_role
        ELSE 'resident'::public.user_role END,
      status = 'active'
  WHERE id = p_user_id
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Compte du dossier artisan introuvable'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.artisan_profiles
  SET is_verified = p_approve,
      rejection_reason = CASE WHEN p_approve THEN NULL ELSE btrim(p_reason) END
  WHERE id = v_artisan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impossible de modifier la fiche artisan'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_artisan_id;
END;
$func$;

REVOKE ALL ON FUNCTION public.admin_review_artisan_profile(uuid,boolean,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_artisan_profile(uuid,boolean,text)
  TO service_role;
