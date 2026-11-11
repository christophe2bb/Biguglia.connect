-- La clôture d'un échange et le suivi des conversations doivent être
-- contrôlés par les endpoints/RPC serveur : aucun UPDATE direct côté client.
-- L'ancienne politique UPDATE pouvait être contournée ou servir de source
-- d'incohérence pour exchange_status.
DROP POLICY IF EXISTS "conversations_update_participant"
  ON public.conversations;
