/**
 * admin/migration/_sql/search.ts
 */

export const SEARCH_SQL = `-- BIGUGLIA CONNECT — Recherche globale full-text (optionnel, améliore les perfs)
-- À exécuter une seule fois dans Supabase → SQL Editor
-- Ce SQL ajoute des colonnes tsvector et des index GIN pour accélérer la recherche globale.

-- 1. Listings (annonces) — colonnes : title, description, location
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE listings SET search_vector = to_tsvector('french',
  coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(location,'')
);
CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING gin(search_vector);

CREATE OR REPLACE FUNCTION listings_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.location,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS listings_search_trigger ON listings;
CREATE TRIGGER listings_search_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_search_update();

-- 2. Equipment items (matériel) — colonnes : title, description, pickup_location
ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE equipment_items SET search_vector = to_tsvector('french',
  coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(pickup_location,'')
);
CREATE INDEX IF NOT EXISTS equipment_search_idx ON equipment_items USING gin(search_vector);

CREATE OR REPLACE FUNCTION equipment_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.pickup_location,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS equipment_search_trigger ON equipment_items;
CREATE TRIGGER equipment_search_trigger
  BEFORE INSERT OR UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION equipment_search_update();

-- 3. Help requests (coups de main) — colonnes : title, description, location_city
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE help_requests SET search_vector = to_tsvector('french',
  coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(location_city,'')
);
CREATE INDEX IF NOT EXISTS help_search_idx ON help_requests USING gin(search_vector);

CREATE OR REPLACE FUNCTION help_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.location_city,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS help_search_trigger ON help_requests;
CREATE TRIGGER help_search_trigger
  BEFORE INSERT OR UPDATE ON help_requests
  FOR EACH ROW EXECUTE FUNCTION help_search_update();

-- 4. Forum posts — colonnes : title, content
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE forum_posts SET search_vector = to_tsvector('french',
  coalesce(title,'') || ' ' || coalesce(content,'')
);
CREATE INDEX IF NOT EXISTS forum_search_idx ON forum_posts USING gin(search_vector);

CREATE OR REPLACE FUNCTION forum_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.title,'') || ' ' || coalesce(NEW.content,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS forum_search_trigger ON forum_posts;
CREATE TRIGGER forum_search_trigger
  BEFORE INSERT OR UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION forum_search_update();

-- 5. Local events (événements) — colonnes : title, description, location
ALTER TABLE local_events ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE local_events SET search_vector = to_tsvector('french',
  coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(location,'')
);
CREATE INDEX IF NOT EXISTS events_search_idx ON local_events USING gin(search_vector);

CREATE OR REPLACE FUNCTION events_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.location,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS events_search_trigger ON local_events;
CREATE TRIGGER events_search_trigger
  BEFORE INSERT OR UPDATE ON local_events
  FOR EACH ROW EXECUTE FUNCTION events_search_update();

-- 6. Group outings (promenades) — colonnes : title, description, meeting_point
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE group_outings SET search_vector = to_tsvector('french',
  coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(meeting_point,'')
);
CREATE INDEX IF NOT EXISTS outings_search_idx ON group_outings USING gin(search_vector);

CREATE OR REPLACE FUNCTION outings_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.meeting_point,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS outings_search_trigger ON group_outings;
CREATE TRIGGER outings_search_trigger
  BEFORE INSERT OR UPDATE ON group_outings
  FOR EACH ROW EXECUTE FUNCTION outings_search_update();

-- 7. Artisan profiles — colonnes : business_name, description, service_area
ALTER TABLE artisan_profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE artisan_profiles SET search_vector = to_tsvector('french',
  coalesce(business_name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(service_area,'')
);
CREATE INDEX IF NOT EXISTS artisan_search_idx ON artisan_profiles USING gin(search_vector);

CREATE OR REPLACE FUNCTION artisan_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.business_name,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.service_area,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS artisan_search_trigger ON artisan_profiles;
CREATE TRIGGER artisan_search_trigger
  BEFORE INSERT OR UPDATE ON artisan_profiles
  FOR EACH ROW EXECUTE FUNCTION artisan_search_update();

-- 8. Associations — colonnes : name, description_short, location, category
ALTER TABLE associations ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE associations SET search_vector = to_tsvector('french',
  coalesce(name,'') || ' ' || coalesce(description_short,'') || ' ' || coalesce(location,'') || ' ' || coalesce(category,'')
);
CREATE INDEX IF NOT EXISTS asso_search_idx ON associations USING gin(search_vector);

CREATE OR REPLACE FUNCTION asso_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french',
    coalesce(NEW.name,'') || ' ' || coalesce(NEW.description_short,'') || ' ' || coalesce(NEW.location,'') || ' ' || coalesce(NEW.category,'')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS asso_search_trigger ON associations;
CREATE TRIGGER asso_search_trigger
  BEFORE INSERT OR UPDATE ON associations
  FOR EACH ROW EXECUTE FUNCTION asso_search_update();

-- Résumé : 8 tables indexées pour la recherche full-text française.
-- equipment_items : title / description / pickup_location
-- help_requests   : title / description / location_city
-- group_outings   : title / description / meeting_point
-- artisan_profiles: business_name / description / service_area
-- associations    : name / description_short / location / category
`;
