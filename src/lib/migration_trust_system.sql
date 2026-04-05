-- ============================================================
-- BIGUGLIA CONNECT — Système de confiance & réputation unifié
-- Version 2.0 — Remplace item_ratings pour les notations personne
--
-- Coller dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- ─── 0. Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. trust_interactions ────────────────────────────────────────────────────
-- Représente chaque interaction réelle entre deux membres.
-- Un avis ne peut être laissé que sur une interaction completed.
CREATE TABLE IF NOT EXISTS trust_interactions (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  -- Thème source
  source_type      TEXT NOT NULL CHECK (source_type IN (
    'listing','equipment','help_request','lost_found',
    'association','outing','collection_item','event',
    'promenade','service_request'
  )),
  source_id        UUID NOT NULL,
  -- Participants
  requester_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Cycle de vie
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'transaction','material_request','help_match',
    'participation','contact','service_request'
  )),
  status           TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested','pending','accepted','rejected',
    'in_progress','done','cancelled','disputed'
  )),
  -- Avis débloqué ?
  review_unlocked          BOOLEAN NOT NULL DEFAULT false,
  review_requester_done    BOOLEAN NOT NULL DEFAULT false,
  review_receiver_done     BOOLEAN NOT NULL DEFAULT false,
  -- Conversation liée
  conversation_id  UUID REFERENCES conversations(id) ON DELETE SET NULL,
  -- Historique statuts (JSONB)
  status_history   JSONB NOT NULL DEFAULT '[]',
  -- Timestamps
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at      TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule interaction active par (source, requester)
  CONSTRAINT uq_trust_interaction UNIQUE (source_type, source_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_ti_requester  ON trust_interactions(requester_id);
CREATE INDEX IF NOT EXISTS idx_ti_receiver   ON trust_interactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_ti_source     ON trust_interactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ti_status     ON trust_interactions(status);
CREATE INDEX IF NOT EXISTS idx_ti_review     ON trust_interactions(review_unlocked) WHERE review_unlocked = true;

-- ─── 2. reviews ───────────────────────────────────────────────────────────────
-- La table reviews peut déjà exister (ancienne version sans author_id).
-- Stratégie robuste et idempotente :
--   a) CREATE TABLE IF NOT EXISTS avec seulement id + created_at
--   b) ALTER TABLE ADD COLUMN IF NOT EXISTS pour CHAQUE colonne (y compris author_id)
--   c) Contraintes CHECK via DO blocks APRÈS que toutes les colonnes existent

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajout de TOUTES les colonnes (idempotent) — author_id et target_user_id en premier
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS author_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rating             INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS interaction_id     UUID REFERENCES trust_interactions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_type        TEXT,
  ADD COLUMN IF NOT EXISTS source_id          UUID,
  ADD COLUMN IF NOT EXISTS dim_communication  INT,
  ADD COLUMN IF NOT EXISTS dim_reliability    INT,
  ADD COLUMN IF NOT EXISTS dim_punctuality    INT,
  ADD COLUMN IF NOT EXISTS dim_quality        INT,
  ADD COLUMN IF NOT EXISTS comment            TEXT,
  ADD COLUMN IF NOT EXISTS would_recommend    BOOLEAN,
  ADD COLUMN IF NOT EXISTS moderation_status  TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderation_note    TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT now();

-- Garantir que rating a une valeur par défaut et n'est pas NULL (si la colonne existait déjà sans DEFAULT)
DO $$ BEGIN
  ALTER TABLE reviews ALTER COLUMN rating SET DEFAULT 5;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
UPDATE reviews SET rating = 5 WHERE rating IS NULL;

-- Garantir que moderation_status a une valeur par défaut
DO $$ BEGIN
  ALTER TABLE reviews ALTER COLUMN moderation_status SET DEFAULT 'visible';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
UPDATE reviews SET moderation_status = 'visible' WHERE moderation_status IS NULL;

-- Contraintes CHECK via DO blocks (ignorées si déjà présentes)
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_dim_comm_check CHECK (dim_communication BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_dim_rel_check CHECK (dim_reliability BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_dim_punc_check CHECK (dim_punctuality BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_dim_qual_check CHECK (dim_quality BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_modstatus_check
    CHECK (moderation_status IN ('visible','reported','hidden','deleted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ces deux contraintes nécessitent que author_id ET target_user_id existent (garantis par les ALTER ci-dessus)
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT no_self_review CHECK (author_id <> target_user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT uq_review_per_interaction UNIQUE (interaction_id, author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_target   ON reviews(target_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_author   ON reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_source   ON reviews(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_reviews_modstatus ON reviews(moderation_status);

-- ─── 3. review_tags ──────────────────────────────────────────────────────────
-- Tags qualitatifs optionnels (ex: "Ponctuel", "Communication facile", etc.)
CREATE TABLE IF NOT EXISTS review_tags (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id  UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  tag        TEXT NOT NULL CHECK (char_length(tag) <= 50),
  UNIQUE(review_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_rtags_review ON review_tags(review_id);

-- ─── 4. trust_profile_stats ───────────────────────────────────────────────────
-- Stats agrégées par profil — mis à jour via trigger.
CREATE TABLE IF NOT EXISTS trust_profile_stats (
  profile_id           UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  -- Interactions
  interactions_total   INT NOT NULL DEFAULT 0,
  interactions_done    INT NOT NULL DEFAULT 0,
  interactions_cancelled INT NOT NULL DEFAULT 0,
  interactions_disputed  INT NOT NULL DEFAULT 0,
  -- Avis reçus
  reviews_received     INT NOT NULL DEFAULT 0,
  avg_rating           NUMERIC(3,2) NOT NULL DEFAULT 0,
  avg_communication    NUMERIC(3,2),
  avg_reliability      NUMERIC(3,2),
  avg_punctuality      NUMERIC(3,2),
  avg_quality          NUMERIC(3,2),
  recommend_pct        INT,   -- % de "je recommande"
  -- Distribution 1-5
  dist_1               INT NOT NULL DEFAULT 0,
  dist_2               INT NOT NULL DEFAULT 0,
  dist_3               INT NOT NULL DEFAULT 0,
  dist_4               INT NOT NULL DEFAULT 0,
  dist_5               INT NOT NULL DEFAULT 0,
  -- Score de confiance calculé (0-100)
  trust_score          INT NOT NULL DEFAULT 0,
  -- Timestamps
  last_computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. profile_badges ────────────────────────────────────────────────────────
-- Badges obtenus par un membre (assignés automatiquement ou par admin).
CREATE TABLE IF NOT EXISTS profile_badges (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_code   TEXT NOT NULL CHECK (badge_code IN (
    'new_member','profile_complete','email_verified','phone_verified',
    'active_member','fast_responder','reliable_organizer','reliable_vendor',
    'reliable_helper','reliable_borrower','trusted_member','top_rated',
    'veteran','admin_validated'
  )),
  awarded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  awarded_by   TEXT NOT NULL DEFAULT 'system' CHECK (awarded_by IN ('system','admin')),
  UNIQUE(profile_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_pbadges_profile ON profile_badges(profile_id);

-- ─── 6. Triggers updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_trust_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ti_updated_at ON trust_interactions;
CREATE TRIGGER trg_ti_updated_at BEFORE UPDATE ON trust_interactions
  FOR EACH ROW EXECUTE FUNCTION update_trust_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_trust_updated_at();

DROP TRIGGER IF EXISTS trg_tps_updated_at ON trust_profile_stats;
CREATE TRIGGER trg_tps_updated_at BEFORE UPDATE ON trust_profile_stats
  FOR EACH ROW EXECUTE FUNCTION update_trust_updated_at();

-- ─── 7. Trigger: unlock review when interaction → done ────────────────────────
CREATE OR REPLACE FUNCTION unlock_review_on_done()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.review_unlocked := true;
    NEW.completed_at    := COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_unlock_review ON trust_interactions;
CREATE TRIGGER trg_unlock_review BEFORE UPDATE ON trust_interactions
  FOR EACH ROW EXECUTE FUNCTION unlock_review_on_done();

-- ─── 8. Trigger: recalculate trust_profile_stats on review insert/update/delete ─
CREATE OR REPLACE FUNCTION recalc_trust_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Determine which profile to recalculate
  IF TG_OP = 'DELETE' THEN
    v_profile_id := OLD.target_user_id;
  ELSE
    v_profile_id := NEW.target_user_id;
  END IF;

  INSERT INTO trust_profile_stats (
    profile_id,
    reviews_received, avg_rating,
    avg_communication, avg_reliability, avg_punctuality, avg_quality,
    recommend_pct,
    dist_1, dist_2, dist_3, dist_4, dist_5,
    trust_score, last_computed_at
  )
  SELECT
    v_profile_id,
    COUNT(*)                                                        AS reviews_received,
    ROUND(AVG(rating)::NUMERIC, 2)                                  AS avg_rating,
    ROUND(AVG(dim_communication)::NUMERIC, 2)                       AS avg_communication,
    ROUND(AVG(dim_reliability)::NUMERIC, 2)                         AS avg_reliability,
    ROUND(AVG(dim_punctuality)::NUMERIC, 2)                         AS avg_punctuality,
    ROUND(AVG(dim_quality)::NUMERIC, 2)                             AS avg_quality,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(100.0 * SUM(CASE WHEN would_recommend THEN 1 ELSE 0 END) / COUNT(*))::INT
      ELSE NULL END                                                  AS recommend_pct,
    SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END)                       AS dist_1,
    SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END)                       AS dist_2,
    SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END)                       AS dist_3,
    SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END)                       AS dist_4,
    SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END)                       AS dist_5,
    -- Trust score: base 20 + reviews bonus + rating bonus
    LEAST(100, 20
      + LEAST(30, COUNT(*) * 3)
      + CASE WHEN AVG(rating) >= 4.5 THEN 30
             WHEN AVG(rating) >= 4.0 THEN 20
             WHEN AVG(rating) >= 3.0 THEN 10
             ELSE 0 END
    )::INT                                                           AS trust_score,
    now()
  FROM reviews
  WHERE target_user_id = v_profile_id
    AND moderation_status = 'visible'
  ON CONFLICT (profile_id) DO UPDATE SET
    reviews_received   = EXCLUDED.reviews_received,
    avg_rating         = EXCLUDED.avg_rating,
    avg_communication  = EXCLUDED.avg_communication,
    avg_reliability    = EXCLUDED.avg_reliability,
    avg_punctuality    = EXCLUDED.avg_punctuality,
    avg_quality        = EXCLUDED.avg_quality,
    recommend_pct      = EXCLUDED.recommend_pct,
    dist_1             = EXCLUDED.dist_1,
    dist_2             = EXCLUDED.dist_2,
    dist_3             = EXCLUDED.dist_3,
    dist_4             = EXCLUDED.dist_4,
    dist_5             = EXCLUDED.dist_5,
    trust_score        = EXCLUDED.trust_score,
    last_computed_at   = EXCLUDED.last_computed_at,
    updated_at         = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_trust ON reviews;
CREATE TRIGGER trg_recalc_trust
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalc_trust_stats();

-- ─── 9. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE trust_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_profile_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_badges     ENABLE ROW LEVEL SECURITY;

-- trust_interactions
DROP POLICY IF EXISTS "TI lecture participants"       ON trust_interactions;
DROP POLICY IF EXISTS "TI créer si connecté"          ON trust_interactions;
DROP POLICY IF EXISTS "TI modifier si participant"    ON trust_interactions;
DROP POLICY IF EXISTS "TI admin tout"                 ON trust_interactions;

CREATE POLICY "TI lecture participants" ON trust_interactions
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );
CREATE POLICY "TI créer si connecté" ON trust_interactions
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "TI modifier si participant" ON trust_interactions
  FOR UPDATE USING (
    auth.uid() = requester_id OR auth.uid() = receiver_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "TI admin tout" ON trust_interactions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- reviews
DROP POLICY IF EXISTS "Avis publics visibles"      ON reviews;
DROP POLICY IF EXISTS "Avis reçus par la cible"    ON reviews;
DROP POLICY IF EXISTS "Créer avis si interaction"  ON reviews;
DROP POLICY IF EXISTS "Modérer avis admin"         ON reviews;

CREATE POLICY "Avis publics visibles" ON reviews
  FOR SELECT USING (moderation_status = 'visible');
CREATE POLICY "Avis reçus par la cible" ON reviews
  FOR SELECT USING (auth.uid() = target_user_id OR auth.uid() = author_id);
CREATE POLICY "Créer avis si interaction" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND author_id <> target_user_id
    AND EXISTS (
      SELECT 1 FROM trust_interactions
      WHERE id = interaction_id
        AND review_unlocked = true
        AND (requester_id = auth.uid() OR receiver_id = auth.uid())
    )
  );
CREATE POLICY "Modérer avis admin" ON reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );

-- review_tags
DROP POLICY IF EXISTS "Tags publics" ON review_tags;
DROP POLICY IF EXISTS "Tags créer auteur" ON review_tags;
CREATE POLICY "Tags publics" ON review_tags FOR SELECT USING (true);
CREATE POLICY "Tags créer auteur" ON review_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM reviews WHERE id = review_id AND author_id = auth.uid())
);

-- trust_profile_stats (public read, system/admin write)
DROP POLICY IF EXISTS "Stats publiques" ON trust_profile_stats;
CREATE POLICY "Stats publiques" ON trust_profile_stats FOR SELECT USING (true);

-- profile_badges (public read)
DROP POLICY IF EXISTS "Badges publics" ON profile_badges;
DROP POLICY IF EXISTS "Badges admin" ON profile_badges;
CREATE POLICY "Badges publics" ON profile_badges FOR SELECT USING (true);
CREATE POLICY "Badges admin" ON profile_badges FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ─── 10. Compatibilité: garder item_ratings pour les notations de CONTENU ──────
-- Les avis PERSONNE (reviews) sont la nouvelle source de vérité.
-- item_ratings reste pour les notes d'étoiles sur le contenu (annonce, événement, etc.)
-- Aucune migration destructive ici.

-- ─── 11. Reload cache PostgREST ───────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ✅ Migration terminée — 5 tables, 8 triggers, RLS complet
