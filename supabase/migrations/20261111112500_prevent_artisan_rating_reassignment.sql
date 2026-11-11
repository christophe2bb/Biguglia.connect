-- Services / Avis artisans : corriger le contournement de l'éligibilité.
-- Un utilisateur peut modifier sa note et son commentaire, mais ne doit pas
-- déplacer un avis existant vers un autre artisan ni changer son auteur.
-- La garde s'applique si l'ancien OU le nouveau type est "artisan" :
-- empêche aussi de convertir une note acquise dans un autre onglet.
-- Aucun avis existant n'est modifié.
CREATE OR REPLACE FUNCTION public.guard_artisan_rating_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF OLD.target_type = 'artisan' OR NEW.target_type = 'artisan' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.target_type IS DISTINCT FROM OLD.target_type
      OR NEW.target_id IS DISTINCT FROM OLD.target_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.author_id IS DISTINCT FROM OLD.author_id THEN
      RAISE EXCEPTION 'Avis artisan : auteur et destinataire non modifiables'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_artisan_rating_identity()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS item_ratings_guard_artisan_identity ON public.item_ratings;
CREATE TRIGGER item_ratings_guard_artisan_identity
BEFORE UPDATE ON public.item_ratings
FOR EACH ROW
EXECUTE FUNCTION public.guard_artisan_rating_identity();
