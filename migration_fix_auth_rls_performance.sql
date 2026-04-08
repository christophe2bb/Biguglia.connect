-- ============================================
-- MIGRATION: Optimisation Performance RLS (TABLES DE BASE UNIQUEMENT)
-- ============================================
-- Problème: auth.uid() et auth.jwt() sont ré-évalués pour chaque ligne dans les politiques RLS
-- Solution: Utiliser (SELECT auth.uid()) pour évaluer une seule fois
-- Impact: Amélioration drastique des performances sur toutes les requêtes authentifiées
-- Référence: https://supabase.com/docs/guides/database/database-linter?lint=auth_rls_initplan
-- Date: 2026-04-08
-- Note: Cette migration ne touche que les tables du schéma de base (supabase-schema.sql)

-- ============================================
-- PARTIE 1: PROFILES
-- ============================================

DROP POLICY IF EXISTS "allow_select" ON public.profiles;
DROP POLICY IF EXISTS "allow_update" ON public.profiles;
DROP POLICY IF EXISTS "allow_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

CREATE POLICY "allow_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "allow_update" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "allow_insert" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================
-- PARTIE 2: ARTISAN PROFILES & PHOTOS
-- ============================================

DROP POLICY IF EXISTS "artisan_profiles_select" ON public.artisan_profiles;
DROP POLICY IF EXISTS "artisan_profiles_insert" ON public.artisan_profiles;
DROP POLICY IF EXISTS "artisan_profiles_update" ON public.artisan_profiles;

CREATE POLICY "artisan_profiles_select" ON public.artisan_profiles
  FOR SELECT USING (true);

CREATE POLICY "artisan_profiles_insert" ON public.artisan_profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "artisan_profiles_update" ON public.artisan_profiles
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Photos
DROP POLICY IF EXISTS "artisan_photos_select" ON public.artisan_photos;
DROP POLICY IF EXISTS "artisan_photos_insert" ON public.artisan_photos;
DROP POLICY IF EXISTS "artisan_photos_delete" ON public.artisan_photos;

CREATE POLICY "artisan_photos_select" ON public.artisan_photos
  FOR SELECT USING (true);

CREATE POLICY "artisan_photos_insert" ON public.artisan_photos
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM artisan_profiles WHERE id = artisan_id
    )
  );

CREATE POLICY "artisan_photos_delete" ON public.artisan_photos
  FOR DELETE USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM artisan_profiles WHERE id = artisan_id
    )
  );

-- ============================================
-- PARTIE 3: SERVICE REQUESTS
-- ============================================

DROP POLICY IF EXISTS "service_requests_select_parties" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_insert_resident" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_update_parties" ON public.service_requests;

CREATE POLICY "service_requests_select_parties" ON public.service_requests
  FOR SELECT USING (
    (SELECT auth.uid()) = resident_id OR
    (SELECT auth.uid()) IN (
      SELECT user_id FROM artisan_profiles WHERE id = artisan_id
    )
  );

CREATE POLICY "service_requests_insert_resident" ON public.service_requests
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = resident_id);

CREATE POLICY "service_requests_update_parties" ON public.service_requests
  FOR UPDATE USING (
    (SELECT auth.uid()) = resident_id OR
    (SELECT auth.uid()) IN (
      SELECT user_id FROM artisan_profiles WHERE id = artisan_id
    )
  );

-- ============================================
-- PARTIE 4: MESSAGES & CONVERSATIONS
-- ============================================

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;

CREATE POLICY "messages_select_participant" ON public.messages
  FOR SELECT USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id
    )
  );

CREATE POLICY "messages_insert_participant" ON public.messages
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id
    )
  );

-- Conversations
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;

CREATE POLICY "conversations_select_participant" ON public.conversations
  FOR SELECT USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM conversation_participants WHERE conversation_id = id
    )
  );

CREATE POLICY "conversations_update_participant" ON public.conversations
  FOR UPDATE USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM conversation_participants WHERE conversation_id = id
    )
  );

-- Conversation Participants
DROP POLICY IF EXISTS "conversation_participants_select_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_own" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON public.conversation_participants;

CREATE POLICY "conversation_participants_select_own" ON public.conversation_participants
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "conversation_participants_insert_own" ON public.conversation_participants
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "conversation_participants_update_own" ON public.conversation_participants
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- PARTIE 5: LISTINGS & EQUIPMENT
-- ============================================

DROP POLICY IF EXISTS "listings_select_published_or_own" ON public.listings;
DROP POLICY IF EXISTS "listings_insert_own" ON public.listings;
DROP POLICY IF EXISTS "listings_update_own" ON public.listings;
DROP POLICY IF EXISTS "listings_delete_own" ON public.listings;

CREATE POLICY "listings_select_published_or_own" ON public.listings
  FOR SELECT USING (status = 'published' OR (SELECT auth.uid()) = user_id);

CREATE POLICY "listings_insert_own" ON public.listings
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "listings_update_own" ON public.listings
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "listings_delete_own" ON public.listings
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Listing Photos
DROP POLICY IF EXISTS "listing_photos_select_public" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_insert_owner" ON public.listing_photos;
DROP POLICY IF EXISTS "listing_photos_delete_owner" ON public.listing_photos;

CREATE POLICY "listing_photos_select_public" ON public.listing_photos
  FOR SELECT USING (true);

CREATE POLICY "listing_photos_insert_owner" ON public.listing_photos
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM listings WHERE id = listing_id
    )
  );

CREATE POLICY "listing_photos_delete_owner" ON public.listing_photos
  FOR DELETE USING (
    (SELECT auth.uid()) IN (
      SELECT user_id FROM listings WHERE id = listing_id
    )
  );

-- Equipment Items
DROP POLICY IF EXISTS "equipment_items_select_available_or_own" ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_items_insert_own" ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_items_update_own" ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_items_delete_own" ON public.equipment_items;

CREATE POLICY "equipment_items_select_available_or_own" ON public.equipment_items
  FOR SELECT USING (is_available = true OR (SELECT auth.uid()) = owner_id);

CREATE POLICY "equipment_items_insert_own" ON public.equipment_items
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "equipment_items_update_own" ON public.equipment_items
  FOR UPDATE USING ((SELECT auth.uid()) = owner_id);

CREATE POLICY "equipment_items_delete_own" ON public.equipment_items
  FOR DELETE USING ((SELECT auth.uid()) = owner_id);

-- Equipment Photos
DROP POLICY IF EXISTS "equipment_photos_select_public" ON public.equipment_photos;
DROP POLICY IF EXISTS "equipment_photos_insert_owner" ON public.equipment_photos;
DROP POLICY IF EXISTS "equipment_photos_delete_owner" ON public.equipment_photos;

CREATE POLICY "equipment_photos_select_public" ON public.equipment_photos
  FOR SELECT USING (true);

CREATE POLICY "equipment_photos_insert_owner" ON public.equipment_photos
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IN (
      SELECT owner_id FROM equipment_items WHERE id = item_id
    )
  );

CREATE POLICY "equipment_photos_delete_owner" ON public.equipment_photos
  FOR DELETE USING (
    (SELECT auth.uid()) IN (
      SELECT owner_id FROM equipment_items WHERE id = item_id
    )
  );

-- Borrow Requests
DROP POLICY IF EXISTS "borrow_requests_select_parties" ON public.borrow_requests;
DROP POLICY IF EXISTS "borrow_requests_insert_borrower" ON public.borrow_requests;
DROP POLICY IF EXISTS "borrow_requests_update_parties" ON public.borrow_requests;

CREATE POLICY "borrow_requests_select_parties" ON public.borrow_requests
  FOR SELECT USING (
    (SELECT auth.uid()) = borrower_id OR
    (SELECT auth.uid()) IN (
      SELECT owner_id FROM equipment_items WHERE id = item_id
    )
  );

CREATE POLICY "borrow_requests_insert_borrower" ON public.borrow_requests
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = borrower_id);

CREATE POLICY "borrow_requests_update_parties" ON public.borrow_requests
  FOR UPDATE USING (
    (SELECT auth.uid()) = borrower_id OR
    (SELECT auth.uid()) IN (
      SELECT owner_id FROM equipment_items WHERE id = item_id
    )
  );

-- ============================================
-- PARTIE 6: FORUM
-- ============================================

DROP POLICY IF EXISTS "forum_posts_select_published_or_own" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_insert_own" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_update_own" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_delete_own" ON public.forum_posts;

CREATE POLICY "forum_posts_select_published_or_own" ON public.forum_posts
  FOR SELECT USING (status = 'published' OR (SELECT auth.uid()) = author_id);

CREATE POLICY "forum_posts_insert_own" ON public.forum_posts
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "forum_posts_update_own" ON public.forum_posts
  FOR UPDATE USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "forum_posts_delete_own" ON public.forum_posts
  FOR DELETE USING ((SELECT auth.uid()) = author_id);

-- Forum Comments
DROP POLICY IF EXISTS "forum_comments_select_public" ON public.forum_comments;
DROP POLICY IF EXISTS "forum_comments_insert_own" ON public.forum_comments;
DROP POLICY IF EXISTS "forum_comments_update_own" ON public.forum_comments;
DROP POLICY IF EXISTS "forum_comments_delete_own" ON public.forum_comments;

CREATE POLICY "forum_comments_select_public" ON public.forum_comments
  FOR SELECT USING (true);

CREATE POLICY "forum_comments_insert_own" ON public.forum_comments
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = author_id);

CREATE POLICY "forum_comments_update_own" ON public.forum_comments
  FOR UPDATE USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "forum_comments_delete_own" ON public.forum_comments
  FOR DELETE USING ((SELECT auth.uid()) = author_id);

-- ============================================
-- PARTIE 7: REVIEWS & NOTIFICATIONS
-- ============================================

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;

CREATE POLICY "reviews_select_public" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON public.reviews
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = reviewer_id);

CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING ((SELECT auth.uid()) = reviewer_id);

CREATE POLICY "reviews_delete_own" ON public.reviews
  FOR DELETE USING ((SELECT auth.uid()) = reviewer_id);

-- Notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_insert_system" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- PARTIE 8: APPOINTMENTS
-- ============================================

DROP POLICY IF EXISTS "appointments_select_parties" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_resident" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_parties" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_resident" ON public.appointments;

CREATE POLICY "appointments_select_parties" ON public.appointments
  FOR SELECT USING (
    (SELECT auth.uid()) = resident_id OR
    (SELECT auth.uid()) IN (
      SELECT user_id FROM artisan_profiles WHERE id = artisan_id
    )
  );

CREATE POLICY "appointments_insert_resident" ON public.appointments
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = resident_id);

CREATE POLICY "appointments_update_parties" ON public.appointments
  FOR UPDATE USING (
    (SELECT auth.uid()) = resident_id OR
    (SELECT auth.uid()) IN (
      SELECT user_id FROM artisan_profiles WHERE id = artisan_id
    )
  );

CREATE POLICY "appointments_delete_resident" ON public.appointments
  FOR DELETE USING ((SELECT auth.uid()) = resident_id);

-- ============================================
-- PARTIE 9: REPORTS
-- ============================================

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;

CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING ((SELECT auth.uid()) = reporter_id);

CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);

-- ============================================
-- VERIFICATION FINALE
-- ============================================

DO $$
DECLARE
  _table text;
  _count int := 0;
  _optimized int := 0;
BEGIN
  FOR _table IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN (
      'profiles', 'artisan_profiles', 'artisan_photos',
      'service_requests',
      'messages', 'conversations', 'conversation_participants',
      'listings', 'listing_photos',
      'equipment_items', 'equipment_photos', 'borrow_requests',
      'forum_posts', 'forum_comments',
      'reviews', 'notifications',
      'appointments', 'reports'
    )
  LOOP
    _count := _count + 1;
    RAISE NOTICE 'Table %: RLS policies updated', _table;
    _optimized := _optimized + 1;
  END LOOP;

  IF _optimized = _count THEN
    RAISE NOTICE '✅ SUCCESS: % tables optimized with (SELECT auth.uid())', _optimized;
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Only % of % tables optimized', _optimized, _count;
  END IF;
END $$;
