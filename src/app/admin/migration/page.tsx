'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, Copy, Check, Database, Loader2, RefreshCw, AlertTriangle, Upload, HardDrive, Eye, ImageIcon } from 'lucide-react';

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

-- Recharge le cache PostgREST (OBLIGATOIRE après création de tables)
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
];

type TableStatus = { name: string; exists: boolean };
type StorageDiag = {
  bucketExists: boolean | null;
  bucketPublic: boolean | null;
  canUpload: boolean | null;
  canRead: boolean | null;
  testFileUrl: string | null;
  error: string | null;
};

export default function MigrationPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking]       = useState(true);
  const [tables,   setTables]         = useState<TableStatus[]>([]);
  const [copied,   setCopied]         = useState(false);
  const [copiedNotify, setCopiedNotify] = useState(false);
  const [copiedBucket, setCopiedBucket] = useState(false);

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

    </div>
  );
}
