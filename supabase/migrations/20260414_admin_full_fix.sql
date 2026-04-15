-- ============================================================================
-- MIGRATION COMPLÈTE v2 : Fix Admin + Listings + Profiles RLS
-- Date : 2026-04-15
-- Idempotent : peut être relancé plusieurs fois sans erreur
-- Correction : listing_type est un ENUM → ALTER TYPE au lieu de CHECK
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 0 : ENUM listing_type — ajouter les valeurs manquantes
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'exchange') THEN
    ALTER TYPE listing_type ADD VALUE 'exchange';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'service') THEN
    ALTER TYPE listing_type ADD VALUE 'service';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'rental') THEN
    ALTER TYPE listing_type ADD VALUE 'rental';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'wanted') THEN
    ALTER TYPE listing_type ADD VALUE 'wanted';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'listing_type' AND e.enumlabel = 'free') THEN
    ALTER TYPE listing_type ADD VALUE 'free';
  END IF;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 1 : TABLE profiles — RLS + rôle admin
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profils publics en lecture"          ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"            ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"      ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"     ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"          ON profiles;
DROP POLICY IF EXISTS "Profiles select policy"              ON profiles;
DROP POLICY IF EXISTS "Profils lisibles par tous"           ON profiles;

CREATE POLICY "Profils lisibles par tous" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"    ON profiles;
CREATE POLICY "Utilisateurs créent leur propre profil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile"               ON profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil"  ON profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin modifie tous les profils" ON profiles;
CREATE POLICY "Admin modifie tous les profils" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role IN ('admin', 'moderator')
    )
  );

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

UPDATE profiles
  SET role = 'admin'
  WHERE email = 'chris20600@outlook.fr';


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 2 : TABLE listings — colonnes manquantes
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_negotiable') THEN
    ALTER TABLE listings ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_urgent') THEN
    ALTER TABLE listings ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='moderation_status') THEN
    ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'en_attente_validation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='sector_id') THEN
    ALTER TABLE listings ADD COLUMN sector_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='condition_state') THEN
    ALTER TABLE listings ADD COLUMN condition_state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='exchange_preferences') THEN
    ALTER TABLE listings ADD COLUMN exchange_preferences TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='pickup_notes') THEN
    ALTER TABLE listings ADD COLUMN pickup_notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='availability_window') THEN
    ALTER TABLE listings ADD COLUMN availability_window TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='views_count') THEN
    ALTER TABLE listings ADD COLUMN views_count INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='author_id') THEN
    ALTER TABLE listings ADD COLUMN author_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    UPDATE listings SET author_id = user_id WHERE user_id IS NOT NULL AND author_id IS NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='expires_at') THEN
    ALTER TABLE listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='boost_until') THEN
    ALTER TABLE listings ADD COLUMN boost_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='quick_pickup') THEN
    ALTER TABLE listings ADD COLUMN quick_pickup BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='reserved_by_user_id') THEN
    ALTER TABLE listings ADD COLUMN reserved_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

END $$;

CREATE INDEX IF NOT EXISTS listings_sector_idx   ON listings(sector_id);
CREATE INDEX IF NOT EXISTS listings_status_idx   ON listings(status);
CREATE INDEX IF NOT EXISTS listings_type_idx     ON listings(listing_type);
CREATE INDEX IF NOT EXISTS listings_price_idx    ON listings(price);
CREATE INDEX IF NOT EXISTS listings_urgent_idx   ON listings(is_urgent)    WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS listings_expires_idx  ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_boost_idx    ON listings(boost_until)  WHERE boost_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS listings_author_idx   ON listings(author_id);

CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 3 : Vérification finale
-- ════════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

SELECT
  id,
  email,
  role,
  full_name,
  CASE WHEN role = 'admin' THEN '✅ Admin OK' ELSE '❌ Rôle incorrect : ' || role END AS statut_admin
FROM profiles
WHERE email = 'chris20600@outlook.fr';

-- ============================================================================
-- FIN — Résultat attendu : statut_admin = "✅ Admin OK"
-- ============================================================================
