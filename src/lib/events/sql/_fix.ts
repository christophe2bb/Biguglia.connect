/**
 * events/sql/_fix.ts — Correctifs urgents à exécuter AVANT la migration principale
 *
 * USER_ROLE_FIX_SQL : harmonise l'enum user_role (moderateur → moderator).
 * EVENT_FIX_SQL     : corrige les contraintes de statut et les colonnes
 *                     manquantes sur local_events / events avant le refactoring.
 *
 * Ces deux scripts sont idempotents et peuvent être relancés sans danger.
 */

// ─── Correctif enum user_role ─────────────────────────────────────────────────

export const USER_ROLE_FIX_SQL = `-- ============================================================
-- 🔧 CORRECTIF ENUM user_role — moderateur → moderator
-- Exécutez ce script si vous obtenez l'erreur :
--   "invalid input value for enum user_role: moderateur"
-- ============================================================

-- 1. Vérifier les valeurs actuelles de l'enum
SELECT enumlabel FROM pg_enum
  WHERE enumtypid = 'user_role'::regtype
  ORDER BY enumsortorder;

-- 2. Ajouter 'moderator' si absent (HORS transaction car ADD VALUE ne peut pas être rollbacké)
-- Exécutez d'abord cette ligne séparément si l'étape 3 échoue :
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'moderator';

-- 3. Migrer les lignes avec l'ancienne valeur 'moderateur'
DO $$
BEGIN
  -- Essai cast direct : si user_role est un ENUM
  BEGIN
    EXECUTE $q$ UPDATE profiles SET role = 'moderator'::user_role WHERE role::text = 'moderateur' $q$;
  EXCEPTION WHEN OTHERS THEN
    -- Si role est TEXT
    UPDATE profiles SET role = 'moderator' WHERE role = 'moderateur';
  END;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration moderateur→moderator ignorée : %', SQLERRM;
END$$;

-- 4. Recréer current_user_role() pour accepter les deux valeurs
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ✅ Enum user_role corrigé
`;

// ─── Correctif urgent statuts + colonnes manquantes ───────────────────────────

export const EVENT_FIX_SQL = `-- ============================================================
-- ⚠️  CORRECTIF URGENT — statuts + colonnes manquantes
-- Fonctionne que la table s'appelle local_events OU events
-- Exécutez CE SCRIPT EN PREMIER si vous obtenez l'erreur :
--   "violates check constraint local_events_status_check"
--   "column e.capacity does not exist"
--   "relation local_events does not exist"
-- ============================================================

-- 1. Corrections sur local_events (seulement si elle existe encore)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'local_events') THEN
    -- Supprimer les anciennes contraintes
    ALTER TABLE local_events DROP CONSTRAINT IF EXISTS local_events_status_check;
    ALTER TABLE local_events DROP CONSTRAINT IF EXISTS events_status_check;
    -- Ajouter les colonnes manquantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='capacity') THEN
      ALTER TABLE local_events ADD COLUMN capacity INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='is_unlimited') THEN
      ALTER TABLE local_events ADD COLUMN is_unlimited BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='registration_open') THEN
      ALTER TABLE local_events ADD COLUMN registration_open BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='price_type') THEN
      ALTER TABLE local_events ADD COLUMN price_type TEXT DEFAULT 'gratuit';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='cancel_reason') THEN
      ALTER TABLE local_events ADD COLUMN cancel_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='local_events' AND column_name='postpone_reason') THEN
      ALTER TABLE local_events ADD COLUMN postpone_reason TEXT;
    END IF;
    -- Migrer les statuts legacy → français
    UPDATE local_events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open');
    UPDATE local_events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
    UPDATE local_events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
    UPDATE local_events SET status = 'archive' WHERE status IN ('archived','archivee');
    UPDATE local_events SET status = 'complet' WHERE status IN ('full','complete');
    UPDATE local_events SET status = 'a_venir'
      WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');
    -- Remettre une contrainte large
    ALTER TABLE local_events DROP CONSTRAINT IF EXISTS local_events_status_check;
    ALTER TABLE local_events ADD CONSTRAINT local_events_status_check
      CHECK (status IN (
        'active','cancelled','completed','done','archived','full',
        'a_venir','complet','reporte','annule','passe','archive',
        'publie','brouillon'
      ));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- 2. Corrections sur events (si local_events a déjà été renommée)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    -- Ajouter les colonnes manquantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='capacity') THEN
      ALTER TABLE events ADD COLUMN capacity INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_unlimited') THEN
      ALTER TABLE events ADD COLUMN is_unlimited BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='registration_open') THEN
      ALTER TABLE events ADD COLUMN registration_open BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='price_type') THEN
      ALTER TABLE events ADD COLUMN price_type TEXT DEFAULT 'gratuit';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='cancel_reason') THEN
      ALTER TABLE events ADD COLUMN cancel_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='postpone_reason') THEN
      ALTER TABLE events ADD COLUMN postpone_reason TEXT;
    END IF;
    -- Migrer les statuts legacy → français
    UPDATE events SET status = 'a_venir' WHERE status IN ('active','publie','brouillon','open');
    UPDATE events SET status = 'annule'  WHERE status IN ('cancelled','annulee','canceled');
    UPDATE events SET status = 'passe'   WHERE status IN ('completed','done','terminee','past');
    UPDATE events SET status = 'archive' WHERE status IN ('archived','archivee');
    UPDATE events SET status = 'complet' WHERE status IN ('full','complete');
    UPDATE events SET status = 'a_venir'
      WHERE status NOT IN ('a_venir','complet','reporte','annule','passe','archive');
    -- Contrainte CHECK sur events
    ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
    ALTER TABLE events ADD CONSTRAINT events_status_check
      CHECK (status IN ('a_venir','complet','reporte','annule','passe','archive'));
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- ✅ Correctif appliqué — vous pouvez maintenant exécuter EVENT_LIFECYCLE_SQL
`;
