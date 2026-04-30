/**
 * admin/migration/_sql/status.ts
 * SQL — Statuts enrichis (compatible ENUM + TEXT CHECK)
 */

export const STATUS_SQL = `-- BIGUGLIA CONNECT — Statuts enrichis (compatible ENUM + TEXT CHECK)
-- Détecte automatiquement si le statut est un ENUM ou un CHECK TEXT

-- ============================================================
-- 1. Annonces (listings) — ajouter 'reserved' et 'expired'
-- ============================================================
DO $$
DECLARE
  col_type TEXT;
  type_name TEXT;
BEGIN
  -- Récupère le type de la colonne status
  SELECT data_type, udt_name
    INTO col_type, type_name
    FROM information_schema.columns
   WHERE table_name = 'listings' AND column_name = 'status'
   LIMIT 1;

  IF col_type = 'USER-DEFINED' THEN
    -- C'est un ENUM : on ajoute les valeurs manquantes
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
       WHERE enumtypid = type_name::regtype
         AND enumlabel = 'reserved'
    ) THEN
      EXECUTE 'ALTER TYPE ' || type_name || ' ADD VALUE ''reserved''';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
       WHERE enumtypid = type_name::regtype
         AND enumlabel = 'expired'
    ) THEN
      EXECUTE 'ALTER TYPE ' || type_name || ' ADD VALUE ''expired''';
    END IF;

  ELSE
    -- C'est un TEXT avec CHECK : on le remplace
    EXECUTE 'ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check';
    EXECUTE $c$ALTER TABLE listings ADD CONSTRAINT listings_status_check
      CHECK (status IN (''active'', ''reserved'', ''sold'', ''archived'', ''expired''))$c$;
  END IF;
END $$;

-- Nouveaux champs listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auto_expire BOOLEAN DEFAULT false;

-- ============================================================
-- 2. Equipment items — add status column
-- ============================================================
ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS status TEXT
  DEFAULT 'available'
  CHECK (status IN ('available', 'reserved', 'borrowed', 'unavailable', 'archived'));
ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Sync existing is_available with new status
UPDATE equipment_items SET status = CASE WHEN is_available THEN 'available' ELSE 'unavailable' END
  WHERE status IS NULL OR status = 'available';

-- ============================================================
-- 3. Collection items — add missing statuses
-- ============================================================
ALTER TABLE collection_items DROP CONSTRAINT IF EXISTS collection_items_status_check;
ALTER TABLE collection_items ADD CONSTRAINT collection_items_status_check
  CHECK (status IN ('active', 'reserved', 'exchanged', 'sold', 'archived', 'draft'));
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- ============================================================
-- 4. Help requests — add in_progress, closed, archived
-- ============================================================
-- help_requests.status is typically TEXT — drop & recreate CHECK
ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS help_requests_status_check;
ALTER TABLE help_requests ADD CONSTRAINT help_requests_status_check
  CHECK (status IN ('active', 'in_progress', 'paused', 'resolved', 'closed', 'archived', 'draft'));
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
-- Trigger: set resolved_at when resolved
CREATE OR REPLACE FUNCTION set_help_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS help_requests_resolved ON help_requests;
CREATE TRIGGER help_requests_resolved
  BEFORE UPDATE ON help_requests FOR EACH ROW
  EXECUTE FUNCTION set_help_resolved_at();

-- ============================================================
-- 5. Perdu / Trouvé — add restituted/closed/archived statuses
-- ============================================================
ALTER TABLE lost_found_items DROP CONSTRAINT IF EXISTS lost_found_items_status_check;
ALTER TABLE lost_found_items ADD CONSTRAINT lost_found_items_status_check
  CHECK (status IN ('active', 'resolved', 'restituted', 'closed', 'archived', 'draft'));
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================================
-- 6. Associations — add closed status
-- ============================================================
ALTER TABLE associations DROP CONSTRAINT IF EXISTS associations_status_check;
ALTER TABLE associations ADD CONSTRAINT associations_status_check
  CHECK (status IN ('active', 'inactive', 'closed', 'draft'));
ALTER TABLE associations ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- ============================================================
-- 6b. Promenades (group_outings) — add archived status
-- ============================================================
ALTER TABLE group_outings DROP CONSTRAINT IF EXISTS group_outings_status_check;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
UPDATE group_outings SET status = 'active' WHERE status IS NULL;
ALTER TABLE group_outings ADD CONSTRAINT group_outings_status_check
  CHECK (status IN ('active', 'cancelled', 'completed', 'archived'));
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- ============================================================
-- 7. Événements (local_events) — add archived + cancelled statuses
-- ============================================================
ALTER TABLE local_events DROP CONSTRAINT IF EXISTS local_events_status_check;
ALTER TABLE local_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
UPDATE local_events SET status = 'active' WHERE status IS NULL;
ALTER TABLE local_events ADD CONSTRAINT local_events_status_check
  CHECK (status IN ('active', 'cancelled', 'completed', 'archived'));
ALTER TABLE local_events ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- ============================================================
-- 8. Trigger auto-update status_changed_at (universel)
-- ============================================================
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_status_changed ON listings;
CREATE TRIGGER listings_status_changed
  BEFORE UPDATE ON listings FOR EACH ROW
  EXECUTE FUNCTION update_status_changed_at();

DROP TRIGGER IF EXISTS help_requests_status_changed ON help_requests;
CREATE TRIGGER help_requests_status_changed
  BEFORE UPDATE ON help_requests FOR EACH ROW
  EXECUTE FUNCTION update_status_changed_at();

DROP TRIGGER IF EXISTS lost_found_status_changed ON lost_found_items;
CREATE TRIGGER lost_found_status_changed
  BEFORE UPDATE ON lost_found_items FOR EACH ROW
  EXECUTE FUNCTION update_status_changed_at();

DROP TRIGGER IF EXISTS associations_status_changed ON associations;
CREATE TRIGGER associations_status_changed
  BEFORE UPDATE ON associations FOR EACH ROW
  EXECUTE FUNCTION update_status_changed_at();

DROP TRIGGER IF EXISTS group_outings_status_changed ON group_outings;
CREATE TRIGGER group_outings_status_changed
  BEFORE UPDATE ON group_outings FOR EACH ROW
  EXECUTE FUNCTION update_status_changed_at();

DROP TRIGGER IF EXISTS local_events_status_changed ON local_events;
CREATE TRIGGER local_events_status_changed
  BEFORE UPDATE ON local_events FOR EACH ROW
  EXECUTE FUNCTION update_status_changed_at();

-- ============================================================
-- 9. Fonction auto-expiration des annonces périmées
-- ============================================================
CREATE OR REPLACE FUNCTION auto_expire_listings()
RETURNS void AS $$
BEGIN
  UPDATE listings
     SET status = 'expired'::text, status_changed_at = NOW()
   WHERE auto_expire = true
     AND expiration_date IS NOT NULL
     AND expiration_date < CURRENT_DATE
     AND status::text = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'OK: statuts enrichis appliqués avec succès' AS result;`;

// =============================================================================
// Migration : listings.cover_url — colonne dénormalisée + trigger
// Migration file : supabase/migrations/20260428_listings_cover_url.sql
// =============================================================================
export const LISTINGS_COVER_SQL = `-- ============================================================
-- listings.cover_url — colonne dénormalisée pour la vue liste
-- ============================================================
-- Évite le join listing_photos (N lignes) dans la page /annonces.
-- cover_url = URL de la photo avec le plus petit display_order.

-- 1. Colonne
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.listings.cover_url IS
  'URL dénormalisée de la photo cover (display_order le plus bas). '
  'Maintenue par le trigger trg_listing_photos_cover.';

-- 2. Fonction trigger
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
  IF TG_OP = 'DELETE' THEN
    v_listing_id := OLD.listing_id;
  ELSE
    v_listing_id := NEW.listing_id;
  END IF;
  SELECT url INTO v_cover_url
    FROM public.listing_photos
   WHERE listing_id = v_listing_id
   ORDER BY display_order ASC
   LIMIT 1;
  UPDATE public.listings
     SET cover_url = v_cover_url
   WHERE id = v_listing_id;
  RETURN NULL;
END;
$$;

-- 3. Trigger
DROP TRIGGER IF EXISTS trg_listing_photos_cover ON public.listing_photos;
CREATE TRIGGER trg_listing_photos_cover
  AFTER INSERT OR UPDATE OF url, display_order OR DELETE
  ON public.listing_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_listing_cover_url();

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_order
  ON public.listing_photos (listing_id, display_order ASC);

-- 5. Backfill
UPDATE public.listings l
   SET cover_url = (
         SELECT url
           FROM public.listing_photos p
          WHERE p.listing_id = l.id
          ORDER BY p.display_order ASC
          LIMIT 1
       )
 WHERE l.cover_url IS NULL;

SELECT 'OK: listings.cover_url migration appliquée' AS result;`;
