-- ============================================================
-- STEP 2a — DIAGNOSTIC : policies auth_rls_initplan restantes
-- ============================================================
-- Objectif : lister exactement les 63 policies encore impactées
-- sur les 36 tables identifiées dans le linter (fichier 11).
--
-- Ce script est READ-ONLY — aucune modification en base.
-- Coller dans le Supabase SQL Editor et exécuter.
--
-- Résultat attendu : ~63 lignes
-- Colonnes : schemaname, tablename, policyname, cmd, roles,
--            permissive, qual (USING), with_check (WITH CHECK)
--
-- Critères de détection des appels non wrappés :
--   auth.uid()       → ne doit PAS être dans (SELECT auth.uid())
--   auth.role()      → idem
--   auth.jwt()       → idem
--   current_setting( → idem
-- ============================================================

SELECT
    p.schemaname,
    p.tablename,
    p.policyname,
    p.cmd,
    p.roles,
    p.permissive,
    p.qual        AS using_expr,
    p.with_check  AS with_check_expr,

    -- Flags de détection précis
    (
        p.qual ~ 'auth\.(uid|role|jwt)\(\)'
        AND p.qual !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)'
    ) AS qual_has_unwrapped,

    (
        p.with_check ~ 'auth\.(uid|role|jwt)\(\)'
        AND p.with_check !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)'
    ) AS with_check_has_unwrapped,

    (
        (p.qual ~ 'current_setting\(' AND p.qual !~ '\(SELECT\s+current_setting\(')
        OR
        (p.with_check ~ 'current_setting\(' AND p.with_check !~ '\(SELECT\s+current_setting\(')
    ) AS has_unwrapped_current_setting

FROM pg_policies p
WHERE
    p.schemaname = 'public'
    AND p.tablename IN (
        'artisan_profiles', 'asso_comments', 'associations',
        'collection_categories', 'collection_favorites',
        'collection_item_comments', 'collection_items',
        'collection_offers', 'event_comments', 'event_participants',
        'events', 'forum_follows', 'forum_reactions', 'forum_replies',
        'forum_reports', 'forum_topics', 'group_outings',
        'help_comments', 'help_photos', 'help_requests',
        'item_ratings', 'lf_comments', 'listings', 'lost_found_items',
        'moderation_queue', 'notifications', 'outing_comments',
        'outing_participants', 'promenade_likes', 'promenades',
        'request_comments', 'reviews', 'service_requests',
        'theme_memberships', 'theme_profiles', 'trust_interactions'
    )
    AND (
        -- USING contient auth.uid/role/jwt non wrappé
        (
            p.qual ~ 'auth\.(uid|role|jwt)\(\)'
            AND p.qual !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)'
        )
        OR
        -- WITH CHECK contient auth.uid/role/jwt non wrappé
        (
            p.with_check ~ 'auth\.(uid|role|jwt)\(\)'
            AND p.with_check !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)'
        )
        OR
        -- current_setting non wrappé
        (
            p.qual ~ 'current_setting\('
            AND p.qual !~ '\(SELECT\s+current_setting\('
        )
        OR
        (
            p.with_check ~ 'current_setting\('
            AND p.with_check !~ '\(SELECT\s+current_setting\('
        )
    )
ORDER BY
    p.tablename,
    p.policyname;

-- ============================================================
-- RÉSULTAT ATTENDU
-- ~63 lignes = 63 policies non encore corrigées
-- Si 0 lignes → la migration v1 a déjà tout corrigé (re-lancer
--   le linter pour confirmer)
-- Si < 63 lignes → certaines ont été corrigées entre temps
-- Si > 63 lignes → de nouvelles policies ont été ajoutées
--
-- Partage le résultat CSV pour générer migration_auth_rls_v2.sql
-- ============================================================
