-- ============================================================
-- BIGUGLIA CONNECT - Schéma complet de base de données
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (complète auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'resident' CHECK (role IN ('resident', 'artisan_pending', 'artisan_verified', 'moderator', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'suspended')),
  legal_consent BOOLEAN NOT NULL DEFAULT false,
  legal_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger auto-création profil à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, status, legal_consent, legal_consent_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'resident'),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'resident') = 'artisan_pending' THEN 'pending' ELSE 'active' END,
    COALESCE((NEW.raw_user_meta_data->>'legal_consent')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data->>'legal_consent')::boolean, false) THEN now() ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. CATÉGORIES MÉTIERS ARTISANS
-- ============================================================
CREATE TABLE IF NOT EXISTS trade_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🔧',
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Données initiales (admin uniquement)
INSERT INTO trade_categories (name, slug, icon, description, display_order) VALUES
  ('Plomberie', 'plomberie', '🚿', 'Plombier, chauffagiste, sanitaire', 1),
  ('Électricité', 'electricite', '⚡', 'Électricien, installation, dépannage', 2),
  ('Maçonnerie', 'maconnerie', '🧱', 'Maçon, carrelage, terrassement', 3),
  ('Peinture', 'peinture', '🎨', 'Peintre intérieur et extérieur', 4),
  ('Menuiserie', 'menuiserie', '🪵', 'Menuisier, portes, fenêtres', 5),
  ('Climatisation', 'climatisation', '❄️', 'Clim, pompe à chaleur, ventilation', 6),
  ('Jardinage', 'jardinage', '🌿', 'Jardinier, espaces verts, taille', 7),
  ('Bricolage', 'bricolage', '🔨', 'Bricoleur, petits travaux, montage', 8),
  ('Nettoyage', 'nettoyage', '🧹', 'Nettoyeur professionnel, entretien', 9),
  ('Carrelage', 'carrelage', '⬜', 'Carreleur, faïence, mosaïque', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. PROFILS ARTISANS
-- ============================================================
CREATE TABLE IF NOT EXISTS artisan_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  trade_category_id UUID REFERENCES trade_categories(id),
  description TEXT NOT NULL DEFAULT '',
  service_area TEXT NOT NULL DEFAULT 'Biguglia et environs',
  years_experience INT,
  siret TEXT,
  insurance TEXT,
  verification_notes TEXT, -- visible admin seulement
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER artisan_profiles_updated_at BEFORE UPDATE ON artisan_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. PHOTOS ARTISANS
-- ============================================================
CREATE TABLE IF NOT EXISTS artisan_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. DEMANDES DE SERVICE
-- ============================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES trade_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'tres_urgent')),
  preferred_date DATE,
  preferred_time TEXT,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'viewed', 'replied', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER service_requests_updated_at BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 6. PHOTOS DEMANDES DE SERVICE
-- ============================================================
CREATE TABLE IF NOT EXISTS service_request_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. RENDEZ-VOUS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE CASCADE NOT NULL,
  proposed_date DATE NOT NULL,
  proposed_time TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'rescheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. CONVERSATIONS ET MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject TEXT,
  related_type TEXT CHECK (related_type IN ('service_request', 'listing', 'equipment', 'general')),
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger pour mettre à jour conversations.updated_at à chaque message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================
-- 9. CATÉGORIES ANNONCES
-- ============================================================
CREATE TABLE IF NOT EXISTS listing_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO listing_categories (name, slug, icon, display_order) VALUES
  ('Outils', 'outils', '🔧', 1),
  ('Matériaux', 'materiaux', '🧱', 2),
  ('Équipement maison', 'maison', '🏠', 3),
  ('Équipement jardin', 'jardin', '🌿', 4),
  ('Véhicules / Remorques', 'vehicules', '🚗', 5),
  ('Services', 'services', '👷', 6),
  ('Divers', 'divers', '📦', 7)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 10. ANNONCES
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES listing_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  listing_type TEXT NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale', 'wanted', 'free', 'service')),
  price DECIMAL(10,2),
  condition TEXT CHECK (condition IN ('neuf', 'tres_bon', 'bon', 'usage')),
  location TEXT NOT NULL DEFAULT 'Biguglia',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS listing_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. CATÉGORIES ÉQUIPEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🔧',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO equipment_categories (name, slug, icon, display_order) VALUES
  ('Outillage électrique', 'outillage-electrique', '🔌', 1),
  ('Outillage manuel', 'outillage-manuel', '🔨', 2),
  ('Échelles / Échafaudages', 'echelles', '🪜', 3),
  ('Véhicules / Remorques', 'vehicules', '🚗', 4),
  ('Nettoyage', 'nettoyage', '🧹', 5),
  ('Jardinage', 'jardinage-equip', '🌿', 6),
  ('Béton / Maçonnerie', 'beton', '🧱', 7),
  ('Divers', 'divers-equip', '📦', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 12. ÉQUIPEMENT À PRÊTER/EMPRUNTER
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES equipment_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'bon' CHECK (condition IN ('excellent', 'bon', 'usage')),
  deposit_amount DECIMAL(10,2),
  is_free BOOLEAN NOT NULL DEFAULT true,
  daily_rate DECIMAL(10,2),
  pickup_location TEXT NOT NULL DEFAULT 'Biguglia',
  rules TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER equipment_items_updated_at BEFORE UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS equipment_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES equipment_items(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. DEMANDES D'EMPRUNT
-- ============================================================
CREATE TABLE IF NOT EXISTS borrow_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id UUID REFERENCES equipment_items(id) ON DELETE CASCADE NOT NULL,
  borrower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'borrowed', 'returned', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER borrow_requests_updated_at BEFORE UPDATE ON borrow_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 14. FORUM
-- ============================================================
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '💬',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO forum_categories (name, slug, description, icon, display_order) VALUES
  ('Recommandations artisans', 'recommandations', 'Partagez vos expériences avec les artisans de Biguglia', '⭐', 1),
  ('Conseils travaux', 'conseils-travaux', 'Questions et conseils sur les travaux et la rénovation', '🔨', 2),
  ('Aide urgente', 'aide-urgente', 'Besoin d''aide rapidement ? Postez ici', '🆘', 3),
  ('Recherche matériel', 'recherche-materiel', 'Cherchez ou proposez du matériel et des outils', '🔧', 4),
  ('Bons plans Biguglia', 'bons-plans', 'Astuces, bons plans et infos locales', '💡', 5),
  ('Vente / Échange', 'vente-echange', 'Transactions et échanges entre voisins', '🤝', 6),
  ('Entraide de quartier', 'entraide', 'Solidarité et entraide entre habitants', '🏘️', 7),
  ('🌿 Promenades & Nature', 'promenades', 'Itinéraires, sorties, balades et nature à Biguglia', '🌿', 8),
  ('🏆 Collectionneurs', 'collectionneurs', 'Échanges, expertises et rencontres de collectionneurs', '🏆', 9),
  ('🎉 Événements locaux', 'evenements', 'Discussions autour des événements de Biguglia', '🎉', 10)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  views INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER forum_posts_updated_at BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS forum_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER forum_comments_updated_at BEFORE UPDATE ON forum_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 15. AVIS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(artisan_id, reviewer_id)
);

-- ============================================================
-- 16. SIGNALEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'post', 'listing', 'message', 'equipment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 17. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 18. FAVORIS ARTISANS
-- ============================================================
CREATE TABLE IF NOT EXISTS favorite_artisans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, artisan_id)
);

-- ============================================================
-- 19. ROW LEVEL SECURITY (RLS) - SÉCURITÉ ESSENTIELLE
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artisan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artisan_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_artisans ENABLE ROW LEVEL SECURITY;

-- Helper: rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: statut de l'utilisateur courant
CREATE OR REPLACE FUNCTION current_user_status()
RETURNS TEXT AS $$
  SELECT status FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---- PROFILES ----
CREATE POLICY "Profils publics en lecture" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Modifier son propre profil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin modifie tous les profils" ON profiles
  FOR ALL USING (current_user_role() = 'admin');

-- ---- ARTISAN PROFILES ----
-- Lecture: profils vérifiés visibles par tous, pending visible par l'admin et le propriétaire
CREATE POLICY "Artisans vérifiés visibles" ON artisan_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'artisan_verified')
    OR user_id = auth.uid()
    OR current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "Artisan crée son profil" ON artisan_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Artisan modifie son profil" ON artisan_profiles
  FOR UPDATE USING (auth.uid() = user_id OR current_user_role() = 'admin');

CREATE POLICY "Admin supprime profil artisan" ON artisan_profiles
  FOR DELETE USING (current_user_role() = 'admin');

-- ---- ARTISAN PHOTOS ----
CREATE POLICY "Photos artisans visibles" ON artisan_photos
  FOR SELECT USING (true);

CREATE POLICY "Artisan gère ses photos" ON artisan_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM artisan_profiles WHERE id = artisan_id AND user_id = auth.uid())
    OR current_user_role() = 'admin'
  );

-- ---- SERVICE REQUESTS ----
CREATE POLICY "Voir ses propres demandes" ON service_requests
  FOR SELECT USING (
    resident_id = auth.uid()
    OR EXISTS (SELECT 1 FROM artisan_profiles WHERE id = artisan_id AND user_id = auth.uid())
    OR current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "Résident crée une demande" ON service_requests
  FOR INSERT WITH CHECK (auth.uid() = resident_id);

CREATE POLICY "Modifier ses demandes" ON service_requests
  FOR UPDATE USING (
    resident_id = auth.uid()
    OR EXISTS (SELECT 1 FROM artisan_profiles WHERE id = artisan_id AND user_id = auth.uid())
    OR current_user_role() = 'admin'
  );

-- ---- SERVICE REQUEST PHOTOS ----
CREATE POLICY "Photos demande visibles par participants" ON service_request_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = request_id
      AND (sr.resident_id = auth.uid()
        OR EXISTS (SELECT 1 FROM artisan_profiles ap WHERE ap.id = sr.artisan_id AND ap.user_id = auth.uid())
        OR current_user_role() IN ('admin', 'moderator'))
    )
  );

CREATE POLICY "Résident ajoute photos" ON service_request_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM service_requests WHERE id = request_id AND resident_id = auth.uid())
  );

-- ---- CONVERSATIONS ----
CREATE POLICY "Voir ses conversations" ON conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
    OR current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "Créer conversation" ON conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---- CONVERSATION PARTICIPANTS ----
CREATE POLICY "Voir participants de ses conversations" ON conversation_participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid())
    OR current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "Rejoindre conversation" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Mettre à jour sa participation" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- ---- MESSAGES ----
CREATE POLICY "Voir messages de ses conversations" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
    OR current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "Envoyer message" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  );

-- ---- LISTINGS ----
CREATE POLICY "Annonces actives publiques" ON listings
  FOR SELECT USING (status = 'active' OR user_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

CREATE POLICY "Créer annonce connecté" ON listings
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Modifier sa propre annonce" ON listings
  FOR UPDATE USING (user_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

CREATE POLICY "Supprimer sa propre annonce" ON listings
  FOR DELETE USING (user_id = auth.uid() OR current_user_role() = 'admin');

-- ---- LISTING PHOTOS ----
CREATE POLICY "Photos annonces visibles" ON listing_photos
  FOR SELECT USING (true);

CREATE POLICY "Propriétaire gère photos annonce" ON listing_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid())
    OR current_user_role() = 'admin'
  );

-- ---- EQUIPMENT ITEMS ----
CREATE POLICY "Équipements disponibles visibles" ON equipment_items
  FOR SELECT USING (is_available = true OR owner_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

CREATE POLICY "Créer équipement connecté" ON equipment_items
  FOR INSERT WITH CHECK (auth.uid() = owner_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Modifier son équipement" ON equipment_items
  FOR UPDATE USING (owner_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

CREATE POLICY "Supprimer son équipement" ON equipment_items
  FOR DELETE USING (owner_id = auth.uid() OR current_user_role() = 'admin');

-- ---- EQUIPMENT PHOTOS ----
CREATE POLICY "Photos équipement visibles" ON equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "Propriétaire gère photos" ON equipment_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM equipment_items WHERE id = item_id AND owner_id = auth.uid())
    OR current_user_role() = 'admin'
  );

-- ---- BORROW REQUESTS ----
CREATE POLICY "Voir ses demandes d'emprunt" ON borrow_requests
  FOR SELECT USING (
    borrower_id = auth.uid()
    OR EXISTS (SELECT 1 FROM equipment_items WHERE id = item_id AND owner_id = auth.uid())
    OR current_user_role() IN ('admin', 'moderator')
  );

CREATE POLICY "Emprunter un équipement" ON borrow_requests
  FOR INSERT WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "Modifier demande d'emprunt" ON borrow_requests
  FOR UPDATE USING (
    borrower_id = auth.uid()
    OR EXISTS (SELECT 1 FROM equipment_items WHERE id = item_id AND owner_id = auth.uid())
    OR current_user_role() = 'admin'
  );

-- ---- FORUM POSTS ----
CREATE POLICY "Posts forum publics" ON forum_posts
  FOR SELECT USING (true);

CREATE POLICY "Créer post connecté" ON forum_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Modifier son post" ON forum_posts
  FOR UPDATE USING (author_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

CREATE POLICY "Supprimer son post" ON forum_posts
  FOR DELETE USING (author_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

-- ---- FORUM COMMENTS ----
CREATE POLICY "Commentaires forum publics" ON forum_comments
  FOR SELECT USING (true);

CREATE POLICY "Créer commentaire connecté" ON forum_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Modifier son commentaire" ON forum_comments
  FOR UPDATE USING (author_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

CREATE POLICY "Supprimer son commentaire" ON forum_comments
  FOR DELETE USING (author_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

-- ---- REVIEWS ----
CREATE POLICY "Avis publics" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Laisser un avis connecté" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Modifier son avis" ON reviews
  FOR UPDATE USING (reviewer_id = auth.uid() OR current_user_role() = 'admin');

CREATE POLICY "Supprimer son avis" ON reviews
  FOR DELETE USING (reviewer_id = auth.uid() OR current_user_role() = 'admin');

-- ---- REPORTS ----
CREATE POLICY "Voir ses signalements" ON reports
  FOR SELECT USING (reporter_id = auth.uid() OR current_user_role() IN ('admin', 'moderator'));

CREATE POLICY "Signaler contenu" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admin gère signalements" ON reports
  FOR UPDATE USING (current_user_role() IN ('admin', 'moderator'));

-- ---- NOTIFICATIONS ----
CREATE POLICY "Voir ses notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Marquer notification lue" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Créer notification système" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---- FAVORITES ----
CREATE POLICY "Voir ses favoris" ON favorite_artisans
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Gérer ses favoris" ON favorite_artisans
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 20. CATÉGORIES PUBLIQUES (pas de RLS restrictif)
-- ============================================================
ALTER TABLE trade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catégories métiers publiques" ON trade_categories FOR SELECT USING (true);
CREATE POLICY "Admin gère catégories métiers" ON trade_categories FOR ALL USING (current_user_role() = 'admin');

CREATE POLICY "Catégories annonces publiques" ON listing_categories FOR SELECT USING (true);
CREATE POLICY "Admin gère catégories annonces" ON listing_categories FOR ALL USING (current_user_role() = 'admin');

CREATE POLICY "Catégories équipement publiques" ON equipment_categories FOR SELECT USING (true);
CREATE POLICY "Admin gère catégories équipement" ON equipment_categories FOR ALL USING (current_user_role() = 'admin');

CREATE POLICY "Catégories forum publiques" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "Admin gère catégories forum" ON forum_categories FOR ALL USING (current_user_role() = 'admin');

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction pour obtenir les statistiques admin
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles WHERE role != 'admin'),
    'pending_artisans', (SELECT COUNT(*) FROM profiles WHERE role = 'artisan_pending'),
    'verified_artisans', (SELECT COUNT(*) FROM profiles WHERE role = 'artisan_verified'),
    'total_listings', (SELECT COUNT(*) FROM listings WHERE status = 'active'),
    'total_forum_posts', (SELECT COUNT(*) FROM forum_posts),
    'pending_reports', (SELECT COUNT(*) FROM reports WHERE status = 'pending'),
    'total_equipment', (SELECT COUNT(*) FROM equipment_items WHERE is_available = true),
    'total_messages', (SELECT COUNT(*) FROM messages)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder droits d'exécution à l'admin uniquement
REVOKE EXECUTE ON FUNCTION get_admin_stats() FROM PUBLIC;

COMMENT ON TABLE profiles IS 'Profils utilisateurs - complète auth.users';
COMMENT ON TABLE artisan_profiles IS 'Profils artisans - visible seulement si artisan_verified';
COMMENT ON TABLE service_requests IS 'Demandes de service avec photos';
COMMENT ON TABLE conversations IS 'Conversations privées - accès uniquement aux participants';
COMMENT ON TABLE messages IS 'Messages - accès uniquement aux participants de la conversation';

-- ============================================================
-- DEMANDES PUBLIQUES — commentaires communautaires
-- ============================================================
CREATE TABLE IF NOT EXISTS request_comments (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  author_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "request_comments_select" ON request_comments FOR SELECT USING (true);
CREATE POLICY "request_comments_insert" ON request_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "request_comments_delete" ON request_comments FOR DELETE USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
);

-- Rendre les service_requests lisibles publiquement (lecture seule)
DROP POLICY IF EXISTS "Voir ses propres demandes" ON service_requests;
CREATE POLICY "service_requests_select_public" ON service_requests
  FOR SELECT USING (true);
