-- ============================================================================
-- MIGRATION COMPLÈTE : Fix Admin + Listings + Profiles RLS
-- Date : 2026-04-14
-- Idempotent : peut être relancé plusieurs fois sans erreur
-- ============================================================================
-- Ce script consolide TOUS les correctifs nécessaires en un seul bloc.
-- Collez-le dans Supabase → SQL Editor et cliquez "Run".
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 1 : TABLE profiles — RLS + rôle admin
-- ════════════════════════════════════════════════════════════════════════════

-- 1a. Activer RLS sur profiles (sans cela, toutes les policies sont ignorées)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1b. Supprimer toutes les anciennes policies SELECT pouvant être en conflit
DROP POLICY IF EXISTS "Profils publics en lecture"          ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"            ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"      ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"     ON profiles;
DROP POLICY IF EXISTS "Users can view own profile"          ON profiles;
DROP POLICY IF EXISTS "Profiles select policy"             ON profiles;
DROP POLICY IF EXISTS "Profils lisibles par tous"           ON profiles;

-- 1c. Policy SELECT permissive : tout le monde peut lire tous les profils
--     Nécessaire pour :
--       - AuthProvider.fetchProfile() avec la clé anon
--       - ProtectedPage qui recharge le profil pour vérifier le rôle
--       - Pages de profil public
CREATE POLICY "Profils lisibles par tous" ON profiles
  FOR SELECT USING (true);

-- 1d. Policy INSERT : chaque utilisateur peut créer son propre profil
DROP POLICY IF EXISTS "Users can insert own profile"              ON profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"   ON profiles;
CREATE POLICY "Utilisateurs créent leur propre profil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 1e. Policy UPDATE user : chaque utilisateur peut modifier son propre profil
DROP POLICY IF EXISTS "Users can update own profile"              ON profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 1f. Policy UPDATE admin : les admins/modérateurs peuvent modifier tous les profils
--     (nécessaire pour changer les rôles via l'interface admin)
DROP POLICY IF EXISTS "Admin modifie tous les profils" ON profiles;
CREATE POLICY "Admin modifie tous les profils" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role IN ('admin', 'moderator')
    )
  );

-- 1g. S'assurer que la colonne role existe avec la bonne valeur par défaut
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 1h. Donner le rôle admin à l'administrateur principal
UPDATE profiles
  SET role = 'admin'
  WHERE email = 'chris20600@outlook.fr';


-- ════════════════════════════════════════════════════════════════════════════
-- PARTIE 2 : TABLE listings — colonnes manquantes
-- ════════════════════════════════════════════════════════════════════════════

-- 2a. Contraintes sur listing_type et status (drop + recreate pour éviter conflits)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('sale', 'wanted', 'free', 'exchange', 'service', 'rental'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'active', 'reserved', 'sold', 'given', 'exchanged', 'closed', 'expired', 'archived', 'hidden'));

-- 2b. Ajout des colonnes manquantes (idempotent via IF NOT EXISTS)
DO $$ BEGIN

  -- Prix négociable
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_negotiable') THEN
    ALTER TABLE listings ADD COLUMN is_negotiable BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Annonce urgente
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='is_urgent') THEN
    ALTER TABLE listings ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Statut de modération
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='moderation_status') THEN
    ALTER TABLE listings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'en_attente_validation';
  END IF;

  -- Secteur géographique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='sector_id') THEN
    ALTER TABLE listings ADD COLUMN sector_id TEXT;
  END IF;

  -- État de l'objet (texte libre)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='condition_state') THEN
    ALTER TABLE listings ADD COLUMN condition_state TEXT;
  END IF;

  -- Préférences d'échange
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='exchange_preferences') THEN
    ALTER TABLE listings ADD COLUMN exchange_preferences TEXT;
  END IF;

  -- Notes de remise / retrait
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='pickup_notes') THEN
    ALTER TABLE listings ADD COLUMN pickup_notes TEXT;
  END IF;

  -- Créneaux de disponibilité
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='availability_window') THEN
    ALTER TABLE listings ADD COLUMN availability_window TEXT;
  END IF;

  -- Compteur de vues
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='views_count') THEN
    ALTER TABLE listings ADD COLUMN views_count INT NOT NULL DEFAULT 0;
  END IF;

  -- Author id (alias de user_id, pour compatibilité avec les requêtes admin)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='author_id') THEN
    ALTER TABLE listings ADD COLUMN author_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    UPDATE listings SET author_id = user_id WHERE user_id IS NOT NULL AND author_id IS NULL;
  END IF;

  -- Expiration automatique
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='expires_at') THEN
    ALTER TABLE listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;

  -- Mise en avant
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='boost_until') THEN
    ALTER TABLE listings ADD COLUMN boost_until TIMESTAMPTZ;
  END IF;

  -- Retrait rapide possible
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='quick_pickup') THEN
    ALTER TABLE listings ADD COLUMN quick_pickup BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Réservé par quel utilisateur
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='listings' AND column_name='reserved_by_user_id') THEN
    ALTER TABLE listings ADD COLUMN reserved_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

END $$;

-- 2c. Index pour les performances
CREATE INDEX IF NOT EXISTS listings_sector_idx   ON listings(sector_id);
CREATE INDEX IF NOT EXISTS listings_status_idx   ON listings(status);
CREATE INDEX IF NOT EXISTS listings_type_idx     ON listings(listing_type);
CREATE INDEX IF NOT EXISTS listings_price_idx    ON listings(price);
CREATE INDEX IF NOT EXISTS listings_urgent_idx   ON listings(is_urgent)    WHERE is_urgent = true;
CREATE INDEX IF NOT EXISTS listings_expires_idx  ON listings(expires_at);
CREATE INDEX IF NOT EXISTS listings_boost_idx    ON listings(boost_until)  WHERE boost_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS listings_author_idx   ON listings(author_id);

-- 2d. Trigger updated_at
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

-- 3a. Rafraîchir le cache PostgREST (obligatoire après modifications de schéma)
NOTIFY pgrst, 'reload schema';

-- 3b. Vérification : afficher les informations de l'admin
--     (confirme que le script s'est exécuté correctement)
SELECT
  id,
  email,
  role,
  full_name,
  CASE WHEN role = 'admin' THEN '✅ Admin OK' ELSE '❌ Rôle incorrect : ' || role END AS statut_admin
FROM profiles
WHERE email = 'chris20600@outlook.fr';

-- ============================================================================
-- FIN DE MIGRATION
-- Résultat attendu : une ligne avec statut_admin = "✅ Admin OK"
-- ============================================================================
