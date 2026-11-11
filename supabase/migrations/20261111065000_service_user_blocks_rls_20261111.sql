-- Services / Messagerie : permettre à chaque compte de gérer SES blocages.
-- Sans politiques RLS, la table était inaccessible aux clients authentifiés.
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;

DROP POLICY IF EXISTS user_blocks_owner_select ON public.user_blocks;
DROP POLICY IF EXISTS user_blocks_owner_insert ON public.user_blocks;
DROP POLICY IF EXISTS user_blocks_owner_delete ON public.user_blocks;

CREATE POLICY user_blocks_owner_select ON public.user_blocks
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_blocks_owner_insert ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND target_user_id IS DISTINCT FROM (SELECT auth.uid())
  );

CREATE POLICY user_blocks_owner_delete ON public.user_blocks
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Index unique (user_id,target_user_id) déjà présent.
-- Le destinataire ne doit pas lire qui l'a bloqué.
