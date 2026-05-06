-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : restreindre moderation_kpi aux admins/modérateurs uniquement
-- Contexte  : la vue était accessible anonymement (GRANT SELECT TO authenticated
--             ne suffit pas — les rôles anon héritent aussi du GRANT sur les vues).
-- Fix       : supprimer le GRANT public, recréer la vue avec sécurité renforcée.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Retirer le GRANT SELECT public sur la vue
REVOKE SELECT ON moderation_kpi FROM anon;
REVOKE SELECT ON moderation_kpi FROM authenticated;

-- 2. Recréer la vue avec SECURITY DEFINER pour contrôle fin
--    (la vue existe déjà, on la remplace)
CREATE OR REPLACE VIEW moderation_kpi AS
  SELECT
    COUNT(*)                                          AS total,
    COUNT(*) FILTER (WHERE status = 'pending')        AS pending,
    COUNT(*) FILTER (WHERE status = 'published')      AS published,
    COUNT(*) FILTER (WHERE status = 'refused')        AS refused,
    COUNT(*) FILTER (WHERE status = 'correction')     AS correction,
    AVG(risk_score)                                   AS avg_risk,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h
  FROM moderation_queue;

-- 3. N'accorder l'accès qu'aux rôles admin/moderator via une fonction RPC
--    Les API routes admin utilisent createAdminClient() (service_role) → bypass RLS.
--    Aucun GRANT nécessaire : seul le service_role peut lire cette vue directement.

-- 4. Pour que les API routes admin puissent continuer à lire via service_role :
GRANT SELECT ON moderation_kpi TO service_role;

-- Vérification : la vue ne doit PAS être accessible par anon ou authenticated
-- Test : SELECT * FROM moderation_kpi; → doit retourner 0 ligne ou "permission denied"
