-- Biguglia Connect | PROPOSITION : vue moderation_kpi
-- PRÉPRODUCTION UNIQUEMENT — AUCUNE EXECUTION EN PRODUCTION.
-- Le serveur lit cette vue exclusivement avec createAdminClient() (service_role)
-- après getAdminUser() ; aucun rôle client ne doit lire la vue directement.
--
-- IMPORTANT : les anciens scripts 20260506_rls_moderation_kpi.sql et
-- src/app/admin/migration/_sql/moderation.ts recréent potentiellement la
-- vue avec les privilèges par défaut. Ne pas les réappliquer après cette
-- migration sans les harmoniser.

BEGIN;

-- Conserve les colonnes et le SQL métier existants ; change seulement
-- le contexte de sécurité PostgreSQL de la vue.
ALTER VIEW public.moderation_kpi SET (security_invoker = true);

-- Ne pas se contenter de REVOKE FROM anon/authenticated : des GRANT
-- sur PUBLIC peuvent continuer à donner accès par héritage.
REVOKE ALL PRIVILEGES ON TABLE public.moderation_kpi
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.moderation_kpi TO service_role;

COMMIT;

-- Vérifications attendues (lecture seule) :
-- SELECT reloptions FROM pg_class
-- WHERE oid = 'public.moderation_kpi'::regclass;
-- SELECT has_table_privilege('anon','public.moderation_kpi','SELECT')
--        AS anon_can_read,
--        has_table_privilege('authenticated','public.moderation_kpi','SELECT')
--        AS user_can_read,
--        has_table_privilege('service_role','public.moderation_kpi','SELECT')
--        AS server_can_read;
-- Attendu : security_invoker=true ; false, false, true.
-- Recontrôler /api/admin/moderation/queue et /stats-data :
-- admin et modérateur autorisés ; résident et invité refusés.
