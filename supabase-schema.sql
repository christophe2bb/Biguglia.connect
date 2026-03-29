-- ============================================================
-- BIGUGLIA CONNECT — Schéma base de données Supabase complet
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('resident', 'artisan_pending', 'artisan_verified', 'moderator', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'pending', 'rejected', 'suspended');
CREATE TYPE urgency_level AS ENUM ('normal', 'urgent', 'tres_urgent');
CREATE TYPE request_status AS ENUM ('submitted', 'viewed', 'replied', 'scheduled', 'completed', 'cancelled');
CREATE TYPE appointment_status AS ENUM ('pending', 'accepted', 'declined', 'rescheduled', 'completed', 'cancelled');
CREATE TYPE listing_type AS ENUM ('sale', 'wanted', 'free', 'service');
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'archived');
CREATE TYPE item_condition AS ENUM ('excellent', 'bon', 'usage');
CREATE TYPE borrow_status AS ENUM ('pending', 'approved', 'rejected', 'borrowed', 'returned', 'cancelled');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE report_target AS ENUM ('user', 'post', 'listing', 'message', 'equipment');
CREATE TYPE related_type AS ENUM ('service_request', 'listing', 'equipment', 'general');

-- ============================================================
-- TABLE PROFILES (utilisateurs)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'resident',
  status account_status NOT NULL DEFAULT 'active',
  legal_consent BOOLEAN NOT NULL DEFAULT FALSE,
  legal_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CATÉGORIES DE MÉTIERS
-- ============================================================

CREATE TABLE trade_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🔧',
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Données initiales
INSERT INTO trade_categories (name, slug, icon, description, display_order) VALUES
  ('Plomberie', 'plomberie', '🚿', 'Plombiers, chauffagistes, sanitaires', 1),
  ('Électricité', 'electricite', '⚡', 'Électriciens, domotique, installation', 2),
  ('Maçonnerie', 'maconnerie', '🧱', 'Maçons, carreleurs, enduit', 3),
  ('Peinture', 'peinture', '🎨', 'Peintres en bâtiment, papier peint', 4),
  ('Menuiserie', 'menuiserie', '🪵', 'Menuisiers, charpentiers, parquet', 5),
  ('Climatisation', 'climatisation', '❄️', 'Climatiseurs, VMC, ventilation', 6),
  ('Jardinage', 'jardinage', '🌿', 'Jardiniers, paysagistes, entretien', 7),
  ('Bricolage', 'bricolage', '🔨', 'Bricoleurs multi-services', 8),
  ('Toiture', 'toiture', '🏠', 'Couvreurs, zingueurs, étanchéité', 9),
  ('Carrelage', 'carrelage', '🔲', 'Carreleurs, faïenciers', 10),
  ('Ferronnerie', 'ferronnerie', '⚙️', 'Ferrailleurs, grilles, portails', 11),
  ('Nettoyage', 'nettoyage', '🧹', 'Nettoyage professionnel, entretien', 12);

-- ============================================================
-- PROFILS ARTISANS
-- ============================================================

CREATE TABLE artisan_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  trade_category_id UUID REFERENCES trade_categories(id),
  description TEXT,
  service_area TEXT NOT NULL DEFAULT 'Biguglia et alentours',
  years_experience INTEGER,
  siret TEXT,
  insurance TEXT,
  verification_notes TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TRIGGER artisan_profiles_updated_at
  BEFORE UPDATE ON artisan_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Photos galerie artisan
CREATE TABLE artisan_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEMANDES DE SERVICE
-- ============================================================

CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES trade_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency urgency_level NOT NULL DEFAULT 'normal',
  preferred_date DATE,
  preferred_time TIME,
  address TEXT NOT NULL DEFAULT 'Biguglia',
  status request_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Photos des demandes
CREATE TABLE service_request_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RENDEZ-VOUS
-- ============================================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  resident_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE CASCADE,
  proposed_date DATE NOT NULL,
  proposed_time TIME NOT NULL,
  notes TEXT,
  status appointment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AVIS / ÉVALUATIONS
-- ============================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(artisan_id, reviewer_id)
);

-- ============================================================
-- MESSAGERIE
-- ============================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT,
  related_type related_type DEFAULT 'general',
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger : mettre à jour updated_at de la conversation quand un message est envoyé
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================
-- CATÉGORIES D'ANNONCES
-- ============================================================

CREATE TABLE listing_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO listing_categories (name, slug, icon, display_order) VALUES
  ('Outillage', 'outillage', '🔧', 1),
  ('Mobilier', 'mobilier', '🪑', 2),
  ('Électroménager', 'electromenager', '🏠', 3),
  ('Jardin', 'jardin', '🌿', 4),
  ('Véhicules', 'vehicules', '🚗', 5),
  ('Vêtements', 'vetements', '👕', 6),
  ('Sports & Loisirs', 'sports-loisirs', '⚽', 7),
  ('Bricolage', 'bricolage', '🔨', 8),
  ('Services', 'services', '👷', 9),
  ('Divers', 'divers', '📦', 10);

-- ============================================================
-- ANNONCES (PETITES ANNONCES)
-- ============================================================

CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES listing_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  listing_type listing_type NOT NULL DEFAULT 'sale',
  price DECIMAL(10,2),
  condition TEXT,
  location TEXT NOT NULL DEFAULT 'Biguglia',
  status listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE listing_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- CATÉGORIES MATÉRIEL
-- ============================================================

CREATE TABLE equipment_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '🔧',
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO equipment_categories (name, slug, icon, display_order) VALUES
  ('Outils électroportatifs', 'outils-electro', '🔌', 1),
  ('Outils de jardin', 'outils-jardin', '🌱', 2),
  ('Matériel BTP', 'materiel-btp', '🏗️', 3),
  ('Remorques & Transport', 'transport', '🚛', 4),
  ('Échafaudages & Escabeaux', 'echafaudages', '🪜', 5),
  ('Matériel de fête', 'fete', '🎉', 6),
  ('Camping & Outdoor', 'camping', '⛺', 7),
  ('Électronique', 'electronique', '💻', 8),
  ('Sport & Loisirs', 'sport', '⚽', 9),
  ('Divers', 'divers', '📦', 10);

-- ============================================================
-- MATÉRIEL À PRÊTER/EMPRUNTER
-- ============================================================

CREATE TABLE equipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES equipment_categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition item_condition NOT NULL DEFAULT 'bon',
  deposit_amount DECIMAL(10,2),
  is_free BOOLEAN NOT NULL DEFAULT TRUE,
  daily_rate DECIMAL(10,2),
  pickup_location TEXT NOT NULL DEFAULT 'Biguglia',
  rules TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER equipment_items_updated_at
  BEFORE UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE equipment_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Demandes d'emprunt
CREATE TABLE borrow_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  message TEXT,
  status borrow_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER borrow_requests_updated_at
  BEFORE UPDATE ON borrow_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FORUM COMMUNAUTAIRE
-- ============================================================

CREATE TABLE forum_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '💬',
  display_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO forum_categories (name, slug, description, icon, display_order) VALUES
  ('Général', 'general', 'Discussions générales sur Biguglia', '🏘️', 1),
  ('Travaux & Artisans', 'travaux', 'Conseils travaux, recommandations artisans', '🔧', 2),
  ('Entraide', 'entraide', 'Coups de main, services entre voisins', '🤝', 3),
  ('Événements locaux', 'evenements', 'Fêtes, marchés, animations à Biguglia', '🎉', 4),
  ('Annonces officielles', 'annonces-officielles', 'Informations municipales', '📢', 5),
  ('Questions & Réponses', 'questions', 'Posez vos questions à la communauté', '❓', 6);

CREATE TABLE forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES forum_categories(id),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE forum_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER forum_comments_updated_at
  BEFORE UPDATE ON forum_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Incrémenter les vues
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_posts SET views = views + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SIGNALEMENTS
-- ============================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artisan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artisan_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: est-ce que l'utilisateur connecté est admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: est-ce que l'utilisateur connecté est modérateur ou admin?
CREATE OR REPLACE FUNCTION is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------- PROFILES --------
-- Lecture publique des profils
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (TRUE);
-- Modification uniquement par soi-même ou admin
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid() OR is_admin());
-- Création par le système (trigger)
CREATE POLICY "profiles_insert_system" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- -------- ARTISAN PROFILES --------
CREATE POLICY "artisan_profiles_select_all" ON artisan_profiles FOR SELECT USING (TRUE);
CREATE POLICY "artisan_profiles_insert_own" ON artisan_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "artisan_profiles_update_own" ON artisan_profiles FOR UPDATE USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "artisan_profiles_delete_admin" ON artisan_profiles FOR DELETE USING (is_admin());

-- -------- ARTISAN PHOTOS --------
CREATE POLICY "artisan_photos_select_all" ON artisan_photos FOR SELECT USING (TRUE);
CREATE POLICY "artisan_photos_insert_own" ON artisan_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM artisan_profiles WHERE id = artisan_id AND user_id = auth.uid())
);
CREATE POLICY "artisan_photos_delete_own" ON artisan_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM artisan_profiles WHERE id = artisan_id AND user_id = auth.uid())
  OR is_admin()
);

-- -------- SERVICE REQUESTS --------
CREATE POLICY "service_requests_select_parties" ON service_requests FOR SELECT USING (
  resident_id = auth.uid()
  OR EXISTS (SELECT 1 FROM artisan_profiles WHERE id = artisan_id AND user_id = auth.uid())
  OR is_moderator_or_admin()
);
CREATE POLICY "service_requests_insert_resident" ON service_requests FOR INSERT WITH CHECK (resident_id = auth.uid());
CREATE POLICY "service_requests_update_parties" ON service_requests FOR UPDATE USING (
  resident_id = auth.uid()
  OR EXISTS (SELECT 1 FROM artisan_profiles WHERE id = artisan_id AND user_id = auth.uid())
  OR is_admin()
);

-- -------- CONVERSATIONS --------
CREATE POLICY "conversations_select_participant" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
  OR is_moderator_or_admin()
);
CREATE POLICY "conversations_insert_auth" ON conversations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- -------- CONVERSATION PARTICIPANTS --------
CREATE POLICY "conv_participants_select_own" ON conversation_participants FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM conversation_participants cp2 WHERE cp2.conversation_id = conversation_id AND cp2.user_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "conv_participants_insert_auth" ON conversation_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conv_participants_update_own" ON conversation_participants FOR UPDATE USING (user_id = auth.uid());

-- -------- MESSAGES --------
CREATE POLICY "messages_select_participant" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
  OR is_moderator_or_admin()
);
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- -------- LISTINGS --------
CREATE POLICY "listings_select_active" ON listings FOR SELECT USING (status = 'active' OR user_id = auth.uid() OR is_moderator_or_admin());
CREATE POLICY "listings_insert_auth" ON listings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "listings_update_own" ON listings FOR UPDATE USING (user_id = auth.uid() OR is_moderator_or_admin());
CREATE POLICY "listings_delete_own" ON listings FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- -------- LISTING PHOTOS --------
CREATE POLICY "listing_photos_select_all" ON listing_photos FOR SELECT USING (TRUE);
CREATE POLICY "listing_photos_insert_own" ON listing_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM listings WHERE id = listing_id AND user_id = auth.uid())
);

-- -------- EQUIPMENT --------
CREATE POLICY "equipment_select_available" ON equipment_items FOR SELECT USING (is_available = TRUE OR owner_id = auth.uid() OR is_admin());
CREATE POLICY "equipment_insert_auth" ON equipment_items FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "equipment_update_own" ON equipment_items FOR UPDATE USING (owner_id = auth.uid() OR is_admin());
CREATE POLICY "equipment_delete_own" ON equipment_items FOR DELETE USING (owner_id = auth.uid() OR is_admin());

-- -------- EQUIPMENT PHOTOS --------
CREATE POLICY "equipment_photos_select_all" ON equipment_photos FOR SELECT USING (TRUE);
CREATE POLICY "equipment_photos_insert_own" ON equipment_photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM equipment_items WHERE id = item_id AND owner_id = auth.uid())
);

-- -------- BORROW REQUESTS --------
CREATE POLICY "borrow_requests_select_parties" ON borrow_requests FOR SELECT USING (
  borrower_id = auth.uid()
  OR EXISTS (SELECT 1 FROM equipment_items WHERE id = item_id AND owner_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "borrow_requests_insert_auth" ON borrow_requests FOR INSERT WITH CHECK (borrower_id = auth.uid());
CREATE POLICY "borrow_requests_update_owner" ON borrow_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM equipment_items WHERE id = item_id AND owner_id = auth.uid())
  OR borrower_id = auth.uid()
  OR is_admin()
);

-- -------- FORUM POSTS --------
CREATE POLICY "forum_posts_select_all" ON forum_posts FOR SELECT USING (TRUE);
CREATE POLICY "forum_posts_insert_auth" ON forum_posts FOR INSERT WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);
CREATE POLICY "forum_posts_update_own" ON forum_posts FOR UPDATE USING (author_id = auth.uid() OR is_moderator_or_admin());
CREATE POLICY "forum_posts_delete_own" ON forum_posts FOR DELETE USING (author_id = auth.uid() OR is_moderator_or_admin());

-- -------- FORUM COMMENTS --------
CREATE POLICY "forum_comments_select_all" ON forum_comments FOR SELECT USING (TRUE);
CREATE POLICY "forum_comments_insert_auth" ON forum_comments FOR INSERT WITH CHECK (author_id = auth.uid() AND auth.uid() IS NOT NULL);
CREATE POLICY "forum_comments_update_own" ON forum_comments FOR UPDATE USING (author_id = auth.uid() OR is_moderator_or_admin());
CREATE POLICY "forum_comments_delete_own" ON forum_comments FOR DELETE USING (author_id = auth.uid() OR is_moderator_or_admin());

-- -------- REPORTS --------
CREATE POLICY "reports_insert_auth" ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_select_admin" ON reports FOR SELECT USING (reporter_id = auth.uid() OR is_moderator_or_admin());
CREATE POLICY "reports_update_admin" ON reports FOR UPDATE USING (is_moderator_or_admin());

-- -------- NOTIFICATIONS --------
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_system" ON notifications FOR INSERT WITH CHECK (is_admin() OR auth.uid() IS NOT NULL);

-- ============================================================
-- TRIGGER CRÉATION AUTOMATIQUE DE PROFIL
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, legal_consent, legal_consent_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'resident'),
    COALESCE((NEW.raw_user_meta_data->>'legal_consent')::boolean, FALSE),
    CASE WHEN (NEW.raw_user_meta_data->>'legal_consent')::boolean THEN NOW() ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Créer les buckets dans l'interface Supabase Storage ou via l'API :
-- Bucket "photos" : public = true
-- Bucket "documents" : public = false (pour pièces justificatives artisans)

-- Politiques Storage (à configurer dans l'UI Supabase) :
-- photos : lecture publique, écriture authentifiée uniquement
-- documents : lecture admin uniquement, écriture authentifiée

-- ============================================================
-- INDEXES POUR PERFORMANCES
-- ============================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_artisan_profiles_user_id ON artisan_profiles(user_id);
CREATE INDEX idx_artisan_profiles_category ON artisan_profiles(trade_category_id);
CREATE INDEX idx_service_requests_resident ON service_requests(resident_id);
CREATE INDEX idx_service_requests_artisan ON service_requests(artisan_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_listings_user ON listings(user_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_category ON listings(category_id);
CREATE INDEX idx_equipment_items_owner ON equipment_items(owner_id);
CREATE INDEX idx_equipment_items_available ON equipment_items(is_available);
CREATE INDEX idx_forum_posts_category ON forum_posts(category_id, created_at DESC);
CREATE INDEX idx_forum_comments_post ON forum_comments(post_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);

-- ============================================================
-- REALTIME (pour messagerie en temps réel)
-- ============================================================
-- Activer Realtime sur les tables messages et notifications
-- Dans l'interface Supabase : Database > Replication > Tables
-- Ajouter : messages, notifications, conversation_participants
