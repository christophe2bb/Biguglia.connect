-- ============================================================
-- Migration : mise à jour contrainte related_type conversations
-- Ajoute : help_request, collection_item, lost_found, association,
--          outing, event, service_request, artisan, community
-- ============================================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_related_type_check;

-- 2. Recréer avec toutes les valeurs acceptées
--    (doit correspondre exactement à RELATED_TYPES dans route.ts)
ALTER TABLE conversations
  ADD CONSTRAINT conversations_related_type_check
  CHECK (related_type IN (
    'listing',
    'equipment',
    'general',
    'help_request',
    'collection_item',
    'lost_found',
    'association',
    'outing',
    'event',
    'service_request',
    'artisan',
    'community'
  ));
