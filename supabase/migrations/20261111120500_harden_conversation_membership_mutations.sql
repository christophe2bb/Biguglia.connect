-- Sécurité messagerie (tous contextes, y compris Services) :
-- un client authentifié ne doit PAS pouvoir s'ajouter à n'importe quelle
-- conversation ni déplacer sa participation vers un autre fil.
-- La création, les accusés de lecture et la suppression administrative
-- sont déjà traités par des routes serveur, après contrôle des permissions,
-- via service_role (qui ne dépend pas des politiques RLS).
-- Aucun message, participant ou conversation existant n'est modifié.

-- Ancien INSERT WITH CHECK (true) : création de fils fantômes par anon.
DROP POLICY IF EXISTS "conversations_insert_creator"
  ON public.conversations;

-- Ancien INSERT WITH CHECK (auth.uid() = user_id) :
-- un utilisateur pouvait rejoindre n'importe quel ID de conversation.
DROP POLICY IF EXISTS "conversation_participants_insert_own"
  ON public.conversation_participants;

-- Ancien UPDATE sur user_id=auth.uid() :
-- un utilisateur pouvait modifier conversation_id vers un fil tiers.
DROP POLICY IF EXISTS "conversation_participants_update_own"
  ON public.conversation_participants;

-- La suppression directe de sa participation pourrait rendre un fil incomplet.
-- Elle doit passer par une route métier autorisée.
DROP POLICY IF EXISTS "Supprimer ses participations"
  ON public.conversation_participants;
