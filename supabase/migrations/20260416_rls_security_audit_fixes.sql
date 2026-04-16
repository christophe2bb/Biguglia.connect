-- ============================================================================
-- MIGRATION 20260416 — RLS Security Audit Fixes
-- Biguglia Connect — A executer dans Supabase SQL Editor
-- ============================================================================
-- AUDIT LIVE (2026-04-16) — 3 problemes confirmes en production :
--
-- CRITIQUE   profiles         -> SELECT USING(true) expose email/phone/role a anon
-- CRITIQUE   service_requests -> SELECT USING(true) expose adresses/descriptions a anon
-- BUG/DoS    conversations +  -> recursion infinie dans la policy
--            messages +          conversation_participants -> HTTP 500 sur toute
--            message_attachments  requete messagerie
--            conversation_participants
--
-- ECRITURE (INSERT/UPDATE/DELETE) : correctement protegee (WITH CHECK = auth.uid())
-- TABLES CRITIQUES SURES : reports, artisan_profiles, notifications,
--   admin_action_logs, moderation_queue -> retournent [] pour anon OK
-- TABLES PUBLIQUES OK : listings, job_offers, job_demands, help_requests,
--   events, forum_posts, sectors, trade_categories -> USING(true) intentionnel OK
-- ============================================================================

-- ============================================================================
-- FIX 1 — CRITIQUE : profiles — SELECT USING(true) -> email/phone/role exposes
-- ============================================================================
-- Cause : migration_profil_public.sql + 20260414_profiles_rls_fix.sql
--   ont cree USING(true) pour contourner un bug AuthProvider.
--
-- Impact applicatif : AuthProvider fait SELECT sur profiles avec la cle anon
--   APRES auth.getUser(). Avec auth.uid() IS NOT NULL, le SELECT retourne
--   [] quand pas de session (comportement correct) et les rows quand connecte.
-- ============================================================================

-- Etape 1 : Supprimer toutes les politiques USING(true) heritees sur profiles
DROP POLICY IF EXISTS "Profils publics en lecture"           ON profiles;
DROP POLICY IF EXISTS "Public profiles readable"             ON profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"       ON profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"      ON profiles;
DROP POLICY IF EXISTS "Profils lisibles par tous"            ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"        ON profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"          ON profiles;

-- ⚠️  La policy SELECT profiles est définie UNIQUEMENT dans :
--     20260416_profiles_rls_final.sql (source de vérité unique)
-- Ce bloc ne crée plus de policy ici pour éviter les doublons.

-- ============================================================================
-- FIX 2 — CRITIQUE : service_requests — SELECT USING(true) -> adresses exposees
-- ============================================================================
-- Cause : fin de database.sql a ajoute service_requests_select_public USING(true)
--   pour que les commentaires publics fonctionnent.
--   Consequence : expose resident_id, artisan_id, address, description a l'anon.
-- Note : request_comments garde sa propre policy USING(true) — OK.
-- ============================================================================

DROP POLICY IF EXISTS "service_requests_select_public"       ON service_requests;
DROP POLICY IF EXISTS "Voir ses propres demandes"            ON service_requests;
DROP POLICY IF EXISTS "service_requests_select_own"          ON service_requests;
DROP POLICY IF EXISTS "service_requests_select_participants" ON service_requests;

CREATE POLICY "service_requests_select_participants"
  ON service_requests FOR SELECT
  USING (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  );

-- ============================================================================
-- FIX 3 — BUG/DoS : Recursion infinie dans conversation_participants
-- ============================================================================
-- Cause : policy "Voir participants de ses conversations" contient :
--   EXISTS (SELECT 1 FROM conversation_participants cp2
--           WHERE cp2.conversation_id = conversation_id
--           AND cp2.user_id = auth.uid())
--   -> self-reference = recursion infinie -> HTTP 500 code 42P17
--   sur toute requete conversations / messages / message_attachments.
--
-- Fix : remplacer par user_id = auth.uid() (direct, sans sous-requete recursive)
-- ============================================================================

-- Etape 3a : conversation_participants — supprimer la policy recursive
DROP POLICY IF EXISTS "Voir participants de ses conversations" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own"   ON conversation_participants;

CREATE POLICY "conversation_participants_select_own"
  ON conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_moderator_or_admin()
  );

-- Etape 3b : messages — recree sans sous-requete recursive
DROP POLICY IF EXISTS "Voir messages de ses conversations" ON messages;
DROP POLICY IF EXISTS "messages_select_participants"       ON messages;

CREATE POLICY "messages_select_participants"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- Etape 3c : conversations
DROP POLICY IF EXISTS "Voir ses conversations"            ON conversations;
DROP POLICY IF EXISTS "conversations_select_participants" ON conversations;

CREATE POLICY "conversations_select_participants"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- Etape 3d : message_attachments (si la table existe)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_attachments'
  ) THEN
    DROP POLICY IF EXISTS "message_attachments_select_participants" ON message_attachments;
    EXECUTE $p$
      CREATE POLICY "message_attachments_select_participants"
        ON message_attachments FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM messages m
            JOIN conversation_participants cp
              ON cp.conversation_id = m.conversation_id
            WHERE m.id = message_attachments.message_id
              AND cp.user_id = auth.uid()
          )
          OR is_moderator_or_admin()
        )
    $p$;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION RAPIDE post-migration (a executer dans SQL Editor)
-- ============================================================================
-- 1. profiles — plus accessible a l'anon :
--    SET ROLE anon;
--    SELECT id, email FROM profiles LIMIT 1;
--    Attendu : 0 lignes
--
-- 2. service_requests — plus accessible a l'anon :
--    SET ROLE anon;
--    SELECT id, address FROM service_requests LIMIT 1;
--    Attendu : 0 lignes
--
-- 3. messagerie — plus de recursion infinie :
--    RESET ROLE;
--    SELECT id FROM conversations LIMIT 1;
--    Attendu : 1 ligne sans erreur 42P17
--
-- 4. Test AuthProvider (depuis l'app) :
--    Ouvrir /connexion -> se connecter -> profil doit se charger correctement
-- ============================================================================

-- ============================================================================
-- ATTENTION APPLICATION — Impact du changement profiles
-- ============================================================================
-- AuthProvider (src/components/providers/AuthProvider.tsx) fait un SELECT
-- sur profiles. Avec la nouvelle policy, ce SELECT NE DOIT ETRE appele
-- QU'APRES auth.getUser() pour avoir un auth.uid() valide.
-- Si l'app charge profiles avant la session -> [] retourne -> comportement OK.
-- Verifier que le flux de connexion reste fonctionnel apres ce deploy.
-- ============================================================================

NOTIFY pgrst, 'reload schema';
