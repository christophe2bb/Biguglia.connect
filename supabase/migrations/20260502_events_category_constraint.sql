-- ============================================================================
-- MIGRATION 20260502_events_category_constraint
-- ★ Mise à jour de la contrainte category sur la table events ★
--
-- Problème : la contrainte "local_events_category_check" n'acceptait que
-- les anciennes valeurs (fete_locale, etc.) et bloquait la création
-- d'événements avec les nouvelles catégories du code.
--
-- Solution : supprimer l'ancienne contrainte et en créer une nouvelle
-- qui accepte toutes les valeurs définies dans _constants.ts
-- IDEMPOTENT : DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT IF NOT EXISTS
-- ============================================================================

-- Supprimer l'ancienne contrainte (peut s'appeler local_events_category_check
-- ou events_category_check selon la migration d'origine)
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS local_events_category_check;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_category_check;

-- Corriger les lignes existantes avec d'anciennes valeurs → valeur la plus proche
UPDATE public.events SET category = 'fete'        WHERE category = 'fete_locale';
UPDATE public.events SET category = 'fete'        WHERE category = 'animation';
UPDATE public.events SET category = 'culture'     WHERE category = 'arts';
UPDATE public.events SET category = 'sport'       WHERE category = 'sport_plein_air';
UPDATE public.events SET category = 'association' WHERE category = 'solidarite';
UPDATE public.events SET category = 'citoyen'     WHERE category = 'mairie';
UPDATE public.events SET category = 'citoyen'     WHERE category = 'reunion';
UPDATE public.events SET category = 'marche'      WHERE category = 'brocante';
UPDATE public.events SET category = 'marche'      WHERE category = 'commerce';
UPDATE public.events SET category = 'famille'     WHERE category = 'enfance';
UPDATE public.events SET category = 'famille'     WHERE category = 'jeunesse';
UPDATE public.events SET category = 'fete'        WHERE category NOT IN (
  'fete','culture','sport','association','citoyen','marche','famille',
  'musique','repas','nature','social','conference'
);

-- Ajouter la nouvelle contrainte avec toutes les catégories du code
ALTER TABLE public.events
  ADD CONSTRAINT events_category_check
  CHECK (category IN (
    'fete',
    'culture',
    'sport',
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
