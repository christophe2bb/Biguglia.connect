-- ─────────────────────────────────────────────────────────────────────────────
-- scripts/rls-audit-setup.sql
-- Fonctions RPC nécessaires pour l'audit RLS automatisé.
--
-- À exécuter UNE SEULE FOIS dans Supabase SQL Editor :
--   Supabase Dashboard → SQL Editor → New query → coller + Run
--
-- Ces fonctions utilisent SECURITY DEFINER pour accéder à pg_catalog
-- (pg_tables, pg_policies) qui n'est pas exposé par PostgREST.
-- Elles sont en lecture seule et ne modifient aucune donnée.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Statut RLS de toutes les tables publiques
CREATE OR REPLACE FUNCTION public.rls_audit_tables()
RETURNS TABLE(tablename text, rowsecurity bool)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT tablename::text, rowsecurity
  FROM   pg_tables
  WHERE  schemaname = 'public'
  ORDER  BY tablename;
$$;

-- 2. Toutes les policies RLS du schéma public
CREATE OR REPLACE FUNCTION public.rls_audit_policies()
RETURNS TABLE(
  tablename  text,
  policyname text,
  cmd        text,
  qual       text,
  with_check text,
  roles      text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    tablename::text,
    policyname::text,
    cmd::text,
    qual::text,
    with_check::text,
    roles::text[]
  FROM   pg_policies
  WHERE  schemaname = 'public'
  ORDER  BY tablename, policyname;
$$;

-- Vérification immédiate
SELECT 'rls_audit_tables OK — ' || count(*)::text || ' tables' AS check
FROM   rls_audit_tables();

SELECT 'rls_audit_policies OK — ' || count(*)::text || ' policies' AS check
FROM   rls_audit_policies();
