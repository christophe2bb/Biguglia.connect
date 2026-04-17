-- ============================================================================
-- MIGRATION 20260417_rls_fix_real_issues
-- ★ Correction des vraies failles RLS identifiées à l'audit ★
--
-- Contexte :
--   L'audit complet des policies SELECT USING(true) a identifié 63 policies.
--   La majorité sont LÉGITIMES (données publiques d'une plateforme communautaire).
--   Ce script corrige uniquement les 4 vrais problèmes :
--
-- PROBLÈME 1 — equipment_items : policy USING(true) qui neutralise la
--   policy restrictive existante (is_available OR owner).
--   En PostgreSQL, 2 policies SELECT = OR logique → la vraie restriction
--   est complètement contournée.
--
-- PROBLÈME 2 — event_status_history : états + notes de modération internes
--   (changed_by = identité du modérateur, note = raison de modération)
--   visibles par tous les anonymes.
--
-- PROBLÈME 3 — event_participants : liste complète de qui assiste à quoi
--   exposée publiquement (données comportementales / vie privée).
--   Note : les événements sont publics, mais la liste nominative des
--   participants est une donnée personnelle.
--
-- PROBLÈME 4 — request_comments : commentaires sur service_requests
--   (qui peuvent contenir des adresses / détails privés).
--   service_requests est déjà protégé, mais ses commentaires ne l'étaient pas.
--
-- IDEMPOTENTE : DROP IF EXISTS avant chaque CREATE.
-- ============================================================================


-- ============================================================================
-- FIX 1 — equipment_items
-- Supprimer la policy USING(true) qui écrase la restriction existante
-- ============================================================================
-- Situation actuelle :
--   • equipment_items_select_available_or_own → USING(is_available OR owner) ✅
--   • equipment_items_select                  → USING(true) ❌ rend tout public
-- PostgreSQL applique OR entre toutes les policies SELECT d'un même rôle.
-- Résultat : tout le monde voit tout le matériel, même non disponible.
-- Fix : supprimer uniquement la policy USING(true).
-- ============================================================================

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;

-- Supprimer la policy trop permissive (les autres sont conservées)
DROP POLICY IF EXISTS "equipment_items_select" ON public.equipment_items;
DROP POLICY IF EXISTS "eq_public_read"          ON public.equipment_items;
DROP POLICY IF EXISTS "equipment_select_active" ON public.equipment_items;

-- La policy restrictive existante reste en place :
-- equipment_items_select_available_or_own → USING((is_available = true) OR (auth.uid() = owner_id))
-- Vérifier qu'elle existe encore :
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'equipment_items'
      AND policyname = 'equipment_items_select_available_or_own'
  ) THEN
    -- Recréer si elle n'existe plus
    EXECUTE $policy$
      CREATE POLICY "equipment_items_select_available_or_own"
        ON public.equipment_items
        FOR SELECT
        USING (
          (is_available = true)
          OR (auth.uid() = owner_id)
          OR is_moderator_or_admin()
        );
    $policy$;
    RAISE NOTICE 'Recréé equipment_items_select_available_or_own';
  ELSE
    RAISE NOTICE 'equipment_items_select_available_or_own déjà présente — OK';
  END IF;
END $$;


-- ============================================================================
-- FIX 2 — event_status_history
-- Notes et identités de modération internes → admin/organisateur seulement
-- ============================================================================
-- Données sensibles exposées :
--   • old_status / new_status → workflow interne de modération
--   • changed_by              → identité du modérateur
--   • note                    → raison de la décision de modération
-- Règle : visible par l'organisateur de l'événement ou admin/modérateur
-- ============================================================================

ALTER TABLE public.event_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esh_select"                    ON public.event_status_history;
DROP POLICY IF EXISTS "event_status_history_select"   ON public.event_status_history;
DROP POLICY IF EXISTS "Voir historique de son événement" ON public.event_status_history;

CREATE POLICY "esh_select"
  ON public.event_status_history
  FOR SELECT
  USING (
    -- Organisateur de l'événement
    EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_status_history.event_id
        AND e.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- FIX 3 — event_participants
-- Liste nominative des participants → données personnelles
-- ============================================================================
-- Contexte : les événements sont publics, mais savoir QUI y participe
-- (user_id, statut de présence) est une donnée personnelle.
-- Un utilisateur ne devrait pas pouvoir lister tous les participants
-- de tous les événements.
--
-- Règle : visible par le participant lui-même, l'organisateur, ou admin
-- Note : on supprime la policy doublonnée "event_participations_select" aussi.
-- ============================================================================

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ep_select"                   ON public.event_participants;
DROP POLICY IF EXISTS "event_participations_select" ON public.event_participants;
DROP POLICY IF EXISTS "Voir participants d'un événement" ON public.event_participants;

CREATE POLICY "ep_select"
  ON public.event_participants
  FOR SELECT
  USING (
    -- Le participant voit sa propre ligne
    auth.uid() = user_id
    -- L'organisateur voit tous ses participants
    OR EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_participants.event_id
        AND e.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- FIX 4 — request_comments
-- Commentaires sur service_requests → potentiellement des adresses
-- ============================================================================
-- service_requests est protégé (resident_id / artisan_id / admin).
-- Mais ses commentaires étaient publics, exposant les échanges privés.
-- Règle : visible uniquement par le résident ou l'artisan concerné, ou admin
-- ============================================================================

ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_comments_select"        ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_select_public" ON public.request_comments;

CREATE POLICY "request_comments_select"
  ON public.request_comments
  FOR SELECT
  USING (
    -- Auteur du commentaire
    auth.uid() = author_id
    -- Résident ou artisan concerné par la demande de service
    OR EXISTS (
      SELECT 1
      FROM public.service_requests sr
      WHERE sr.id = request_comments.request_id
        AND (
          sr.resident_id = auth.uid()
          OR sr.artisan_id = auth.uid()
        )
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- Recharger PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution
-- ============================================================================
-- SELECT tablename, policyname, cmd, left(qual, 80) as qual_preview
-- FROM pg_policies
-- WHERE tablename IN (
--   'equipment_items',
--   'event_status_history',
--   'event_participants',
--   'request_comments'
-- )
-- AND cmd = 'SELECT'
-- ORDER BY tablename, policyname;
--
-- Résultat attendu :
--   equipment_items      | equipment_items_select_available_or_own | SELECT | (is_available OR owner OR admin)
--   event_participants   | ep_select                               | SELECT | (uid=user_id OR organizer OR admin)
--   event_status_history | esh_select                              | SELECT | (EXISTS(organizer) OR admin)
--   request_comments     | request_comments_select                 | SELECT | (uid=author OR EXISTS(sr) OR admin)
--
-- PLUS de ligne "equipment_items_select" avec USING(true)
-- ============================================================================
