-- ============================================================
-- Migration : mise à jour contrainte related_type conversations
-- Ajoute : help_request, collection_item, lost_found, association, outing
-- ============================================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_related_type_check;

-- 2. Recréer avec toutes les valeurs acceptées
ALTER TABLE conversations
  ADD CONSTRAINT conversations_related_type_check
  CHECK (related_type IN (
    'service_request',
    'listing',
    'equipment',
    'general',
    'help_request',
    'collection_item',
    'lost_found',
    'association',
    'outing'
  ));
