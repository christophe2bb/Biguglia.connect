-- ===========================================================================
-- MIGRATION : Anti-duplication conversations — Biguglia Connect
-- Ajoute une contrainte UNIQUE canonique sur les paires de participants
-- pour rendre le garde applicatif de start-conversation race-proof.
--
-- 2026-04-12 — À exécuter dans Supabase → SQL Editor
--
-- PRÉREQUIS OBLIGATOIRES avant d'appliquer
-- ---------------------------------------------------------------------------
--   1. Exécuter le script de détection des doublons (section A ci-dessous)
--      et vérifier que le résultat est vide (0 lignes).
--   2. Si des doublons existent, les dédupliquer manuellement (section B).
--   3. Tester sur un dump de staging avant de passer en production.
--   4. Mettre à jour docs/db/SCHEMA.md après déploiement réussi.
-- ===========================================================================

-- ===========================================================================
-- SECTION A — Détection des doublons existants (READ-ONLY, sans risque)
-- Exécuter avant tout et vérifier que le résultat est VIDE.
-- ===========================================================================

/*
  Trouve les paires (participant_a, participant_b, related_type, related_id)
  qui ont plus d'une conversation. Une seule ligne = pas de doublon.

  SELECT
    LEAST(cp1.user_id, cp2.user_id)    AS participant_a,
    GREATEST(cp1.user_id, cp2.user_id) AS participant_b,
    c.related_type,
    c.related_id,
    COUNT(*)                           AS nb_conversations
  FROM conversation_participants cp1
  JOIN conversation_participants cp2
    ON cp1.conversation_id = cp2.conversation_id
   AND cp1.user_id < cp2.user_id         -- évite les doublons de jointure
  JOIN conversations c ON c.id = cp1.conversation_id
  GROUP BY 1, 2, 3, 4
  HAVING COUNT(*) > 1
  ORDER BY nb_conversations DESC;
*/

-- ===========================================================================
-- SECTION B — Déduplication manuelle (si la section A renvoie des lignes)
-- À adapter selon les résultats réels.
-- ===========================================================================

/*
  Pour chaque groupe en doublon, conserver la conversation la plus récente
  et supprimer les autres. ATTENTION : les messages des convs supprimées
  seront perdus (ON DELETE CASCADE sur messages.conversation_id).

  -- Identifier les ids à supprimer (garder la conv la plus récente)
  WITH ranked AS (
    SELECT
      c.id,
      LEAST(cp1.user_id, cp2.user_id)    AS participant_a,
      GREATEST(cp1.user_id, cp2.user_id) AS participant_b,
      c.related_type,
      c.related_id,
      ROW_NUMBER() OVER (
        PARTITION BY LEAST(cp1.user_id, cp2.user_id),
                     GREATEST(cp1.user_id, cp2.user_id),
                     c.related_type,
                     COALESCE(c.related_id::text, '')
        ORDER BY c.updated_at DESC
      ) AS rn
    FROM conversation_participants cp1
    JOIN conversation_participants cp2
      ON cp1.conversation_id = cp2.conversation_id
     AND cp1.user_id < cp2.user_id
    JOIN conversations c ON c.id = cp1.conversation_id
  )
  DELETE FROM conversations
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
*/

-- ===========================================================================
-- SECTION C — Migration principale (appliquer après A + B)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- C-1. Ajout de la colonne joined_at sur conversation_participants
--      (manquante dans le schéma initial, présente dans les types TypeScript)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_participants'
      AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE conversation_participants
      ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- C-2. Élargissement de la contrainte CHECK related_type
--      (ajoute les valeurs métier ajoutées après le schéma initial :
--       artisan, community, event — absentes de la contrainte d'origine)
-- ---------------------------------------------------------------------------
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_related_type_check;

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
    'outing',
    'event',
    'artisan',
    'community'
  ));

-- ---------------------------------------------------------------------------
-- C-3. Contrainte d'unicité sur les paires canoniques
--
-- Objectif : garantir qu'il existe au plus UNE conversation entre deux
-- participants donnés pour un même contexte (related_type + related_id).
--
-- Modèle choisi : table de normalisation `conversation_pairs`
-- (vue matérialisée légère) plutôt qu'une contrainte directe sur
-- conversation_participants, car la paire doit être triée (canonique).
--
-- Alternative sans table : index fonctionnel partiel sur conversations
-- (nécessite que owner_id/created_by stockent les deux participants — voir C-4).
-- ---------------------------------------------------------------------------

-- Table des paires canoniques (une ligne par conversation bipartite)
CREATE TABLE IF NOT EXISTS conversation_pairs (
  conversation_id UUID PRIMARY KEY
    REFERENCES conversations(id) ON DELETE CASCADE,
  participant_a   UUID NOT NULL,   -- LEAST(user_a, user_b)  — UUID lexicographique
  participant_b   UUID NOT NULL,   -- GREATEST(user_a, user_b)
  related_type    TEXT NOT NULL DEFAULT 'general',
  related_id      UUID,            -- NULL pour conversations génériques

  -- Canonicité : participant_a < participant_b (ordre lexicographique UUID)
  CONSTRAINT conversation_pairs_canonical
    CHECK (participant_a < participant_b),

  -- Unicité métier : une seule conv par (paire, contexte)
  CONSTRAINT conversation_pairs_unique
    UNIQUE (participant_a, participant_b, related_type, related_id)
);

COMMENT ON TABLE conversation_pairs IS
  'Paires canoniques (participant_a < participant_b) pour la contrainte UNIQUE '
  'anti-duplication de start-conversation. Une ligne = une conversation bipartite.';

-- Index de support pour les lookups fréquents depuis findExistingConversation
CREATE INDEX IF NOT EXISTS idx_conv_pairs_lookup
  ON conversation_pairs (participant_a, participant_b, related_type)
  WHERE related_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_conv_pairs_lookup_related
  ON conversation_pairs (participant_a, participant_b, related_type, related_id)
  WHERE related_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- C-4. Remplissage initial de conversation_pairs
--      depuis les données existantes (conversations bipartites seulement)
-- ---------------------------------------------------------------------------
INSERT INTO conversation_pairs (conversation_id, participant_a, participant_b, related_type, related_id)
SELECT
  c.id                               AS conversation_id,
  LEAST(cp1.user_id, cp2.user_id)    AS participant_a,
  GREATEST(cp1.user_id, cp2.user_id) AS participant_b,
  COALESCE(c.related_type, 'general') AS related_type,
  c.related_id
FROM conversations c
JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
JOIN conversation_participants cp2
  ON cp2.conversation_id = c.id
  AND cp1.user_id < cp2.user_id        -- une seule ligne par paire ordonnée
WHERE (
  -- Compter le nombre de participants — ne retenir que les conversations bipartites
  SELECT COUNT(*) FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
) = 2
ON CONFLICT DO NOTHING;              -- idempotent si relancé après correction de doublons

-- ---------------------------------------------------------------------------
-- C-5. Trigger pour maintenir conversation_pairs à jour automatiquement
--      (INSERT sur conversation_participants → upsert dans conversation_pairs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_maintain_conversation_pairs()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_other_user UUID;
  v_conv       RECORD;
BEGIN
  -- Trouver l'autre participant (si exactement 2 au total)
  SELECT user_id INTO v_other_user
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id <> NEW.user_id
  LIMIT 1;

  IF v_other_user IS NULL THEN
    RETURN NEW; -- Conversation pas encore bipartite, rien à faire
  END IF;

  SELECT related_type, related_id INTO v_conv
  FROM conversations
  WHERE id = NEW.conversation_id;

  INSERT INTO conversation_pairs (
    conversation_id, participant_a, participant_b, related_type, related_id
  ) VALUES (
    NEW.conversation_id,
    LEAST(NEW.user_id, v_other_user),
    GREATEST(NEW.user_id, v_other_user),
    COALESCE(v_conv.related_type, 'general'),
    v_conv.related_id
  )
  ON CONFLICT ON CONSTRAINT conversation_pairs_unique DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintain_conversation_pairs
  ON conversation_participants;

CREATE TRIGGER trg_maintain_conversation_pairs
  AFTER INSERT ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION fn_maintain_conversation_pairs();

-- ---------------------------------------------------------------------------
-- C-6. RLS sur conversation_pairs
--      (accessible en lecture aux participants, pas d'écriture directe)
-- ---------------------------------------------------------------------------
ALTER TABLE conversation_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses paires de conversation"
  ON conversation_pairs FOR SELECT
  USING (
    participant_a = auth.uid()
    OR participant_b = auth.uid()
  );

-- Pas de politique INSERT/UPDATE/DELETE : la table est maintenue uniquement
-- par le trigger et les opérations admin (createAdminClient contourne RLS).

-- ===========================================================================
-- SECTION D — Vérification post-migration
-- ===========================================================================

/*
  -- D-1. Vérifier que conversation_pairs est bien peuplée
  SELECT COUNT(*) FROM conversation_pairs;

  -- D-2. Vérifier qu'il n'y a plus de doublons
  SELECT participant_a, participant_b, related_type, related_id, COUNT(*)
  FROM conversation_pairs
  GROUP BY 1, 2, 3, 4
  HAVING COUNT(*) > 1;
  -- Doit retourner 0 lignes.

  -- D-3. Vérifier que le trigger fonctionne (créer une conv de test et inspecter)
  -- (à faire manuellement sur staging)
*/
