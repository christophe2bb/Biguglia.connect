-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : ajout des colonnes optionnelles manquantes dans la table listings
-- Date      : 2026-04-13
-- Raison    : Le formulaire de publication d'annonce référençait des colonnes
--             (is_negotiable, availability_window, pickup_notes,
--              exchange_preferences, condition_state) qui n'existaient pas
--             encore dans le schéma DB, provoquant l'erreur :
--             "Could not find the 'is_negotiable' column of 'listings'
--              in the schema cache"
-- ─────────────────────────────────────────────────────────────────────────────

-- Ajout des colonnes optionnelles (idempotent grâce à IF NOT EXISTS)

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_negotiable        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_window  text,
  ADD COLUMN IF NOT EXISTS pickup_notes         text,
  ADD COLUMN IF NOT EXISTS exchange_preferences text,
  ADD COLUMN IF NOT EXISTS condition_state      text;

-- Commentaires de documentation
COMMENT ON COLUMN listings.is_negotiable        IS 'Indique si le prix est négociable';
COMMENT ON COLUMN listings.availability_window  IS 'Créneaux de disponibilité pour récupérer l''article (ex: "week-ends uniquement")';
COMMENT ON COLUMN listings.pickup_notes         IS 'Instructions de retrait / livraison (ex: "Contacter avant de venir")';
COMMENT ON COLUMN listings.exchange_preferences IS 'Préférences d''échange (ex: "Échange contre outils de jardinage")';
COMMENT ON COLUMN listings.condition_state      IS 'État détaillé de l''article (ex: "Quelques rayures superficielles")';

-- Rafraîchissement du cache PostgREST (nécessaire pour que Supabase reconnaisse les nouvelles colonnes)
-- Note : dans Supabase cloud, ce NOTIFY est automatique après le DDL.
-- Sur self-hosted, exécutez : SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';
