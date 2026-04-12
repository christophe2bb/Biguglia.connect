/**
 * admin/migration/_sql/sectors.ts
 */
export const SECTORS_SQL = `-- ════════════════════════════════════════════════════════════════════════════
-- COUCHE TERRITORIALE TRANSVERSALE — Table "sectors" + sector_id sur tous les modules
-- Biguglia Connect · Version 1.0 · ${new Date().toISOString().slice(0, 10)}
-- ════════════════════════════════════════════════════════════════════════════
-- Exécuter en une seule fois dans l'éditeur SQL Supabase.
-- Idempotent : IF NOT EXISTS partout.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Table centrale des secteurs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sectors (
  id            TEXT PRIMARY KEY,           -- ex: 'les-collines'
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  icon          TEXT NOT NULL DEFAULT '📍',
  color         TEXT NOT NULL DEFAULT 'gray',
  display_order INT  NOT NULL DEFAULT 99,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sectors' AND policyname='sectors_select') THEN
    CREATE POLICY "sectors_select" ON sectors FOR SELECT USING (true);
    CREATE POLICY "sectors_insert" ON sectors FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "sectors_update" ON sectors FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ── 2. Insertion des secteurs canoniques de Biguglia ────────────────────────
INSERT INTO sectors (id, name, slug, icon, color, display_order, description) VALUES
  ('les-collines', 'Les Collines',       'les-collines', '⛰️',  'emerald', 1, 'Quartier résidentiel sur les hauteurs'),
  ('figabruna',    'Figabruna',           'figabruna',    '🌊',  'blue',    2, 'Secteur sud de Biguglia'),
  ('village',      'Village de Biguglia', 'village',      '🏘️',  'amber',   3, 'Cœur historique du village'),
  ('casatorra',    'Casatorra',           'casatorra',    '🌿',  'green',   4, 'Secteur Casatorra'),
  ('ortale',       'Ortale',              'ortale',       '🏡',  'violet',  5, 'Quartier Ortale'),
  ('la-plaine',    'La Plaine',           'la-plaine',    '🌾',  'orange',  6, 'Zone de la plaine et étang'),
  ('la-marana',    'La Marana',           'la-marana',    '🏖️',  'cyan',    7, 'Zone de La Marana')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color,
  display_order = EXCLUDED.display_order, description = EXCLUDED.description;

-- ── 3. Ajout de sector_id sur chaque table module ──────────────────────────
-- (Idempotent : ADD COLUMN IF NOT EXISTS)

-- Profils utilisateurs — secteur de résidence
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;

-- Forum (déjà géré par forum_sectors, on ajoute aussi sur forum_topics pour cohérence)
-- forum_topics.sector_id référence déjà forum_sectors, pas besoin de changer

-- Perdu / Trouvé
ALTER TABLE lost_found_items ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS lfi_sector_idx ON lost_found_items(sector_id);

-- Coups de main
ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS help_sector_idx ON help_requests(sector_id);

-- Événements (table = events)
ALTER TABLE events ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS events_sector_idx ON events(sector_id);

-- Promenades
ALTER TABLE promenades ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS promenades_sector_idx ON promenades(sector_id);

-- Associations
ALTER TABLE associations ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
ALTER TABLE associations ADD COLUMN IF NOT EXISTS is_citywide BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS asso_sector_idx ON associations(sector_id);

-- Collectionneurs
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS collect_sector_idx ON collection_items(sector_id);

-- Matériel (equipment_items)
ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS equip_sector_idx ON equipment_items(sector_id);

-- Annonces (listings)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES sectors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS listing_sector_idx ON listings(sector_id);

-- ── 4. Vue statistiques par secteur ────────────────────────────────────────
CREATE OR REPLACE VIEW sector_stats AS
SELECT
  s.id,
  s.name,
  s.icon,
  s.color,
  s.display_order,
  (SELECT COUNT(*) FROM lost_found_items lfi WHERE lfi.sector_id = s.id AND lfi.status NOT IN ('restitue','clos','archive')) AS lf_count,
  (SELECT COUNT(*) FROM help_requests hr WHERE hr.sector_id = s.id AND hr.status = 'active')                        AS help_count,
  (SELECT COUNT(*) FROM events le WHERE le.sector_id = s.id AND le.status IN ('a_venir','complet'))                AS events_count,
  (SELECT COUNT(*) FROM promenades p WHERE p.sector_id = s.id AND p.status = 'active')                             AS promenades_count,
  (SELECT COUNT(*) FROM associations a WHERE a.sector_id = s.id AND a.status = 'active')                            AS asso_count,
  (SELECT COUNT(*) FROM collection_items ci WHERE ci.sector_id = s.id AND ci.status = 'actif')                      AS collect_count,
  (SELECT COUNT(*) FROM equipment_items ei WHERE ei.sector_id = s.id AND ei.status = 'disponible')                  AS equip_count,
  (SELECT COUNT(*) FROM listings l WHERE l.sector_id = s.id AND l.status = 'active')                                AS listings_count
FROM sectors s
WHERE s.is_active = true
ORDER BY s.display_order;

-- ✅ Résultat :
-- • Table 'sectors' avec 6 secteurs de Biguglia et RLS
-- • home_sector_id sur profiles (secteur de résidence)
-- • sector_id sur : lost_found_items, help_requests, events,
--   promenades, associations, collection_items, equipment_items, listings
-- • Vue sector_stats avec compteurs en temps réel par secteur et module
`;

