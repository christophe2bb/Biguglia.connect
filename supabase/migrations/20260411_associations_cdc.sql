-- ─── Migration CDC Associations — Biguglia Connect ───────────────────────────
-- Ajoute les colonnes manquantes du Cahier des Charges Associations
-- Phase 1 MVP : colonnes d'engagement + activité + CDC §10
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonnes d'acceptation (CDC §6.2, §7.3, §10)
ALTER TABLE associations
  ADD COLUMN IF NOT EXISTS is_accepting_members    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accepting_volunteers BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accepting_donations  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accepting_partners   BOOLEAN DEFAULT false;

-- 2. Horodatage dernière activité (CDC §7.4 — preuve d'activité)
ALTER TABLE associations
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- 3. Index pour les requêtes fréquentes (CDC §7.1 — recherche et filtres)
CREATE INDEX IF NOT EXISTS idx_associations_category ON associations(category);
CREATE INDEX IF NOT EXISTS idx_associations_sector_id ON associations(sector_id);
CREATE INDEX IF NOT EXISTS idx_associations_status ON associations(status);
CREATE INDEX IF NOT EXISTS idx_associations_urgent ON associations(urgent_need) WHERE urgent_need = true;
CREATE INDEX IF NOT EXISTS idx_associations_is_accepting_volunteers ON associations(is_accepting_volunteers) WHERE is_accepting_volunteers = true;
CREATE INDEX IF NOT EXISTS idx_associations_is_accepting_donations ON associations(is_accepting_donations) WHERE is_accepting_donations = true;
CREATE INDEX IF NOT EXISTS idx_associations_created_at ON associations(created_at DESC);

-- 4. Mise à jour automatique de last_activity_at sur modification
CREATE OR REPLACE FUNCTION update_asso_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asso_last_activity ON associations;
CREATE TRIGGER trg_asso_last_activity
  BEFORE UPDATE ON associations
  FOR EACH ROW
  EXECUTE FUNCTION update_asso_last_activity();

-- 5. Table association_needs structurés (CDC §7.2, §10)
CREATE TABLE IF NOT EXISTS association_needs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  need_type      TEXT NOT NULL CHECK (need_type IN (
    'members', 'volunteers', 'material', 'sponsors', 'donations',
    'skills', 'venue', 'communication', 'logistics'
  )),
  title          TEXT NOT NULL,
  description    TEXT,
  urgency        TEXT DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  status         TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fulfilled', 'archived')),
  sector_id      TEXT,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asso_needs_association ON association_needs(association_id);
CREATE INDEX IF NOT EXISTS idx_asso_needs_status ON association_needs(status);
CREATE INDEX IF NOT EXISTS idx_asso_needs_type ON association_needs(need_type);
CREATE INDEX IF NOT EXISTS idx_asso_needs_urgency ON association_needs(urgency);

-- RLS association_needs
ALTER TABLE association_needs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asso_needs_select" ON association_needs;
CREATE POLICY "asso_needs_select" ON association_needs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "asso_needs_insert" ON association_needs;
CREATE POLICY "asso_needs_insert" ON association_needs
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
  );

DROP POLICY IF EXISTS "asso_needs_update" ON association_needs;
CREATE POLICY "asso_needs_update" ON association_needs
  FOR UPDATE USING (
    auth.uid() = created_by
    OR auth.uid() IN (SELECT author_id FROM associations WHERE id = association_needs.association_id)
  );

DROP POLICY IF EXISTS "asso_needs_delete" ON association_needs;
CREATE POLICY "asso_needs_delete" ON association_needs
  FOR DELETE USING (
    auth.uid() = created_by
    OR auth.uid() IN (SELECT author_id FROM associations WHERE id = association_needs.association_id)
  );

-- 6. Table association_memberships_interest (CDC §7.3 — demandes structurées)
CREATE TABLE IF NOT EXISTS association_memberships_interest (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest_type  TEXT DEFAULT 'member' CHECK (interest_type IN (
    'member', 'volunteer', 'donor', 'partner', 'info'
  )),
  message        TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'accepted', 'declined')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (association_id, user_id, interest_type)
);

CREATE INDEX IF NOT EXISTS idx_asso_interest_assoc ON association_memberships_interest(association_id);
CREATE INDEX IF NOT EXISTS idx_asso_interest_user ON association_memberships_interest(user_id);
CREATE INDEX IF NOT EXISTS idx_asso_interest_status ON association_memberships_interest(status);

ALTER TABLE association_memberships_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asso_interest_select" ON association_memberships_interest;
CREATE POLICY "asso_interest_select" ON association_memberships_interest
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT author_id FROM associations WHERE id = association_memberships_interest.association_id)
  );

DROP POLICY IF EXISTS "asso_interest_insert" ON association_memberships_interest;
CREATE POLICY "asso_interest_insert" ON association_memberships_interest
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "asso_interest_delete" ON association_memberships_interest;
CREATE POLICY "asso_interest_delete" ON association_memberships_interest
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Fin migration CDC Associations ──────────────────────────────────────────
-- COMMENT ON TABLE associations IS 'CDC Associations v1 — Biguglia Connect PRO';
