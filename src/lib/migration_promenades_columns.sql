-- Migration : ajout des colonnes manquantes dans la table promenades
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query

ALTER TABLE promenades
  ADD COLUMN IF NOT EXISTS start_point       TEXT,
  ADD COLUMN IF NOT EXISTS dogs_allowed      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stroller_friendly BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS water_access      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS route_loop        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shade_level       TEXT CHECK (shade_level IN ('none','partial','full')),
  ADD COLUMN IF NOT EXISTS best_time_of_day  TEXT CHECK (best_time_of_day IN ('morning','sunset','anytime')),
  ADD COLUMN IF NOT EXISTS practical_tips    TEXT,
  ADD COLUMN IF NOT EXISTS safety_notes      TEXT,
  ADD COLUMN IF NOT EXISTS sector_id         TEXT;
