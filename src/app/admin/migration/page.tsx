'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, Copy, Check, Database, Loader2, RefreshCw, AlertTriangle, Upload, HardDrive, Eye, ImageIcon, Zap, Star, CheckCheck, Activity, Tag, Info, Search, Wrench, MessageSquare, Users, Shield } from 'lucide-react';

// ─── SQL complet à copier-coller dans Supabase SQL Editor ─────────────────────
const MIGRATION_SQL = `-- ============================================================
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

// ─── SQL Realtime instantané ───────────────────────────────────────────────────
const REALTIME_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Activation Realtime instantané (v2)
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. REPLICA IDENTITY FULL (pour que UPDATE transmette la ligne complète)
ALTER TABLE messages                  REPLICA IDENTITY FULL;
ALTER TABLE notifications             REPLICA IDENTITY FULL;
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;
ALTER TABLE conversations             REPLICA IDENTITY FULL;

-- 2. Ajouter les tables à la publication Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- 3. Corriger les politiques RLS pour Realtime
--    Supabase Realtime ne peut pas évaluer les JOIN dans les policies SELECT.
--    On remplace la policy messages par une version sans JOIN.

-- Supprimer l'ancienne policy messages
DROP POLICY IF EXISTS "Voir messages de ses conversations" ON messages;

-- Nouvelle policy : utilise sender_id + conversation_id via sous-requête simple
CREATE POLICY "Voir messages de ses conversations" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Supprimer et recréer la policy conversation_participants pour Realtime
-- (simple : pas de sous-requête récursive sur la même table → évite 42P17)
DROP POLICY IF EXISTS "Voir participants de ses conversations" ON conversation_participants;

CREATE POLICY "Voir participants de ses conversations" ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

-- 4. Vérification (doit retourner 4 lignes)
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages','notifications','conversation_participants','conversations')
ORDER BY tablename;`;

// ─── SQL Fix BLOC 1 : Ajouter valeurs ENUM (exécuter SEUL, hors transaction) ───
const CONV_FIX_BLOC1 = `-- ============================================================
-- BIGUGLIA CONNECT — Fix messagerie BLOC 1/2
-- Ajouter les valeurs manquantes dans l'ENUM related_type
--
-- ⚠️  IMPORTANT : coller CE BLOC SEUL dans un nouvel onglet SQL Editor
--    (ALTER TYPE ADD VALUE ne peut pas s'exécuter dans une transaction)
-- ============================================================
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'listing';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'equipment';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'help_request';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'lost_found';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'association';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'outing';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'collection_item';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'service_request';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'general';
ALTER TYPE related_type ADD VALUE IF NOT EXISTS 'community';

-- Vérification : doit afficher les 11 valeurs
SELECT enumlabel AS valeur FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'related_type'
ORDER BY e.enumsortorder;
`;

// ─── SQL Fix BLOC 2 : CHECK + RLS (exécuter APRÈS le bloc 1) ─────────────────
const CONV_FIX_BLOC2 = `-- ============================================================
-- BIGUGLIA CONNECT — Fix messagerie BLOC 2/2
-- Fonction SECURITY DEFINER + CHECK + RLS policies
--
-- Exécuter APRÈS le BLOC 1 (dans un nouvel onglet SQL Editor)
-- ============================================================

-- 1. Mettre à jour le CHECK pour autoriser toutes les valeurs + NULL
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_related_type_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_related_type_check
  CHECK (
    related_type IS NULL
    OR related_type::text IN (
      'service_request', 'listing', 'equipment', 'general',
      'help_request', 'collection_item', 'lost_found',
      'association', 'outing', 'event', 'community'
    )
  );

-- 2. Valeur par défaut = 'general'
ALTER TABLE conversations
  ALTER COLUMN related_type SET DEFAULT 'general';

-- 3. Fonction SECURITY DEFINER : contourne les RLS pour créer une conversation
--    Appelée via supabase.rpc('create_conversation_with_message', {...})
CREATE OR REPLACE FUNCTION create_conversation_with_message(
  p_subject        TEXT,
  p_related_type   TEXT DEFAULT 'general',
  p_related_id     TEXT DEFAULT NULL,   -- TEXT pour accepter UUID ou slug (ex: 'collectionneurs')
  p_owner_id       UUID DEFAULT NULL,
  p_initial_msg    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_conv_id    UUID;
  v_related_id UUID := NULL;   -- UUID cast (NULL si p_related_id est un slug texte)
BEGIN
  -- Vérification : utilisateur connecté obligatoire
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Vérification : pas de contact avec soi-même
  IF p_owner_id IS NOT NULL AND v_user_id = p_owner_id THEN
    RAISE EXCEPTION 'SELF_CONTACT';
  END IF;

  -- Tenter de caster p_related_id en UUID (échoue silencieusement si c'est un slug texte)
  BEGIN
    IF p_related_id IS NOT NULL THEN
      v_related_id := p_related_id::UUID;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    v_related_id := NULL;  -- slug communauté (ex: 'collectionneurs') → pas d'UUID
  END;

  -- Chercher conversation existante isolée par (related_type, related_id OU subject)
  IF p_owner_id IS NOT NULL THEN
    IF v_related_id IS NOT NULL THEN
      -- Isolation stricte : même related_type ET même related_id (UUID)
      SELECT c.id INTO v_conv_id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_owner_id
      WHERE c.related_type::text = p_related_type
        AND c.related_id = v_related_id
      ORDER BY c.updated_at DESC
      LIMIT 1;
    ELSIF p_related_id IS NOT NULL THEN
      -- Slug communauté : isolation par (related_type, subject)
      SELECT c.id INTO v_conv_id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_owner_id
      WHERE c.related_type::text = p_related_type
        AND c.subject = p_subject
      ORDER BY c.updated_at DESC
      LIMIT 1;
    ELSE
      -- Pas de related_id : cherche conv générale entre les deux (sans related_id)
      SELECT c.id INTO v_conv_id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = v_user_id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_owner_id
      WHERE c.related_id IS NULL
      ORDER BY c.updated_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- Conversation existante → la retourner
  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Créer la nouvelle conversation (related_id = NULL si slug communauté)
  INSERT INTO conversations (subject, related_type, related_id)
  VALUES (
    p_subject,
    COALESCE(p_related_type, 'general')::related_type,
    v_related_id    -- NULL pour les slugs communauté, UUID pour les vraies ressources
  )
  RETURNING id INTO v_conv_id;

  -- Ajouter les participants
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  IF p_owner_id IS NOT NULL AND p_owner_id != v_user_id THEN
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, p_owner_id)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  -- Insérer le message initial
  IF p_initial_msg IS NOT NULL AND p_initial_msg != '' THEN
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (v_conv_id, v_user_id, p_initial_msg);
  END IF;

  RETURN v_conv_id;
END;
$$;

-- Autoriser les utilisateurs authentifiés à appeler cette fonction
GRANT EXECUTE ON FUNCTION create_conversation_with_message TO authenticated;

-- Fonction pour récupérer le profil de l'autre participant (contourne RLS)
-- Nécessaire car la RLS sur conversation_participants filtre sur user_id = auth.uid()
CREATE OR REPLACE FUNCTION get_conversation_other_participant(p_conversation_id UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- Vérifier que l'utilisateur participe à cette conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Retourner le profil de l'autre participant
  RETURN QUERY
    SELECT p.id, p.full_name, p.avatar_url
    FROM conversation_participants cp
    JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id != v_user_id
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_conversation_other_participant TO authenticated;

-- 4. RLS conversations (pour la lecture/mise à jour)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Créer une conversation" ON conversations;
CREATE POLICY "Créer une conversation" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Voir ses conversations" ON conversations;
CREATE POLICY "Voir ses conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Modifier ses conversations" ON conversations;
CREATE POLICY "Modifier ses conversations" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
    )
  );

-- 5. RLS conversation_participants (simple, sans récursion)
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ajouter des participants" ON conversation_participants;
CREATE POLICY "Ajouter des participants" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Voir participants de ses conversations" ON conversation_participants;
CREATE POLICY "Voir participants de ses conversations" ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Supprimer ses participations" ON conversation_participants;
CREATE POLICY "Supprimer ses participations" ON conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- 6. RLS messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voir messages de ses conversations" ON messages;
CREATE POLICY "Voir messages de ses conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Envoyer un message" ON messages;
CREATE POLICY "Envoyer un message" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

-- 7. Recharge PostgREST
NOTIFY pgrst, 'reload schema';

SELECT 'Fix BLOC 2 appliqué avec succès — fonction create_conversation_with_message créée' AS resultat;
`;

// ─── SQL Messagerie universelle — enrichissement des conversations ──────────────
const MESSAGING_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Messagerie universelle (enrichissement)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Ajouter les colonnes de contexte sur la table conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS source_title   TEXT,
  ADD COLUMN IF NOT EXISTS source_image   TEXT,
  ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Migrer les données existantes : created_by = premier participant
UPDATE conversations c
SET created_by = (
  SELECT cp.user_id FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
  ORDER BY cp.joined_at ASC NULLS LAST, cp.id ASC
  LIMIT 1
)
WHERE c.created_by IS NULL;

-- 2. Enrichir le type ENUM related_type si pas déjà fait
-- (valeurs déjà présentes : listing, equipment, help_request, lost_found,
--  association, outing, collection_item, service_request, general)
-- Aucune migration nécessaire si la colonne est TEXT avec CHECK

-- 3. Ajouter la colonne status aux conversations (si absente)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'blocked'));

-- 4. Index supplémentaires pour les recherches de conversation
CREATE INDEX IF NOT EXISTS conversations_created_by_idx ON conversations(created_by);
CREATE INDEX IF NOT EXISTS conversations_owner_id_idx   ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx     ON conversations(status);

-- 5. Colonne message_type sur messages (pour système, pièces jointes, etc.)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system', 'image', 'file', 'location'));
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at       TIMESTAMPTZ;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;

-- 6. Table message_attachments (pièces jointes enrichies)
CREATE TABLE IF NOT EXISTS message_attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_name    TEXT,
  file_size    INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes avant recréation (idempotent)
DROP POLICY IF EXISTS "Participants peuvent voir les pièces jointes" ON message_attachments;
DROP POLICY IF EXISTS "Participants peuvent ajouter des pièces jointes" ON message_attachments;

CREATE POLICY "Participants peuvent voir les pièces jointes"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
        AND cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Participants peuvent ajouter des pièces jointes"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
        AND cp.user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS message_attachments_message_idx ON message_attachments(message_id);

-- 7. Colonnes anti-spam sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_conversation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversation_count_today INTEGER NOT NULL DEFAULT 0;

-- 8. Vue helper : dernière activité par conversation pour l'utilisateur connecté
-- (matérialisée en SELECT depuis l'app, pas besoin de vue serveur)

-- 9. Vérification finale
SELECT
  (SELECT count(*) FROM conversations WHERE status IS NOT NULL) AS convs_with_status,
  (SELECT count(*) FROM messages WHERE message_type IS NOT NULL) AS msgs_with_type,
  (SELECT count(*) FROM message_attachments) AS attachments_count;
`;

// ─── SQL Interactions / Suivi des échanges ────────────────────────────────────
const INTERACTION_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Table interactions (cycle de vie complet)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Creer la table interactions
CREATE TABLE IF NOT EXISTS interactions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Type et cible
  source_type     TEXT NOT NULL CHECK (source_type IN (
    'listing', 'equipment', 'help_request', 'association',
    'collection_item', 'outing', 'event', 'service_request', 'lost_found'
  )),
  source_id       UUID NOT NULL,

  -- Participants
  requester_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Type d interaction
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'transaction',       -- annonce : vente/achat
    'material_request',  -- materiel : demande de pret
    'help_match',        -- coup de main : aide acceptee
    'participation',     -- promenade/evenement : inscription
    'contact',           -- association/collectionneur : prise de contact
    'service_request'    -- artisan : demande de prestation
  )),

  -- Cycle de vie
  status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested',    -- demande envoyee
    'pending',      -- en attente de reponse
    'accepted',     -- acceptee par le destinataire
    'rejected',     -- refusee
    'in_progress',  -- en cours (action en train de se realiser)
    'done',         -- terminee (les 2 parties confirment)
    'cancelled',    -- annulee par l un ou l autre
    'disputed'      -- litige signale
  )),

  -- Historique des statuts (JSON array)
  status_history  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Conversation liee (cree automatiquement ou manuellement)
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Avis debloque apres confirmation
  review_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  review_requester_done BOOLEAN NOT NULL DEFAULT FALSE,
  review_receiver_done  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Dates
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at     TIMESTAMPTZ,
  in_progress_at  TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule interaction active par paire (requester + source)
  UNIQUE(source_type, source_id, requester_id)
);

-- 2. Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS interactions_updated_at ON interactions;
CREATE TRIGGER interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_interactions_requester ON interactions(requester_id);
CREATE INDEX IF NOT EXISTS idx_interactions_receiver  ON interactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_interactions_source    ON interactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status    ON interactions(status);
CREATE INDEX IF NOT EXISTS idx_interactions_conv      ON interactions(conversation_id);

-- 4. Fonction : ajouter entree dans status_history
CREATE OR REPLACE FUNCTION add_interaction_history(
  p_interaction_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE interactions
  SET
    status         = p_new_status,
    status_history = status_history || jsonb_build_object(
      'status',     p_new_status,
      'changed_by', p_user_id,
      'changed_at', now(),
      'note',       p_note
    ),
    accepted_at     = CASE WHEN p_new_status = 'accepted'     THEN now() ELSE accepted_at     END,
    in_progress_at  = CASE WHEN p_new_status = 'in_progress'  THEN now() ELSE in_progress_at  END,
    completed_at    = CASE WHEN p_new_status = 'done'         THEN now() ELSE completed_at    END,
    cancelled_at    = CASE WHEN p_new_status IN ('cancelled','rejected') THEN now() ELSE cancelled_at END
  WHERE id = p_interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction : confirmer la fin d interaction (les 2 cotes)
CREATE OR REPLACE FUNCTION confirm_interaction_done(
  p_interaction_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_interaction interactions%ROWTYPE;
  v_req_done BOOLEAN; v_rec_done BOOLEAN;
BEGIN
  SELECT * INTO v_interaction FROM interactions WHERE id = p_interaction_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  -- Seuls les participants peuvent confirmer
  IF v_uid <> v_interaction.requester_id AND v_uid <> v_interaction.receiver_id THEN
    RETURN FALSE;
  END IF;
  -- Marquer la confirmation de ce cote
  IF v_uid = v_interaction.requester_id THEN
    UPDATE interactions SET review_requester_done = TRUE WHERE id = p_interaction_id;
  ELSE
    UPDATE interactions SET review_receiver_done = TRUE WHERE id = p_interaction_id;
  END IF;
  -- Verifier si les 2 ont confirme
  SELECT review_requester_done, review_receiver_done
  INTO v_req_done, v_rec_done
  FROM interactions WHERE id = p_interaction_id;
  -- Si les 2 confirment : passer a done + debloquer avis
  IF v_req_done AND v_rec_done THEN
    UPDATE interactions
    SET status = 'done', review_unlocked = TRUE, completed_at = now()
    WHERE id = p_interaction_id;
    -- Sync conversation exchange_status si liee
    UPDATE conversations
    SET exchange_status = 'done',
        exchange_confirmed_at = now()
    WHERE id = v_interaction.conversation_id;
    RETURN TRUE;
  END IF;
  -- Si une seule partie : passer en pending confirmation
  UPDATE interactions SET status = 'in_progress' WHERE id = p_interaction_id
    AND status NOT IN ('done', 'cancelled', 'rejected');
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Mettre a jour can_rate_item pour utiliser interactions.review_unlocked
CREATE OR REPLACE FUNCTION can_rate_item(p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID; v_status TEXT; v_date DATE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  -- Auteur ne peut pas noter son propre item
  CASE p_target_type
    WHEN 'listing'         THEN SELECT user_id      INTO v_author_id FROM listings        WHERE id = p_target_id;
    WHEN 'equipment'       THEN SELECT owner_id     INTO v_author_id FROM equipment_items WHERE id = p_target_id;
    WHEN 'help_request'    THEN SELECT author_id    INTO v_author_id FROM help_requests   WHERE id = p_target_id;
    WHEN 'association'     THEN SELECT author_id    INTO v_author_id FROM associations    WHERE id = p_target_id;
    WHEN 'collection_item' THEN SELECT author_id    INTO v_author_id FROM collection_items WHERE id = p_target_id;
    WHEN 'event'           THEN SELECT author_id    INTO v_author_id FROM local_events    WHERE id = p_target_id;
    WHEN 'outing'          THEN SELECT organizer_id INTO v_author_id FROM group_outings   WHERE id = p_target_id;
    ELSE v_author_id := NULL;
  END CASE;
  IF v_author_id = v_uid THEN RETURN FALSE; END IF;
  -- Libre : perdu/trouve, promenade
  IF p_target_type IN ('lost_found', 'promenade') THEN RETURN TRUE; END IF;
  -- Evenement : inscrit + date passee
  IF p_target_type = 'event' THEN
    SELECT event_date INTO v_date FROM local_events WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (SELECT 1 FROM event_participations WHERE event_id = p_target_id AND user_id = v_uid);
  END IF;
  -- Sortie : inscrit + date passee
  IF p_target_type = 'outing' THEN
    SELECT outing_date INTO v_date FROM group_outings WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (SELECT 1 FROM outing_participants WHERE outing_id = p_target_id AND user_id = v_uid);
  END IF;
  -- Demande artisan
  IF p_target_type = 'service_request' THEN
    RETURN EXISTS (SELECT 1 FROM service_requests WHERE id = p_target_id AND resident_id = v_uid);
  END IF;
  -- Tous les autres : interaction terminee (review_unlocked = true)
  -- OU fallback : conversation avec exchange_status=done
  RETURN EXISTS (
    SELECT 1 FROM interactions
    WHERE source_type = p_target_type
      AND source_id   = p_target_id
      AND (requester_id = v_uid OR receiver_id = v_uid)
      AND review_unlocked = TRUE
  ) OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.related_type    = p_target_type
      AND c.related_id      = p_target_id
      AND c.exchange_status = 'done'
      AND cp.user_id        = v_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voir ses interactions"    ON interactions;
DROP POLICY IF EXISTS "Creer une interaction"    ON interactions;
DROP POLICY IF EXISTS "Modifier son interaction" ON interactions;

CREATE POLICY "Voir ses interactions" ON interactions
  FOR SELECT USING (
    requester_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Creer une interaction" ON interactions
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Modifier son interaction" ON interactions
  FOR UPDATE USING (
    requester_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 8. Recharge schema
NOTIFY pgrst, 'reload schema';`;

// ─── SQL Notation universelle ──────────────────────────────────────────────────
const RATING_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Table item_ratings (notation avec verification)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 0. Fonction helper role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Fonction : verification eligibilite pour noter un item
CREATE OR REPLACE FUNCTION can_rate_item(p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
  v_status    TEXT;
  v_date      DATE;
  v_uid       UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;

  -- Ne pas noter son propre item
  CASE p_target_type
    WHEN 'listing' THEN
      SELECT user_id INTO v_author_id FROM listings WHERE id = p_target_id;
    WHEN 'equipment' THEN
      SELECT owner_id INTO v_author_id FROM equipment WHERE id = p_target_id;
    WHEN 'help_request' THEN
      SELECT author_id INTO v_author_id FROM help_requests WHERE id = p_target_id;
    WHEN 'association' THEN
      SELECT author_id INTO v_author_id FROM associations WHERE id = p_target_id;
    WHEN 'collection_item' THEN
      SELECT author_id INTO v_author_id FROM collection_items WHERE id = p_target_id;
    WHEN 'event' THEN
      SELECT author_id INTO v_author_id FROM local_events WHERE id = p_target_id;
    WHEN 'outing' THEN
      SELECT organizer_id INTO v_author_id FROM group_outings WHERE id = p_target_id;
    ELSE
      v_author_id := NULL;
  END CASE;

  IF v_author_id = v_uid THEN RETURN FALSE; END IF;

  -- Libre : perdu/trouve, promenade
  IF p_target_type IN ('lost_found', 'promenade') THEN RETURN TRUE; END IF;

  -- Coup de main : doit etre resolu
  IF p_target_type = 'help_request' THEN
    SELECT status INTO v_status FROM help_requests WHERE id = p_target_id;
    IF v_status <> 'resolved' THEN RETURN FALSE; END IF;
    IF v_author_id = v_uid THEN RETURN TRUE; END IF;
  END IF;

  -- Evenement : inscrit + date passee
  IF p_target_type = 'event' THEN
    SELECT event_date INTO v_date FROM local_events WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM event_participations
      WHERE event_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Sortie : inscrit + date passee
  IF p_target_type = 'outing' THEN
    SELECT outing_date INTO v_date FROM group_outings WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM outing_participants
      WHERE outing_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Demande artisan : auteur de la demande
  IF p_target_type = 'service_request' THEN
    RETURN EXISTS (
      SELECT 1 FROM service_requests WHERE id = p_target_id AND resident_id = v_uid
    );
  END IF;

  -- listing, equipment, association, collection_item : conversation liee obligatoire
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.related_type = p_target_type
      AND c.related_id   = p_target_id
      AND cp.user_id     = v_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1. Creer la table item_ratings
CREATE TABLE IF NOT EXISTS item_ratings (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN (
    'listing','equipment','help_request','lost_found',
    'association','outing','collection_item','event',
    'promenade','service_request'
  )),
  target_id    UUID NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating       INT NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  comment      TEXT,
  poll_choice  INT CHECK (poll_choice >= 0 AND poll_choice <= 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_type, target_id, user_id)
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_item_ratings_target ON item_ratings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_author ON item_ratings(author_id);
CREATE INDEX IF NOT EXISTS idx_item_ratings_user   ON item_ratings(user_id);

-- 3. RLS stricte
ALTER TABLE item_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notes publiques"         ON item_ratings;
DROP POLICY IF EXISTS "Noter si connecte"        ON item_ratings;
DROP POLICY IF EXISTS "Modifier sa note"         ON item_ratings;
DROP POLICY IF EXISTS "Supprimer sa note"        ON item_ratings;
DROP POLICY IF EXISTS "Noter apres interaction"  ON item_ratings;

-- Lecture : toujours publique
CREATE POLICY "Notes publiques" ON item_ratings
  FOR SELECT USING (true);

-- Insertion : seulement si eligible (interaction reelle verifiee cote DB)
CREATE POLICY "Noter apres interaction" ON item_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND can_rate_item(target_type, target_id)
  );

-- Modification : seulement sa propre note
CREATE POLICY "Modifier sa note" ON item_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Suppression : soi-meme ou admin
CREATE POLICY "Supprimer sa note" ON item_ratings
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Recharge cache
NOTIFY pgrst, 'reload schema';`;

// ─── SQL Échanges confirmés (à exécuter dans Supabase SQL Editor) ────────────
const EXCHANGE_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Echanges confirmes (avis verifie)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Ajouter les colonnes d echange sur la table conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS exchange_status TEXT
    DEFAULT NULL CHECK (exchange_status IN ('pending_confirmation','done')),
  ADD COLUMN IF NOT EXISTS exchange_confirmed_by UUID[]
    DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS exchange_confirmed_at TIMESTAMPTZ
    DEFAULT NULL;

-- 2. Index pour requetes rapides sur l echange
CREATE INDEX IF NOT EXISTS idx_conversations_exchange
  ON conversations(exchange_status)
  WHERE exchange_status IS NOT NULL;

-- 3. Mettre a jour la fonction can_rate_item pour utiliser exchange_status
-- Pour listing, equipment, association, collection_item, help_request :
--   echange confirme (exchange_status = done) obligatoire au lieu de simple conversation
CREATE OR REPLACE FUNCTION can_rate_item(p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
  v_status    TEXT;
  v_date      DATE;
  v_uid       UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;

  -- Ne pas noter son propre item
  CASE p_target_type
    WHEN 'listing'         THEN SELECT user_id       INTO v_author_id FROM listings        WHERE id = p_target_id;
    WHEN 'equipment'       THEN SELECT owner_id      INTO v_author_id FROM equipment_items WHERE id = p_target_id;
    WHEN 'help_request'    THEN SELECT author_id     INTO v_author_id FROM help_requests   WHERE id = p_target_id;
    WHEN 'association'     THEN SELECT author_id     INTO v_author_id FROM associations    WHERE id = p_target_id;
    WHEN 'collection_item' THEN SELECT author_id     INTO v_author_id FROM collection_items WHERE id = p_target_id;
    WHEN 'event'           THEN SELECT author_id     INTO v_author_id FROM local_events    WHERE id = p_target_id;
    WHEN 'outing'          THEN SELECT organizer_id  INTO v_author_id FROM group_outings   WHERE id = p_target_id;
    ELSE v_author_id := NULL;
  END CASE;

  IF v_author_id = v_uid THEN RETURN FALSE; END IF;

  -- Libre : perdu/trouve, promenade
  IF p_target_type IN ('lost_found', 'promenade') THEN RETURN TRUE; END IF;

  -- Evenement : inscrit + date passee
  IF p_target_type = 'event' THEN
    SELECT event_date INTO v_date FROM local_events WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM event_participations
      WHERE event_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Sortie : inscrit + date passee
  IF p_target_type = 'outing' THEN
    SELECT outing_date INTO v_date FROM group_outings WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM outing_participants
      WHERE outing_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Demande artisan : auteur de la demande
  IF p_target_type = 'service_request' THEN
    RETURN EXISTS (
      SELECT 1 FROM service_requests WHERE id = p_target_id AND resident_id = v_uid
    );
  END IF;

  -- Coup de main : echange confirme OU statut resolved + participant conversation
  IF p_target_type = 'help_request' THEN
    SELECT status INTO v_status FROM help_requests WHERE id = p_target_id;
    -- Echange confirme via conversation
    IF EXISTS (
      SELECT 1 FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.related_type = 'help_request'
        AND c.related_id   = p_target_id
        AND c.exchange_status = 'done'
        AND cp.user_id     = v_uid
    ) THEN RETURN TRUE; END IF;
    -- Fallback : resolu + auteur
    IF v_status = 'resolved' AND v_author_id = v_uid THEN RETURN TRUE; END IF;
    RETURN FALSE;
  END IF;

  -- listing, equipment, association, collection_item :
  -- ECHANGE CONFIRME obligatoire (exchange_status = done)
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.related_type    = p_target_type
      AND c.related_id      = p_target_id
      AND c.exchange_status = 'done'
      AND cp.user_id        = v_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. RLS sur conversations : permettre la mise a jour de exchange_status
DROP POLICY IF EXISTS "Participants maj echange"  ON conversations;
CREATE POLICY "Participants maj echange" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- 5. Recharge cache
NOTIFY pgrst, 'reload schema';`;

// ─── SQL Bucket Storage (à exécuter dans Supabase SQL Editor) ─────────────────
const BUCKET_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Création bucket Storage "photos"
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Créer le bucket public "photos" (si inexistant)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760,  -- 10 MB max par fichier
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif'];

-- 2. Policies RLS sur le bucket storage.objects
-- On supprime les anciennes policies d'abord pour éviter les conflits
DROP POLICY IF EXISTS "photos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "photos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_delete" ON storage.objects;
-- Anciennes versions (noms alternatifs)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

-- Lecture publique (tout le monde peut voir les photos)
CREATE POLICY "photos_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Upload autorisé pour les utilisateurs connectés
CREATE POLICY "photos_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Mise à jour (upsert) pour les utilisateurs connectés
CREATE POLICY "photos_auth_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- Suppression par le propriétaire du fichier
CREATE POLICY "photos_owner_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos' AND auth.uid() = owner);

-- Vérification finale
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'photos';
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'photos%';`;

// ─── Tables à vérifier via REST direct ───────────────────────────────────────
const TABLES_TO_CHECK = [
  { name: 'collection_categories', label: 'Catégories collections',  theme: '🏆 Collectionneurs' },
  { name: 'collection_items',      label: 'Annonces collections',    theme: '🏆 Collectionneurs' },
  { name: 'promenades',            label: 'Promenades',              theme: '🌿 Promenades' },
  { name: 'group_outings',         label: 'Sorties groupées',        theme: '🌿 Promenades' },
  { name: 'outing_comments',       label: 'Commentaires sorties',    theme: '🌿 Promenades' },
  { name: 'outing_photos',         label: 'Photos sorties',          theme: '🌿 Promenades' },
  { name: 'local_events',          label: 'Événements locaux',       theme: '🎉 Événements' },
  { name: 'event_participations',  label: 'Participations',          theme: '🎉 Événements' },
  { name: 'event_photos',          label: 'Photos événements',       theme: '🎉 Événements' },
  { name: 'event_comments',        label: 'Commentaires événements', theme: '🎉 Événements' },
  { name: 'request_comments',      label: 'Commentaires demandes',   theme: '🔧 Vie pratique' },
  { name: 'associations',           label: 'Associations',            theme: '🏛️ Associations' },
  { name: 'asso_photos',            label: 'Photos associations',     theme: '🏛️ Associations' },
  { name: 'asso_comments',          label: 'Forum associations',      theme: '🏛️ Associations' },
  { name: 'lost_found_items',      label: 'Annonces Perdu/Trouvé',   theme: '🔍 Perdu/Trouvé' },
  { name: 'lf_photos',             label: 'Photos Perdu/Trouvé',     theme: '🔍 Perdu/Trouvé' },
  { name: 'lf_comments',           label: 'Commentaires Perdu/Trouvé', theme: '🔍 Perdu/Trouvé' },
  { name: 'help_requests',         label: 'Coups de main',            theme: '🤝 Coups de main' },
  { name: 'help_photos',           label: 'Photos coups de main',     theme: '🤝 Coups de main' },
  { name: 'help_comments',         label: 'Commentaires coups de main', theme: '🤝 Coups de main' },
  { name: 'moderation_queue',      label: 'File de modération',       theme: '🛡️ Modération' },
  { name: 'item_ratings',          label: 'Notes & Avis (universel)',  theme: '⭐ Notation' },
];

type TableStatus = { name: string; exists: boolean };
const ARTISAN_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Artisans : colonnes documents & vérification
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

-- 0. Fonction helper rôle utilisateur (recrée si manquante)
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 1. Colonnes manquantes sur artisan_profiles
ALTER TABLE artisan_profiles
  ADD COLUMN IF NOT EXISTS artisan_type TEXT DEFAULT 'professionnel'
    CHECK (artisan_type IN ('professionnel', 'particulier')),
  ADD COLUMN IF NOT EXISTS doc_kbis_url TEXT,
  ADD COLUMN IF NOT EXISTS doc_insurance_url TEXT,
  ADD COLUMN IF NOT EXISTS doc_id_url TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 2. Recréer les policies RLS sur artisan_profiles
--    (DROP IF EXISTS pour éviter les conflits)
DROP POLICY IF EXISTS "Artisans vérifiés visibles" ON artisan_profiles;
CREATE POLICY "Artisans vérifiés visibles" ON artisan_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'artisan_verified')
    OR user_id = auth.uid()
    OR current_user_role() IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Artisan crée son profil" ON artisan_profiles;
CREATE POLICY "Artisan crée son profil" ON artisan_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Artisan modifie son profil" ON artisan_profiles;
CREATE POLICY "Artisan modifie son profil" ON artisan_profiles
  FOR UPDATE USING (auth.uid() = user_id OR current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin supprime profil artisan" ON artisan_profiles;
CREATE POLICY "Admin supprime profil artisan" ON artisan_profiles
  FOR DELETE USING (current_user_role() = 'admin');

-- 3. Policy UPDATE sur profiles pour que l'admin puisse changer le rôle
DROP POLICY IF EXISTS "Admin modifie tous les profils" ON profiles;
CREATE POLICY "Admin modifie tous les profils" ON profiles
  FOR ALL USING (current_user_role() = 'admin');

-- 4. Bucket sécurisé pour les documents justificatifs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', false, 10485760,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Policies RLS sur le bucket documents
DROP POLICY IF EXISTS "Artisan lit ses documents" ON storage.objects;
CREATE POLICY "Artisan lit ses documents" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR current_user_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "Artisan uploade ses documents" ON storage.objects;
CREATE POLICY "Artisan uploade ses documents" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Artisan supprime ses documents" ON storage.objects;
CREATE POLICY "Artisan supprime ses documents" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR current_user_role() = 'admin'
    )
  );
`;

const COLLECTION_COMMENTS_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Discussion sur articles de collection
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

-- Table des commentaires publics sur les articles de collection
CREATE TABLE IF NOT EXISTS collection_item_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id    UUID NOT NULL REFERENCES collection_items(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index performances
CREATE INDEX IF NOT EXISTS collection_item_comments_item_idx   ON collection_item_comments(item_id);
CREATE INDEX IF NOT EXISTS collection_item_comments_author_idx ON collection_item_comments(author_id);
CREATE INDEX IF NOT EXISTS collection_item_comments_date_idx   ON collection_item_comments(created_at DESC);

-- RLS
ALTER TABLE collection_item_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut lire les commentaires collection" ON collection_item_comments;
CREATE POLICY "Tout le monde peut lire les commentaires collection"
  ON collection_item_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Membres authentifiés peuvent commenter" ON collection_item_comments;
CREATE POLICY "Membres authentifiés peuvent commenter"
  ON collection_item_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut modifier son commentaire" ON collection_item_comments;
CREATE POLICY "Auteur peut modifier son commentaire"
  ON collection_item_comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut supprimer son commentaire" ON collection_item_comments;
CREATE POLICY "Auteur peut supprimer son commentaire"
  ON collection_item_comments FOR DELETE
  USING (auth.uid() = author_id);

-- Vérification
SELECT COUNT(*) AS nb_commentaires FROM collection_item_comments;
`;

const COMMUNITY_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Communautés thématiques (Phase 1 MVP)
-- Coller dans Supabase > SQL Editor > Run
-- ============================================================

-- 1. Table des adhésions aux thèmes
CREATE TABLE IF NOT EXISTS theme_memberships (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_slug     TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','hidden')),
  visibility     TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','members_only','private')),
  allow_messages BOOLEAN NOT NULL DEFAULT true,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, theme_slug)
);

CREATE INDEX IF NOT EXISTS theme_memberships_theme_idx  ON theme_memberships(theme_slug);
CREATE INDEX IF NOT EXISTS theme_memberships_user_idx   ON theme_memberships(user_id);
CREATE INDEX IF NOT EXISTS theme_memberships_active_idx ON theme_memberships(theme_slug, status) WHERE status = 'active';

ALTER TABLE theme_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique adhésions" ON theme_memberships;
CREATE POLICY "Lecture publique adhésions" ON theme_memberships FOR SELECT USING (true);
DROP POLICY IF EXISTS "Créer sa propre adhésion" ON theme_memberships;
CREATE POLICY "Créer sa propre adhésion" ON theme_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Modifier sa propre adhésion" ON theme_memberships;
CREATE POLICY "Modifier sa propre adhésion" ON theme_memberships FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Supprimer sa propre adhésion" ON theme_memberships;
CREATE POLICY "Supprimer sa propre adhésion" ON theme_memberships FOR DELETE USING (auth.uid() = user_id);

-- 2. Table des mini-profils thématiques
CREATE TABLE IF NOT EXISTS theme_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_slug    TEXT NOT NULL,
  bio           TEXT,
  interests     TEXT[] DEFAULT '{}',
  looking_for   TEXT,
  offering      TEXT,
  availability  TEXT,
  level         TEXT,
  tags          TEXT[] DEFAULT '{}',
  location_zone TEXT,
  custom_fields JSONB DEFAULT '{}',
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, theme_slug)
);

CREATE INDEX IF NOT EXISTS theme_profiles_theme_idx ON theme_profiles(theme_slug);
CREATE INDEX IF NOT EXISTS theme_profiles_user_idx  ON theme_profiles(user_id);

ALTER TABLE theme_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture publique profils thème" ON theme_profiles;
CREATE POLICY "Lecture publique profils thème" ON theme_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Créer son propre profil thème" ON theme_profiles;
CREATE POLICY "Créer son propre profil thème" ON theme_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Modifier son propre profil thème" ON theme_profiles;
CREATE POLICY "Modifier son propre profil thème" ON theme_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Supprimer son propre profil thème" ON theme_profiles;
CREATE POLICY "Supprimer son propre profil thème" ON theme_profiles FOR DELETE USING (auth.uid() = user_id);

-- Vérification
SELECT
  (SELECT COUNT(*) FROM theme_memberships) AS nb_adhesions,
  (SELECT COUNT(*) FROM theme_profiles)    AS nb_profils_theme;
`;

// ─── SQL Discussions communautaires ────────────────────────────────────────────
const DISCUSSIONS_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — Discussions communautaires (Phase 2)
-- Coller dans Supabase > SQL Editor > Run
-- ⚠️  Exécuter APRÈS le SQL Communautés (theme_memberships, theme_profiles)
-- ============================================================

-- 1. Table des discussions publiques thématiques
CREATE TABLE IF NOT EXISTS theme_discussions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme_slug   TEXT NOT NULL,
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  likes_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS theme_discussions_theme_idx  ON theme_discussions(theme_slug);
CREATE INDEX IF NOT EXISTS theme_discussions_author_idx ON theme_discussions(author_id);
CREATE INDEX IF NOT EXISTS theme_discussions_date_idx   ON theme_discussions(theme_slug, created_at DESC);

ALTER TABLE theme_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique discussions" ON theme_discussions;
CREATE POLICY "Lecture publique discussions"
  ON theme_discussions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Membres peuvent publier" ON theme_discussions;
CREATE POLICY "Membres peuvent publier"
  ON theme_discussions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut modifier" ON theme_discussions;
CREATE POLICY "Auteur peut modifier"
  ON theme_discussions FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Auteur peut supprimer" ON theme_discussions;
CREATE POLICY "Auteur peut supprimer"
  ON theme_discussions FOR DELETE
  USING (auth.uid() = author_id);

-- 2. Table des likes de discussions
CREATE TABLE IF NOT EXISTS theme_discussion_likes (
  discussion_id UUID NOT NULL REFERENCES theme_discussions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (discussion_id, user_id)
);

CREATE INDEX IF NOT EXISTS theme_discussion_likes_user_idx ON theme_discussion_likes(user_id);

ALTER TABLE theme_discussion_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique likes" ON theme_discussion_likes;
CREATE POLICY "Lecture publique likes"
  ON theme_discussion_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Membres peuvent liker" ON theme_discussion_likes;
CREATE POLICY "Membres peuvent liker"
  ON theme_discussion_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Membres peuvent unliker" ON theme_discussion_likes;
CREATE POLICY "Membres peuvent unliker"
  ON theme_discussion_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Fonction trigger pour mettre à jour le compteur de likes
CREATE OR REPLACE FUNCTION update_discussion_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE theme_discussions SET likes_count = likes_count + 1 WHERE id = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE theme_discussions SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.discussion_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_likes_count_trigger ON theme_discussion_likes;
CREATE TRIGGER update_likes_count_trigger
  AFTER INSERT OR DELETE ON theme_discussion_likes
  FOR EACH ROW EXECUTE FUNCTION update_discussion_likes_count();

-- 4. Vérification
SELECT
  (SELECT COUNT(*) FROM theme_discussions) AS nb_discussions,
  (SELECT COUNT(*) FROM theme_discussion_likes) AS nb_likes;
`;

// ─── RLS + SECURITY DEFINER pour le système de statuts ───────────────────────
const RLS_STATUS_SQL = `-- ============================================================
-- BIGUGLIA CONNECT — RLS Statuts & Fonctions SECURITY DEFINER
-- Protège les changements de statut : seul le créateur/modérateur/admin peut agir
-- À exécuter APRÈS le SQL "Statuts enrichis"
-- ============================================================

-- ============================================================
-- 1. Fonction SECURITY DEFINER : changer le statut d'une annonce
-- ============================================================
CREATE OR REPLACE FUNCTION change_listing_status(
  p_listing_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  -- Récupère le propriétaire et le statut actuel
  SELECT user_id, status INTO v_owner_id, v_current_status
    FROM listings WHERE id = p_listing_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Annonce introuvable');
  END IF;

  -- Récupère le rôle de l'appelant
  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  -- Admin : accès total
  IF v_role IN ('admin', 'moderator') THEN
    UPDATE listings
      SET status = p_new_status,
          status_changed_at = NOW(),
          updated_at = NOW()
    WHERE id = p_listing_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  -- Propriétaire : transitions autorisées
  IF v_user_id = v_owner_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'active'   THEN ARRAY['reserved','sold','archived','expired']
      WHEN 'reserved' THEN ARRAY['active','sold','archived']
      WHEN 'sold'     THEN ARRAY['active','archived']
      WHEN 'expired'  THEN ARRAY['active','archived']
      WHEN 'archived' THEN ARRAY['active']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE listings
        SET status = p_new_status,
            status_changed_at = NOW(),
            updated_at = NOW()
      WHERE id = p_listing_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée : ' || v_current_status || ' → ' || p_new_status);
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_listing_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 2. Fonction SECURITY DEFINER : changer le statut d'un équipement
-- ============================================================
CREATE OR REPLACE FUNCTION change_equipment_status(
  p_item_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  SELECT owner_id, COALESCE(status, CASE WHEN is_available THEN 'available' ELSE 'unavailable' END)
    INTO v_owner_id, v_current_status
    FROM equipment_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Matériel introuvable');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  IF v_role IN ('admin', 'moderator') THEN
    UPDATE equipment_items
      SET status = p_new_status,
          is_available = (p_new_status = 'available'),
          status_changed_at = NOW(),
          updated_at = NOW()
    WHERE id = p_item_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_user_id = v_owner_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'available'   THEN ARRAY['reserved','unavailable','archived']
      WHEN 'reserved'    THEN ARRAY['available','borrowed','archived']
      WHEN 'borrowed'    THEN ARRAY['available']
      WHEN 'unavailable' THEN ARRAY['available','archived']
      WHEN 'archived'    THEN ARRAY['available']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE equipment_items
        SET status = p_new_status,
            is_available = (p_new_status = 'available'),
            status_changed_at = NOW(),
            updated_at = NOW()
      WHERE id = p_item_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_equipment_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 3. Fonction SECURITY DEFINER : changer le statut d'une aide
-- ============================================================
CREATE OR REPLACE FUNCTION change_help_request_status(
  p_request_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_author_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  SELECT author_id, status INTO v_author_id, v_current_status
    FROM help_requests WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Demande introuvable');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  IF v_role IN ('admin', 'moderator') THEN
    UPDATE help_requests
      SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
          resolved_at = CASE WHEN p_new_status = 'resolved' THEN NOW() ELSE resolved_at END,
          archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
    WHERE id = p_request_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_user_id = v_author_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'active'      THEN ARRAY['in_progress','paused','resolved','closed']
      WHEN 'in_progress' THEN ARRAY['resolved','paused','closed']
      WHEN 'paused'      THEN ARRAY['active','resolved','closed']
      WHEN 'resolved'    THEN ARRAY['active','archived']
      WHEN 'closed'      THEN ARRAY['active','archived']
      WHEN 'archived'    THEN ARRAY['active']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE help_requests
        SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
            resolved_at = CASE WHEN p_new_status = 'resolved' THEN NOW() ELSE resolved_at END,
            archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
      WHERE id = p_request_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_help_request_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 4. Fonction SECURITY DEFINER : changer statut perdu/trouvé
-- ============================================================
CREATE OR REPLACE FUNCTION change_lost_found_status(
  p_item_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_author_id UUID;
  v_current_status TEXT;
  v_role TEXT;
  v_allowed_transitions TEXT[];
BEGIN
  SELECT author_id, status INTO v_author_id, v_current_status
    FROM lost_found_items WHERE id = p_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Objet introuvable');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  IF v_role IN ('admin', 'moderator') THEN
    UPDATE lost_found_items
      SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
          resolved_at = CASE WHEN p_new_status IN ('resolved','restituted') THEN NOW() ELSE resolved_at END,
          archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
    WHERE id = p_item_id;
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF v_user_id = v_author_id THEN
    v_allowed_transitions := CASE v_current_status
      WHEN 'active'    THEN ARRAY['resolved','restituted','closed','archived']
      WHEN 'resolved'  THEN ARRAY['active','archived']
      WHEN 'restituted'THEN ARRAY['active','archived']
      WHEN 'closed'    THEN ARRAY['active','archived']
      WHEN 'archived'  THEN ARRAY['active']
      ELSE ARRAY[]::TEXT[]
    END;

    IF p_new_status = ANY(v_allowed_transitions) THEN
      UPDATE lost_found_items
        SET status = p_new_status, status_changed_at = NOW(), updated_at = NOW(),
            resolved_at = CASE WHEN p_new_status IN ('resolved','restituted') THEN NOW() ELSE resolved_at END,
            archived_at = CASE WHEN p_new_status = 'archived' THEN NOW() ELSE archived_at END
      WHERE id = p_item_id;
      RETURN jsonb_build_object('ok', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'Transition non autorisée');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'Accès refusé');
END;
$$;

GRANT EXECUTE ON FUNCTION change_lost_found_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 5. Politique RLS renforcée : seul créateur/modo/admin peut UPDATE le statut
-- ============================================================

-- Listings
DROP POLICY IF EXISTS "listings_status_update" ON listings;
CREATE POLICY "listings_status_update" ON listings
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Equipment items
DROP POLICY IF EXISTS "equipment_status_update" ON equipment_items;
CREATE POLICY "equipment_status_update" ON equipment_items
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Help requests
DROP POLICY IF EXISTS "help_requests_status_update" ON help_requests;
CREATE POLICY "help_requests_status_update" ON help_requests
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Lost & found items
DROP POLICY IF EXISTS "lost_found_status_update" ON lost_found_items;
CREATE POLICY "lost_found_status_update" ON lost_found_items
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Group outings
DROP POLICY IF EXISTS "group_outings_status_update" ON group_outings;
CREATE POLICY "group_outings_status_update" ON group_outings
  FOR UPDATE USING (
    auth.uid() = organizer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = organizer_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Local events
DROP POLICY IF EXISTS "local_events_status_update" ON local_events;
CREATE POLICY "local_events_status_update" ON local_events
  FOR UPDATE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  )
  WITH CHECK (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- ============================================================
-- 6. Table d'historique des changements de statut
-- ============================================================
CREATE TABLE IF NOT EXISTS status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name    TEXT NOT NULL,           -- 'listings', 'help_requests', etc.
  record_id     UUID NOT NULL,
  old_status    TEXT,
  new_status    TEXT NOT NULL,
  changed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at    TIMESTAMPTZ DEFAULT NOW(),
  note          TEXT                     -- optionnel : raison du changement
);

CREATE INDEX IF NOT EXISTS status_history_record ON status_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS status_history_user ON status_history(changed_by);
CREATE INDEX IF NOT EXISTS status_history_date ON status_history(changed_at DESC);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Lecture : créateur ou admin
DROP POLICY IF EXISTS "status_history_read" ON status_history;
CREATE POLICY "status_history_read" ON status_history
  FOR SELECT USING (
    changed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- Insertion : authentifié (via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "status_history_insert" ON status_history;
CREATE POLICY "status_history_insert" ON status_history
  FOR INSERT WITH CHECK (changed_by = auth.uid());

-- ============================================================
-- 7. Trigger générique : enregistrer chaque changement de statut
-- ============================================================
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO status_history(table_name, record_id, old_status, new_status, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attache le trigger à chaque table concernée
DROP TRIGGER IF EXISTS log_listings_status ON listings;
CREATE TRIGGER log_listings_status
  AFTER UPDATE ON listings FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_equipment_status ON equipment_items;
CREATE TRIGGER log_equipment_status
  AFTER UPDATE ON equipment_items FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_help_status ON help_requests;
CREATE TRIGGER log_help_status
  AFTER UPDATE ON help_requests FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_lost_found_status ON lost_found_items;
CREATE TRIGGER log_lost_found_status
  AFTER UPDATE ON lost_found_items FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_outings_status ON group_outings;
CREATE TRIGGER log_outings_status
  AFTER UPDATE ON group_outings FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

DROP TRIGGER IF EXISTS log_events_status ON local_events;
CREATE TRIGGER log_events_status
  AFTER UPDATE ON local_events FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

SELECT 'OK: RLS statuts + SECURITY DEFINER + historique appliqués avec succès' AS result;
`;

type StorageDiag = {
  bucketExists: boolean | null;
  bucketPublic: boolean | null;
  canUpload: boolean | null;
  canRead: boolean | null;
  testFileUrl: string | null;
  error: string | null;
};

// ─── Composant aperçu SQL modération ─────────────────────────────────────────
function ModerationSQLPreview() {
  const [sql, setSql] = useState<string>('');
  useEffect(() => {
    import('@/lib/moderation').then(({ MODERATION_SQL }) => setSql(MODERATION_SQL));
  }, []);
  if (!sql) return <div className="text-xs text-gray-400 italic">Chargement…</div>;
  return <pre className="text-xs text-purple-300 font-mono leading-relaxed whitespace-pre-wrap">{sql}</pre>;
}

export default function MigrationPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking]       = useState(true);
  const [tables,   setTables]         = useState<TableStatus[]>([]);
  const [copied,       setCopied]       = useState(false);
  const [copiedNotify, setCopiedNotify] = useState(false);
  const [copiedBucket, setCopiedBucket] = useState(false);
  const [copiedRealtime, setCopiedRealtime] = useState(false);
  const [copiedRating, setCopiedRating] = useState(false);
  const [copiedExchange, setCopiedExchange] = useState(false);
  const [copiedInteraction, setCopiedInteraction] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [copiedSearch, setCopiedSearch] = useState(false);
  const [copiedArtisan, setCopiedArtisan] = useState(false);
  const [copiedMessaging, setCopiedMessaging] = useState(false);
  const [copiedConvFix1, setCopiedConvFix1] = useState(false);
  const [copiedConvFix2, setCopiedConvFix2] = useState(false);
  const [copiedCollectionComments, setCopiedCollectionComments] = useState(false);
  const [copiedCommunity, setCopiedCommunity] = useState(false);
  const [copiedDiscussions, setCopiedDiscussions] = useState(false);
  const [copiedRLS, setCopiedRLS] = useState(false);
  const [copiedModeration, setCopiedModeration] = useState(false);

  // Storage diagnostic
  const [storageDiag, setStorageDiag] = useState<StorageDiag>({
    bucketExists: null, bucketPublic: null,
    canUpload: null, canRead: null, testFileUrl: null, error: null,
  });
  const [checkingStorage, setCheckingStorage] = useState(false);
  const [testingUpload, setTestingUpload] = useState(false);

  useEffect(() => {
    checkTables();
    checkStorage();
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const checkTables = async () => {
    setChecking(true);
    const results: TableStatus[] = [];
    for (const t of TABLES_TO_CHECK) {
      const { error } = await supabase.from(t.name).select('id').limit(1);
      // Absent si : 42P01 (PostgreSQL), PGRST205 (PostgREST schema cache), ou message "schema cache"
      const missing = !!error && (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        (error.message ?? '').includes('schema cache') ||
        (error.message ?? '').includes('Could not find')
      );
      results.push({ name: t.name, exists: !missing });
    }
    setTables(results);
    setChecking(false);
  };

  const checkStorage = async () => {
    setCheckingStorage(true);
    const diag: StorageDiag = {
      bucketExists: null, bucketPublic: null,
      canUpload: null, canRead: null, testFileUrl: null, error: null,
    };
    try {
      // 1. Vérifier si le bucket existe en listant les fichiers
      const { data: files, error: listErr } = await supabase.storage
        .from('photos')
        .list('__diagnostic__', { limit: 1 });

      if (listErr) {
        if (listErr.message?.includes('Bucket not found') || listErr.message?.includes('bucket') || listErr.message?.includes('does not exist')) {
          diag.bucketExists = false;
          diag.error = `Bucket "photos" introuvable : ${listErr.message}`;
        } else {
          // Bucket existe mais autre erreur (permissions)
          diag.bucketExists = true;
          diag.canRead = false;
          diag.error = `Erreur lecture bucket : ${listErr.message}`;
        }
      } else {
        diag.bucketExists = true;
        diag.canRead = true;
        void files; // suppress unused warning
      }

      // 2. Tester un upload avec une vraie image PNG 1x1 pixel
      if (diag.bucketExists) {
        // PNG 1x1 pixel transparent (format binaire valide)
        const pngBytes = new Uint8Array([
          0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A, // PNG signature
          0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52, // IHDR chunk length + type
          0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01, // 1x1 px
          0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53, // bit depth, color type, etc.
          0xDE,0x00,0x00,0x00,0x0C,0x49,0x44,0x41, // IDAT chunk
          0x54,0x08,0xD7,0x63,0xF8,0xCF,0xC0,0x00, // compressed pixel
          0x00,0x00,0x02,0x00,0x01,0xE2,0x21,0xBC, // CRC
          0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4E, // IEND
          0x44,0xAE,0x42,0x60,0x82               // IEND CRC
        ]);
        const testBlob = new Blob([pngBytes], { type: 'image/png' });
        const testPath = `__diagnostic__/test_${Date.now()}.png`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('photos')
          .upload(testPath, testBlob, { upsert: true, contentType: 'image/png' });

        if (upErr) {
          diag.canUpload = false;
          diag.error = (diag.error ? diag.error + ' | ' : '') + `Upload bloqué : ${upErr.message}`;
        } else if (upData?.path) {
          diag.canUpload = true;
          const { data: urlData } = supabase.storage.from('photos').getPublicUrl(upData.path);
          diag.testFileUrl = urlData?.publicUrl ?? null;
          // Check public URL structure
          if (diag.testFileUrl) {
            diag.bucketPublic = diag.testFileUrl.includes('/object/public/');
          }
          // Cleanup test file
          await supabase.storage.from('photos').remove([testPath]);
        }
      }
    } catch (e: unknown) {
      diag.error = `Exception : ${e instanceof Error ? e.message : String(e)}`;
    }
    setStorageDiag(diag);
    setCheckingStorage(false);
  };

  const testRealUpload = async (file: File) => {
    if (!file) return;
    setTestingUpload(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `__diagnostic__/real_test_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      alert(`❌ Upload échoué :\n\nErreur : ${error.message}\nCode : ${(error as {statusCode?: string}).statusCode ?? 'N/A'}\n\nVérifiez :\n1. Que le bucket "photos" existe (SQL ci-dessous)\n2. Que les policies sont appliquées\n3. Que vous êtes connecté`);
    } else if (data?.path) {
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path);
      const url = urlData?.publicUrl;
      // Cleanup
      await supabase.storage.from('photos').remove([path]);
      alert(`✅ Upload réussi !\n\nURL publique : ${url}\n\nLe bucket fonctionne correctement.`);
    }
    setTestingUpload(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(MIGRATION_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    });
  };

  const handleCopyNotify = () => {
    navigator.clipboard.writeText("NOTIFY pgrst, 'reload schema';").then(() => {
      setCopiedNotify(true);
      setTimeout(() => setCopiedNotify(false), 4000);
    });
  };

  const handleCopyBucket = () => {
    navigator.clipboard.writeText(BUCKET_SQL).then(() => {
      setCopiedBucket(true);
      setTimeout(() => setCopiedBucket(false), 4000);
    });
  };

  const handleCopyArtisan = () => {
    navigator.clipboard.writeText(ARTISAN_SQL);
    setCopiedArtisan(true);
    setTimeout(() => setCopiedArtisan(false), 4000);
  };

  const handleCopyCollectionComments = () => {
    navigator.clipboard.writeText(COLLECTION_COMMENTS_SQL);
    setCopiedCollectionComments(true);
    setTimeout(() => setCopiedCollectionComments(false), 4000);
  };

  const handleCopyCommunity = () => {
    navigator.clipboard.writeText(COMMUNITY_SQL);
    setCopiedCommunity(true);
    setTimeout(() => setCopiedCommunity(false), 4000);
  };

  const handleCopyDiscussions = () => {
    navigator.clipboard.writeText(DISCUSSIONS_SQL);
    setCopiedDiscussions(true);
    setTimeout(() => setCopiedDiscussions(false), 4000);
  };

  const handleCopyRLS = () => {
    navigator.clipboard.writeText(RLS_STATUS_SQL);
    setCopiedRLS(true);
    setTimeout(() => setCopiedRLS(false), 4000);
  };

  const handleCopySearch = () => {
    const searchSql = `-- BIGUGLIA CONNECT — Recherche globale full-text (optionnel, améliore les perfs)
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
    navigator.clipboard.writeText(searchSql).then(() => {
      setCopiedSearch(true);
      setTimeout(() => setCopiedSearch(false), 4000);
    });
  };

  const handleCopyRealtime = () => {
    navigator.clipboard.writeText(REALTIME_SQL).then(() => {
      setCopiedRealtime(true);
      setTimeout(() => setCopiedRealtime(false), 4000);
    });
  };

  const handleCopyRating = () => {
    navigator.clipboard.writeText(RATING_SQL).then(() => {
      setCopiedRating(true);
      setTimeout(() => setCopiedRating(false), 4000);
    });
  };

  const handleCopyExchange = () => {
    navigator.clipboard.writeText(EXCHANGE_SQL).then(() => {
      setCopiedExchange(true);
      setTimeout(() => setCopiedExchange(false), 4000);
    });
  };

  const handleCopyMessaging = () => {
    navigator.clipboard.writeText(MESSAGING_SQL).then(() => {
      setCopiedMessaging(true);
      setTimeout(() => setCopiedMessaging(false), 4000);
    });
  };

  const handleCopyConvFix1 = () => {
    navigator.clipboard.writeText(CONV_FIX_BLOC1).then(() => {
      setCopiedConvFix1(true);
      setTimeout(() => setCopiedConvFix1(false), 4000);
    });
  };

  const handleCopyConvFix2 = () => {
    navigator.clipboard.writeText(CONV_FIX_BLOC2).then(() => {
      setCopiedConvFix2(true);
      setTimeout(() => setCopiedConvFix2(false), 4000);
    });
  };

  const handleCopyInteraction = () => {
    navigator.clipboard.writeText(INTERACTION_SQL).then(() => {
      setCopiedInteraction(true);
      setTimeout(() => setCopiedInteraction(false), 4000);
    });
  };

  const allOk       = tables.length > 0 && tables.every(t => t.exists);
  const missingCount = tables.filter(t => !t.exists).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Database className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Migration base de données</h1>
          <p className="text-gray-500 text-sm">Vérification et installation des tables thèmes</p>
        </div>
      </div>

      {/* ── Statut global ── */}
      {checking ? (
        <div className="bg-white rounded-2xl border p-8 flex items-center justify-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-gray-500">Vérification en cours…</span>
        </div>
      ) : allOk ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3 mb-6">
          <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">✅ Toutes les tables sont présentes</p>
            <p className="text-emerald-700 text-sm">Les 3 thèmes sont opérationnels.</p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3 mb-6">
          <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-base">
              {missingCount} table{missingCount > 1 ? 's' : ''} manquante{missingCount > 1 ? 's' : ''} — migration requise
            </p>
            <p className="text-red-700 text-sm mt-1">
              Copiez le SQL ci-dessous et exécutez-le dans votre projet Supabase.
            </p>
          </div>
        </div>
      )}

      {/* ── Tableau état des tables ── */}
      <div className="bg-white rounded-2xl border shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">État des tables</h2>
          <button onClick={checkTables} disabled={checking}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
        <div className="divide-y">
          {TABLES_TO_CHECK.map(t => {
            const s = tables.find(r => r.name === t.name);
            return (
              <div key={t.name} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-semibold text-gray-800">{t.label}</span>
                  <span className="ml-2 text-xs text-gray-400">{t.theme}</span>
                </div>
                {!s ? (
                  <span className="text-gray-400 text-sm">—</span>
                ) : s.exists ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" /> OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 text-sm font-semibold">
                    <XCircle className="w-4 h-4" /> Manquante
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bloc SQL — toujours visible ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">

        {/* Instructions */}
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Instructions :</strong>
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              <li>Cliquez <strong>Copier le SQL</strong> ci-dessous</li>
              <li>Ouvrez <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">supabase.com</a> → votre projet → <strong>SQL Editor</strong></li>
              <li>Cliquez <strong>New query</strong>, collez (<kbd>Ctrl+V</kbd>), puis cliquez <strong>Run</strong></li>
              <li>Revenez ici et cliquez <strong>Actualiser</strong></li>
            </ol>
          </div>
        </div>

        {/* Bouton copier */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">
            SQL complet — promenades + collectionneurs + événements + NOTIFY
          </p>
          <button onClick={handleCopy}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
              copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}>
            {copied
              ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier le SQL</>}
          </button>
        </div>

        {/* Code SQL */}
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap">
            {MIGRATION_SQL}
          </pre>
        </div>
      </div>

      {/* ── Bandeau NOTIFY — si tables OK mais erreur cache ── */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <div>
            <p className="font-bold text-orange-800 text-sm">
              Tables présentes mais erreur &quot;Could not find the table&quot; ?
            </p>
            <p className="text-orange-700 text-xs mt-0.5">
              PostgREST n&apos;a pas rechargé son cache après la migration.
              Exécutez cette commande dans Supabase SQL Editor :
            </p>
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3 font-mono text-sm text-green-400">
          <code>NOTIFY pgrst, &apos;reload schema&apos;;</code>
          <button onClick={handleCopyNotify}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              copiedNotify ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
            }`}>
            {copiedNotify ? <><Check className="w-3 h-3" /> Copié !</> : <><Copy className="w-3 h-3" /> Copier</>}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION REALTIME — MESSAGES & NOTIFICATIONS INSTANTANÉS
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <Zap className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Realtime — Messages & Notifications</h2>
          <p className="text-gray-500 text-sm">Active les notifications et messages instantanés</p>
        </div>
      </div>

      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">⚡</span>
          <div>
            <p className="font-bold text-red-800 text-sm">
              À exécuter si les messages ou notifications n&apos;arrivent pas en temps réel
            </p>
            <p className="text-red-700 text-xs mt-1">
              Sans cette migration, Supabase ne diffuse pas les nouveaux messages ni les notifications.
              Les tables doivent être ajoutées à la publication <code className="bg-red-100 px-1 rounded">supabase_realtime</code>.
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyRealtime}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copiedRealtime ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          {copiedRealtime
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Realtime</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap">{REALTIME_SQL}</pre>
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 font-bold">📋 Instructions :</p>
          <ol className="text-xs text-amber-700 mt-1 space-y-1 list-decimal list-inside">
            <li>Copiez le SQL ci-dessus</li>
            <li>Allez sur <strong>supabase.com</strong> → votre projet → <strong>SQL Editor</strong></li>
            <li>Cliquez <strong>New query</strong>, collez et cliquez <strong>Run</strong></li>
            <li>La dernière requête doit retourner <strong>4 lignes</strong> (messages, notifications, conversation_participants, conversations)</li>
            <li>Ce script corrige aussi les policies RLS pour que Realtime fonctionne (suppression des JOIN bloquants)</li>
            <li>Activez aussi : <strong>Database → Replication → supabase_realtime</strong> → vérifiez que les 4 tables sont cochées</li>
          </ol>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION NOTATION — AVIS & ÉTOILES UNIVERSEL
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-amber-100 rounded-2xl">
          <Star className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Notation universelle — Avis & Étoiles</h2>
          <p className="text-gray-500 text-sm">Notes 1-5 étoiles + mini-sondages sur toutes les rubriques</p>
        </div>
      </div>

      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">⭐</span>
          <div>
            <p className="font-bold text-amber-800 text-sm">
              À exécuter pour activer les avis sur toutes les rubriques
            </p>
            <p className="text-amber-700 text-xs mt-1">
              Crée la table <code className="bg-amber-100 px-1 rounded">item_ratings</code> permettant de noter
              annonces, événements, promenades, associations, coups de main, collectionneurs, matériel, etc.
              Avec mini-sondages contextuels par rubrique.
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyRating}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copiedRating ? 'bg-emerald-500 text-white' : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          {copiedRating
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Notation</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-amber-300 font-mono leading-relaxed whitespace-pre-wrap">{RATING_SQL}</pre>
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 font-bold">📋 Instructions :</p>
          <ol className="text-xs text-amber-700 mt-1 space-y-1 list-decimal list-inside">
            <li>Copiez le SQL ci-dessus</li>
            <li>Allez sur <strong>supabase.com</strong> → votre projet → <strong>SQL Editor</strong></li>
            <li>Cliquez <strong>New query</strong>, collez et cliquez <strong>Run</strong></li>
            <li>La table <code className="bg-amber-100 px-1 rounded">item_ratings</code> sera créée avec RLS</li>
            <li>Les avis apparaîtront automatiquement sur toutes les rubriques du site</li>
          </ol>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION ÉCHANGES CONFIRMÉS — AVIS VÉRIFIÉS
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-emerald-100 rounded-2xl">
          <CheckCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Échanges confirmés — Avis vérifiés</h2>
          <p className="text-gray-500 text-sm">Ajoute le suivi d&apos;échange sur les conversations pour débloquer les avis</p>
        </div>
      </div>

      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">🤝</span>
          <div>
            <p className="font-bold text-emerald-800 text-sm">
              À exécuter pour activer les avis vérifiés
            </p>
            <p className="text-emerald-700 text-xs mt-1">
              Ajoute <code className="bg-emerald-100 px-1 rounded">exchange_status</code> sur la table
              <code className="bg-emerald-100 px-1 rounded ml-1">conversations</code>.
              Un avis n&apos;est possible que si les 2 parties ont confirmé la fin de l&apos;échange.
              Met à jour la fonction <code className="bg-emerald-100 px-1 rounded">can_rate_item</code> pour
              exiger <code className="bg-emerald-100 px-1 rounded">exchange_status = &apos;done&apos;</code>.
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyExchange}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copiedExchange ? 'bg-emerald-500 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {copiedExchange
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Échanges confirmés</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">{EXCHANGE_SQL}</pre>
        </div>
        <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-xs text-emerald-800 font-bold">📋 Instructions :</p>
          <ol className="text-xs text-emerald-700 mt-1 space-y-1 list-decimal list-inside">
            <li>Copiez le SQL ci-dessus</li>
            <li>Allez sur <strong>supabase.com</strong> → votre projet → <strong>SQL Editor</strong></li>
            <li>Cliquez <strong>New query</strong>, collez et cliquez <strong>Run</strong></li>
            <li>Le suivi d&apos;échange sera activé sur toutes les conversations liées</li>
            <li>Les avis n&apos;apparaîtront que si l&apos;échange est confirmé par les 2 parties</li>
          </ol>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FIX MESSAGERIE — À EXÉCUTER EN PREMIER SI ERREUR
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-red-100 rounded-2xl">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">🔴 Fix messagerie — À exécuter si le bouton &quot;Message privé&quot; affiche une erreur</h2>
          <p className="text-gray-500 text-sm">Corrige le CHECK constraint sur related_type + RLS conversations/messages/participants</p>
        </div>
      </div>

      {/* Explication étapes — bannière bien visible */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-2xl p-5 mb-4">
        <p className="font-black text-red-900 text-base mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          Si vous voyez « Contrainte related_type — exécutez BLOC 1 » : exécutez les 2 blocs ci-dessous
        </p>
        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2.5 bg-white/70 rounded-xl p-3">
            <span className="w-6 h-6 bg-red-600 text-white text-xs font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
            <div>
              <p className="text-sm font-bold text-red-900">BLOC 1 — Ajouter les valeurs ENUM <code className="bg-red-100 px-1 rounded">related_type</code></p>
              <p className="text-xs text-red-700 mt-0.5">Coller <strong>seul</strong> dans un <strong>nouvel onglet</strong> Supabase → SQL Editor → Run</p>
              <p className="text-xs text-red-600 mt-0.5 font-medium">⚠️ Doit être exécuté SEUL — hors transaction</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/70 rounded-xl p-3">
            <span className="w-6 h-6 bg-orange-600 text-white text-xs font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
            <div>
              <p className="text-sm font-bold text-orange-900">BLOC 2 — CHECK constraint + RLS + fonction RPC</p>
              <p className="text-xs text-orange-700 mt-0.5">Coller dans un <strong>autre onglet</strong> Supabase → SQL Editor → Run (après BLOC 1)</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 text-xs text-amber-800 font-medium">
          💡 <strong>Pourquoi 2 blocs séparés ?</strong> PostgreSQL interdit <code>ALTER TYPE ADD VALUE</code> dans une transaction.
          Les blocs 1 et 2 doivent être collés et exécutés dans 2 onglets SQL Editor distincts.
        </div>
      </div>

      {/* BLOC 1 */}
      <div className="bg-white rounded-2xl border-2 border-red-400 shadow-md overflow-hidden mb-4">
        <div className="px-5 py-4 bg-red-600 flex items-center justify-between gap-3">
          <div className="text-white">
            <p className="text-base font-black flex items-center gap-2">
              <span className="w-7 h-7 bg-white text-red-600 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">1</span>
              BLOC 1 — Ajouter les valeurs ENUM <code className="bg-red-500 px-1.5 py-0.5 rounded text-sm">related_type</code>
            </p>
            <p className="text-xs text-red-100 mt-1 ml-9">
              ⚠️ À coller <strong>SEUL</strong> dans un <strong>nouvel onglet</strong> Supabase → SQL Editor → Run
            </p>
          </div>
          <button onClick={handleCopyConvFix1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow flex-shrink-0 ${
              copiedConvFix1 ? 'bg-emerald-400 text-white' : 'bg-white text-red-700 hover:bg-red-50'
            }`}>
            {copiedConvFix1
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier BLOC 1</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-60">
          <pre className="text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap">{CONV_FIX_BLOC1}</pre>
        </div>
      </div>

      {/* BLOC 2 */}
      <div className="bg-white rounded-2xl border-2 border-orange-400 shadow-md overflow-hidden mb-6">
        <div className="px-5 py-4 bg-orange-500 flex items-center justify-between gap-3">
          <div className="text-white">
            <p className="text-base font-black flex items-center gap-2">
              <span className="w-7 h-7 bg-white text-orange-600 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">2</span>
              BLOC 2 — CHECK constraint + RLS + fonction RPC
            </p>
            <p className="text-xs text-orange-100 mt-1 ml-9">
              À coller dans un <strong>autre onglet</strong> SQL Editor → Run — <strong>après le BLOC 1</strong>
            </p>
          </div>
          <button onClick={handleCopyConvFix2}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow flex-shrink-0 ${
              copiedConvFix2 ? 'bg-emerald-400 text-white' : 'bg-white text-orange-700 hover:bg-orange-50'
            }`}>
            {copiedConvFix2
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier BLOC 2</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-60">
          <pre className="text-xs text-orange-200 font-mono leading-relaxed whitespace-pre-wrap">{CONV_FIX_BLOC2}</pre>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION MESSAGERIE UNIVERSELLE
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-blue-100 rounded-2xl">
          <MessageSquare className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Messagerie universelle — Enrichissement des conversations</h2>
          <p className="text-gray-500 text-sm">Ajoute les colonnes de contexte, statut, et la table message_attachments</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Colonnes ajoutées</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li><code>conversations.source_title</code> — titre du contenu lié</li>
              <li><code>conversations.source_image</code> — image du contenu</li>
              <li><code>conversations.created_by</code> — initiateur de la conversation</li>
              <li><code>conversations.owner_id</code> — propriétaire du contenu</li>
              <li><code>conversations.status</code> — active / archived / blocked</li>
              <li><code>messages.message_type</code> — text / system / image / file</li>
              <li><code>messages.attachment_url / type / edited_at / deleted_at</code></li>
              <li>Table <code>message_attachments</code> (pièces jointes)</li>
            </ul>
          </div>
        </div>
        <button
          onClick={handleCopyMessaging}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copiedMessaging ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copiedMessaging
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Messagerie universelle</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-blue-300 font-mono leading-relaxed whitespace-pre-wrap">{MESSAGING_SQL}</pre>
        </div>
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-800 font-bold">📋 Instructions :</p>
          <ol className="text-xs text-blue-700 mt-1 space-y-1 list-decimal list-inside">
            <li>Copiez le SQL ci-dessus</li>
            <li>Allez sur <strong>supabase.com</strong> → votre projet → <strong>SQL Editor</strong></li>
            <li>Cliquez <strong>New query</strong>, collez et cliquez <strong>Run</strong></li>
            <li>La messagerie sera enrichie avec le contexte complet (titre, image, statut)</li>
            <li>Les pièces jointes seront disponibles via la table message_attachments</li>
          </ol>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION INTERACTIONS — SUIVI DES ÉCHANGES (NOUVEAU)
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-8">
        <div className="p-3 bg-indigo-100 rounded-2xl">
          <Activity className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Suivi des interactions — Cycle de vie complet</h2>
          <p className="text-gray-500 text-sm">Table centrale pour tracer chaque échange de la demande à l&apos;avis</p>
        </div>
      </div>

      <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">🔄</span>
          <div>
            <p className="font-bold text-indigo-800 text-sm">
              À exécuter pour activer le suivi complet des interactions
            </p>
            <p className="text-indigo-700 text-xs mt-1">
              Crée la table <code className="bg-indigo-100 px-1 rounded">interactions</code> avec cycle de vie complet
              (requested → accepted → in_progress → done), historique de statuts, déverrouillage des avis,
              et synchronisation avec les conversations.
              Inclut les fonctions <code className="bg-indigo-100 px-1 rounded">add_interaction_history</code> et{' '}
              <code className="bg-indigo-100 px-1 rounded">confirm_interaction_done</code>.
            </p>
          </div>
        </div>
        <button
          onClick={handleCopyInteraction}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
            copiedInteraction ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copiedInteraction
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Interactions</>
          }
        </button>
        <div className="mt-3 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-indigo-300 font-mono leading-relaxed whitespace-pre-wrap">{INTERACTION_SQL}</pre>
        </div>
        <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
          <p className="text-xs text-indigo-800 font-bold">📋 Ce que cela active :</p>
          <ul className="text-xs text-indigo-700 mt-1 space-y-0.5 list-disc list-inside">
            <li>Boutons &quot;Je suis intéressé&quot;, &quot;Je peux aider&quot;, &quot;Je réserve&quot; sur toutes les rubriques</li>
            <li>Centre de suivi &quot;Mes échanges&quot; avec filtres (en attente, en cours, à terminer, à évaluer)</li>
            <li>Timeline de chaque échange dans la conversation</li>
            <li>Déblocage automatique des avis quand les 2 parties confirment</li>
            <li>Historique complet de chaque changement de statut</li>
          </ul>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION STATUTS — CHAMPS ENRICHIS
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-4">
        <div className="p-3 bg-violet-100 rounded-2xl">
          <Tag className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Statuts enrichis</h2>
          <p className="text-gray-500 text-sm">Ajoute status_changed_at, expiration_date et statuts manquants — compatible ENUM et TEXT CHECK</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm mb-4 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
            <Info className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-violet-800">
              <p className="font-bold mb-1">Ce SQL enrichit les tables existantes (compatible ENUM et TEXT CHECK) :</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li><strong>Détecte automatiquement</strong> si le statut est un ENUM (ALTER TYPE ADD VALUE) ou un TEXT CHECK</li>
                <li>Ajoute <code>&apos;reserved&apos;</code> et <code>&apos;expired&apos;</code> aux annonces</li>
                <li>Ajoute colonne <code>status</code> sur equipment_items (<code>available/reserved/borrowed/unavailable</code>)</li>
                <li>Ajoute <code>&apos;reserved&apos;</code>, <code>&apos;exchanged&apos;</code> aux collections</li>
                <li>Ajoute <code>&apos;restituted&apos;</code>, <code>&apos;closed&apos;</code> à perdu/trouvé</li>
                <li>Ajoute <code>&apos;closed&apos;</code> aux associations</li>
                <li>Ajoute <code>status_changed_at</code>, <code>expiration_date</code> sur toutes les tables</li>
                <li>Ajoute colonne <code>status</code> sur group_outings et local_events si absente</li>
                <li>Crée les triggers auto-update de <code>status_changed_at</code></li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => {
              const sql = `-- BIGUGLIA CONNECT — Statuts enrichis (compatible ENUM + TEXT CHECK)
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
              navigator.clipboard.writeText(sql);
              setCopiedStatus(true);
              setTimeout(() => setCopiedStatus(false), 4000);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all mb-3 ${
              copiedStatus
                ? 'bg-emerald-500 text-white'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {copiedStatus
              ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
              : <><Copy className="w-4 h-4" /> Copier le SQL Statuts enrichis</>
            }
          </button>

          <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1 bg-gray-50 rounded-xl p-3">
            <li>Copiez le SQL ci-dessus</li>
            <li>Allez dans Supabase → SQL Editor → New query</li>
            <li>Collez et exécutez</li>
            <li>Les statuts <strong>reserved</strong>, <strong>expired</strong> seront disponibles sur les annonces</li>
            <li>Les champs <strong>status_changed_at</strong> et <strong>expiration_date</strong> seront ajoutés</li>
          </ol>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION RECHERCHE GLOBALE — INDEX FULL-TEXT
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-4">
        <div className="p-3 bg-violet-100 rounded-2xl">
          <Search className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Recherche globale (Full-Text)</h2>
          <p className="text-gray-500 text-sm">Index GIN pour accélérer la recherche dans toutes les rubriques</p>
        </div>
      </div>

      <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl flex-shrink-0">🔍</span>
          <div>
            <p className="font-bold text-violet-800 text-sm">
              SQL optionnel — Améliore les performances de recherche
            </p>
            <p className="text-violet-700 text-xs mt-1">
              Ajoute des colonnes <code className="bg-violet-100 px-1 rounded">search_vector</code> (tsvector) et des index GIN sur 8 tables.
              La recherche globale fonctionne sans ce SQL (via ILIKE), mais ce SQL la rend 10× plus rapide sur un grand volume de données.
            </p>
          </div>
        </div>
        <button
          onClick={handleCopySearch}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
            copiedSearch ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'
          }`}
        >
          {copiedSearch
            ? <><Check className="w-4 h-4" /> SQL copié ! Collez dans Supabase SQL Editor</>
            : <><Copy className="w-4 h-4" /> Copier le SQL Recherche globale</>
          }
        </button>
        <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1 bg-gray-50 rounded-xl p-3 mt-3">
          <li>Copiez le SQL ci-dessus (optionnel, recommandé en production)</li>
          <li>Allez dans Supabase → SQL Editor → New query</li>
          <li>Collez et exécutez</li>
          <li>Les 8 tables indexées : listings, equipment_items, help_requests, forum_posts, local_events, group_outings, artisan_profiles, associations</li>
        </ol>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SECTION STORAGE — DIAGNOSTIC PHOTOS
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 mt-4">
        <div className="p-3 bg-blue-100 rounded-2xl">
          <HardDrive className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Stockage des photos (Storage)</h2>
          <p className="text-gray-500 text-sm">Diagnostic du bucket &quot;photos&quot; et des permissions d&apos;upload</p>
        </div>
      </div>

      {/* État du bucket */}
      <div className="bg-white rounded-2xl border shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-500" /> État du bucket &quot;photos&quot;
          </h3>
          <button onClick={checkStorage} disabled={checkingStorage}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${checkingStorage ? 'animate-spin' : ''}`} /> Tester
          </button>
        </div>

        {checkingStorage ? (
          <div className="p-8 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-gray-500 text-sm">Diagnostic en cours…</span>
          </div>
        ) : storageDiag.bucketExists === null ? (
          <div className="p-6 text-center text-gray-400 text-sm">Cliquez &quot;Tester&quot; pour lancer le diagnostic</div>
        ) : (
          <div className="divide-y">
            {/* Bucket existe ? */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Bucket &quot;photos&quot; existe</span>
              {storageDiag.bucketExists
                ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> Oui</span>
                : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Non — À créer</span>}
            </div>
            {/* Bucket public ? */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Bucket public (URLs accessibles)</span>
              {storageDiag.bucketPublic === null
                ? <span className="text-gray-400 text-sm">—</span>
                : storageDiag.bucketPublic
                  ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> Oui</span>
                  : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Non — Photos invisibles !</span>}
            </div>
            {/* Lecture */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Lecture des fichiers autorisée</span>
              {storageDiag.canRead === null
                ? <span className="text-gray-400 text-sm">—</span>
                : storageDiag.canRead
                  ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> OK</span>
                  : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Bloquée</span>}
            </div>
            {/* Upload */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-700">Upload de fichiers autorisé</span>
              {storageDiag.canUpload === null
                ? <span className="text-gray-400 text-sm">—</span>
                : storageDiag.canUpload
                  ? <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm"><CheckCircle className="w-4 h-4" /> OK</span>
                  : <span className="flex items-center gap-1 text-red-500 font-semibold text-sm"><XCircle className="w-4 h-4" /> Bloqué → appliquer SQL Storage</span>}
            </div>
            {/* Erreur détaillée */}
            {storageDiag.error && (
              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-800 font-mono break-all font-semibold">ℹ️ Détail : {storageDiag.error}</p>
                <p className="text-xs text-amber-700 mt-1">→ Copiez et exécutez le <strong>SQL Storage</strong> ci-dessous dans Supabase SQL Editor.</p>
              </div>
            )}
          </div>
        )}

        {/* Test upload réel */}
        <div className="px-5 py-4 bg-gray-50 border-t">
          <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Test d&apos;upload réel (choisissez une image)
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={e => e.target.files?.[0] && testRealUpload(e.target.files[0])}
              className="text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
            />
            {testingUpload && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Ce test uploade et supprime immédiatement un fichier — aucune donnée conservée.</p>
        </div>
      </div>

      {/* ─── Statut résumé Storage ─── */}
      {storageDiag.bucketExists === false && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-sm">🚨 Bucket &quot;photos&quot; manquant — Les photos ne peuvent pas être sauvegardées !</p>
            <p className="text-red-700 text-xs mt-1">Exécutez le SQL ci-dessous dans Supabase pour créer le bucket et les permissions.</p>
          </div>
        </div>
      )}
      {storageDiag.canUpload === false && storageDiag.bucketExists === true && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 text-sm">⚠️ Bucket présent mais upload bloqué</p>
            <p className="text-amber-700 text-xs mt-1">
              {storageDiag.error?.includes('mime type')
                ? '→ Le bucket existe mais les policies RLS bloquent l\'upload. Exécutez le SQL Storage ci-dessous (DROP + CREATE POLICY) pour corriger.'
                : '→ Policies RLS manquantes ou incorrectes. Exécutez le SQL Storage ci-dessous pour ajouter les permissions d\'upload.'}
            </p>
            {storageDiag.error && (
              <p className="text-amber-600 text-xs mt-1 font-mono bg-amber-100 px-2 py-1 rounded">{storageDiag.error}</p>
            )}
          </div>
        </div>
      )}
      {storageDiag.canUpload === true && storageDiag.bucketPublic === true && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">✅ Storage opérationnel — Les photos peuvent être uploadées et affichées.</p>
          </div>
        </div>
      )}

      {/* ─── SQL Artisan colonnes manquantes ─── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-orange-50 border-b border-orange-100 flex items-start gap-3">
          <Wrench className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-800">
            <strong>SQL Artisans — Colonnes documents &amp; vérification</strong>
            <p className="text-xs mt-1 text-orange-700">À exécuter si la page <strong>Admin → Artisans</strong> ne montre pas les documents ni le type d&apos;artisan. Ajoute les colonnes manquantes à <code>artisan_profiles</code>.</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">Ajoute : artisan_type, doc_kbis_url, doc_insurance_url, doc_id_url, rejection_reason, is_featured + bucket documents</p>
          <button onClick={handleCopyArtisan}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
              copiedArtisan ? 'bg-emerald-500 text-white' : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}>
            {copiedArtisan
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Artisans</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-cyan-400 font-mono leading-relaxed whitespace-pre-wrap">{ARTISAN_SQL}</pre>
        </div>
      </div>

      {/* ─── SQL Discussion Collectionneurs ─── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800">
            <strong>SQL Discussion — Commentaires sur articles de collection</strong>
            <p className="text-xs mt-1 text-rose-700">
              Active les discussions publiques (mini-forum) sur chaque carte de la page Collectionneurs.
              Table <code>collection_item_comments</code> + RLS + index.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">Table collection_item_comments + policies RLS (SELECT public, INSERT/UPDATE/DELETE authentifié)</p>
          <button onClick={handleCopyCollectionComments}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
              copiedCollectionComments ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}>
            {copiedCollectionComments
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Discussion Collection</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-cyan-400 font-mono leading-relaxed whitespace-pre-wrap">{COLLECTION_COMMENTS_SQL}</pre>
        </div>
      </div>

      {/* ─── SQL Communautés thématiques ─── */}
      <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-violet-50 border-b border-violet-100 flex items-start gap-3">
          <Users className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-violet-800">
            <strong>🌐 SQL Communautés thématiques — Adhésions + Mini-profils</strong>
            <p className="text-xs mt-1 text-violet-700">
              Active le système de communautés : rejoindre un thème, créer un mini-profil,
              voir les membres. Tables <code>theme_memberships</code> + <code>theme_profiles</code> + RLS.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">2 tables · RLS complète · index performances · Phase 1 MVP communautés</p>
          <button onClick={handleCopyCommunity}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
              copiedCommunity ? 'bg-emerald-500 text-white' : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}>
            {copiedCommunity
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Communautés</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-violet-300 font-mono leading-relaxed whitespace-pre-wrap">{COMMUNITY_SQL}</pre>
        </div>
      </div>

      {/* ─── SQL Discussions communautaires ─── */}
      <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-800">
            <strong>💬 SQL Discussions communautaires — Forum public thématique</strong>
            <p className="text-xs mt-1 text-indigo-700">
              Active l&apos;onglet &quot;Discussions&quot; dans chaque communauté : messages publics, épinglés, likes.
              Tables <code>theme_discussions</code> + <code>theme_discussion_likes</code> + trigger likes + RLS.
              <br />⚠️ À exécuter <strong>APRÈS</strong> le SQL Communautés.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">2 tables · trigger compteur likes · RLS · index performances · Phase 2 communautés</p>
          <button onClick={handleCopyDiscussions}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
              copiedDiscussions ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}>
            {copiedDiscussions
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Discussions</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-80">
          <pre className="text-xs text-indigo-300 font-mono leading-relaxed whitespace-pre-wrap">{DISCUSSIONS_SQL}</pre>
        </div>
      </div>

      {/* ─── SQL RLS Statuts ─── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-purple-50 border-b border-purple-100 flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-900">
            <strong>🔐 RLS Statuts — Politiques + SECURITY DEFINER + Historique</strong>
            <p className="text-xs mt-1 text-purple-700">
              À exécuter <strong>après</strong> le SQL &quot;Statuts enrichis&quot;. Ajoute :<br/>
              • Fonctions <code>change_*_status()</code> SECURITY DEFINER pour chaque type de contenu<br/>
              • Politiques RLS UPDATE restreintes au créateur / modérateur / admin<br/>
              • Table <code>status_history</code> + triggers d&apos;audit complets<br/>
              • Transitions de statuts validées côté base (rejet si non autorisé)
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">4 fonctions SECURITY DEFINER · 6 politiques RLS · table status_history · 6 triggers audit</p>
          <button onClick={handleCopyRLS}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
              copiedRLS ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}>
            {copiedRLS
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL RLS Statuts</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-72">
          <pre className="text-xs text-purple-300 font-mono leading-relaxed whitespace-pre-wrap">{RLS_STATUS_SQL}</pre>
        </div>
      </div>

      {/* ─── SQL Bucket ─── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100 flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>SQL Storage — Bucket &quot;photos&quot; + Policies RLS</strong>
            <p className="text-xs mt-1 text-blue-700">À exécuter <strong>une seule fois</strong> dans <strong>Supabase → SQL Editor</strong> si les photos ne s&apos;affichent pas.</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <p className="text-xs text-gray-500">Crée le bucket public + 4 policies (SELECT, INSERT, UPDATE, DELETE)</p>
          <button onClick={handleCopyBucket}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow ${
              copiedBucket ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
            {copiedBucket
              ? <><Check className="w-4 h-4" /> Copié ! Collez dans Supabase</>
              : <><Copy className="w-4 h-4" /> Copier SQL Storage</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-64">
          <pre className="text-xs text-cyan-400 font-mono leading-relaxed whitespace-pre-wrap">{BUCKET_SQL}</pre>
        </div>
      </div>

      {/* ─── MODÉRATION CENTRALISÉE ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-purple-900 to-indigo-900">
          <Shield className="w-5 h-5 text-purple-300" />
          <div>
            <h3 className="font-bold text-white">SQL Modération centralisée</h3>
            <p className="text-xs text-purple-300 mt-0.5">
              File de modération, historique d&apos;audit, niveaux de confiance, RLS complet.
              À exécuter UNE FOIS dans Supabase → SQL Editor.
            </p>
          </div>
        </div>
        <div className="p-4 flex items-center justify-between border-b border-purple-100">
          <p className="text-sm text-gray-600">
            Crée <code className="text-xs bg-gray-100 px-1 rounded">moderation_queue</code>,{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">moderation_history</code>,
            colonnes <code className="text-xs bg-gray-100 px-1 rounded">trust_level</code> et vue KPI.
          </p>
          <button
            onClick={() => {
              import('@/lib/moderation').then(({ MODERATION_SQL }) => {
                navigator.clipboard.writeText(MODERATION_SQL).then(() => {
                  setCopiedModeration(true);
                  setTimeout(() => setCopiedModeration(false), 3000);
                });
              });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              copiedModeration ? 'bg-emerald-500 text-white' : 'bg-purple-700 text-white hover:bg-purple-800'
            }`}
          >
            {copiedModeration
              ? <><Check className="w-4 h-4" /> Copié !</>
              : <><Copy className="w-4 h-4" /> Copier SQL Modération</>}
          </button>
        </div>
        <div className="p-4 bg-gray-950 overflow-auto max-h-96">
          <ModerationSQLPreview />
        </div>
      </div>

    </div>
  );
}
