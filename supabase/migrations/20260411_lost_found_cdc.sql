-- ===========================================================================
-- MIGRATION : Perdu / Trouve -- CDC Biguglia Connect
-- Tables : lost_found_items, lf_photos, lf_comments, lf_matches
-- 2026-04-11 -- A executer dans Supabase -> SQL Editor
-- ===========================================================================

-- 1. Table principale lost_found_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_found_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type (perdu / trouve)
  type                TEXT NOT NULL DEFAULT 'perdu'
                      CHECK (type IN ('perdu', 'trouve')),

  -- Statut metier (valeurs francaises)
  status              TEXT NOT NULL DEFAULT 'perdu'
                      CHECK (status IN (
                        'draft', 'perdu', 'trouve', 'identifie',
                        'restitue', 'clos', 'archive'
                      )),

  -- Contenu
  title               TEXT NOT NULL,
  category            TEXT NOT NULL DEFAULT 'autre',
  description         TEXT NOT NULL,

  -- Caracteristiques de l'objet
  brand               TEXT,
  color               TEXT,
  distinctive_sign    TEXT,
  keep_secret         BOOLEAN NOT NULL DEFAULT false,
  is_sensitive        BOOLEAN NOT NULL DEFAULT false,

  -- Date et lieu
  lost_date           DATE NOT NULL,
  lost_time           TEXT,
  sector_id           TEXT,   -- FK logique vers lib/sectors.ts (TEXT)
  location_area       TEXT NOT NULL DEFAULT 'Centre-ville',
  location_detail     TEXT,

  -- Contact
  contact_name        TEXT NOT NULL DEFAULT 'Anonyme',
  contact_phone       TEXT,
  contact_email       TEXT,
  contact_mode        TEXT NOT NULL DEFAULT 'messagerie'
                      CHECK (contact_mode IN ('messagerie', 'telephone', 'email', 'tous')),
  show_phone          BOOLEAN NOT NULL DEFAULT false,

  -- Options supplementaires
  reward              TEXT,
  sentimental_value   BOOLEAN NOT NULL DEFAULT false,
  declared_authorities BOOLEAN NOT NULL DEFAULT false,
  deposited_at        TEXT,          -- lieu de depot (Mairie, Commerce, etc.)
  proof_required      BOOLEAN NOT NULL DEFAULT false,
  need_community_help BOOLEAN NOT NULL DEFAULT true,

  -- Correspondance
  matched_item_id     UUID REFERENCES lost_found_items(id) ON DELETE SET NULL,

  -- Moderation
  moderation_status   TEXT DEFAULT 'ok',

  -- Timestamps et expiration
  expires_at          TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index lost_found_items
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS lfi_author_idx    ON lost_found_items(author_id);
CREATE INDEX IF NOT EXISTS lfi_status_idx    ON lost_found_items(status);
CREATE INDEX IF NOT EXISTS lfi_type_idx      ON lost_found_items(type);
CREATE INDEX IF NOT EXISTS lfi_category_idx  ON lost_found_items(category);
CREATE INDEX IF NOT EXISTS lfi_sector_idx    ON lost_found_items(sector_id);
CREATE INDEX IF NOT EXISTS lfi_date_idx      ON lost_found_items(created_at DESC);
CREATE INDEX IF NOT EXISTS lfi_lost_date_idx ON lost_found_items(lost_date DESC);

-- 3. RLS lost_found_items
-- ---------------------------------------------------------------------------
ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lfi_select" ON lost_found_items;
CREATE POLICY "lfi_select" ON lost_found_items
  FOR SELECT USING (
    status != 'draft'
    OR auth.uid() = author_id
  );

DROP POLICY IF EXISTS "lfi_insert" ON lost_found_items;
CREATE POLICY "lfi_insert" ON lost_found_items
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "lfi_update" ON lost_found_items;
CREATE POLICY "lfi_update" ON lost_found_items
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "lfi_delete" ON lost_found_items;
CREATE POLICY "lfi_delete" ON lost_found_items
  FOR DELETE USING (auth.uid() = author_id);

-- 4. Table lf_photos (photos attachees aux annonces)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lf_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  display_order   INT NOT NULL DEFAULT 0,
  is_cover        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lf_photos_item_idx ON lf_photos(item_id, display_order);

ALTER TABLE lf_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_photos_select" ON lf_photos;
CREATE POLICY "lf_photos_select" ON lf_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lf_photos_insert" ON lf_photos;
CREATE POLICY "lf_photos_insert" ON lf_photos
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT author_id FROM lost_found_items WHERE id = item_id
    )
  );

DROP POLICY IF EXISTS "lf_photos_delete" ON lf_photos;
CREATE POLICY "lf_photos_delete" ON lf_photos
  FOR DELETE USING (
    auth.uid() IN (
      SELECT author_id FROM lost_found_items WHERE id = item_id
    )
  );

-- 5. Table lf_comments (discussion sur une annonce)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lf_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id     UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lf_comments_item_idx ON lf_comments(item_id, created_at);

ALTER TABLE lf_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_comments_select" ON lf_comments;
CREATE POLICY "lf_comments_select" ON lf_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "lf_comments_insert" ON lf_comments;
CREATE POLICY "lf_comments_insert" ON lf_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "lf_comments_delete" ON lf_comments;
CREATE POLICY "lf_comments_delete" ON lf_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 6. Table lf_matches (correspondances suggeres entre annonces)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lf_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lost_item_id    UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  found_item_id   UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
  match_score     INT NOT NULL DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  match_status    TEXT NOT NULL DEFAULT 'suggested'
                  CHECK (match_status IN ('suggested', 'confirmed', 'rejected')),
  suggested_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lost_item_id, found_item_id)
);

CREATE INDEX IF NOT EXISTS lf_matches_lost_idx  ON lf_matches(lost_item_id);
CREATE INDEX IF NOT EXISTS lf_matches_found_idx ON lf_matches(found_item_id);

ALTER TABLE lf_matches ENABLE ROW LEVEL SECURITY;

-- ⚠️  NEUTRALISÉ — USING(true) exposait match_score, match_status, suggested_by publiquement
--     Remplacée dans : 20260416_lf_matches_rls.sql
DROP POLICY IF EXISTS "lf_matches_select" ON lf_matches;

DROP POLICY IF EXISTS "lf_matches_insert" ON lf_matches;
CREATE POLICY "lf_matches_insert" ON lf_matches
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Trigger auto-update updated_at sur lost_found_items
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_lfi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lfi_updated_at ON lost_found_items;
CREATE TRIGGER trg_lfi_updated_at
  BEFORE UPDATE ON lost_found_items
  FOR EACH ROW
  EXECUTE FUNCTION update_lfi_updated_at();

-- 8. Commentaire de table
-- ---------------------------------------------------------------------------
COMMENT ON TABLE lost_found_items IS 'Module Perdu/Trouve -- CDC Biguglia Connect 2026';

-- Migration Perdu / Trouve terminee !
