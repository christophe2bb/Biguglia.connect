-- Biguglia Connect | PROPOSITION : visibilité des annonces et des photos
-- PRÉPRODUCTION UNIQUEMENT. Ne pas appliquer à la production sans sauvegarde
-- restaurable et tests entre deux comptes distincts.
-- Schéma vérifié par lecture seule sur la base existante le 2026-11-10.
--
-- Le formulaire actuel insère explicitement moderation_status =
-- 'en_attente_validation' et le modifie de même sur une édition.
-- La route admin utilise service_role pour accorder le statut 'publie'.
--
-- RISQUE RÉSIDUEL : le bucket photos est public et ses URL déjà connues
-- restent téléchargeables, même si listing_photos n'est plus visible.
-- La confidentialité de photos non publiées exige une stratégie de bucket
-- privé + URLs signées et une migration applicative séparée.

BEGIN;

-- Les annonces sans champ explicite ne doivent jamais naître "publiées".
ALTER TABLE public.listings
  ALTER COLUMN moderation_status SET DEFAULT 'en_attente_validation';

-- Les anciennes policies SELECT étaient combinées par OR ; une seule
-- policy SELECT true rendait les autres restrictions inopérantes.
DROP POLICY IF EXISTS listings_select ON public.listings;
DROP POLICY IF EXISTS listings_select_active ON public.listings;
DROP POLICY IF EXISTS listings_select_published_or_own ON public.listings;
DROP POLICY IF EXISTS listings_read_reviewed_or_owner ON public.listings;

CREATE POLICY listings_read_reviewed_or_owner
  ON public.listings FOR SELECT TO anon, authenticated
  USING (
    (status = 'active'::public.listing_status
     AND moderation_status = 'publie')
    OR ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
    OR (SELECT public.is_moderator_or_admin())
  );

-- On ne peut pas empêcher l'auto-approbation avec une policy UPDATE
-- fondée uniquement sur user_id : l'auteur peut changer les colonnes
-- d'une ligne qui lui appartient. Ce trigger impose un statut serveur
-- pour toute écriture exécutée en tant que "authenticated".
-- Les routes administrateur emploient service_role et restent exemptes.
CREATE OR REPLACE FUNCTION public.enforce_listing_moderation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $body$
BEGIN
  IF current_user = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.moderation_status :=
        CASE WHEN NEW.status = 'draft'::public.listing_status
             THEN 'draft' ELSE 'en_attente_validation' END;
    ELSE
      IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Le propriétaire ne peut pas être modifié'
          USING ERRCODE = '42501';
      END IF;

      IF NEW.status = 'draft'::public.listing_status THEN
        NEW.moderation_status := 'draft';
      ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
         OR (OLD.status <> 'active'::public.listing_status
             AND NEW.status = 'active'::public.listing_status)
         OR ROW(
           NEW.title, NEW.description, NEW.category_id, NEW.price,
           NEW.listing_type, NEW.condition, NEW.location, NEW.sector_id,
           NEW.availability_window, NEW.pickup_notes,
           NEW.exchange_preferences, NEW.condition_state,
           NEW.is_negotiable, NEW.is_urgent, NEW.quick_pickup,
           NEW.cover_url, NEW.price_type
         ) IS DISTINCT FROM ROW(
           OLD.title, OLD.description, OLD.category_id, OLD.price,
           OLD.listing_type, OLD.condition, OLD.location, OLD.sector_id,
           OLD.availability_window, OLD.pickup_notes,
           OLD.exchange_preferences, OLD.condition_state,
           OLD.is_negotiable, OLD.is_urgent, OLD.quick_pickup,
           OLD.cover_url, OLD.price_type
         ) THEN
        NEW.moderation_status := 'en_attente_validation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$body$;

DROP TRIGGER IF EXISTS enforce_listing_moderation_status
  ON public.listings;
CREATE TRIGGER enforce_listing_moderation_status
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_moderation_status();

REVOKE EXECUTE ON FUNCTION public.enforce_listing_moderation_status()
  FROM PUBLIC, anon, authenticated;

-- Les photos d'une annonce ne sont consultables via la Data API que si
-- cette annonce est visible pour le demandeur (publique, propriétaire,
-- ou équipe de modération). La sous-requête respecte la RLS de listings.
DROP POLICY IF EXISTS listing_photos_select
  ON public.listing_photos;
DROP POLICY IF EXISTS listing_photos_select_all
  ON public.listing_photos;
DROP POLICY IF EXISTS listing_photos_select_public
  ON public.listing_photos;
DROP POLICY IF EXISTS listing_photos_read_visible_listing
  ON public.listing_photos;

CREATE POLICY listing_photos_read_visible_listing
  ON public.listing_photos FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_photos.listing_id
    )
  );

COMMIT;

-- A TESTER EN PRÉPRODUCTION :
-- 1) anon ne lit que les annonces actives ET 'publie'.
-- 2) auteur A lit ses brouillons ; B et anon ne les voient pas.
-- 3) A insère/édite une annonce : la modération reste en attente.
-- 4) A tente d'écrire 'publie' directement : refus d'auto-approbation.
-- 5) admin valide depuis la route serveur : 'publie' conservé.
-- 6) les photos suivent la visibilité de la ligne d'annonce.
-- 7) affichage d'annonces / recherche / favoris / brouillons sans régression.
-- 8) aucun nouveau contenu réel créé pour ces essais.
