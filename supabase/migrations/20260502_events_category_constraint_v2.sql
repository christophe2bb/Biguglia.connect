-- ============================================================================
-- MIGRATION 20260502_events_category_constraint_v2
-- ★ Contrainte category corrigée avec les vrais IDs du formulaire ★
--
-- Les IDs réels viennent de src/lib/events/mapping.ts :
--   concert, fete_locale, marche_foire, vide_grenier, rencontre_asso,
--   atelier, sortie_famille, activite_enfant, sport, reunion_publique,
--   solidaire, autres
-- + les IDs legacy de _constants.ts (fete, culture, association, etc.)
--
-- IDEMPOTENT : DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT
-- ============================================================================

-- Supprimer toute contrainte existante sur category
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS local_events_category_check;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_category_check;

-- Recréer avec TOUS les IDs possibles (mapping.ts + _constants.ts legacy)
ALTER TABLE public.events
  ADD CONSTRAINT events_category_check
  CHECK (category IN (
    -- IDs actuels (src/lib/events/mapping.ts — utilisés par le formulaire)
    'concert',
    'fete_locale',
    'marche_foire',
    'vide_grenier',
    'rencontre_asso',
    'atelier',
    'sortie_famille',
    'activite_enfant',
    'sport',
    'reunion_publique',
    'solidaire',
    'autres',
    -- IDs legacy (_constants.ts)
    'fete',
    'culture',
    'association',
    'citoyen',
    'marche',
    'famille',
    'musique',
    'repas',
    'nature',
    'social',
    'conference'
  ));
