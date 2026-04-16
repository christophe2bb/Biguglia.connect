-- ============================================================================
-- MIGRATION 20260416_profiles_rls_hardening
-- ⚠️  NEUTRALISÉ — REMPLACÉ PAR 20260416_profiles_rls_final.sql
-- ============================================================================
-- Ce fichier était un brouillon intermédiaire de durcissement RLS.
-- Son contenu a été consolidé dans le fichier source de vérité unique :
--
--   SOURCE DE VÉRITÉ : supabase/migrations/20260416_profiles_rls_final.sql
--
-- Ce bloc effectue uniquement un nettoyage idempotent des résidus.
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profils lisibles par tous"                  ON public.profiles;
DROP POLICY IF EXISTS "Profils publics en lecture"                 ON public.profiles;
DROP POLICY IF EXISTS "Public profiles readable"                   ON public.profiles;
DROP POLICY IF EXISTS "Profiles are publicly readable"             ON public.profiles;
DROP POLICY IF EXISTS "Allow public select on profiles"            ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated"              ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_authenticated"                ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile"                 ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy"                     ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin"               ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"               ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs créent leur propre profil"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"               ON public.profiles;
DROP POLICY IF EXISTS "Utilisateurs modifient leur propre profil"  ON public.profiles;
DROP POLICY IF EXISTS "Admin modifie tous les profils"             ON public.profiles;

-- La fonction is_moderator_or_admin() est créée dans _final.sql
-- La vue public_profiles est créée dans _final.sql
NOTIFY pgrst, 'reload schema';
