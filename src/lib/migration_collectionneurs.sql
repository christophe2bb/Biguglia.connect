-- ============================================================
-- BIGUGLIA CONNECT — Migration Collectionneurs uniquement
-- Coller dans Supabase SQL Editor > New query > Run
-- ============================================================

CREATE TABLE IF NOT EXISTS collection_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT 'gray',
  display_order INT NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL
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
  item_type TEXT NOT NULL DEFAULT 'vente'
    CHECK (item_type IN ('vente', 'troc', 'don', 'recherche')),
  price NUMERIC(10,2),
  condition TEXT NOT NULL DEFAULT 'bon'
    CHECK (condition IN ('neuf', 'excellent', 'bon', 'passable')),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'archived')),
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_item_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES collection_items(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sécurité (RLS)
ALTER TABLE collection_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='collection_categories' AND policyname='collection_categories_select') THEN
    CREATE POLICY "collection_categories_select" ON collection_categories FOR SELECT USING (true);
    CREATE POLICY "collection_categories_insert" ON collection_categories FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "collection_categories_delete" ON collection_categories FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='collection_items' AND policyname='collection_items_select') THEN
    CREATE POLICY "collection_items_select" ON collection_items FOR SELECT USING (status = 'active');
    CREATE POLICY "collection_items_insert" ON collection_items FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "collection_items_update" ON collection_items FOR UPDATE USING (auth.uid() = author_id);
    CREATE POLICY "collection_items_delete" ON collection_items FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

ALTER TABLE collection_item_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='collection_item_photos' AND policyname='collection_item_photos_select') THEN
    CREATE POLICY "collection_item_photos_select" ON collection_item_photos FOR SELECT USING (true);
    CREATE POLICY "collection_item_photos_insert" ON collection_item_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM collection_items WHERE id = item_id AND author_id = auth.uid())
    );
  END IF;
END $$;
