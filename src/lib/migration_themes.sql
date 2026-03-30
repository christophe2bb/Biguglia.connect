-- ============================================================
-- BIGUGLIA CONNECT — Migration thèmes locaux
-- Promenades · Collectionneurs · Événements
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- THÈME 1 — PROMENADES & NATURE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promenades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  distance_km NUMERIC(5,2),
  duration_min INT,
  difficulty TEXT NOT NULL DEFAULT 'facile' CHECK (difficulty IN ('facile', 'moyen', 'difficile')),
  type TEXT NOT NULL DEFAULT 'balade' CHECK (type IN ('balade', 'randonnee', 'velo', 'plage', 'nature')),
  tags TEXT[] DEFAULT '{}',
  start_point TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER promenades_updated_at BEFORE UPDATE ON promenades FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS promenade_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promenade_id UUID REFERENCES promenades(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promenade_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  promenade_id UUID REFERENCES promenades(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(promenade_id, user_id)
);

-- Sorties groupées (promenades)
CREATE TABLE IF NOT EXISTS group_outings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  promenade_id UUID REFERENCES promenades(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  outing_date DATE NOT NULL,
  outing_time TEXT NOT NULL DEFAULT '09:00',
  max_participants INT NOT NULL DEFAULT 10,
  meeting_point TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER group_outings_updated_at BEFORE UPDATE ON group_outings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS outing_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(outing_id, user_id)
);

-- RLS Promenades
ALTER TABLE promenades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promenades_select" ON promenades FOR SELECT USING (status = 'active');
CREATE POLICY "promenades_insert" ON promenades FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "promenades_update" ON promenades FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "promenades_delete" ON promenades FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE promenade_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promenade_photos_select" ON promenade_photos FOR SELECT USING (true);
CREATE POLICY "promenade_photos_insert" ON promenade_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM promenades WHERE id = promenade_id AND author_id = auth.uid())
);

ALTER TABLE promenade_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promenade_likes_select" ON promenade_likes FOR SELECT USING (true);
CREATE POLICY "promenade_likes_insert" ON promenade_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "promenade_likes_delete" ON promenade_likes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE group_outings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_outings_select" ON group_outings FOR SELECT USING (true);
CREATE POLICY "group_outings_insert" ON group_outings FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "group_outings_update" ON group_outings FOR UPDATE USING (auth.uid() = organizer_id);

ALTER TABLE outing_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outing_participants_select" ON outing_participants FOR SELECT USING (true);
CREATE POLICY "outing_participants_insert" ON outing_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outing_participants_delete" ON outing_participants FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- THÈME 2 — COLLECTIONNEURS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT 'gray',
  display_order INT NOT NULL DEFAULT 0
);

INSERT INTO collection_categories (name, slug, icon, color, display_order) VALUES
  ('Timbres & philatélie',   'timbres',     '📮', 'blue',    1),
  ('Monnaies & numismatique','monnaies',    '🪙', 'amber',   2),
  ('Vinyles & musique',      'vinyles',     '🎵', 'purple',  3),
  ('Livres anciens',         'livres',      '📚', 'emerald', 4),
  ('Figurines & jouets',     'figurines',   '🎮', 'rose',    5),
  ('Cartes postales',        'cartes',      '🗺️', 'sky',     6),
  ('Art & tableaux',         'art',         '🎨', 'pink',    7),
  ('Vintage & mode',         'vintage',     '👗', 'orange',  8),
  ('Minéraux & fossiles',    'mineraux',    '🪨', 'teal',    9),
  ('Miniatures & maquettes', 'miniatures',  '🏗️', 'indigo',  10),
  ('Automobilia',            'automobilia', '🚗', 'red',     11),
  ('Nature & botanique',     'nature-col',  '🌿', 'green',   12)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS collection_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES collection_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'vente' CHECK (item_type IN ('vente', 'troc', 'don', 'recherche')),
  price NUMERIC(10,2),
  condition TEXT NOT NULL DEFAULT 'bon' CHECK (condition IN ('neuf', 'excellent', 'bon', 'passable')),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER collection_items_updated_at BEFORE UPDATE ON collection_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS collection_item_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Collection
ALTER TABLE collection_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_categories_select" ON collection_categories FOR SELECT USING (true);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_items_select" ON collection_items FOR SELECT USING (status = 'active');
CREATE POLICY "collection_items_insert" ON collection_items FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "collection_items_update" ON collection_items FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "collection_items_delete" ON collection_items FOR DELETE USING (auth.uid() = author_id);

ALTER TABLE collection_item_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_item_photos_select" ON collection_item_photos FOR SELECT USING (true);
CREATE POLICY "collection_item_photos_insert" ON collection_item_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM collection_items WHERE id = item_id AND author_id = auth.uid())
);

-- ────────────────────────────────────────────────────────────
-- THÈME 3 — ÉVÉNEMENTS LOCAUX
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS local_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT NOT NULL DEFAULT '18:00',
  location TEXT NOT NULL DEFAULT 'Biguglia',
  category TEXT NOT NULL DEFAULT 'social' CHECK (category IN ('sport','culture','musique','repas','nature','famille','social','conference')),
  organizer_name TEXT,
  max_participants INT,
  is_free BOOLEAN NOT NULL DEFAULT true,
  price NUMERIC(10,2),
  tags TEXT[] DEFAULT '{}',
  is_official BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER local_events_updated_at BEFORE UPDATE ON local_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS event_participations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES local_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- RLS Events
ALTER TABLE local_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "local_events_select" ON local_events FOR SELECT USING (status = 'active');
CREATE POLICY "local_events_insert" ON local_events FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "local_events_update_own" ON local_events FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "local_events_admin" ON local_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

ALTER TABLE event_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_participations_select" ON event_participations FOR SELECT USING (true);
CREATE POLICY "event_participations_insert" ON event_participations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_participations_delete" ON event_participations FOR DELETE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Catégories forum pour les 3 thèmes
-- ────────────────────────────────────────────────────────────
INSERT INTO forum_categories (name, slug, description, icon, display_order) VALUES
  ('🌿 Promenades & Nature', 'promenades',    'Itinéraires, sorties, balades et nature à Biguglia', '🌿', 8),
  ('🏆 Collectionneurs',     'collectionneurs','Échanges, expertises et rencontres de collectionneurs', '🏆', 9),
  ('🎉 Événements locaux',   'evenements',     'Discussions autour des événements de Biguglia',     '🎉', 10)
ON CONFLICT (slug) DO NOTHING;
