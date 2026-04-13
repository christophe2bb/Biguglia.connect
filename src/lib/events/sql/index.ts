/**
 * events/sql/index.ts — Barrel du sous-module SQL Événements
 *
 * Ré-exporte les constantes SQL atomiques et assemble EVENT_LIFECYCLE_SQL
 * à partir de ses quatre blocs fonctionnels pour une compatibilité arrière
 * totale avec les consommateurs existants (useMigration.ts, etc.).
 *
 * Ordre d'exécution recommandé :
 *   1. USER_ROLE_FIX_SQL  — si erreur enum user_role
 *   2. EVENT_FIX_SQL      — si erreur contrainte statut
 *   3. EVENT_LIFECYCLE_SQL — migration complète
 *
 * Sous-modules :
 *   _fix.ts           — correctifs urgents (USER_ROLE_FIX_SQL, EVENT_FIX_SQL)
 *   _schema.ts        — DDL tables + colonnes + statuts (étapes 0-10)
 *   _triggers.ts      — triggers updated_at + audit statut (étapes 11-12)
 *   _views_indexes.ts — vue organisateur + index + profils publics (étapes 13-13b, 20-21)
 *   _rls.ts           — Row Level Security toutes tables (étapes 14-19)
 */

export { USER_ROLE_FIX_SQL, EVENT_FIX_SQL } from './_fix';

import { EVENT_SCHEMA_SQL }       from './_schema';
import { EVENT_TRIGGERS_SQL }     from './_triggers';
import { EVENT_VIEWS_INDEXES_SQL } from './_views_indexes';
import { EVENT_RLS_SQL }          from './_rls';

/**
 * Script de migration complet du cycle de vie des événements.
 * Assemblé depuis les quatre blocs fonctionnels dans l'ordre d'exécution
 * correct : schéma → triggers → vues/index → RLS.
 */
export const EVENT_LIFECYCLE_SQL =
  `-- ============================================================
-- ÉVÉNEMENTS — Migration cycle de vie complet
-- Biguglia Connect — À exécuter dans Supabase SQL Editor
-- IMPORTANT : Si vous avez l'erreur "local_events_status_check",
-- exécutez d'abord le script CORRECTIF (EVENT_FIX_SQL).
-- ============================================================
` +
  EVENT_SCHEMA_SQL +
  EVENT_TRIGGERS_SQL +
  EVENT_VIEWS_INDEXES_SQL +
  EVENT_RLS_SQL +
  `
-- ✅ Migration terminée — tables, triggers, RLS, vue organisateur, mini-forum, profils publics
`;

// Re-export des blocs atomiques pour les tests ou une exécution partielle
export { EVENT_SCHEMA_SQL }        from './_schema';
export { EVENT_TRIGGERS_SQL }      from './_triggers';
export { EVENT_VIEWS_INDEXES_SQL } from './_views_indexes';
export { EVENT_RLS_SQL }           from './_rls';
