/**
 * admin/migration/_sql/forum.ts
 */
export const FORUM_V2_SQL = `-- ════════════════════════════════════════════════════════════════════════════
-- FORUM LOCAL v2 — Biguglia Connect
-- Tables : forum_sectors, forum_topics, forum_replies, forum_tags,
--          forum_topic_tags, forum_reactions, forum_follows,
--          forum_reports, forum_moderation_logs
-- ════════════════════════════════════════════════════════════════════════════

-- ── Secteurs géographiques ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_sectors (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT NOT NULL DEFAULT '',
  icon          TEXT NOT NULL DEFAULT '📍',
  color         TEXT NOT NULL DEFAULT 'gray',
  display_order INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE forum_sectors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_sectors' AND policyname='forum_sectors_select') THEN
    CREATE POLICY "forum_sectors_select" ON forum_sectors FOR SELECT USING (true);
    CREATE POLICY "forum_sectors_insert" ON forum_sectors FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- Insertion des 7 secteurs de Biguglia
INSERT INTO forum_sectors (name, slug, description, icon, color, display_order) VALUES
  ('Les Collines',       'les-collines', 'Quartier résidentiel sur les hauteurs', '⛰️', 'emerald', 1),
  ('Figabruna',          'figabruna',    'Secteur sud de Biguglia',               '🌊', 'blue',    2),
  ('Village de Biguglia','village',      'Cœur historique du village',            '🏘️', 'amber',   3),
  ('Casatorra',          'casatorra',    'Secteur Casatorra',                     '🌿', 'green',   4),
  ('Ortale',             'ortale',       'Quartier Ortale',                       '🏡', 'violet',  5),
  ('La Plaine',          'la-plaine',    'Zone de la plaine et étang',            '🌾', 'orange',  6),
  ('La Marana',          'la-marana',    'Zone de La Marana',                     '🏖️', 'cyan',    7)
ON CONFLICT (slug) DO NOTHING;

-- Ajout catégories thématiques forum v2
INSERT INTO forum_categories (name, slug, description, icon, display_order) VALUES
  ('Vie du quartier',     'vie-quartier',    'Actualités et vie locale',           '🏠', 1),
  ('Infos pratiques',     'infos-pratiques', 'Conseils, adresses, démarches',      'ℹ️', 2),
  ('Entraide',            'entraide',        'Coups de main, dépannage, partage',  '🤝', 3),
  ('Sécurité',            'securite',        'Alertes, incidents, sécurité',       '🚨', 4),
  ('Commerces & Services','commerces',       'Recommandations de commerces',       '🛒', 5),
  ('Enfants & Écoles',    'enfants-ecoles',  'École, activités enfants',           '🎒', 6),
  ('Nature & Animaux',    'nature-animaux',  'Faune, flore, balades',              '🌿', 7),
  ('Travaux & Chantiers', 'travaux',         'Travaux publics et chantiers',       '🔧', 8),
  ('Discussion libre',    'libre',           'Discussion ouverte entre voisins',   '💬', 9)
ON CONFLICT (slug) DO NOTHING;

-- ── Sujets (forum_topics) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_topics (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sector_id       UUID REFERENCES forum_sectors(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES forum_categories(id) ON DELETE SET NULL,
  author_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'ouvert'
                  CHECK (status IN ('ouvert','verrouille','masque','archive')),
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  is_hot          BOOLEAN NOT NULL DEFAULT false,
  views           INT NOT NULL DEFAULT 0,
  reply_count     INT NOT NULL DEFAULT 0,
  reaction_count  INT NOT NULL DEFAULT 0,
  last_reply_at   TIMESTAMPTZ,
  tags            TEXT[] DEFAULT '{}',
  visibility      TEXT NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public','membres','secteur')),
  search_vector   tsvector,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_topics_sector_idx    ON forum_topics(sector_id);
CREATE INDEX IF NOT EXISTS forum_topics_category_idx  ON forum_topics(category_id);
CREATE INDEX IF NOT EXISTS forum_topics_status_idx    ON forum_topics(status);
CREATE INDEX IF NOT EXISTS forum_topics_hot_idx       ON forum_topics(is_hot, reply_count DESC);
CREATE INDEX IF NOT EXISTS forum_topics_search_idx    ON forum_topics USING gin(search_vector);

ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_topics' AND policyname='forum_topics_select') THEN
    CREATE POLICY "forum_topics_select" ON forum_topics FOR SELECT USING (
      status != 'masque' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "forum_topics_insert" ON forum_topics FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "forum_topics_update" ON forum_topics FOR UPDATE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "forum_topics_delete" ON forum_topics FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- Trigger full-text search
CREATE OR REPLACE FUNCTION forum_topics_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('french', coalesce(NEW.title,'') || ' ' || coalesce(NEW.content,''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS forum_topics_search_trigger ON forum_topics;
CREATE TRIGGER forum_topics_search_trigger
  BEFORE INSERT OR UPDATE ON forum_topics
  FOR EACH ROW EXECUTE FUNCTION forum_topics_search_update();

-- Trigger auto mise à jour updated_at
CREATE OR REPLACE FUNCTION update_forum_topics_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS forum_topics_updated_at ON forum_topics;
CREATE TRIGGER forum_topics_updated_at
  BEFORE UPDATE ON forum_topics FOR EACH ROW EXECUTE FUNCTION update_forum_topics_updated_at();

-- ── Réponses (forum_replies) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_replies (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_id        UUID REFERENCES forum_topics(id) ON DELETE CASCADE NOT NULL,
  author_id       UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL,
  quote_reply_id  UUID REFERENCES forum_replies(id) ON DELETE SET NULL,
  is_solution     BOOLEAN NOT NULL DEFAULT false,
  reaction_count  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_replies_topic_idx ON forum_replies(topic_id, created_at);
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_replies' AND policyname='forum_replies_select') THEN
    CREATE POLICY "forum_replies_select" ON forum_replies FOR SELECT USING (true);
    CREATE POLICY "forum_replies_insert" ON forum_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
    CREATE POLICY "forum_replies_update" ON forum_replies FOR UPDATE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "forum_replies_delete" ON forum_replies FOR DELETE USING (
      auth.uid() = author_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- Trigger : incrémenter reply_count sur forum_topics
CREATE OR REPLACE FUNCTION forum_reply_count_update() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_topics SET reply_count = reply_count + 1, last_reply_at = now() WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_topics SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS forum_reply_count_trigger ON forum_replies;
CREATE TRIGGER forum_reply_count_trigger
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION forum_reply_count_update();

-- ── Tags ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_tags (
  id    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name  TEXT NOT NULL,
  slug  TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280'
);
ALTER TABLE forum_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_tags' AND policyname='forum_tags_select') THEN
    CREATE POLICY "forum_tags_select" ON forum_tags FOR SELECT USING (true);
    CREATE POLICY "forum_tags_insert" ON forum_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS forum_topic_tags (
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE NOT NULL,
  tag_id   UUID REFERENCES forum_tags(id)   ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (topic_id, tag_id)
);
ALTER TABLE forum_topic_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_topic_tags' AND policyname='forum_topic_tags_select') THEN
    CREATE POLICY "forum_topic_tags_select" ON forum_topic_tags FOR SELECT USING (true);
    CREATE POLICY "forum_topic_tags_insert" ON forum_topic_tags FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM forum_topics WHERE id = topic_id AND author_id = auth.uid())
    );
    CREATE POLICY "forum_topic_tags_delete" ON forum_topic_tags FOR DELETE USING (
      EXISTS (SELECT 1 FROM forum_topics WHERE id = topic_id AND author_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ── Réactions ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_reactions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_id   UUID REFERENCES forum_topics(id)  ON DELETE CASCADE,
  reply_id   UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, user_id, emoji),
  UNIQUE(reply_id, user_id, emoji),
  CHECK (topic_id IS NOT NULL OR reply_id IS NOT NULL)
);
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_reactions' AND policyname='forum_reactions_select') THEN
    CREATE POLICY "forum_reactions_select" ON forum_reactions FOR SELECT USING (true);
    CREATE POLICY "forum_reactions_insert" ON forum_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "forum_reactions_delete" ON forum_reactions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Suivis (notifications réponses) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_follows (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_id        UUID REFERENCES forum_topics(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notify_replies  BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(topic_id, user_id)
);
ALTER TABLE forum_follows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_follows' AND policyname='forum_follows_select') THEN
    CREATE POLICY "forum_follows_select" ON forum_follows FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "forum_follows_insert" ON forum_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "forum_follows_delete" ON forum_follows FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Signalements forum ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_reports (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id    UUID REFERENCES forum_topics(id)  ON DELETE CASCADE,
  reply_id    UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL DEFAULT 'autre'
              CHECK (reason IN ('hors_sujet','insulte','spam','desinformation','contenu_sensible','autre')),
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'en_attente'
              CHECK (status IN ('en_attente','examine','resolu','rejete')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (topic_id IS NOT NULL OR reply_id IS NOT NULL)
);
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_reports' AND policyname='forum_reports_select') THEN
    CREATE POLICY "forum_reports_select" ON forum_reports FOR SELECT USING (
      auth.uid() = reporter_id
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "forum_reports_insert" ON forum_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
    CREATE POLICY "forum_reports_update" ON forum_reports FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ── Journal de modération ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_moderation_logs (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  topic_id     UUID REFERENCES forum_topics(id)  ON DELETE CASCADE,
  reply_id     UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  action       TEXT NOT NULL
               CHECK (action IN ('masquer','verrouiller','deplacer','epingler','archiver','supprimer','fusionner','suspendre','deverrouiller')),
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE forum_moderation_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_moderation_logs' AND policyname='forum_moderation_logs_select') THEN
    CREATE POLICY "forum_moderation_logs_select" ON forum_moderation_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
    CREATE POLICY "forum_moderation_logs_insert" ON forum_moderation_logs FOR INSERT WITH CHECK (
      auth.uid() = moderator_id
    );
  END IF;
END $$;

-- ── Photos de sujets (forum_topic_photos) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_topic_photos (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_id      UUID REFERENCES forum_topics(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_topic_photos_topic_idx ON forum_topic_photos(topic_id, display_order);
ALTER TABLE forum_topic_photos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='forum_topic_photos' AND policyname='forum_topic_photos_select') THEN
    CREATE POLICY "forum_topic_photos_select" ON forum_topic_photos FOR SELECT USING (true);
    CREATE POLICY "forum_topic_photos_insert" ON forum_topic_photos FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM forum_topics WHERE id = topic_id AND author_id = auth.uid())
    );
    CREATE POLICY "forum_topic_photos_delete" ON forum_topic_photos FOR DELETE USING (
      EXISTS (SELECT 1 FROM forum_topics WHERE id = topic_id AND author_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
    );
  END IF;
END $$;

-- ✅ Forum v2 opérationnel : 10 tables (+ photos), RLS, triggers, full-text search
`;

