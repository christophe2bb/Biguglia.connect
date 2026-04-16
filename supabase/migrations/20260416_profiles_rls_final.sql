-- ============================================================================
-- MIGRATION 20260416_profiles_rls_final
-- Script UNIQUE et CONSOLIDÉ — remplace les 3 scripts précédents :
--   • 20260414_profiles_rls_fix.sql
--   • 20260416_rls_security_audit_fixes.sql
--   • 20260416_profiles_rls_hardening.sql
--
-- ORDRE D'EXÉCUTION GARANTI :
--   1. Fonction is_moderator_or_admin() — doit exister AVANT les policies
--   2. RLS + policies profiles
--   3. RLS + policies service_requests
--   4. Fix recursion conversation_participants / messages / conversations
--   5. Vue public_profiles
--
-- IDEMPOTENT : peut être relancé sans erreur (IF NOT EXISTS / DROP IF EXISTS)
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 — Fonction utilitaire (DOIT être créée EN PREMIER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'moderator')
  );
$$;


-- ============================================================================
-- ÉTAPE 2 — RLS table profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les anciennes policies SELECT (noms historiques)
DROP POLICY IF EXISTS "Profils lisibles par tous"            ON public.profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"           ON public.profiles;
DROP POLICY IF EXISTS "Public profiles readable"             ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"       ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"          ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"           ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy"               ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"         ON public.profiles;

-- Nouvelle policy SELECT — propre profil OU admin/modérateur
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR is_moderator_or_admin()
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert own profile"             ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"   ON public.profiles;
CREATE POLICY "Utilisateurs créent leur propre profil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE propre profil
DROP POLICY IF EXISTS "Users can update own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil" ON public.profiles;
CREATE POLICY "Utilisateurs modifient leur propre profil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- UPDATE admin/modérateur
DROP POLICY IF EXISTS "Admin modifie tous les profils" ON public.profiles;
CREATE POLICY "Admin modifie tous les profils"
  ON public.profiles
  FOR UPDATE
  USING (is_moderator_or_admin());

-- Colonne role (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';


-- ============================================================================
-- ÉTAPE 3 — RLS table service_requests
-- ============================================================================
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_select_public"       ON public.service_requests;
DROP POLICY IF EXISTS "Voir ses propres demandes"            ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_own"          ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_participants" ON public.service_requests;

CREATE POLICY "service_requests_select_participants"
  ON public.service_requests
  FOR SELECT
  USING (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- ÉTAPE 4 — Fix récursion conversation_participants / messages / conversations
-- ============================================================================

-- 4a — conversation_participants
DROP POLICY IF EXISTS "Voir participants de ses conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own"   ON public.conversation_participants;

CREATE POLICY "conversation_participants_select_own"
  ON public.conversation_participants
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_moderator_or_admin()
  );

-- 4b — messages
DROP POLICY IF EXISTS "Voir messages de ses conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participants"       ON public.messages;

CREATE POLICY "messages_select_participants"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- 4c — conversations
DROP POLICY IF EXISTS "Voir ses conversations"            ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;

CREATE POLICY "conversations_select_participants"
  ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
    OR is_moderator_or_admin()
  );

-- 4d — message_attachments (si la table existe)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'message_attachments'
  ) THEN
    EXECUTE $p$
      DROP POLICY IF EXISTS "message_attachments_select_participants"
        ON public.message_attachments;
      CREATE POLICY "message_attachments_select_participants"
        ON public.message_attachments
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.messages m
            JOIN public.conversation_participants cp
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
-- ÉTAPE 5 — Vue public_profiles (données non sensibles)
-- ============================================================================
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE VIEW public.public_profiles
  WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM public.profiles;

-- Accès aux utilisateurs connectés uniquement (pas aux anon)
GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL   ON public.public_profiles FROM anon;


-- ============================================================================
-- ÉTAPE 6 — Recharger PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VÉRIFICATION post-exécution (à coller séparément dans SQL Editor)
-- ============================================================================
-- 1. Anon ne peut plus lire les profils :
--    SET ROLE anon;
--    SELECT id, email FROM profiles LIMIT 1;
--    → Attendu : 0 lignes
--
-- 2. Policy active :
--    RESET ROLE;
--    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
--    → Attendu : "profiles_select_own_or_admin" pour SELECT
--
-- 3. Vue non accessible à l'anon :
--    SET ROLE anon;
--    SELECT id FROM public_profiles LIMIT 1;
--    → Attendu : permission denied
--
-- 4. Pas de récursion messagerie :
--    RESET ROLE;
--    SELECT id FROM conversations LIMIT 1;
--    → Attendu : résultat sans erreur 42P17
-- ============================================================================
