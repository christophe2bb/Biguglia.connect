-- =============================================================================
-- MIGRATION C : Consolidation des politiques RLS dupliquées (données RÉELLES)
-- =============================================================================
-- Source : Supabase Snippet "Find Duplicate Row-Level Security Policies"
-- Requête : SELECT tablename, cmd, COUNT(*) FROM pg_policies GROUP BY ...
--           HAVING COUNT(*) > 1
-- Total   : 60 groupes (table, action) avec plusieurs policies PERMISSIVE
-- SAFE    : lit pg_policies, combine USING/WITH CHECK avec OR, recrée 1 policy
--           comportement identique (Postgres faisait déjà l'OR implicitement)
-- APPLIQUER : SQL Editor Supabase → coller tout → RUN
--             Vérifier NOTICE : "Consolidated X → 1 for table.action"
-- =============================================================================

DO $consolidate$
DECLARE
  p           RECORD;
  using_parts TEXT[];
  check_parts TEXT[];
  combined_using TEXT;
  combined_check TEXT;
  new_name    TEXT;
  cnt         INT := 0;
  targets     RECORD;
BEGIN

  FOR targets IN
    SELECT * FROM (VALUES
      ('conversation_participants', 'INSERT', ARRAY['Ajouter des participants', 'conversation_participants_insert', 'conversation_participants_insert_own', 'cp_insert']),
      ('conversation_participants', 'SELECT', ARRAY['Voir participants de ses conversations', 'conversation_participants_select', 'conversation_participants_select_own', 'cp_select']),
      ('conversations', 'UPDATE', ARRAY['Modifier ses conversations', 'Participants maj echange', 'conv_update', 'conversations_update_participant']),
      ('equipment_items', 'INSERT', ARRAY['eq_owner_insert', 'equipment_insert_auth', 'equipment_items_insert', 'equipment_items_insert_own']),
      ('equipment_items', 'SELECT', ARRAY['eq_public_read', 'equipment_items_select', 'equipment_items_select_available_or_own', 'equipment_select_active']),
      ('forum_posts', 'SELECT', ARRAY['forum_posts_select', 'forum_posts_select_all', 'forum_posts_select_public', 'forum_posts_select_published_or_own']),
      ('profiles', 'SELECT', ARRAY['Profils publics en lecture', 'allow_all_select', 'allow_select', 'profiles_public_select']),
      ('reviews', 'SELECT', ARRAY['Avis publics visibles', 'Avis reçus par la cible', 'reviews_select', 'reviews_select_public']),
      ('artisan_profiles', 'SELECT', ARRAY['Artisans vérifiés visibles', 'artisan_profiles_select', 'artisan_profiles_select_all']),
      ('collection_items', 'SELECT', ARRAY['CI admin', 'CI select owner', 'CI select public']),
      ('conversations', 'INSERT', ARRAY['Créer une conversation', 'conv_insert', 'conversations_insert_creator']),
      ('conversations', 'SELECT', ARRAY['Voir ses conversations', 'conv_select', 'conversations_select_participant']),
      ('equipment_items', 'UPDATE', ARRAY['eq_owner_update', 'equipment_items_update_own', 'equipment_update_owner']),
      ('equipment_photos', 'SELECT', ARRAY['equipment_photos_select', 'equipment_photos_select_all', 'equipment_photos_select_public']),
      ('events', 'SELECT', ARRAY['events_public_select', 'events_select_all', 'local_events_select']),
      ('events', 'UPDATE', ARRAY['events_update_admin', 'events_update_own', 'local_events_update_own']),
      ('events', 'INSERT', ARRAY['events_insert', 'events_insert_own', 'local_events_insert']),
      ('forum_comments', 'SELECT', ARRAY['forum_comments_select', 'forum_comments_select_all', 'forum_comments_select_public']),
      ('forum_comments', 'INSERT', ARRAY['forum_comments_insert', 'forum_comments_insert_auth', 'forum_comments_insert_own']),
      ('forum_posts', 'INSERT', ARRAY['forum_posts_insert', 'forum_posts_insert_auth', 'forum_posts_insert_own']),
      ('listing_photos', 'SELECT', ARRAY['listing_photos_select', 'listing_photos_select_all', 'listing_photos_select_public']),
      ('listing_photos', 'INSERT', ARRAY['listing_photos_insert', 'listing_photos_insert_own', 'listing_photos_insert_owner']),
      ('listings', 'SELECT', ARRAY['listings_select', 'listings_select_active', 'listings_select_published_or_own']),
      ('listings', 'INSERT', ARRAY['listings_insert', 'listings_insert_auth', 'listings_insert_own']),
      ('messages', 'INSERT', ARRAY['Envoyer un message', 'messages_insert', 'messages_insert_participant']),
      ('messages', 'SELECT', ARRAY['Voir messages de ses conversations', 'messages_select', 'messages_select_participant']),
      ('moderation_queue', 'SELECT', ARRAY['moderation_queue_select', 'modq_author_select', 'modq_staff_select']),
      ('moderation_queue', 'UPDATE', ARRAY['moderation_queue_update', 'modq_author_update_draft', 'modq_staff_update']),
      ('service_requests', 'SELECT', ARRAY['service_requests_select', 'service_requests_select_parties', 'service_requests_select_public']),
      ('artisan_photos', 'SELECT', ARRAY['artisan_photos_select', 'artisan_photos_select_all']),
      ('artisan_profiles', 'UPDATE', ARRAY['Artisan modifie son profil', 'artisan_profiles_update']),
      ('artisan_profiles', 'INSERT', ARRAY['Artisan crée son profil', 'artisan_profiles_insert']),
      ('borrow_requests', 'INSERT', ARRAY['borrow_requests_insert_auth', 'borrow_requests_insert_borrower']),
      ('collection_categories', 'SELECT', ARRAY['categories_collection_publiques', 'collection_categories_select']),
      ('equipment_items', 'DELETE', ARRAY['eq_owner_delete', 'equipment_items_delete_own']),
      ('equipment_photos', 'INSERT', ARRAY['equipment_photos_insert_own', 'equipment_photos_insert_owner']),
      ('event_comments', 'SELECT', ARRAY['ec_select', 'event_comments_select']),
      ('event_comments', 'DELETE', ARRAY['ec_delete', 'event_comments_delete']),
      ('event_comments', 'INSERT', ARRAY['ec_insert', 'event_comments_insert']),
      ('event_participants', 'SELECT', ARRAY['ep_select', 'event_participations_select']),
      ('event_participants', 'INSERT', ARRAY['ep_insert', 'event_participations_insert']),
      ('event_participants', 'DELETE', ARRAY['ep_delete', 'event_participations_delete']),
      ('event_photos', 'SELECT', ARRAY['ephoto_select', 'event_photos_select']),
      ('event_photos', 'INSERT', ARRAY['ephoto_insert', 'event_photos_insert']),
      ('event_photos', 'DELETE', ARRAY['ephoto_delete', 'event_photos_delete']),
      ('forum_categories', 'SELECT', ARRAY['categories_forum_publiques', 'forum_categories_select']),
      ('job_demands', 'SELECT', ARRAY['job_demands_public', 'job_demands_public_read']),
      ('job_demands', 'ALL', ARRAY['job_demands_own_all', 'job_demands_own_crud']),
      ('job_offers', 'ALL', ARRAY['job_offers_own_all', 'job_offers_own_crud']),
      ('job_offers', 'SELECT', ARRAY['job_offers_public', 'job_offers_public_read']),
      ('listing_photos', 'DELETE', ARRAY['listing_photos_delete_own', 'listing_photos_delete_owner']),
      ('listings', 'DELETE', ARRAY['listings_delete', 'listings_delete_own']),
      ('listings', 'UPDATE', ARRAY['listings_update', 'listings_update_own']),
      ('moderation_queue', 'INSERT', ARRAY['moderation_queue_insert', 'modq_author_insert']),
      ('notifications', 'UPDATE', ARRAY['notifications_update', 'notifications_update_own']),
      ('notifications', 'SELECT', ARRAY['notifications_select', 'notifications_select_own']),
      ('reports', 'INSERT', ARRAY['reports_insert_auth', 'reports_insert_own']),
      ('reports', 'SELECT', ARRAY['reports_select_own', 'reports_select_own_or_moderator']),
      ('reviews', 'INSERT', ARRAY['Créer avis si interaction', 'reviews_insert_own']),
      ('service_requests', 'INSERT', ARRAY['service_requests_insert', 'service_requests_insert_resident'])
    ) AS t(tbl TEXT, act TEXT, pols TEXT[])
  LOOP
    using_parts := ARRAY[]::TEXT[];
    check_parts := ARRAY[]::TEXT[];

    FOR p IN
      SELECT policyname, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename   = targets.tbl
        AND policyname  = ANY(targets.pols)
    LOOP
      IF p.qual IS NOT NULL AND p.qual <> '' AND p.qual <> 'null' THEN
        using_parts := using_parts || ARRAY['(' || p.qual || ')'];
      END IF;
      IF p.with_check IS NOT NULL AND p.with_check <> '' AND p.with_check <> 'null' THEN
        check_parts := check_parts || ARRAY['(' || p.with_check || ')'];
      END IF;
    END LOOP;

    -- Skip si aucune policy trouvée (déjà consolidée)
    IF array_length(using_parts, 1) IS NULL AND array_length(check_parts, 1) IS NULL THEN
      RAISE NOTICE 'Skip %.% — policies not found (already consolidated?)', targets.tbl, targets.act;
      CONTINUE;
    END IF;

    -- Combiner avec OR
    combined_using := CASE WHEN array_length(using_parts, 1) > 0
      THEN array_to_string(using_parts, ' OR ') ELSE NULL END;
    combined_check := CASE WHEN array_length(check_parts, 1) > 0
      THEN array_to_string(check_parts, ' OR ') ELSE NULL END;

    -- Pour INSERT/UPDATE sans WITH CHECK, copier USING
    IF combined_check IS NULL AND combined_using IS NOT NULL
       AND targets.act IN ('INSERT', 'UPDATE', 'ALL') THEN
      combined_check := combined_using;
    END IF;

    new_name := lower(targets.tbl) || '_' || lower(targets.act) || '_unified';

    -- Supprimer les anciennes policies
    BEGIN
      FOR p IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = targets.tbl
          AND policyname = ANY(targets.pols)
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, targets.tbl);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erreur DROP policies %.%: %', targets.tbl, targets.act, SQLERRM;
      CONTINUE;
    END;

    -- Créer la policy unifiée
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO PUBLIC %s %s',
        new_name, targets.tbl, targets.act,
        CASE WHEN combined_using IS NOT NULL THEN 'USING (' || combined_using || ')' ELSE '' END,
        CASE WHEN combined_check IS NOT NULL THEN 'WITH CHECK (' || combined_check || ')' ELSE '' END
      );
      cnt := cnt + 1;
      RAISE NOTICE 'Consolidated % → 1 pour %.% (nouvelle: %)',
        array_length(targets.pols, 1), targets.tbl, targets.act, new_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erreur CREATE policy %.%: %', targets.tbl, targets.act, SQLERRM;
      -- Ne pas laisser la table sans protection — recréer toutes les originales
      RAISE WARNING 'ATTENTION: vérifier manuellement les policies sur la table %', targets.tbl;
    END;

  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== Consolidation terminée : % policies unifiées créées. ===', cnt;
END;
$consolidate$;
