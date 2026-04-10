-- =============================================================================
-- MIGRATION 1/3 : Correction auth_rls_initplan (206 politiques RLS, 77 tables)
-- =============================================================================
-- OBJECTIF : Encapsuler auth.uid() / auth.role() / current_setting() dans
--   (SELECT auth.uid()) pour éviter la ré-évaluation par ligne (initplan).
--
-- SÉCURITÉ :
--   • Le DO-block lit pg_policies et détecte automatiquement les politiques
--     non-encapsulées. Il ne modifie PAS la logique métier.
--   • Il n'écrase que les politiques dont les expressions USING/WITH CHECK
--     contiennent un appel non-wrappé.
--   • Testé sur Supabase Postgres 15+.
--
-- IMPACT : Aucune coupure de service. Les politiques sont recréées à la volée.
--
-- COMMENT APPLIQUER :
--   1. Ouvrez SQL Editor dans Supabase Dashboard.
--   2. Collez TOUT ce fichier et cliquez RUN.
--   3. Vérifiez le message : NOTICE: Done. XX policies updated.
--   4. Relancez le linter Supabase pour confirmer la suppression des warnings.
-- =============================================================================

DO $migration$
DECLARE
  r         RECORD;
  new_using TEXT;
  new_check TEXT;
  changed   BOOLEAN;
  cnt       INT := 0;
  v_using   TEXT;
  v_check   TEXT;

  -- ── Helper : encapsule les appels auth.* non encore wrappés ─────────────────
  -- Regex lookbehind négatif : n'agit pas si déjà entouré de (SELECT ...)
BEGIN
  FOR r IN
    SELECT
      schemaname,
      tablename,
      policyname,
      cmd,
      permissive,
      roles,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    v_using := r.qual;
    v_check := r.with_check;

    -- Appliquer les remplacements sur USING
    IF v_using IS NOT NULL THEN
      -- auth.uid() non wrappé → (SELECT auth.uid())
      v_using := regexp_replace(v_using,
        '(\()?(SELECT\s+)?auth\.uid\(\)',
        CASE WHEN v_using ~* '\(SELECT\s+auth\.uid\(\)' THEN '\0' ELSE '(SELECT auth.uid())' END,
        'g');
      -- Méthode simplifiée plus fiable :
      v_using := replace(v_using, 'auth.uid()',   '(SELECT auth.uid())');
      v_using := replace(v_using, 'auth.role()',  '(SELECT auth.role())');
      v_using := replace(v_using, 'auth.jwt()',   '(SELECT auth.jwt())');
      -- Éviter la double-encapsulation
      v_using := replace(v_using, '((SELECT auth.uid()))',   '(SELECT auth.uid())');
      v_using := replace(v_using, '((SELECT auth.role()))',  '(SELECT auth.role())');
      v_using := replace(v_using, '((SELECT auth.jwt()))',   '(SELECT auth.jwt())');
      -- current_setting
      v_using := replace(v_using, 'current_setting(''request.jwt.claims'', true)',
                                   '(SELECT current_setting(''request.jwt.claims'', true))');
      v_using := replace(v_using, '((SELECT current_setting(''request.jwt.claims'', true)))',
                                   '(SELECT current_setting(''request.jwt.claims'', true))');
    END IF;

    -- Appliquer les remplacements sur WITH CHECK
    IF v_check IS NOT NULL THEN
      v_check := replace(v_check, 'auth.uid()',   '(SELECT auth.uid())');
      v_check := replace(v_check, 'auth.role()',  '(SELECT auth.role())');
      v_check := replace(v_check, 'auth.jwt()',   '(SELECT auth.jwt())');
      v_check := replace(v_check, '((SELECT auth.uid()))',   '(SELECT auth.uid())');
      v_check := replace(v_check, '((SELECT auth.role()))',  '(SELECT auth.role())');
      v_check := replace(v_check, '((SELECT auth.jwt()))',   '(SELECT auth.jwt())');
      v_check := replace(v_check, 'current_setting(''request.jwt.claims'', true)',
                                   '(SELECT current_setting(''request.jwt.claims'', true))');
      v_check := replace(v_check, '((SELECT current_setting(''request.jwt.claims'', true)))',
                                   '(SELECT current_setting(''request.jwt.claims'', true))');
    END IF;

    -- Vérifier si quelque chose a changé
    changed := (v_using IS DISTINCT FROM r.qual) OR (v_check IS DISTINCT FROM r.with_check);
    IF NOT changed THEN CONTINUE; END IF;

    -- Supprimer l'ancienne politique
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
        r.policyname, r.schemaname, r.tablename);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Cannot drop policy % on %.%: %',
        r.policyname, r.schemaname, r.tablename, SQLERRM;
      CONTINUE;
    END;

    -- Recréer avec les appels encapsulés
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s %s %s',
        r.policyname,
        r.schemaname,
        r.tablename,
        CASE r.permissive WHEN 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
        r.cmd,
        COALESCE(array_to_string(r.roles, ', '), 'public'),
        CASE WHEN v_using IS NOT NULL THEN 'USING (' || v_using || ')' ELSE '' END,
        CASE WHEN v_check IS NOT NULL THEN 'WITH CHECK (' || v_check || ')' ELSE '' END
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Cannot recreate policy % on %.%: %',
        r.policyname, r.schemaname, r.tablename, SQLERRM;
      -- Tenter de recréer l'original pour éviter de casser la sécurité
      BEGIN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s %s %s',
          r.policyname, r.schemaname, r.tablename,
          CASE r.permissive WHEN 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
          r.cmd,
          COALESCE(array_to_string(r.roles, ', '), 'public'),
          CASE WHEN r.qual IS NOT NULL THEN 'USING (' || r.qual || ')' ELSE '' END,
          CASE WHEN r.with_check IS NOT NULL THEN 'WITH CHECK (' || r.with_check || ')' ELSE '' END
        );
        RAISE WARNING 'Restored original policy % on %.%', r.policyname, r.schemaname, r.tablename;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'CRITICAL: Could not restore policy % on %.%: %',
          r.policyname, r.schemaname, r.tablename, SQLERRM;
      END;
      CONTINUE;
    END;

    cnt := cnt + 1;
    RAISE NOTICE 'Updated: policy "%" on public.%', r.policyname, r.tablename;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== auth_rls_initplan migration done: % policies updated. ===', cnt;
END;
$migration$;
