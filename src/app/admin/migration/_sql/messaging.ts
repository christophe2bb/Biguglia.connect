/**
 * admin/migration/_sql/messaging.ts
 */
export const MESSAGING_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Messagerie universelle (enrichissement)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Ajouter les colonnes de contexte sur la table conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS source_title   TEXT,
  ADD COLUMN IF NOT EXISTS source_image   TEXT,
  ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Migrer les données existantes : created_by = premier participant
UPDATE conversations c
SET created_by = (
  SELECT cp.user_id FROM conversation_participants cp
  WHERE cp.conversation_id = c.id
  ORDER BY cp.joined_at ASC NULLS LAST, cp.id ASC
  LIMIT 1
)
WHERE c.created_by IS NULL;

-- 2. Enrichir le type ENUM related_type si pas déjà fait
-- (valeurs déjà présentes : listing, equipment, help_request, lost_found,
--  association, outing, collection_item, service_request, general)
-- Aucune migration nécessaire si la colonne est TEXT avec CHECK

-- 3. Ajouter la colonne status aux conversations (si absente)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'blocked'));

-- 4. Index supplémentaires pour les recherches de conversation
CREATE INDEX IF NOT EXISTS conversations_created_by_idx ON conversations(created_by);
CREATE INDEX IF NOT EXISTS conversations_owner_id_idx   ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS conversations_status_idx     ON conversations(status);

-- 5. Colonne message_type sur messages (pour système, pièces jointes, etc.)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system', 'image', 'file', 'location'));
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS edited_at       TIMESTAMPTZ;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;

-- 6. Table message_attachments (pièces jointes enrichies)
CREATE TABLE IF NOT EXISTS message_attachments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id   UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  file_type    TEXT NOT NULL,
  file_name    TEXT,
  file_size    INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes avant recréation (idempotent)
DROP POLICY IF EXISTS "Participants peuvent voir les pièces jointes" ON message_attachments;
DROP POLICY IF EXISTS "Participants peuvent ajouter des pièces jointes" ON message_attachments;

CREATE POLICY "Participants peuvent voir les pièces jointes"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
        AND cp.user_id = auth.uid()
    )
  );
CREATE POLICY "Participants peuvent ajouter des pièces jointes"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
        AND cp.user_id = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS message_attachments_message_idx ON message_attachments(message_id);

-- 7. Colonnes anti-spam sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_conversation_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversation_count_today INTEGER NOT NULL DEFAULT 0;

-- 8. Vue helper : dernière activité par conversation pour l'utilisateur connecté
-- (matérialisée en SELECT depuis l'app, pas besoin de vue serveur)

-- 9. Vérification finale
SELECT
  (SELECT count(*) FROM conversations WHERE status IS NOT NULL) AS convs_with_status,
  (SELECT count(*) FROM messages WHERE message_type IS NOT NULL) AS msgs_with_type,
  (SELECT count(*) FROM message_attachments) AS attachments_count;
`;

export const INTERACTION_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Table interactions (cycle de vie complet)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Creer la table interactions
CREATE TABLE IF NOT EXISTS interactions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Type et cible
  source_type     TEXT NOT NULL CHECK (source_type IN (
    'listing', 'equipment', 'help_request', 'association',
    'collection_item', 'outing', 'event', 'service_request', 'lost_found'
  )),
  source_id       UUID NOT NULL,

  -- Participants
  requester_id    UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Type d interaction
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'transaction',       -- annonce : vente/achat
    'material_request',  -- materiel : demande de pret
    'help_match',        -- coup de main : aide acceptee
    'participation',     -- promenade/evenement : inscription
    'contact',           -- association/collectionneur : prise de contact
    'service_request'    -- artisan : demande de prestation
  )),

  -- Cycle de vie
  status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested',    -- demande envoyee
    'pending',      -- en attente de reponse
    'accepted',     -- acceptee par le destinataire
    'rejected',     -- refusee
    'in_progress',  -- en cours (action en train de se realiser)
    'done',         -- terminee (les 2 parties confirment)
    'cancelled',    -- annulee par l un ou l autre
    'disputed'      -- litige signale
  )),

  -- Historique des statuts (JSON array)
  status_history  JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Conversation liee (cree automatiquement ou manuellement)
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Avis debloque apres confirmation
  review_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  review_requester_done BOOLEAN NOT NULL DEFAULT FALSE,
  review_receiver_done  BOOLEAN NOT NULL DEFAULT FALSE,

  -- Dates
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at     TIMESTAMPTZ,
  in_progress_at  TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Une seule interaction active par paire (requester + source)
  UNIQUE(source_type, source_id, requester_id)
);

-- 2. Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS interactions_updated_at ON interactions;
CREATE TRIGGER interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_interactions_requester ON interactions(requester_id);
CREATE INDEX IF NOT EXISTS idx_interactions_receiver  ON interactions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_interactions_source    ON interactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status    ON interactions(status);
CREATE INDEX IF NOT EXISTS idx_interactions_conv      ON interactions(conversation_id);

-- 4. Fonction : ajouter entree dans status_history
CREATE OR REPLACE FUNCTION add_interaction_history(
  p_interaction_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_note TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE interactions
  SET
    status         = p_new_status,
    status_history = status_history || jsonb_build_object(
      'status',     p_new_status,
      'changed_by', p_user_id,
      'changed_at', now(),
      'note',       p_note
    ),
    accepted_at     = CASE WHEN p_new_status = 'accepted'     THEN now() ELSE accepted_at     END,
    in_progress_at  = CASE WHEN p_new_status = 'in_progress'  THEN now() ELSE in_progress_at  END,
    completed_at    = CASE WHEN p_new_status = 'done'         THEN now() ELSE completed_at    END,
    cancelled_at    = CASE WHEN p_new_status IN ('cancelled','rejected') THEN now() ELSE cancelled_at END
  WHERE id = p_interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction : confirmer la fin d interaction (les 2 cotes)
CREATE OR REPLACE FUNCTION confirm_interaction_done(
  p_interaction_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_interaction interactions%ROWTYPE;
  v_req_done BOOLEAN; v_rec_done BOOLEAN;
BEGIN
  SELECT * INTO v_interaction FROM interactions WHERE id = p_interaction_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  -- Seuls les participants peuvent confirmer
  IF v_uid <> v_interaction.requester_id AND v_uid <> v_interaction.receiver_id THEN
    RETURN FALSE;
  END IF;
  -- Marquer la confirmation de ce cote
  IF v_uid = v_interaction.requester_id THEN
    UPDATE interactions SET review_requester_done = TRUE WHERE id = p_interaction_id;
  ELSE
    UPDATE interactions SET review_receiver_done = TRUE WHERE id = p_interaction_id;
  END IF;
  -- Verifier si les 2 ont confirme
  SELECT review_requester_done, review_receiver_done
  INTO v_req_done, v_rec_done
  FROM interactions WHERE id = p_interaction_id;
  -- Si les 2 confirment : passer a done + debloquer avis
  IF v_req_done AND v_rec_done THEN
    UPDATE interactions
    SET status = 'done', review_unlocked = TRUE, completed_at = now()
    WHERE id = p_interaction_id;
    -- Sync conversation exchange_status si liee
    UPDATE conversations
    SET exchange_status = 'done',
        exchange_confirmed_at = now()
    WHERE id = v_interaction.conversation_id;
    RETURN TRUE;
  END IF;
  -- Si une seule partie : passer en pending confirmation
  UPDATE interactions SET status = 'in_progress' WHERE id = p_interaction_id
    AND status NOT IN ('done', 'cancelled', 'rejected');
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Mettre a jour can_rate_item pour utiliser interactions.review_unlocked
CREATE OR REPLACE FUNCTION can_rate_item(p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID; v_status TEXT; v_date DATE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  -- Auteur ne peut pas noter son propre item
  CASE p_target_type
    WHEN 'listing'         THEN SELECT user_id      INTO v_author_id FROM listings        WHERE id = p_target_id;
    WHEN 'equipment'       THEN SELECT owner_id     INTO v_author_id FROM equipment_items WHERE id = p_target_id;
    WHEN 'help_request'    THEN SELECT author_id    INTO v_author_id FROM help_requests   WHERE id = p_target_id;
    WHEN 'association'     THEN SELECT author_id    INTO v_author_id FROM associations    WHERE id = p_target_id;
    WHEN 'collection_item' THEN SELECT author_id    INTO v_author_id FROM collection_items WHERE id = p_target_id;
    WHEN 'event'           THEN SELECT author_id    INTO v_author_id FROM local_events    WHERE id = p_target_id;
    WHEN 'outing'          THEN SELECT organizer_id INTO v_author_id FROM group_outings   WHERE id = p_target_id;
    ELSE v_author_id := NULL;
  END CASE;
  IF v_author_id = v_uid THEN RETURN FALSE; END IF;
  -- Libre : perdu/trouve, promenade
  IF p_target_type IN ('lost_found', 'promenade') THEN RETURN TRUE; END IF;
  -- Evenement : inscrit + date passee
  IF p_target_type = 'event' THEN
    SELECT event_date INTO v_date FROM local_events WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (SELECT 1 FROM event_participations WHERE event_id = p_target_id AND user_id = v_uid);
  END IF;
  -- Sortie : inscrit + date passee
  IF p_target_type = 'outing' THEN
    SELECT outing_date INTO v_date FROM group_outings WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (SELECT 1 FROM outing_participants WHERE outing_id = p_target_id AND user_id = v_uid);
  END IF;
  -- Demande artisan
  IF p_target_type = 'service_request' THEN
    RETURN EXISTS (SELECT 1 FROM service_requests WHERE id = p_target_id AND resident_id = v_uid);
  END IF;
  -- Tous les autres : interaction terminee (review_unlocked = true)
  -- OU fallback : conversation avec exchange_status=done
  RETURN EXISTS (
    SELECT 1 FROM interactions
    WHERE source_type = p_target_type
      AND source_id   = p_target_id
      AND (requester_id = v_uid OR receiver_id = v_uid)
      AND review_unlocked = TRUE
  ) OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.related_type    = p_target_type
      AND c.related_id      = p_target_id
      AND c.exchange_status = 'done'
      AND cp.user_id        = v_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voir ses interactions"    ON interactions;
DROP POLICY IF EXISTS "Creer une interaction"    ON interactions;
DROP POLICY IF EXISTS "Modifier son interaction" ON interactions;

CREATE POLICY "Voir ses interactions" ON interactions
  FOR SELECT USING (
    requester_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Creer une interaction" ON interactions
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Modifier son interaction" ON interactions
  FOR UPDATE USING (
    requester_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 8. Recharge schema
NOTIFY pgrst, 'reload schema';`;

export const EXCHANGE_SQL = `-- ============================================================
-- BIGUGLIA CONNECT - Echanges confirmes (avis verifie)
-- Copier dans Supabase > SQL Editor > New query > Run
-- ============================================================

-- 1. Ajouter les colonnes d echange sur la table conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS exchange_status TEXT
    DEFAULT NULL CHECK (exchange_status IN ('pending_confirmation','done')),
  ADD COLUMN IF NOT EXISTS exchange_confirmed_by UUID[]
    DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS exchange_confirmed_at TIMESTAMPTZ
    DEFAULT NULL;

-- 2. Index pour requetes rapides sur l echange
CREATE INDEX IF NOT EXISTS idx_conversations_exchange
  ON conversations(exchange_status)
  WHERE exchange_status IS NOT NULL;

-- 3. Mettre a jour la fonction can_rate_item pour utiliser exchange_status
-- Pour listing, equipment, association, collection_item, help_request :
--   echange confirme (exchange_status = done) obligatoire au lieu de simple conversation
CREATE OR REPLACE FUNCTION can_rate_item(p_target_type TEXT, p_target_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_author_id UUID;
  v_status    TEXT;
  v_date      DATE;
  v_uid       UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;

  -- Ne pas noter son propre item
  CASE p_target_type
    WHEN 'listing'         THEN SELECT user_id       INTO v_author_id FROM listings        WHERE id = p_target_id;
    WHEN 'equipment'       THEN SELECT owner_id      INTO v_author_id FROM equipment_items WHERE id = p_target_id;
    WHEN 'help_request'    THEN SELECT author_id     INTO v_author_id FROM help_requests   WHERE id = p_target_id;
    WHEN 'association'     THEN SELECT author_id     INTO v_author_id FROM associations    WHERE id = p_target_id;
    WHEN 'collection_item' THEN SELECT author_id     INTO v_author_id FROM collection_items WHERE id = p_target_id;
    WHEN 'event'           THEN SELECT author_id     INTO v_author_id FROM local_events    WHERE id = p_target_id;
    WHEN 'outing'          THEN SELECT organizer_id  INTO v_author_id FROM group_outings   WHERE id = p_target_id;
    ELSE v_author_id := NULL;
  END CASE;

  IF v_author_id = v_uid THEN RETURN FALSE; END IF;

  -- Libre : perdu/trouve, promenade
  IF p_target_type IN ('lost_found', 'promenade') THEN RETURN TRUE; END IF;

  -- Evenement : inscrit + date passee
  IF p_target_type = 'event' THEN
    SELECT event_date INTO v_date FROM local_events WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM event_participations
      WHERE event_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Sortie : inscrit + date passee
  IF p_target_type = 'outing' THEN
    SELECT outing_date INTO v_date FROM group_outings WHERE id = p_target_id;
    IF v_date > CURRENT_DATE THEN RETURN FALSE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM outing_participants
      WHERE outing_id = p_target_id AND user_id = v_uid
    );
  END IF;

  -- Demande artisan : auteur de la demande
  IF p_target_type = 'service_request' THEN
    RETURN EXISTS (
      SELECT 1 FROM service_requests WHERE id = p_target_id AND resident_id = v_uid
    );
  END IF;

  -- Coup de main : echange confirme OU statut resolved + participant conversation
  IF p_target_type = 'help_request' THEN
    SELECT status INTO v_status FROM help_requests WHERE id = p_target_id;
    -- Echange confirme via conversation
    IF EXISTS (
      SELECT 1 FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.related_type = 'help_request'
        AND c.related_id   = p_target_id
        AND c.exchange_status = 'done'
        AND cp.user_id     = v_uid
    ) THEN RETURN TRUE; END IF;
    -- Fallback : resolu + auteur
    IF v_status = 'resolved' AND v_author_id = v_uid THEN RETURN TRUE; END IF;
    RETURN FALSE;
  END IF;

  -- listing, equipment, association, collection_item :
  -- ECHANGE CONFIRME obligatoire (exchange_status = done)
  RETURN EXISTS (
    SELECT 1 FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE c.related_type    = p_target_type
      AND c.related_id      = p_target_id
      AND c.exchange_status = 'done'
      AND cp.user_id        = v_uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. RLS sur conversations : permettre la mise a jour de exchange_status
DROP POLICY IF EXISTS "Participants maj echange"  ON conversations;
CREATE POLICY "Participants maj echange" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id
        AND cp.user_id = auth.uid()
    )
  );

-- 5. Recharge cache
NOTIFY pgrst, 'reload schema';`;

