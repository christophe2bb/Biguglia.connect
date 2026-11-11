-- Réconciliation des policies user_blocks existantes sur Supabase.
-- Trois règles propriétaires historiques ("Voir ses blocages", etc.)
-- étaient déjà installées et sont équivalentes aux règles owner_*,
-- sauf que l'ancienne insertion permettait de se bloquer soi-même.
-- Conserver un jeu unique (owner_*), limité au rôle authenticated.
DROP POLICY IF EXISTS "Voir ses blocages" ON public.user_blocks;
DROP POLICY IF EXISTS "Bloquer un utilisateur" ON public.user_blocks;
DROP POLICY IF EXISTS "Débloquer un utilisateur" ON public.user_blocks;

-- user_blocks_owner_select/insert/delete sont créées par
-- 20261111065000_service_user_blocks_rls_20261111.sql.
-- Aucune donnée utilisateur n'est touchée.
