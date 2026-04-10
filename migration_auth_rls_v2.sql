-- ============================================================
-- MIGRATION auth_rls_initplan — v2 (policy-centric)
-- ============================================================
-- Date        : 2026-04-10
-- Tables      : 36 tables (identifiées via linter CSV file 11)
-- Policies    : ~63 restantes après la v1
-- Objectif    : wrapper auth.uid() / auth.role() / auth.jwt()
--               et current_setting() dans (SELECT ...) pour
--               éliminer les per-row initplan re-evaluations
--
-- DIFFÉRENCES vs v1 :
--   ✅ Lecture LIVE de pg_policies (pas de CSV ni de liste fixe)
--   ✅ Correction CONDITIONNELLE par policy, pas par table
--   ✅ Double-wrapping impossible (regex vérifie (SELECT auth.xxx)
--      déjà présent avant toute modification)
--   ✅ Rôles et flag permissive/restrictive préservés à l'identique
--   ✅ USING et WITH CHECK traités séparément
--   ✅ NOTICE avant chaque DROP/CREATE
--   ✅ WARNING si CREATE échoue (pas de rollback silencieux)
--   ✅ Compteur final : N policies mises à jour
--
-- APPLIQUER :
--   1. Coller dans le Supabase SQL Editor
--   2. Exécuter
--   3. Résultat attendu : "auth_rls_v2 done: XX policies updated."
--   4. Relancer le linter → auth_rls_initplan devrait être à 0
-- ============================================================

DO $$
DECLARE
    r            RECORD;
    v_qual       TEXT;
    v_check      TEXT;
    v_qual_new   TEXT;
    v_check_new  TEXT;
    v_changed    BOOLEAN;
    v_updated    INTEGER := 0;
    v_skipped    INTEGER := 0;
    v_roles_sql  TEXT;
    v_perm_kw    TEXT;
    v_cmd_sql    TEXT;

    -- Pattern : appel direct auth.xxx() NON précédé de (SELECT
    -- Utilise negative lookbehind via position check
BEGIN

    FOR r IN
        SELECT
            p.schemaname,
            p.tablename,
            p.policyname,
            p.cmd,
            p.roles,
            p.permissive,
            p.qual        AS qual,
            p.with_check  AS with_check
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
        ORDER BY p.tablename, p.policyname
    LOOP
        v_qual      := r.qual;
        v_check     := r.with_check;
        v_qual_new  := r.qual;
        v_check_new := r.with_check;
        v_changed   := FALSE;

        -- --------------------------------------------------------
        -- CORRECTION auth.uid()
        -- Ne wrapper que les occurrences non déjà wrappées.
        -- Règle : remplace auth.uid() par (SELECT auth.uid())
        --         SAUF si déjà précédé de "SELECT " (lookback manuel).
        -- On utilise regexp_replace avec une regex qui s'assure
        -- que l'occurrence n'est pas déjà dans (SELECT ...).
        -- --------------------------------------------------------

        -- USING : auth.uid()
        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'auth\.uid\(\)'
           AND v_qual_new !~ '\(SELECT\s+auth\.uid\(\)' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})auth\.uid\(\)',
                '(SELECT auth.uid())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- WITH CHECK : auth.uid()
        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'auth\.uid\(\)'
           AND v_check_new !~ '\(SELECT\s+auth\.uid\(\)' THEN
            v_check_new := regexp_replace(
                v_check_new,
                '(?<!\(SELECT\s{0,20})auth\.uid\(\)',
                '(SELECT auth.uid())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- --------------------------------------------------------
        -- CORRECTION auth.role()
        -- --------------------------------------------------------

        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'auth\.role\(\)'
           AND v_qual_new !~ '\(SELECT\s+auth\.role\(\)' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})auth\.role\(\)',
                '(SELECT auth.role())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'auth\.role\(\)'
           AND v_check_new !~ '\(SELECT\s+auth\.role\(\)' THEN
            v_check_new := regexp_replace(
                v_check_new,
                '(?<!\(SELECT\s{0,20})auth\.role\(\)',
                '(SELECT auth.role())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- --------------------------------------------------------
        -- CORRECTION auth.jwt()
        -- --------------------------------------------------------

        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'auth\.jwt\(\)'
           AND v_qual_new !~ '\(SELECT\s+auth\.jwt\(\)' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})auth\.jwt\(\)',
                '(SELECT auth.jwt())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'auth\.jwt\(\)'
           AND v_check_new !~ '\(SELECT\s+auth\.jwt\(\)' THEN
            v_check_new := regexp_replace(
                v_check_new,
                '(?<!\(SELECT\s{0,20})auth\.jwt\(\)',
                '(SELECT auth.jwt())',
                'g'
            );
            v_changed := TRUE;
        END IF;

        -- --------------------------------------------------------
        -- CORRECTION current_setting(...)
        -- --------------------------------------------------------

        IF v_qual_new IS NOT NULL
           AND v_qual_new ~ 'current_setting\('
           AND v_qual_new !~ '\(SELECT\s+current_setting\(' THEN
            v_qual_new := regexp_replace(
                v_qual_new,
                '(?<!\(SELECT\s{0,20})current_setting\(',
                '(SELECT current_setting(',
                'g'
            );
            -- Fermer la parenthèse supplémentaire ouverte
            -- current_setting(X) → (SELECT current_setting(X))
            -- La regex ci-dessus ajoute une ( avant current_setting
            -- On doit ajouter un ) après la parenthèse fermante du call
            -- Ce cas est plus complexe — on utilise une approche différente:
            -- Revertons et utilisons une regex complète
            v_qual_new := r.qual; -- reset
            v_qual_new := regexp_replace(
                v_qual_new,
                'current_setting\(([^)]+)\)',
                '(SELECT current_setting(\1))',
                'g'
            );
            -- Vérifie qu'on n'a pas double-wrappé
            IF v_qual_new ~ '\(SELECT\s+\(SELECT\s+current_setting' THEN
                v_qual_new := r.qual; -- annule si double wrapping détecté
                RAISE WARNING 'table=% policy=% : current_setting double-wrap detected in USING — SKIPPED',
                    r.tablename, r.policyname;
            ELSE
                v_changed := TRUE;
            END IF;
        END IF;

        IF v_check_new IS NOT NULL
           AND v_check_new ~ 'current_setting\('
           AND v_check_new !~ '\(SELECT\s+current_setting\(' THEN
            v_check_new := regexp_replace(
                v_check_new,
                'current_setting\(([^)]+)\)',
                '(SELECT current_setting(\1))',
                'g'
            );
            IF v_check_new ~ '\(SELECT\s+\(SELECT\s+current_setting' THEN
                v_check_new := r.with_check;
                RAISE WARNING 'table=% policy=% : current_setting double-wrap detected in WITH CHECK — SKIPPED',
                    r.tablename, r.policyname;
            ELSE
                v_changed := TRUE;
            END IF;
        END IF;

        -- --------------------------------------------------------
        -- Aucun changement → passer à la policy suivante
        -- --------------------------------------------------------
        IF NOT v_changed THEN
            v_skipped := v_skipped + 1;
            RAISE NOTICE '[SKIP] %.% (%) — already clean or no match',
                r.tablename, r.policyname, r.cmd;
            CONTINUE;
        END IF;

        -- --------------------------------------------------------
        -- Construire les fragments SQL pour la re-création
        -- --------------------------------------------------------

        -- Rôles : préserver les rôles originaux
        IF r.roles = '{public}' OR r.roles IS NULL OR array_length(r.roles, 1) = 0 THEN
            v_roles_sql := 'TO PUBLIC';
        ELSE
            v_roles_sql := 'TO ' || array_to_string(r.roles, ', ');
        END IF;

        -- PERMISSIVE / RESTRICTIVE
        IF r.permissive = 'PERMISSIVE' THEN
            v_perm_kw := 'PERMISSIVE';
        ELSE
            v_perm_kw := 'RESTRICTIVE';
        END IF;

        -- CMD : ALL / SELECT / INSERT / UPDATE / DELETE
        v_cmd_sql := COALESCE(r.cmd, 'ALL');

        -- --------------------------------------------------------
        -- DROP + CREATE
        -- --------------------------------------------------------
        RAISE NOTICE '[UPDATE] %.% (%) — dropping and recreating',
            r.tablename, r.policyname, r.cmd;

        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename
        );

        BEGIN
            -- Construire la commande CREATE dynamiquement
            -- selon qu'on a USING, WITH CHECK, ou les deux
            IF v_qual_new IS NOT NULL AND v_check_new IS NOT NULL THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR %s %s USING (%s) WITH CHECK (%s)',
                    r.policyname,
                    r.schemaname,
                    r.tablename,
                    v_perm_kw,
                    v_cmd_sql,
                    v_roles_sql,
                    v_qual_new,
                    v_check_new
                );
            ELSIF v_qual_new IS NOT NULL THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR %s %s USING (%s)',
                    r.policyname,
                    r.schemaname,
                    r.tablename,
                    v_perm_kw,
                    v_cmd_sql,
                    v_roles_sql,
                    v_qual_new
                );
            ELSIF v_check_new IS NOT NULL THEN
                EXECUTE format(
                    'CREATE POLICY %I ON %I.%I AS %s FOR %s %s WITH CHECK (%s)',
                    r.policyname,
                    r.schemaname,
                    r.tablename,
                    v_perm_kw,
                    v_cmd_sql,
                    v_roles_sql,
                    v_check_new
                );
            ELSE
                RAISE WARNING '[ERROR] table=% policy=% : both qual and with_check are NULL — policy dropped but not recreated!',
                    r.tablename, r.policyname;
                CONTINUE;
            END IF;

            v_updated := v_updated + 1;

        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[CREATE FAILED] table=% policy=% : % — manual intervention required',
                r.tablename, r.policyname, SQLERRM;
            -- La policy a déjà été droppée : signaler clairement
            RAISE WARNING '[CRITICAL] Policy %.% was DROPPED but CREATE failed. Re-create manually!',
                r.tablename, r.policyname;
        END;

    END LOOP;

    RAISE NOTICE '=== auth_rls_v2 done: % policies updated, % skipped (already clean). ===',
        v_updated, v_skipped;

END $$;

-- ============================================================
-- VÉRIFICATION POST-MIGRATION (read-only)
-- Coller et exécuter séparément pour confirmer le résultat.
-- Doit retourner 0 lignes si toutes les policies sont corrigées.
-- ============================================================

/*
SELECT
    p.tablename,
    p.policyname,
    p.cmd,
    p.qual        AS using_expr,
    p.with_check  AS with_check_expr
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
        (p.qual ~ 'auth\.(uid|role|jwt)\(\)' AND p.qual !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)')
        OR
        (p.with_check ~ 'auth\.(uid|role|jwt)\(\)' AND p.with_check !~ '\(SELECT\s+auth\.(uid|role|jwt)\(\)')
        OR
        (p.qual ~ 'current_setting\(' AND p.qual !~ '\(SELECT\s+current_setting\(')
        OR
        (p.with_check ~ 'current_setting\(' AND p.with_check !~ '\(SELECT\s+current_setting\(')
    )
ORDER BY p.tablename, p.policyname;
*/
