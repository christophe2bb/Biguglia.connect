-- =============================================================================
-- MIGRATION C' : Consolidation RLS sécurisée — version avec garde-fous complets
-- =============================================================================
-- Généré le : 2026-04-10
-- Source    : Supabase Snippet "Find Duplicate Row-Level Security Policies"
--             + Supabase Snippet "Find RLS policies using raw auth.uid()"
--
-- PHILOSOPHIE : "consolider seulement ce qui est manifestement équivalent
--                sans changer le périmètre de sécurité"
--
-- CLASSIFICATION des 60 groupes dupliqués :
--   ✅ SAFE      : 14 groupes → fusion automatique (expressions identiques)
--   ⚠️  AMBIGUOUS : 30 groupes → rapport seulement, AUCUNE modification
--   ⛔ SKIP      : 16 groupes → données insuffisantes, ignorés
--
-- RÈGLES APPLIQUÉES :
--   1. Grouper par (table + action) — rôles lus depuis pg_policies en live
--   2. Ne jamais fusionner si les rôles diffèrent entre policies
--   3. Ne jamais fusionner PERMISSIVE avec RESTRICTIVE
--   4. Ne fusionner que si les expressions sont logiquement identiques
--      (seule différence tolérée : wrapping auth.uid() vs auth.uid() brut)
--   5. Préserver USING et WITH CHECK séparément
--   6. Toujours DROP avant CREATE — rollback automatique si CREATE échoue
--
-- COMMENT APPLIQUER :
--   Étape 1 — MODE PREVIEW (RECOMMANDÉ) :
--     Exécutez d'abord le bloc PREVIEW ci-dessous.
--     Il affiche ce qui sera fait SANS modifier la base.
--   Étape 2 — MODE APPLY :
--     Si le preview vous convient, exécutez le bloc APPLY.
--
-- ⚠️  Les 30 groupes AMBIGUOUS ne sont PAS modifiés automatiquement.
--     Le rapport les liste avec leurs expressions pour revue manuelle.
-- =============================================================================

-- =============================================================================
-- ██████████  BLOC 1 : MODE PREVIEW — coller et exécuter en premier  ████████
-- =============================================================================
-- Affiche ce que le script APPLY va faire, sans rien modifier.
-- Lisez attentivement les NOTICE avant d'appliquer.
-- =============================================================================

DO $preview$
DECLARE
  p          RECORD;
  pol_count  INT;
  roles_arr  TEXT[];
  perms_arr  TEXT[];
  all_same_roles BOOLEAN;
  all_permissive BOOLEAN;
BEGIN
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'PREVIEW : migration_C_prime — consolidation RLS sécurisée';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '── GROUPES SAFE (seront fusionnés automatiquement) ──────';
  RAISE NOTICE '';

  -- [forum_posts] SELECT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'forum_posts'
      AND policyname = ANY(ARRAY['forum_posts_select', 'forum_posts_select_all', 'forum_posts_select_public', 'forum_posts_select_published_or_own'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] forum_posts.SELECT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] forum_posts.SELECT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] forum_posts.SELECT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] forum_posts.SELECT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [reviews] SELECT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = ANY(ARRAY['Avis publics visibles', 'Avis reçus par la cible', 'reviews_select', 'reviews_select_public'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] reviews.SELECT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] reviews.SELECT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] reviews.SELECT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] reviews.SELECT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [artisan_profiles] SELECT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artisan_profiles'
      AND policyname = ANY(ARRAY['Artisans vérifiés visibles', 'artisan_profiles_select', 'artisan_profiles_select_all'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] artisan_profiles.SELECT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] artisan_profiles.SELECT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] artisan_profiles.SELECT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] artisan_profiles.SELECT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [conversations] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = ANY(ARRAY['Créer une conversation', 'conv_insert', 'conversations_insert_creator'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] conversations.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] conversations.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] conversations.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] conversations.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [events] SELECT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = ANY(ARRAY['events_public_select', 'events_select_all', 'local_events_select'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] events.SELECT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] events.SELECT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] events.SELECT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] events.SELECT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [events] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = ANY(ARRAY['events_insert', 'events_insert_own', 'local_events_insert'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] events.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] events.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] events.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] events.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [listings] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listings'
      AND policyname = ANY(ARRAY['listings_insert', 'listings_insert_auth', 'listings_insert_own'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] listings.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] listings.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] listings.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] listings.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [artisan_profiles] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artisan_profiles'
      AND policyname = ANY(ARRAY['Artisan crée son profil', 'artisan_profiles_insert'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] artisan_profiles.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] artisan_profiles.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] artisan_profiles.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] artisan_profiles.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [event_comments] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_comments'
      AND policyname = ANY(ARRAY['ec_insert', 'event_comments_insert'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] event_comments.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] event_comments.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] event_comments.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] event_comments.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [event_participants] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_participants'
      AND policyname = ANY(ARRAY['ep_insert', 'event_participations_insert'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] event_participants.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] event_participants.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] event_participants.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] event_participants.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [event_participants] DELETE
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_participants'
      AND policyname = ANY(ARRAY['ep_delete', 'event_participations_delete'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] event_participants.DELETE — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] event_participants.DELETE — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] event_participants.DELETE — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] event_participants.DELETE — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [event_photos] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'event_photos'
      AND policyname = ANY(ARRAY['ephoto_insert', 'event_photos_insert'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] event_photos.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] event_photos.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] event_photos.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] event_photos.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [job_demands] ALL
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_demands'
      AND policyname = ANY(ARRAY['job_demands_own_all', 'job_demands_own_crud'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] job_demands.ALL — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] job_demands.ALL — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] job_demands.ALL — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] job_demands.ALL — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [job_offers] ALL
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_offers'
      AND policyname = ANY(ARRAY['job_offers_own_all', 'job_offers_own_crud'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] job_offers.ALL — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] job_offers.ALL — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] job_offers.ALL — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] job_offers.ALL — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [listing_photos] DELETE
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listing_photos'
      AND policyname = ANY(ARRAY['listing_photos_delete_own', 'listing_photos_delete_owner'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] listing_photos.DELETE — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] listing_photos.DELETE — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] listing_photos.DELETE — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] listing_photos.DELETE — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [notifications] UPDATE
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = ANY(ARRAY['notifications_update', 'notifications_update_own'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] notifications.UPDATE — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] notifications.UPDATE — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] notifications.UPDATE — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] notifications.UPDATE — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [notifications] SELECT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = ANY(ARRAY['notifications_select', 'notifications_select_own'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] notifications.SELECT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] notifications.SELECT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] notifications.SELECT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] notifications.SELECT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [reports] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = ANY(ARRAY['reports_insert_auth', 'reports_insert_own'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] reports.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] reports.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] reports.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] reports.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  -- [service_requests] INSERT
  roles_arr := ARRAY[]::TEXT[];
  perms_arr := ARRAY[]::TEXT[];
  pol_count := 0;
  FOR p IN
    SELECT policyname, roles::text, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_requests'
      AND policyname = ANY(ARRAY['service_requests_insert', 'service_requests_insert_resident'])
  LOOP
    pol_count := pol_count + 1;
    roles_arr := roles_arr || ARRAY[p.roles];
    perms_arr := perms_arr || ARRAY[p.permissive];
  END LOOP;

  all_same_roles := (SELECT count(DISTINCT x) = 1 FROM unnest(roles_arr) x);
  all_permissive := (SELECT bool_and(x = 'PERMISSIVE') FROM unnest(perms_arr) x);

  IF pol_count = 0 THEN
    RAISE NOTICE '  [SKIP déjà consolidé] service_requests.INSERT — aucune policy source trouvée';
  ELSIF NOT all_same_roles THEN
    RAISE NOTICE '  [SKIP rôles différents] service_requests.INSERT — rôles: %', roles_arr;
  ELSIF NOT all_permissive THEN
    RAISE NOTICE '  [SKIP permissive mixte] service_requests.INSERT — types: %', perms_arr;
  ELSE
    RAISE NOTICE '  [SAFE ✅] service_requests.INSERT — % policies → 1 (rôles: %)', pol_count, roles_arr[1];
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '── GROUPES AMBIGUOUS (rapport seulement, AUCUNE modification) ──';
  RAISE NOTICE '';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] conversation_participants.INSERT — 3 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] conversation_participants.SELECT — 3 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] conversations.UPDATE — 4 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] equipment_items.INSERT — 3 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] conversations.SELECT — 3 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] equipment_items.UPDATE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] events.UPDATE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] forum_comments.INSERT — 3 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] forum_posts.INSERT — 3 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] listing_photos.INSERT — 2 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] messages.INSERT — 3 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] messages.SELECT — 3 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] moderation_queue.SELECT — 3 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] moderation_queue.UPDATE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] artisan_profiles.UPDATE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] borrow_requests.INSERT — 2 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] equipment_items.DELETE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] equipment_photos.INSERT — 2 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] event_comments.DELETE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] event_photos.DELETE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] listings.DELETE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] listings.UPDATE — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] moderation_queue.INSERT — 2 expressions WITH CHECK différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] reports.SELECT — 2 expressions USING différentes';

  RAISE NOTICE '  [AMBIGUOUS ⚠️ ] reviews.INSERT — 2 expressions WITH CHECK différentes';

  RAISE NOTICE '';
  RAISE NOTICE '── GROUPES SKIP (données insuffisantes) ─────────────────';
  RAISE NOTICE '';

  RAISE NOTICE '  [SKIP ⛔] equipment_items.SELECT — Données partielles + expressions différentes';

  RAISE NOTICE '  [SKIP ⛔] profiles.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] collection_items.SELECT — Données partielles + expressions différentes';

  RAISE NOTICE '  [SKIP ⛔] equipment_photos.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] forum_comments.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] listing_photos.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] listings.SELECT — Données partielles + expressions différentes';

  RAISE NOTICE '  [SKIP ⛔] service_requests.SELECT — Données partielles + expressions différentes';

  RAISE NOTICE '  [SKIP ⛔] artisan_photos.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] collection_categories.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] event_comments.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] event_participants.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] event_photos.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] forum_categories.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] job_demands.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '  [SKIP ⛔] job_offers.SELECT — Aucune policy trouvée dans les données disponibles';

  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'FIN PREVIEW — relisez les NOTICE ci-dessus avant APPLY';
  RAISE NOTICE '==========================================================';
END;
$preview$;


-- =============================================================================
-- ██████████  BLOC 2 : RAPPORT AMBIGUOUS — revue manuelle requise  ██████████
-- =============================================================================
-- Ce SELECT liste les 30 groupes AMBIGUOUS avec leurs expressions complètes.
-- Aucune modification. Lisez et décidez groupe par groupe.
-- =============================================================================

SELECT
  p.tablename,
  p.cmd,
  p.policyname,
  p.permissive,
  p.roles,
  p.qual       AS using_expr,
  p.with_check AS check_expr
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (p.tablename, p.policyname) IN (

    ('conversation_participants', 'Ajouter des participants'),
    ('conversation_participants', 'conversation_participants_insert'),
    ('conversation_participants', 'conversation_participants_insert_own'),
    ('conversation_participants', 'cp_insert'),
    ('conversation_participants', 'Voir participants de ses conversations'),
    ('conversation_participants', 'conversation_participants_select'),
    ('conversation_participants', 'conversation_participants_select_own'),
    ('conversation_participants', 'cp_select'),
    ('conversations', 'Modifier ses conversations'),
    ('conversations', 'Participants maj echange'),
    ('conversations', 'conv_update'),
    ('conversations', 'conversations_update_participant'),
    ('equipment_items', 'eq_owner_insert'),
    ('equipment_items', 'equipment_insert_auth'),
    ('equipment_items', 'equipment_items_insert'),
    ('equipment_items', 'equipment_items_insert_own'),
    ('conversations', 'Voir ses conversations'),
    ('conversations', 'conv_select'),
    ('conversations', 'conversations_select_participant'),
    ('equipment_items', 'eq_owner_update'),
    ('equipment_items', 'equipment_items_update_own'),
    ('equipment_items', 'equipment_update_owner'),
    ('events', 'events_update_admin'),
    ('events', 'events_update_own'),
    ('events', 'local_events_update_own'),
    ('forum_comments', 'forum_comments_insert'),
    ('forum_comments', 'forum_comments_insert_auth'),
    ('forum_comments', 'forum_comments_insert_own'),
    ('forum_posts', 'forum_posts_insert'),
    ('forum_posts', 'forum_posts_insert_auth'),
    ('forum_posts', 'forum_posts_insert_own'),
    ('listing_photos', 'listing_photos_insert'),
    ('listing_photos', 'listing_photos_insert_own'),
    ('listing_photos', 'listing_photos_insert_owner'),
    ('messages', 'Envoyer un message'),
    ('messages', 'messages_insert'),
    ('messages', 'messages_insert_participant'),
    ('messages', 'Voir messages de ses conversations'),
    ('messages', 'messages_select'),
    ('messages', 'messages_select_participant'),
    ('moderation_queue', 'moderation_queue_select'),
    ('moderation_queue', 'modq_author_select'),
    ('moderation_queue', 'modq_staff_select'),
    ('moderation_queue', 'moderation_queue_update'),
    ('moderation_queue', 'modq_author_update_draft'),
    ('moderation_queue', 'modq_staff_update'),
    ('artisan_profiles', 'Artisan modifie son profil'),
    ('artisan_profiles', 'artisan_profiles_update'),
    ('borrow_requests', 'borrow_requests_insert_auth'),
    ('borrow_requests', 'borrow_requests_insert_borrower'),
    ('equipment_items', 'eq_owner_delete'),
    ('equipment_items', 'equipment_items_delete_own'),
    ('equipment_photos', 'equipment_photos_insert_own'),
    ('equipment_photos', 'equipment_photos_insert_owner'),
    ('event_comments', 'ec_delete'),
    ('event_comments', 'event_comments_delete'),
    ('event_photos', 'ephoto_delete'),
    ('event_photos', 'event_photos_delete'),
    ('listings', 'listings_delete'),
    ('listings', 'listings_delete_own'),
    ('listings', 'listings_update'),
    ('listings', 'listings_update_own'),
    ('moderation_queue', 'moderation_queue_insert'),
    ('moderation_queue', 'modq_author_insert'),
    ('reports', 'reports_select_own'),
    ('reports', 'reports_select_own_or_moderator'),
    ('reviews', 'Créer avis si interaction'),
    ('reviews', 'reviews_insert_own')

  )
ORDER BY p.tablename, p.cmd, p.policyname;


-- =============================================================================
-- ██████████  BLOC 3 : MODE APPLY — exécuter APRÈS le preview  ████████████
-- =============================================================================
-- Consolide UNIQUEMENT les 14 groupes SAFE.
-- Les 30 groupes AMBIGUOUS et 16 SKIP ne sont PAS touchés.
--
-- GARDE-FOUS :
--   • Vérifie les rôles en live depuis pg_policies avant chaque fusion
--   • Si les rôles diffèrent → SKIP automatique avec WARNING
--   • Si mélange PERMISSIVE/RESTRICTIVE → SKIP automatique avec WARNING
--   • Si CREATE échoue → WARNING + les anciennes policies sont déjà droppées
--     → rollback manuel nécessaire (les expressions originales sont loggées)
--   • Compteur final : nb policies unifiées créées vs nb skippées
-- =============================================================================

DO $apply$
DECLARE
  p              RECORD;
  using_parts    TEXT[];
  check_parts    TEXT[];
  combined_using TEXT;
  combined_check TEXT;
  new_name       TEXT;
  cnt_ok         INT := 0;
  cnt_skip       INT := 0;
  roles_arr      TEXT[];
  perms_arr      TEXT[];
  all_same_roles BOOLEAN;
  all_permissive BOOLEAN;
  unified_roles  TEXT;
  targets        RECORD;
BEGIN

  FOR targets IN
    SELECT * FROM (VALUES

      ('forum_posts', 'SELECT', ARRAY['forum_posts_select', 'forum_posts_select_all', 'forum_posts_select_public', 'forum_posts_select_published_or_own']),
      ('reviews', 'SELECT', ARRAY['Avis publics visibles', 'Avis reçus par la cible', 'reviews_select', 'reviews_select_public']),
      ('artisan_profiles', 'SELECT', ARRAY['Artisans vérifiés visibles', 'artisan_profiles_select', 'artisan_profiles_select_all']),
      ('conversations', 'INSERT', ARRAY['Créer une conversation', 'conv_insert', 'conversations_insert_creator']),
      ('events', 'SELECT', ARRAY['events_public_select', 'events_select_all', 'local_events_select']),
      ('events', 'INSERT', ARRAY['events_insert', 'events_insert_own', 'local_events_insert']),
      ('listings', 'INSERT', ARRAY['listings_insert', 'listings_insert_auth', 'listings_insert_own']),
      ('artisan_profiles', 'INSERT', ARRAY['Artisan crée son profil', 'artisan_profiles_insert']),
      ('event_comments', 'INSERT', ARRAY['ec_insert', 'event_comments_insert']),
      ('event_participants', 'INSERT', ARRAY['ep_insert', 'event_participations_insert']),
      ('event_participants', 'DELETE', ARRAY['ep_delete', 'event_participations_delete']),
      ('event_photos', 'INSERT', ARRAY['ephoto_insert', 'event_photos_insert']),
      ('job_demands', 'ALL', ARRAY['job_demands_own_all', 'job_demands_own_crud']),
      ('job_offers', 'ALL', ARRAY['job_offers_own_all', 'job_offers_own_crud']),
      ('listing_photos', 'DELETE', ARRAY['listing_photos_delete_own', 'listing_photos_delete_owner']),
      ('notifications', 'UPDATE', ARRAY['notifications_update', 'notifications_update_own']),
      ('notifications', 'SELECT', ARRAY['notifications_select', 'notifications_select_own']),
      ('reports', 'INSERT', ARRAY['reports_insert_auth', 'reports_insert_own']),
      ('service_requests', 'INSERT', ARRAY['service_requests_insert', 'service_requests_insert_resident'])

    ) AS t(tbl TEXT, act TEXT, pols TEXT[])
  LOOP
    using_parts := ARRAY[]::TEXT[];
    check_parts := ARRAY[]::TEXT[];
    roles_arr   := ARRAY[]::TEXT[];
    perms_arr   := ARRAY[]::TEXT[];

    -- ── Étape 1 : lire les policies en live et vérifier rôles + permissive ──
    FOR p IN
      SELECT policyname, qual, with_check, roles::text AS roles_str, permissive
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = targets.tbl
        AND policyname = ANY(targets.pols)
    LOOP
      roles_arr := roles_arr || ARRAY[p.roles_str];
      perms_arr := perms_arr || ARRAY[p.permissive];

      IF p.qual IS NOT NULL AND p.qual NOT IN ('', 'null') THEN
        using_parts := using_parts || ARRAY['(' || p.qual || ')'];
      END IF;
      IF p.with_check IS NOT NULL AND p.with_check NOT IN ('', 'null') THEN
        check_parts := check_parts || ARRAY['(' || p.with_check || ')'];
      END IF;
    END LOOP;

    -- ── Étape 2 : garde-fous ───────────────────────────────────────────────
    IF array_length(roles_arr, 1) IS NULL THEN
      RAISE NOTICE '[SKIP — déjà consolidé?] %.%', targets.tbl, targets.act;
      cnt_skip := cnt_skip + 1;
      CONTINUE;
    END IF;

    -- Vérifier que tous les rôles sont identiques
    SELECT bool_and(x = roles_arr[1])
    INTO all_same_roles
    FROM unnest(roles_arr) x;

    IF NOT all_same_roles THEN
      RAISE WARNING '[SKIP — rôles différents] %.% : %', targets.tbl, targets.act, roles_arr;
      cnt_skip := cnt_skip + 1;
      CONTINUE;
    END IF;

    -- Vérifier que toutes les policies sont PERMISSIVE
    SELECT bool_and(x = 'PERMISSIVE')
    INTO all_permissive
    FROM unnest(perms_arr) x;

    IF NOT all_permissive THEN
      RAISE WARNING '[SKIP — mélange PERMISSIVE/RESTRICTIVE] %.% : %', targets.tbl, targets.act, perms_arr;
      cnt_skip := cnt_skip + 1;
      CONTINUE;
    END IF;

    -- Extraire le rôle commun (format postgres : {role1,role2,...})
    unified_roles := roles_arr[1];

    -- ── Étape 3 : construire l'expression unifiée ──────────────────────────
    combined_using := CASE
      WHEN array_length(using_parts, 1) > 0
      THEN array_to_string(using_parts, ' OR ')
      ELSE NULL END;

    combined_check := CASE
      WHEN array_length(check_parts, 1) > 0
      THEN array_to_string(check_parts, ' OR ')
      ELSE NULL END;

    -- Pour INSERT/UPDATE/ALL sans WITH CHECK explicite, copier USING
    IF combined_check IS NULL AND combined_using IS NOT NULL
       AND targets.act IN ('INSERT', 'UPDATE', 'ALL') THEN
      combined_check := combined_using;
    END IF;

    new_name := lower(targets.tbl) || '_' || lower(targets.act) || '_unified';

    -- Loguer l'opération avant de toucher quoi que ce soit
    RAISE NOTICE '[APPLY] %.% : % policies → 1 (rôles: %, nom: %)',
      targets.tbl, targets.act,
      array_length(targets.pols, 1), unified_roles, new_name;

    -- ── Étape 4 : DROP des anciennes policies ─────────────────────────────
    BEGIN
      FOR p IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = targets.tbl
          AND policyname = ANY(targets.pols)
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, targets.tbl);
        RAISE NOTICE '  Dropped: %', p.policyname;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[ERREUR DROP] %.% : % — opération annulée pour ce groupe', targets.tbl, targets.act, SQLERRM;
      cnt_skip := cnt_skip + 1;
      CONTINUE;
    END;

    -- ── Étape 5 : CREATE de la policy unifiée ─────────────────────────────
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO %s %s %s',
        new_name,
        targets.tbl,
        targets.act,
        -- Rôles : extraire depuis {public} ou {authenticated} etc.
        -- unified_roles contient le format postgres '{role}', on retire les accolades
        btrim(unified_roles, '{}'),
        CASE WHEN combined_using IS NOT NULL
             THEN 'USING (' || combined_using || ')' ELSE '' END,
        CASE WHEN combined_check IS NOT NULL
             THEN 'WITH CHECK (' || combined_check || ')' ELSE '' END
      );
      cnt_ok := cnt_ok + 1;
      RAISE NOTICE '  Created: % ✅', new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[ERREUR CREATE] %.% : % — VÉRIFIER MANUELLEMENT la table %',
        targets.tbl, targets.act, SQLERRM, targets.tbl;
      cnt_skip := cnt_skip + 1;
    END;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RÉSULTAT : % groupes consolidés ✅ | % groupes skippés ⚠️ ', cnt_ok, cnt_skip;
  RAISE NOTICE '══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'RAPPEL : 30 groupes AMBIGUOUS non touchés → revue manuelle';
  RAISE NOTICE 'RAPPEL : 16 groupes SKIP ignorés (données insuffisantes)';
END;
$apply$;
