-- ============================================================================
-- Migration : RLS DELETE pour service_requests + request_comments
-- ============================================================================
-- PROBLÈME : La table service_requests n'a aucune politique RLS DELETE.
-- RLS par défaut = DENY ALL → le DELETE retourne 0 lignes sans erreur.
-- La console Vercel montre :
--   DELETE .../service_requests?id=eq.xxx&resident_id=eq.yyy → "Fetch a fini"
-- mais l'annonce reste présente car 0 lignes supprimées (RLS silencieux).
--
-- SOLUTION : Créer une politique DELETE qui autorise :
--   1. Le résident (auteur) à supprimer sa propre demande
--   2. Les administrateurs / modérateurs
--
-- Idem pour request_comments (même problème probable).
-- ============================================================================

-- ── service_requests DELETE ──────────────────────────────────────────────────
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_delete_own"         ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_delete_owner"       ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_delete_resident"    ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_delete"             ON public.service_requests;

CREATE POLICY "service_requests_delete_owner_or_admin"
  ON public.service_requests
  FOR DELETE
  USING (
    -- Seul le résident (auteur) peut supprimer sa demande
    auth.uid() = resident_id
    -- Ou un administrateur / modérateur
    OR is_moderator_or_admin()
  );

-- ── request_comments DELETE ──────────────────────────────────────────────────
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_comments_delete_own"   ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_delete_owner" ON public.request_comments;
DROP POLICY IF EXISTS "request_comments_delete"       ON public.request_comments;

CREATE POLICY "request_comments_delete_author_or_admin"
  ON public.request_comments
  FOR DELETE
  USING (
    -- Auteur du commentaire
    auth.uid() = author_id
    -- Ou le résident concerné (peut modérer sa propre demande)
    OR auth.uid() IN (
      SELECT resident_id FROM public.service_requests
      WHERE id = request_comments.request_id
    )
    -- Ou admin / modérateur
    OR is_moderator_or_admin()
  );

-- ── UPDATE : autoriser le résident à changer le statut ──────────────────────
-- Vérifie si une politique UPDATE existe déjà, sinon crée.
DROP POLICY IF EXISTS "service_requests_update_own"     ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_update_owner"   ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_update_resident" ON public.service_requests;

CREATE POLICY "service_requests_update_owner_or_admin"
  ON public.service_requests
  FOR UPDATE
  USING (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  )
  WITH CHECK (
    auth.uid() = resident_id
    OR auth.uid() = artisan_id
    OR is_moderator_or_admin()
  );

-- ============================================================================
-- Vérification (à exécuter manuellement dans le SQL Editor Supabase) :
--
-- SELECT policyname, cmd FROM pg_policies
--   WHERE tablename = 'service_requests'
--   ORDER BY cmd, policyname;
--
-- Attendu :
--   service_requests_delete_owner_or_admin  DELETE
--   service_requests_select_participants    SELECT
--   service_requests_insert_resident        INSERT  (ou similaire)
--   service_requests_update_owner_or_admin  UPDATE
-- ============================================================================
