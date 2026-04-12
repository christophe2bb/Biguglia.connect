/**
 * admin/migration/_sql/core.ts
 */
export const MIGRATION_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Migration thèmes locaux
-- Coller entièrement dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- THÈME 1 — PROMENADES
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
  parking_info TEXT,
  difficulty TEXT CHECK (difficulty IN ('facile', 'moyen', 'difficile')),
  kids_friendly BOOLEAN NOT NULL DEFAULT false,
  dogs_allowed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Add missing columns if table already exists
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS parking_info TEXT;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('facile', 'moyen', 'difficile'));
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS kids_friendly BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE group_outings ADD COLUMN IF NOT EXISTS dogs_allowed BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS outing_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE outing_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_comments' AND policyname='outing_comments_select') THEN
    CREATE POLICY "outing_comments_select" ON outing_comments FOR SELECT USING (true);
    CREATE POLICY "outing_comments_insert" ON outing_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "outing_comments_delete" ON outing_comments FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS outing_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE outing_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_photos' AND policyname='outing_photos_select') THEN
    CREATE POLICY "outing_photos_select" ON outing_photos FOR SELECT USING (true);
    CREATE POLICY "outing_photos_insert" ON outing_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid()));
    CREATE POLICY "outing_photos_delete" ON outing_photos FOR DELETE USING (
      EXISTS (SELECT 1 FROM group_outings WHERE id = outing_id AND organizer_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS outing_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outing_id UUID REFERENCES group_outings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(outing_id, user_id)
);
ALTER TABLE promenades ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promenades' AND policyname='promenades_select') THEN
    CREATE POLICY "promenades_select" ON promenades FOR SELECT USING (status = 'active');
    CREATE POLICY "promenades_insert" ON promenades FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "promenades_update" ON promenades FOR UPDATE USING (auth.uid() = author_id);
    CREATE POLICY "promenades_delete" ON promenades FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;
ALTER TABLE promenade_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promenade_photos' AND policyname='promenade_photos_select') THEN
    CREATE POLICY "promenade_photos_select" ON promenade_photos FOR SELECT USING (true);
    CREATE POLICY "promenade_photos_insert" ON promenade_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM promenades WHERE id = promenade_id AND author_id = auth.uid()));
  END IF;
END $$;
ALTER TABLE promenade_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promenade_likes' AND policyname='promenade_likes_select') THEN
    CREATE POLICY "promenade_likes_select" ON promenade_likes FOR SELECT USING (true);
    CREATE POLICY "promenade_likes_insert" ON promenade_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "promenade_likes_delete" ON promenade_likes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
ALTER TABLE group_outings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='group_outings' AND policyname='group_outings_select') THEN
    CREATE POLICY "group_outings_select" ON group_outings FOR SELECT USING (true);
    CREATE POLICY "group_outings_insert" ON group_outings FOR INSERT WITH CHECK (auth.uid() = organizer_id);
    CREATE POLICY "group_outings_update" ON group_outings FOR UPDATE USING (auth.uid() = organizer_id);
  END IF;
END $$;
ALTER TABLE outing_participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='outing_participants' AND policyname='outing_participants_select') THEN
    CREATE POLICY "outing_participants_select" ON outing_participants FOR SELECT USING (true);
    CREATE POLICY "outing_participants_insert" ON outing_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "outing_participants_delete" ON outing_participants FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- THÈME 2 — COLLECTIONNEURS
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
  ('Timbres & philatélie',   'timbres',      '📮', 'blue',    1),
  ('Monnaies & numismatique','monnaies',     '🪙', 'amber',   2),
  ('Vinyles & musique',      'vinyles',      '🎵', 'purple',  3),
  ('Livres anciens',         'livres',       '📚', 'emerald', 4),
  ('Figurines & jouets',     'figurines',    '🎮', 'rose',    5),
  ('Cartes postales',        'cartes',       '🗺️', 'sky',     6),
  ('Art & tableaux',         'art',          '🎨', 'pink',    7),
  ('Vintage & mode',         'vintage',      '👗', 'orange',  8),
  ('Minéraux & fossiles',    'mineraux',     '🪨', 'teal',    9),
  ('Miniatures & maquettes', 'miniatures',   '🏗️', 'indigo',  10),
  ('Automobilia',            'automobilia',  '🚗', 'red',     11),
  ('Nature & botanique',     'nature-col',   '🌿', 'green',   12)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS collection_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES collection_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'vente' CHECK (item_type IN ('vente','troc','don','recherche')),
  price NUMERIC(10,2),
  condition TEXT NOT NULL DEFAULT 'bon' CHECK (condition IN ('neuf','excellent','bon','passable')),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','archived')),
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
      EXISTS (SELECT 1 FROM collection_items WHERE id = item_id AND author_id = auth.uid()));
  END IF;
END $$;

-- THÈME 3 — ÉVÉNEMENTS LOCAUX
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS event_participations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES local_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE local_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='local_events' AND policyname='local_events_select') THEN
    CREATE POLICY "local_events_select" ON local_events FOR SELECT USING (status = 'active');
    CREATE POLICY "local_events_insert" ON local_events FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "local_events_update_own" ON local_events FOR UPDATE USING (auth.uid() = author_id);
  END IF;
END $$;
ALTER TABLE event_participations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_participations' AND policyname='event_participations_select') THEN
    CREATE POLICY "event_participations_select" ON event_participations FOR SELECT USING (true);
    CREATE POLICY "event_participations_insert" ON event_participations FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "event_participations_delete" ON event_participations FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Photos des événements
CREATE TABLE IF NOT EXISTS event_photos (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id      UUID REFERENCES local_events(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_photos' AND policyname='event_photos_select') THEN
    CREATE POLICY "event_photos_select" ON event_photos FOR SELECT USING (true);
    CREATE POLICY "event_photos_insert" ON event_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM local_events WHERE id = event_id AND author_id = auth.uid())
    );
    CREATE POLICY "event_photos_delete" ON event_photos FOR DELETE USING (
      EXISTS (SELECT 1 FROM local_events WHERE id = event_id AND author_id = auth.uid())
    );
  END IF;
END $$;

-- Catégories forum pour les 3 thèmes
INSERT INTO forum_categories (name, slug, description, icon, display_order) VALUES
  ('🌿 Promenades & Nature', 'promenades',     'Itinéraires, sorties, balades et nature à Biguglia', '🌿', 8),
  ('🏆 Collectionneurs',     'collectionneurs', 'Échanges, expertises et rencontres de collectionneurs', '🏆', 9),
  ('🎉 Événements locaux',   'evenements',      'Discussions autour des événements de Biguglia', '🎉', 10)
ON CONFLICT (slug) DO NOTHING;

-- DEMANDES PUBLIQUES — commentaires communautaires
CREATE TABLE IF NOT EXISTS request_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='request_comments' AND policyname='request_comments_select') THEN
    CREATE POLICY "request_comments_select" ON request_comments FOR SELECT USING (true);
    CREATE POLICY "request_comments_insert" ON request_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "request_comments_delete" ON request_comments FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ÉVÉNEMENTS — commentaires / mini-forum par événement
CREATE TABLE IF NOT EXISTS event_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id   UUID REFERENCES local_events(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_comments' AND policyname='event_comments_select') THEN
    CREATE POLICY "event_comments_select" ON event_comments FOR SELECT USING (true);
    CREATE POLICY "event_comments_insert" ON event_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "event_comments_delete" ON event_comments FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- Rendre les demandes lisibles par tous (tableau d'affichage public)
DROP POLICY IF EXISTS "Voir ses propres demandes" ON service_requests;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='service_requests' AND policyname='service_requests_select_public') THEN
    CREATE POLICY "service_requests_select_public" ON service_requests FOR SELECT USING (true);
  END IF;
END $$;

-- ── PERDU / TROUVÉ ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lost_found_items (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id           UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('perdu','trouve')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','draft')),
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'autre',
  description         TEXT NOT NULL DEFAULT '',
  brand               TEXT,
  color               TEXT,
  distinctive_sign    TEXT,
  keep_secret         BOOLEAN NOT NULL DEFAULT false,
  lost_date           DATE NOT NULL,
  lost_time           TEXT,
  location_area       TEXT NOT NULL DEFAULT '',
  location_detail     TEXT,
  contact_name        TEXT NOT NULL DEFAULT '',
  contact_phone       TEXT,
  contact_email       TEXT,
  contact_mode        TEXT NOT NULL DEFAULT 'messagerie',
  show_phone          BOOLEAN NOT NULL DEFAULT false,
  reward              TEXT,
  sentimental_value   BOOLEAN NOT NULL DEFAULT false,
  declared_authorities BOOLEAN NOT NULL DEFAULT false,
  need_community_help BOOLEAN NOT NULL DEFAULT true,
  deposited_at        TEXT,
  proof_required      BOOLEAN NOT NULL DEFAULT false,
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lost_found_items' AND policyname='lfi_select') THEN
    CREATE POLICY "lfi_select" ON lost_found_items FOR SELECT USING (status <> 'draft' OR auth.uid() = author_id);
    CREATE POLICY "lfi_insert" ON lost_found_items FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "lfi_update" ON lost_found_items FOR UPDATE USING (auth.uid() = author_id);
    CREATE POLICY "lfi_delete" ON lost_found_items FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS lf_photos (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id      UUID REFERENCES lost_found_items(id) ON DELETE CASCADE NOT NULL,
  url          TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE lf_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lf_photos' AND policyname='lf_photos_select') THEN
    CREATE POLICY "lf_photos_select" ON lf_photos FOR SELECT USING (true);
    CREATE POLICY "lf_photos_insert" ON lf_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM lost_found_items WHERE id = item_id AND author_id = auth.uid()));
    CREATE POLICY "lf_photos_delete" ON lf_photos FOR DELETE USING (
      EXISTS (SELECT 1 FROM lost_found_items WHERE id = item_id AND author_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS lf_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id    UUID REFERENCES lost_found_items(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE lf_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lf_comments' AND policyname='lf_comments_select') THEN
    CREATE POLICY "lf_comments_select" ON lf_comments FOR SELECT USING (true);
    CREATE POLICY "lf_comments_insert" ON lf_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "lf_comments_delete" ON lf_comments FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ── ASSOCIATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS associations (
  id                   UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_id            UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pub_type             TEXT NOT NULL DEFAULT 'vitrine' CHECK (pub_type IN ('vitrine','benevoles','activite','adherents','materiel','evenement','dons','partenaires')),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  name                 TEXT NOT NULL,
  slogan               TEXT,
  category             TEXT NOT NULL DEFAULT 'autre',
  description_short    TEXT NOT NULL DEFAULT '',
  description_full     TEXT,
  location             TEXT NOT NULL DEFAULT 'Biguglia',
  address              TEXT,
  schedule             TEXT,
  public_target        TEXT[] NOT NULL DEFAULT '{}',
  age_min              INT,
  age_max              INT,
  membership_required  BOOLEAN NOT NULL DEFAULT false,
  price_type           TEXT NOT NULL DEFAULT 'gratuit',
  price_detail         TEXT,
  capacity             INT,
  activities           TEXT[] NOT NULL DEFAULT '{}',
  frequency            TEXT,
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  needs                TEXT[] NOT NULL DEFAULT '{}',
  need_detail          TEXT,
  contact_name         TEXT NOT NULL DEFAULT '',
  contact_role         TEXT,
  contact_phone        TEXT,
  contact_email        TEXT,
  contact_website      TEXT,
  contact_facebook     TEXT,
  contact_instagram    TEXT,
  contact_mode         TEXT NOT NULL DEFAULT 'messagerie',
  show_phone           BOOLEAN NOT NULL DEFAULT false,
  declared             BOOLEAN NOT NULL DEFAULT false,
  rna_number           TEXT,
  pmr_accessible       BOOLEAN NOT NULL DEFAULT false,
  families_welcome     BOOLEAN NOT NULL DEFAULT false,
  animals_ok           BOOLEAN NOT NULL DEFAULT false,
  indoor               BOOLEAN,
  parking_nearby       BOOLEAN NOT NULL DEFAULT false,
  material_provided    BOOLEAN NOT NULL DEFAULT false,
  registration_required BOOLEAN NOT NULL DEFAULT false,
  places_limited       BOOLEAN NOT NULL DEFAULT false,
  urgent_need          BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='associations' AND policyname='asso_select') THEN
    CREATE POLICY "asso_select" ON associations FOR SELECT USING (status <> 'draft' OR auth.uid() = author_id);
    CREATE POLICY "asso_insert" ON associations FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "asso_update" ON associations FOR UPDATE USING (auth.uid() = author_id);
    CREATE POLICY "asso_delete" ON associations FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS asso_photos (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asso_id       UUID REFERENCES associations(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE asso_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='asso_photos' AND policyname='asso_photos_select') THEN
    CREATE POLICY "asso_photos_select" ON asso_photos FOR SELECT USING (true);
    CREATE POLICY "asso_photos_insert" ON asso_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM associations WHERE id = asso_id AND author_id = auth.uid()));
    CREATE POLICY "asso_photos_delete" ON asso_photos FOR DELETE USING (
      EXISTS (SELECT 1 FROM associations WHERE id = asso_id AND author_id = auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS asso_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asso_id    UUID REFERENCES associations(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE asso_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='asso_comments' AND policyname='asso_comments_select') THEN
    CREATE POLICY "asso_comments_select" ON asso_comments FOR SELECT USING (true);
    CREATE POLICY "asso_comments_insert" ON asso_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "asso_comments_delete" ON asso_comments FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ============================================================
-- SYSTÈME DE MODÉRATION — Enrichissement table reports
-- ============================================================

-- Ajout colonnes enrichies sur reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_title    text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at     timestamptz;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_by     uuid REFERENCES profiles(id);

-- Index pour performance
CREATE INDEX IF NOT EXISTS reports_status_idx        ON reports(status);
CREATE INDEX IF NOT EXISTS reports_target_type_idx   ON reports(target_type);
CREATE INDEX IF NOT EXISTS reports_target_id_idx     ON reports(target_id);

-- Contrainte unicité : 1 signalement par user/contenu
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_reporter_target
  ON reports(reporter_id, target_type, target_id)
  WHERE status = 'pending';

-- Ajout colonnes sur profiles pour réputation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS publication_count  int DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reports_received   int DEFAULT 0;

-- File de modération des premiers posts
CREATE TABLE IF NOT EXISTS moderation_queue (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,   -- 'forum_post', 'listing', 'help_request', etc.
  content_id   uuid NOT NULL,
  content_title text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by  uuid REFERENCES profiles(id),
  reviewed_at  timestamptz,
  reject_reason text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='moderation_queue' AND policyname='moderation_queue_select') THEN
    CREATE POLICY "moderation_queue_select" ON moderation_queue FOR SELECT
      USING (auth.uid() = author_id OR EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('admin','moderator')));
    CREATE POLICY "moderation_queue_insert" ON moderation_queue FOR INSERT
      WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "moderation_queue_update" ON moderation_queue FOR UPDATE
      USING (EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND role IN ('admin','moderator')));
  END IF;
END $$;

-- ============================================================
-- COUPS DE MAIN ENTRE VOISINS
-- ============================================================

CREATE TABLE IF NOT EXISTS help_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id           uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  help_type           text NOT NULL CHECK (help_type IN ('demande','offre','echange')),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','resolved','draft')),
  title               text NOT NULL,
  category            text NOT NULL DEFAULT 'autre',
  description         text NOT NULL,
  urgency             text NOT NULL DEFAULT 'flexible' CHECK (urgency IN ('flexible','cette_semaine','rapidement','urgent')),
  help_date           date,
  help_time           text,
  location_area       text NOT NULL DEFAULT 'Centre-ville',
  location_city       text NOT NULL DEFAULT 'Biguglia',
  location_detail     text,
  duration            text NOT NULL DEFAULT '1h',
  persons_needed      int NOT NULL DEFAULT 1,
  compensation        text NOT NULL DEFAULT 'gratuit',
  compensation_detail text,
  equipment           text[] DEFAULT '{}',
  for_who             text NOT NULL DEFAULT 'Pour moi',
  conditions          text[] DEFAULT '{}',
  visibility          text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','membres')),
  contact_mode        text NOT NULL DEFAULT 'messagerie',
  display_name        text NOT NULL DEFAULT 'prenom_initiale',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='help_requests' AND policyname='help_requests_select') THEN
    CREATE POLICY "help_requests_select" ON help_requests FOR SELECT USING (true);
    CREATE POLICY "help_requests_insert" ON help_requests FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "help_requests_update" ON help_requests FOR UPDATE USING (auth.uid() = author_id);
    CREATE POLICY "help_requests_delete" ON help_requests FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS help_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  help_id       uuid REFERENCES help_requests(id) ON DELETE CASCADE NOT NULL,
  url           text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE help_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='help_photos' AND policyname='help_photos_select') THEN
    CREATE POLICY "help_photos_select" ON help_photos FOR SELECT USING (true);
    CREATE POLICY "help_photos_insert" ON help_photos FOR INSERT WITH CHECK (
      auth.uid() = (SELECT author_id FROM help_requests WHERE id = help_id)
    );
    CREATE POLICY "help_photos_delete" ON help_photos FOR DELETE USING (
      auth.uid() = (SELECT author_id FROM help_requests WHERE id = help_id)
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS help_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  help_id    uuid REFERENCES help_requests(id) ON DELETE CASCADE NOT NULL,
  author_id  uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE help_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='help_comments' AND policyname='help_comments_select') THEN
    CREATE POLICY "help_comments_select" ON help_comments FOR SELECT USING (true);
    CREATE POLICY "help_comments_insert" ON help_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "help_comments_delete" ON help_comments FOR DELETE USING (
      auth.uid() = author_id OR
      auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- Étendre le type de related_type pour les nouvelles conversations
DO $$ BEGIN
  ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_related_type_check;
  ALTER TABLE conversations ADD CONSTRAINT conversations_related_type_check
    CHECK (related_type IN (
      'service_request','listing','equipment','general',
      'help_request','lost_found','association','outing','collection_item','event'
    ));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Recharge le cache PostgREST (OBLIGATOIRE après création de tables)
NOTIFY pgrst, 'reload schema';`;

