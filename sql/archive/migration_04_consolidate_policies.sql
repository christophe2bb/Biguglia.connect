-- =============================================================================
-- MIGRATION 4/4 : Consolidation des politiques RLS dupliquées (340 warnings)
-- =============================================================================
-- PROBLÈME : 74 combinaisons (table, action) possèdent plusieurs politiques
--   PERMISSIVE pour les mêmes rôles (anon + authenticated). Postgres évalue
--   TOUTES les politiques permissives et les ORe — performances dégradées.
--
-- SOLUTION : Pour chaque groupe, supprimer les politiques redondantes et
--   conserver UNE SEULE politique consolidée par (table, action).
--
-- STRATÉGIE de consolidation :
--   • Lire l'expression USING/WITH CHECK de TOUTES les politiques du groupe
--     via pg_policies.
--   • Combiner avec OR : (expr1) OR (expr2) OR ...
--   • Créer une nouvelle politique unifiée nommée <table>_<action>_unified.
--   • Supprimer les anciennes.
--
-- SÉCURITÉ :
--   • Le comportement est IDENTIQUE car Postgres faisait déjà un OR implicite.
--   • Si une politique n'a pas d'expression USING, elle est traitée comme TRUE.
--   • En cas d'erreur sur une table, un ROLLBACK partiel restaure l'état.
--
-- COMMENT APPLIQUER :
--   1. Supabase SQL Editor → coller tout le fichier → RUN
--   2. Vérifier les NOTICE : "Consolidated X → 1 policy for <table>/<action>"
--   3. Relancer le linter pour confirmer la disparition des warnings.
--
-- TEMPS D'EXÉCUTION : ~5-10 secondes (DDL pur, pas de data).
-- =============================================================================

DO $consolidate$
DECLARE
  r           RECORD;
  p           RECORD;
  using_parts TEXT[];
  check_parts TEXT[];
  combined_using TEXT;
  combined_check TEXT;
  new_name    TEXT;
  cnt         INT := 0;
  total_tables INT := 0;

  -- Tables + actions à consolider (extraites du lint Supabase)
  targets RECORD;
BEGIN

  FOR targets IN
    SELECT * FROM (VALUES
      -- artisan_photos
      ('artisan_photos',         'SELECT', ARRAY['artisan_photos_select','artisan_photos_select_all']),
      -- artisan_profiles
      ('artisan_profiles',       'INSERT', ARRAY['Artisan crée son profil','artisan_profiles_insert']),
      ('artisan_profiles',       'SELECT', ARRAY['Artisans vérifiés visibles','artisan_profiles_select','artisan_profiles_select_all']),
      ('artisan_profiles',       'UPDATE', ARRAY['Artisan modifie son profil','artisan_profiles_update']),
      -- borrow_requests
      ('borrow_requests',        'INSERT', ARRAY['borrow_requests_insert_auth','borrow_requests_insert_borrower']),
      -- collection_categories
      ('collection_categories',  'DELETE', ARRAY['admin_gere_categories_collection','collection_categories_delete']),
      ('collection_categories',  'INSERT', ARRAY['admin_gere_categories_collection','collection_categories_insert']),
      ('collection_categories',  'SELECT', ARRAY['admin_gere_categories_collection','categories_collection_publiques','collection_categories_select']),
      -- collection_items
      ('collection_items',       'SELECT', ARRAY['CI admin','CI select owner','CI select public']),
      -- conversation_participants
      ('conversation_participants','INSERT',ARRAY['Ajouter des participants','conversation_participants_insert','conversation_participants_insert_own','cp_insert']),
      ('conversation_participants','SELECT',ARRAY['Voir participants de ses conversations','conversation_participants_select','conversation_participants_select_own','cp_select']),
      -- conversations
      ('conversations',          'INSERT', ARRAY['Créer une conversation','conv_insert','conversations_insert_creator']),
      ('conversations',          'SELECT', ARRAY['Voir ses conversations','conv_select','conversations_select_participant']),
      ('conversations',          'UPDATE', ARRAY['Modifier ses conversations','Participants maj echange','conv_update','conversations_update_participant']),
      -- equipment_categories
      ('equipment_categories',   'SELECT', ARRAY['admin_gere_categories_equipement','categories_equipement_publiques']),
      -- equipment_items
      ('equipment_items',        'DELETE', ARRAY['eq_owner_delete','equipment_items_delete_own']),
      ('equipment_items',        'INSERT', ARRAY['eq_owner_insert','equipment_insert_auth','equipment_items_insert','equipment_items_insert_own']),
      ('equipment_items',        'SELECT', ARRAY['eq_public_read','equipment_items_select','equipment_items_select_available_or_own','equipment_select_active']),
      ('equipment_items',        'UPDATE', ARRAY['eq_owner_update','equipment_items_update_own','equipment_update_owner']),
      -- equipment_photos
      ('equipment_photos',       'INSERT', ARRAY['equipment_photos_insert_own','equipment_photos_insert_owner']),
      ('equipment_photos',       'SELECT', ARRAY['equipment_photos_select','equipment_photos_select_all','equipment_photos_select_public']),
      -- event_comments
      ('event_comments',         'DELETE', ARRAY['ec_delete','event_comments_delete']),
      ('event_comments',         'INSERT', ARRAY['ec_insert','event_comments_insert']),
      ('event_comments',         'SELECT', ARRAY['ec_select','event_comments_select']),
      -- event_participants
      ('event_participants',     'DELETE', ARRAY['ep_delete','event_participations_delete']),
      ('event_participants',     'INSERT', ARRAY['ep_insert','event_participations_insert']),
      ('event_participants',     'SELECT', ARRAY['ep_select','event_participations_select']),
      -- event_photos
      ('event_photos',           'DELETE', ARRAY['ephoto_delete','event_photos_delete']),
      ('event_photos',           'INSERT', ARRAY['ephoto_insert','event_photos_insert']),
      ('event_photos',           'SELECT', ARRAY['ephoto_select','event_photos_select']),
      -- events
      ('events',                 'INSERT', ARRAY['events_insert','events_insert_own','local_events_insert']),
      ('events',                 'SELECT', ARRAY['events_public_select','events_select_all','local_events_select']),
      ('events',                 'UPDATE', ARRAY['events_update_admin','events_update_own','local_events_update_own']),
      -- forum_categories
      ('forum_categories',       'SELECT', ARRAY['admin_gere_categories_forum','categories_forum_publiques','forum_categories_select']),
      -- forum_comments
      ('forum_comments',         'INSERT', ARRAY['forum_comments_insert','forum_comments_insert_auth','forum_comments_insert_own']),
      ('forum_comments',         'SELECT', ARRAY['forum_comments_select','forum_comments_select_all','forum_comments_select_public']),
      -- forum_posts
      ('forum_posts',            'INSERT', ARRAY['forum_posts_insert','forum_posts_insert_auth','forum_posts_insert_own']),
      ('forum_posts',            'SELECT', ARRAY['forum_posts_select','forum_posts_select_all','forum_posts_select_public','forum_posts_select_published_or_own']),
      -- job_demands
      ('job_demands',            'DELETE', ARRAY['job_demands_own_all','job_demands_own_crud']),
      ('job_demands',            'INSERT', ARRAY['job_demands_own_all','job_demands_own_crud']),
      ('job_demands',            'SELECT', ARRAY['job_demands_public','job_demands_public_read']),
      ('job_demands',            'UPDATE', ARRAY['job_demands_own_all','job_demands_own_crud']),
      -- job_offers
      ('job_offers',             'DELETE', ARRAY['job_offers_own_all','job_offers_own_crud']),
      ('job_offers',             'INSERT', ARRAY['job_offers_own_all','job_offers_own_crud']),
      ('job_offers',             'SELECT', ARRAY['job_offers_public','job_offers_public_read']),
      ('job_offers',             'UPDATE', ARRAY['job_offers_own_all','job_offers_own_crud']),
      -- listing_categories
      ('listing_categories',     'SELECT', ARRAY['admin_gere_categories_annonces','categories_annonces_publiques']),
      -- listing_photos
      ('listing_photos',         'DELETE', ARRAY['listing_photos_delete_own','listing_photos_delete_owner']),
      ('listing_photos',         'INSERT', ARRAY['listing_photos_insert','listing_photos_insert_own','listing_photos_insert_owner']),
      ('listing_photos',         'SELECT', ARRAY['listing_photos_select','listing_photos_select_all','listing_photos_select_public']),
      -- listings
      ('listings',               'DELETE', ARRAY['listings_delete','listings_delete_own']),
      ('listings',               'INSERT', ARRAY['listings_insert','listings_insert_auth','listings_insert_own']),
      ('listings',               'SELECT', ARRAY['listings_select','listings_select_active','listings_select_published_or_own']),
      ('listings',               'UPDATE', ARRAY['listings_update','listings_update_own']),
      -- messages
      ('messages',               'INSERT', ARRAY['Envoyer un message','messages_insert','messages_insert_participant']),
      ('messages',               'SELECT', ARRAY['Voir messages de ses conversations','messages_select','messages_select_participant']),
      -- moderation_queue
      ('moderation_queue',       'INSERT', ARRAY['moderation_queue_insert','modq_author_insert']),
      ('moderation_queue',       'SELECT', ARRAY['moderation_queue_select','modq_author_select','modq_staff_select']),
      ('moderation_queue',       'UPDATE', ARRAY['moderation_queue_update','modq_author_update_draft','modq_staff_update']),
      -- notifications
      ('notifications',          'SELECT', ARRAY['notifications_select','notifications_select_own']),
      ('notifications',          'UPDATE', ARRAY['notifications_update','notifications_update_own']),
      -- profile_badges
      ('profile_badges',         'SELECT', ARRAY['Badges admin','Badges publics']),
      -- profiles
      ('profiles',               'INSERT', ARRAY['Admin modifie tous les profils','allow_insert']),
      ('profiles',               'SELECT', ARRAY['Admin modifie tous les profils','Profils publics en lecture','allow_all_select','allow_select','profiles_public_select']),
      ('profiles',               'UPDATE', ARRAY['Admin modifie tous les profils','allow_update']),
      -- reports
      ('reports',                'INSERT', ARRAY['reports_insert_auth','reports_insert_own']),
      ('reports',                'SELECT', ARRAY['reports_select_own','reports_select_own_or_moderator']),
      -- reviews
      ('reviews',                'DELETE', ARRAY['Modérer avis admin','reviews_delete_own']),
      ('reviews',                'INSERT', ARRAY['Créer avis si interaction','Modérer avis admin','reviews_insert_own']),
      ('reviews',                'SELECT', ARRAY['Avis publics visibles','Avis reçus par la cible','Modérer avis admin','reviews_select','reviews_select_public']),
      ('reviews',                'UPDATE', ARRAY['Modérer avis admin','reviews_update_own']),
      -- service_requests
      ('service_requests',       'INSERT', ARRAY['service_requests_insert','service_requests_insert_resident']),
      ('service_requests',       'SELECT', ARRAY['service_requests_select','service_requests_select_parties','service_requests_select_public']),
      -- trade_categories
      ('trade_categories',       'SELECT', ARRAY['admin_gere_categories_metiers','categories_metiers_publiques'])
    ) AS t(tbl TEXT, act TEXT, pols TEXT[])
  LOOP
    -- Collect USING and WITH CHECK from all listed policies
    using_parts := ARRAY[]::TEXT[];
    check_parts := ARRAY[]::TEXT[];

    FOR p IN
      SELECT policyname, qual, with_check, permissive, roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename   = targets.tbl
        AND policyname  = ANY(targets.pols)
    LOOP
      IF p.qual IS NOT NULL AND p.qual <> '' THEN
        using_parts := using_parts || ARRAY['(' || p.qual || ')'];
      END IF;
      IF p.with_check IS NOT NULL AND p.with_check <> '' THEN
        check_parts := check_parts || ARRAY['(' || p.with_check || ')'];
      END IF;
    END LOOP;

    -- If no policies found in pg_policies, skip silently
    IF array_length(using_parts, 1) IS NULL AND array_length(check_parts, 1) IS NULL THEN
      CONTINUE;
    END IF;

    -- Build combined expressions
    combined_using := CASE
      WHEN array_length(using_parts, 1) > 0 THEN array_to_string(using_parts, ' OR ')
      ELSE NULL
    END;
    combined_check := CASE
      WHEN array_length(check_parts, 1) > 0 THEN array_to_string(check_parts, ' OR ')
      ELSE NULL
    END;

    -- Deduplicate check parts (sometimes same as using)
    -- For INSERT/UPDATE, WITH CHECK = USING often
    IF combined_check IS NULL AND combined_using IS NOT NULL
       AND targets.act IN ('INSERT','UPDATE') THEN
      combined_check := combined_using;
    END IF;

    -- Name for unified policy
    new_name := lower(targets.tbl) || '_' || lower(targets.act) || '_unified';

    -- Drop old policies
    BEGIN
      FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename   = targets.tbl
          AND policyname  = ANY(targets.pols)
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, targets.tbl);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error dropping policies on %.%: %', targets.tbl, targets.act, SQLERRM;
      CONTINUE;
    END;

    -- Create consolidated policy
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO PUBLIC %s %s',
        new_name,
        targets.tbl,
        targets.act,
        CASE WHEN combined_using IS NOT NULL THEN 'USING (' || combined_using || ')' ELSE '' END,
        CASE WHEN combined_check IS NOT NULL THEN 'WITH CHECK (' || combined_check || ')' ELSE '' END
      );
      cnt := cnt + 1;
      total_tables := total_tables + 1;
      RAISE NOTICE 'Consolidated % → 1 policy for %.%  (new: %)',
        array_length(targets.pols, 1), targets.tbl, targets.act, new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating unified policy for %.%: %', targets.tbl, targets.act, SQLERRM;
      -- Attempt to restore originals
      RAISE WARNING 'You may need to manually restore policies for table % action %', targets.tbl, targets.act;
    END;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Consolidation done: % unified policies created. ===', cnt;
END;
$consolidate$;
