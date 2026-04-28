-- =============================================================================
-- Migration : listings.cover_url — colonne dénormalisée pour la vue liste
-- =============================================================================
-- Problème (perf) :
--   La page /annonces chargeait la relation listing_photos pour chaque listing
--   (PostgREST : join N+1 groupé, mais ALL photos par listing dans la réponse).
--   ListingCard n'utilise que la première photo (display_order 0).
--   Sur 200 listings × N photos = payload JSON inutilement large.
--
-- Solution :
--   1. Colonne dénormalisée `cover_url TEXT` sur `listings`.
--   2. Trigger AFTER INSERT/UPDATE/DELETE sur `listing_photos` qui maintient
--      cover_url = URL de la photo avec le plus petit display_order (la cover).
--   3. Backfill immédiat sur les données existantes.
--   4. Index partiel sur listing_photos(listing_id, display_order) pour le trigger.
--
-- Avantage : la page /annonces n'a plus besoin du join listing_photos du tout.
--   SELECT id, title, …, cover_url FROM listings  -- ← une seule table, 0 join
--
-- Rollback (si nécessaire) :
--   DROP TRIGGER IF EXISTS trg_listing_photos_cover ON listing_photos;
--   DROP FUNCTION IF EXISTS fn_sync_listing_cover_url();
--   ALTER TABLE listings DROP COLUMN IF EXISTS cover_url;
-- =============================================================================

-- ── 1. Colonne cover_url ──────────────────────────────────────────────────────

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.listings.cover_url IS
  'URL dénormalisée de la photo cover (display_order le plus bas). '
  'Maintenue automatiquement par le trigger trg_listing_photos_cover. '
  'Évite le join listing_photos dans la vue liste /annonces.';

-- ── 2. Fonction trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_sync_listing_cover_url()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_cover_url  TEXT;
BEGIN
  -- Identifier le listing affecté
  IF TG_OP = 'DELETE' THEN
    v_listing_id := OLD.listing_id;
  ELSE
    v_listing_id := NEW.listing_id;
  END IF;

  -- Récupérer l'URL de la photo avec le plus petit display_order
  SELECT url
    INTO v_cover_url
    FROM public.listing_photos
   WHERE listing_id = v_listing_id
   ORDER BY display_order ASC
   LIMIT 1;

  -- Mettre à jour listing (NULL si plus aucune photo)
  UPDATE public.listings
     SET cover_url = v_cover_url
   WHERE id = v_listing_id;

  RETURN NULL; -- trigger AFTER → valeur de retour ignorée
END;
$$;

-- ── 3. Trigger AFTER INSERT / UPDATE / DELETE ─────────────────────────────────

DROP TRIGGER IF EXISTS trg_listing_photos_cover ON public.listing_photos;

CREATE TRIGGER trg_listing_photos_cover
  AFTER INSERT OR UPDATE OF url, display_order OR DELETE
  ON public.listing_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_listing_cover_url();

-- ── 4. Index composite pour le trigger (et toute requête ORDER BY display_order)

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_order
  ON public.listing_photos (listing_id, display_order ASC);

-- ── 5. Backfill — initialiser cover_url pour les listings existants ───────────

UPDATE public.listings l
   SET cover_url = (
         SELECT url
           FROM public.listing_photos p
          WHERE p.listing_id = l.id
          ORDER BY p.display_order ASC
          LIMIT 1
       );

-- ── 6. Vérification ───────────────────────────────────────────────────────────

DO $$
DECLARE
  v_total    INT;
  v_with_url INT;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM public.listings;
  SELECT COUNT(*) INTO v_with_url FROM public.listings WHERE cover_url IS NOT NULL;
  RAISE NOTICE '[listings_cover_url] % listings total, % avec cover_url initialisée',
    v_total, v_with_url;
END;
$$;
