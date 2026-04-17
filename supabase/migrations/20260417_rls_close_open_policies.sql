-- ============================================================================
-- MIGRATION 20260417_rls_close_open_policies
-- ★ Fermeture des policies RLS encore trop ouvertes ★
--
-- Tables concernées :
--   1. help_request_participants   — participation à une demande d'aide
--   2. help_request_status_history — historique d'état d'une demande d'aide
--   3. listing_status_history      — historique d'état d'une annonce
--   4. lf_matches                  — matching objet perdu / trouvé
--
-- Ces 4 tables avaient des policies SELECT USING(true) ou absentes,
-- exposant des données internes (états, participations, scores de matching)
-- à tout utilisateur authentifié voire anonyme.
--
-- Cette migration est IDEMPOTENTE : DROP IF EXISTS avant chaque CREATE.
-- Elle consolide et remplace les migrations partielles du 2026-04-16.
--
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================================


-- ============================================================================
-- TABLE 1 : help_request_participants
-- ============================================================================
-- Données exposées si USING(true) :
--   user_id  → identité du volontaire
--   role     → rôle dans la demande (requester / helper)
--   state    → état de participation (pending / accepted / rejected)
--   message  → message privé du volontaire
--
-- Règle : visible uniquement par :
--   • le participant lui-même (auth.uid() = user_id)
--   • l'auteur de la demande d'aide associée
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.help_request_participants ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies SELECT existantes (anciennes et nouvelles)
DROP POLICY IF EXISTS "help_participants_select"        ON public.help_request_participants;
DROP POLICY IF EXISTS "help_participants_public_select" ON public.help_request_participants;
DROP POLICY IF EXISTS "Voir participants de sa demande" ON public.help_request_participants;
DROP POLICY IF EXISTS "help_request_participants_select_public" ON public.help_request_participants;

-- Nouvelle policy restrictive
CREATE POLICY "help_participants_select"
  ON public.help_request_participants
  FOR SELECT
  USING (
    -- Le participant voit sa propre ligne
    auth.uid() = user_id
    -- L'auteur de la demande d'aide voit tous ses participants
    OR EXISTS (
      SELECT 1
      FROM public.help_requests hr
      WHERE hr.id = help_request_participants.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Admins / modérateurs voient tout
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- TABLE 2 : help_request_status_history
-- ============================================================================
-- Données exposées si USING(true) :
--   old_status / new_status → transitions d'état internes
--   changed_by              → identité de qui a changé l'état
--   note                    → notes internes de modération
--
-- Règle : visible uniquement par :
--   • l'auteur de la demande d'aide
--   • les participants à cette demande
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.help_request_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_status_history_select"        ON public.help_request_status_history;
DROP POLICY IF EXISTS "help_status_history_public_select" ON public.help_request_status_history;
DROP POLICY IF EXISTS "Voir historique de sa demande"     ON public.help_request_status_history;
DROP POLICY IF EXISTS "help_request_status_history_select_public" ON public.help_request_status_history;

CREATE POLICY "help_status_history_select"
  ON public.help_request_status_history
  FOR SELECT
  USING (
    -- Auteur de la demande d'aide
    EXISTS (
      SELECT 1
      FROM public.help_requests hr
      WHERE hr.id = help_request_status_history.help_request_id
        AND hr.author_id = auth.uid()
    )
    -- Participants à cette demande
    OR EXISTS (
      SELECT 1
      FROM public.help_request_participants p
      WHERE p.help_request_id = help_request_status_history.help_request_id
        AND p.user_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- TABLE 3 : listing_status_history
-- ============================================================================
-- Données exposées si USING(true) :
--   old_status / new_status → états internes de modération
--   changed_by              → identité de l'admin/modérateur qui a agi
--   note                    → raison de la modération
--
-- Règle : visible uniquement par :
--   • l'auteur de l'annonce
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.listing_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lsh_select"                          ON public.listing_status_history;
DROP POLICY IF EXISTS "listing_status_history_public"       ON public.listing_status_history;
DROP POLICY IF EXISTS "Voir historique de son annonce"      ON public.listing_status_history;
DROP POLICY IF EXISTS "listing_status_history_select_public" ON public.listing_status_history;

CREATE POLICY "lsh_select"
  ON public.listing_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.listings l
      WHERE l.id = listing_status_history.listing_id
        AND (
          -- Auteur de l'annonce
          l.author_id = auth.uid()
          -- OU admin / modérateur
          OR is_moderator_or_admin()
        )
    )
  );


-- ============================================================================
-- TABLE 4 : lf_matches
-- ============================================================================
-- Données exposées si USING(true) :
--   match_score  → score interne de correspondance (0–100)
--   match_status → suggested / confirmed / rejected (états internes)
--   suggested_by → identité de l'auteur de la suggestion de rapprochement
--
-- Règle : visible uniquement par :
--   • l'auteur de l'objet perdu concerné
--   • l'auteur de l'objet trouvé concerné
--   • admin / modérateur
-- ============================================================================

ALTER TABLE public.lf_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lf_matches_select"        ON public.lf_matches;
DROP POLICY IF EXISTS "lf_matches_public_select" ON public.lf_matches;
DROP POLICY IF EXISTS "Voir ses correspondances"  ON public.lf_matches;
DROP POLICY IF EXISTS "lf_matches_select_public"  ON public.lf_matches;

CREATE POLICY "lf_matches_select"
  ON public.lf_matches
  FOR SELECT
  USING (
    -- Auteur de l'objet perdu
    EXISTS (
      SELECT 1
      FROM public.lost_found_items l1
      WHERE l1.id = lf_matches.lost_item_id
        AND l1.author_id = auth.uid()
    )
    -- Auteur de l'objet trouvé
    OR EXISTS (
      SELECT 1
      FROM public.lost_found_items l2
      WHERE l2.id = lf_matches.found_item_id
        AND l2.author_id = auth.uid()
    )
    -- Admins / modérateurs
    OR is_moderator_or_admin()
  );


-- ============================================================================
-- Recharger PostgREST pour appliquer les nouvelles policies
-- ============================================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VÉRIFICATION post-exécution
-- ============================================================================
-- À coller dans un 2e onglet SQL Editor après exécution :
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN (
--   'help_request_participants',
--   'help_request_status_history',
--   'listing_status_history',
--   'lf_matches'
-- )
-- ORDER BY tablename, cmd;
--
-- Résultat attendu :
--   help_request_participants   | help_participants_select   | SELECT | auth.uid()=user_id OR EXISTS(author) OR admin
--   help_request_status_history | help_status_history_select | SELECT | EXISTS(author) OR EXISTS(participant) OR admin
--   listing_status_history      | lsh_select                 | SELECT | EXISTS(listings.author_id=uid OR admin)
--   lf_matches                  | lf_matches_select          | SELECT | EXISTS(lost_author) OR EXISTS(found_author) OR admin
-- ============================================================================
