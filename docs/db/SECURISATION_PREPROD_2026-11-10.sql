-- BIGUGLIA CONNECT - PROPOSITION DE SECURISATION - 10 NOVEMBRE 2026
--
-- ATTENTION : FICHIER DE REVUE, PAS UNE MIGRATION VALIDEE.
-- NE PAS EXECUTER SUR LA PRODUCTION.
-- Exiger une sauvegarde et une validation sur PostgreSQL/Supabase isole
-- avant application, avec un test d'inscription, publication, moderation,
-- photos, annonces, forum et messagerie entre deux comptes.
-- Les politiques ci-dessous sont basees sur le schema lu le 10/11/2026.
--
-- Ce fichier n'aborde PAS la migration des documents emploi vers un bucket
-- prive, ni toutes les regles Storage photos. Ces travaux exigent de convertir
-- les pages de telechargement et de verifier l'absence de liens publics.
--
BEGIN;

-- A. Harmoniser les 7 secteurs (creation additive, sans modifier les 6 autres).
INSERT INTO public.sectors
  (id, name, slug, icon, color, display_order, description, is_active)
VALUES
  ('la-marana', 'La Marana', 'la-marana', '🏖️', 'cyan', 7, 'Zone de La Marana', true)
ON CONFLICT (id) DO NOTHING;

-- B. Empêcher l'élévation de privilèges via profils.
-- Les membres ne doivent pas pouvoir INSERER leur propre ligne avec role=admin,
-- ni modifier role/status. Le trigger Auth et le serveur admin utilisent
-- des permissions distinctes et restent capables de créer un profil.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (full_name, avatar_url, phone, home_sector_id)
  ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_fields" ON public.profiles;
CREATE POLICY "profiles_update_self_fields"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- C. Une annonce non approuvée ne doit pas être exposée par la Data API.
DROP POLICY IF EXISTS "listings_select" ON public.listings;
DROP POLICY IF EXISTS "listings_select_active" ON public.listings;
DROP POLICY IF EXISTS "listings_select_published_or_own" ON public.listings;
DROP POLICY IF EXISTS "listings_select_secure" ON public.listings;
CREATE POLICY "listings_select_secure"
ON public.listings FOR SELECT TO PUBLIC
USING (
  (
    status::text IN ('active', 'reserved', 'sold', 'given', 'exchanged')
    AND moderation_status = 'publie'
  )
  OR user_id = (SELECT auth.uid())
  OR public.is_moderator_or_admin()
);

-- D. L'authentification seule ne doit pas suffire à publier une annonce
-- approuvée : la base impose l'attente de modération, même si le navigateur
-- envoie moderation_status='publie'. De même pour toute édition du contenu.
CREATE OR REPLACE FUNCTION public.guard_listing_moderation_on_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $guard$
BEGIN
  IF current_user = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.moderation_status :=
        CASE WHEN NEW.status::text = 'draft'
          THEN 'draft' ELSE 'en_attente_validation' END;
    ELSE
      IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Owner cannot be modified';
      END IF;

      IF NEW.status::text = 'draft' THEN
        NEW.moderation_status := 'draft';
      ELSIF OLD.status::text = 'draft'
        OR ROW(NEW.title, NEW.description, NEW.category_id,
               NEW.listing_type, NEW.price, NEW.condition, NEW.location,
               NEW.sector_id, NEW.availability_window, NEW.pickup_notes,
               NEW.exchange_preferences, NEW.condition_state,
               NEW.is_negotiable, NEW.is_urgent, NEW.cover_url)
           IS DISTINCT FROM
           ROW(OLD.title, OLD.description, OLD.category_id,
               OLD.listing_type, OLD.price, OLD.condition, OLD.location,
               OLD.sector_id, OLD.availability_window, OLD.pickup_notes,
               OLD.exchange_preferences, OLD.condition_state,
               OLD.is_negotiable, OLD.is_urgent, OLD.cover_url)
      THEN
        NEW.moderation_status := 'en_attente_validation';
      ELSE
        -- Changer seulement active/reserved/sold ne publie pas un brouillon
        -- et ne contourne jamais la décision de modération.
        NEW.moderation_status := OLD.moderation_status;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$guard$;

DROP TRIGGER IF EXISTS guard_listing_moderation_on_write ON public.listings;
CREATE TRIGGER guard_listing_moderation_on_write
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_listing_moderation_on_write();

-- E. La table listing_photos ne doit plus exposer les images associées aux
-- annonces en attente par la Data API. ATTENTION : les URL du bucket public
-- restent accessibles directement, d'où la nécessité de la phase Storage.
DROP POLICY IF EXISTS "listing_photos_select" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_select_all" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_select_public" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_select_secure" ON public.listing_photos;
CREATE POLICY "listing_photos_select_secure"
ON public.listing_photos FOR SELECT TO PUBLIC
USING (
  EXISTS (
    SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_id
      AND (
        (l.moderation_status = 'publie'
         AND l.status::text IN ('active','reserved','sold','given','exchanged'))
        OR l.user_id = (SELECT auth.uid())
        OR public.is_moderator_or_admin()
      )
  )
);

-- F. Un utilisateur ne peut pas se joindre arbitrairement à une conversation
-- dont il connaît l'UUID : l'API serveur contrôle les deux identités.
DROP POLICY IF EXISTS "conversation_participants_insert_own"
  ON public.conversation_participants;

-- G. Un participant ne doit pas pouvoir forger un message au nom d'autrui.
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own_participant" ON public.messages;
CREATE POLICY "messages_insert_own_participant"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants AS cp
    WHERE cp.conversation_id = messages.conversation_id
      AND cp.user_id = (SELECT auth.uid())
  )
);

-- Contrôles à vérifier manuellement en préproduction avant COMMIT :
SELECT
  has_column_privilege('authenticated','public.profiles','role','UPDATE')
    AS member_may_change_role,
  has_column_privilege('authenticated','public.profiles','full_name','UPDATE')
    AS member_may_edit_name,
  has_table_privilege('authenticated','public.profiles','INSERT')
    AS member_may_create_privileged_profile;

SELECT id, name FROM public.sectors ORDER BY display_order;

-- Avant usage réel : vérifier les deux profils de test,
-- l'édition de compte, le formulaire annonce, le workflow de modération,
-- l'accès aux photos et les échanges entre deux comptes, y compris blocages.
--
-- EXECUTER COMMIT UNIQUEMENT EN ENVIRONNEMENT DE TEST, APRES LES CONTROLES.
-- ROLLBACK est l'état par défaut pour éviter toute modification involontaire.
ROLLBACK;
