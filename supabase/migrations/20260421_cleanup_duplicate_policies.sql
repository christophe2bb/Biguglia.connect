-- ============================================================================
-- MIGRATION 20260421_cleanup_duplicate_policies
-- ★ Nettoyage des policies RLS dupliquées ★
--
-- Contexte :
--   Les migrations successives ont laissé des policies redondantes sur
--   plusieurs tables. En PostgreSQL, plusieurs policies SELECT/INSERT = OR
--   logique : les anciennes redondantes n'ouvrent pas de faille (USING(true)
--   est absent) mais alourdissent les plans d'exécution et rendent
--   l'audit difficile.
--
-- Tables concernées :
--   • conversation_participants  — 4 INSERT → garder conversation_participants_insert_own
--   • conversations              — 3 INSERT, 4 UPDATE → garder les noms canoniques
--   • equipment_items            — 4 INSERT, 3 UPDATE, 2 DELETE → garder _own
--   • event_participants         — 2 DELETE, 2 INSERT → garder ep_*
--   • messages                   — 3 INSERT → garder messages_insert_participant
--   • profiles                   — 2 SELECT → garder profiles_select_own + profiles_select_admin
--   • service_requests           — 2 INSERT, 3 SELECT → garder _participants / _resident
--
-- IDEMPOTENTE : DROP IF EXISTS partout.
-- ============================================================================


-- ============================================================================
-- TABLE : conversation_participants — INSERT (garder : conversation_participants_insert_own)
-- ============================================================================
DROP POLICY IF EXISTS "conversation_participants_insert"     ON public.conversation_participants;
DROP POLICY IF EXISTS "Ajouter des participants"             ON public.conversation_participants;
DROP POLICY IF EXISTS "cp_insert"                            ON public.conversation_participants;


-- ============================================================================
-- TABLE : conversations — INSERT (garder : conversations_insert_creator)
-- ============================================================================
DROP POLICY IF EXISTS "Créer une conversation"               ON public.conversations;
DROP POLICY IF EXISTS "conv_insert"                          ON public.conversations;

-- TABLE : conversations — UPDATE (garder : conversations_update_participant)
DROP POLICY IF EXISTS "conv_update"                          ON public.conversations;
DROP POLICY IF EXISTS "Modifier ses conversations"           ON public.conversations;
DROP POLICY IF EXISTS "Participants maj echange"             ON public.conversations;


-- ============================================================================
-- TABLE : equipment_items — INSERT (garder : equipment_items_insert_own)
-- ============================================================================
DROP POLICY IF EXISTS "eq_owner_insert"                      ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_insert_auth"                ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_items_insert"               ON public.equipment_items;

-- TABLE : equipment_items — UPDATE (garder : equipment_items_update_own)
DROP POLICY IF EXISTS "eq_owner_update"                      ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_update_owner"               ON public.equipment_items;

-- TABLE : equipment_items — DELETE (garder : equipment_items_delete_own)
DROP POLICY IF EXISTS "eq_owner_delete"                      ON public.equipment_items;


-- ============================================================================
-- TABLE : event_participants — INSERT (garder : ep_insert)
-- ============================================================================
DROP POLICY IF EXISTS "event_participations_insert"          ON public.event_participants;

-- TABLE : event_participants — DELETE (garder : ep_delete)
DROP POLICY IF EXISTS "event_participations_delete"          ON public.event_participants;


-- ============================================================================
-- TABLE : messages — INSERT (garder : messages_insert_participant)
-- ============================================================================
DROP POLICY IF EXISTS "Envoyer un message"                   ON public.messages;
DROP POLICY IF EXISTS "messages_insert"                      ON public.messages;


-- ============================================================================
-- TABLE : profiles — SELECT
-- Garder : profiles_select_own + profiles_select_admin (2 policies distinctes
-- pour propre profil ET admin — correct et intentionnel)
-- Supprimer : profiles_select_own_or_admin (ancienne version consolidée
-- remplacée par les 2 policies séparées)
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_own_or_admin"         ON public.profiles;


-- ============================================================================
-- TABLE : service_requests — INSERT (garder : service_requests_insert_resident)
-- ============================================================================
DROP POLICY IF EXISTS "service_requests_insert"              ON public.service_requests;

-- TABLE : service_requests — SELECT (garder : service_requests_select_participants)
DROP POLICY IF EXISTS "service_requests_select"              ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_select_parties"      ON public.service_requests;


-- ============================================================================
-- Recharger PostgREST pour prendre en compte les changements
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution :
--   SELECT tablename, cmd, COUNT(*), string_agg(policyname, ' | ')
--   FROM pg_policies
--   WHERE tablename IN (
--     'conversation_participants','conversations','equipment_items',
--     'event_participants','messages','profiles','service_requests'
--   )
--   GROUP BY tablename, cmd
--   HAVING COUNT(*) > 1
--   ORDER BY tablename, cmd;
--   → Attendu : 0 lignes (ou uniquement profiles SELECT = 2 intentionnel)
-- ============================================================================
