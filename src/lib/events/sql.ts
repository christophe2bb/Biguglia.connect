/**
 * src/lib/events/sql.ts — Redirect vers src/lib/events/sql/
 *
 * Ce fichier est conservé pour la compatibilité ascendante.
 * Toute la logique SQL a été déplacée dans src/lib/events/sql/ :
 *
 *   sql/_fix.ts           — USER_ROLE_FIX_SQL, EVENT_FIX_SQL
 *   sql/_schema.ts        — DDL tables events (étapes 0-10)
 *   sql/_triggers.ts      — triggers updated_at + audit (étapes 11-12)
 *   sql/_views_indexes.ts — vue organisateur, index, profils (étapes 13, 20-21)
 *   sql/_rls.ts           — Row Level Security (étapes 14-19)
 *   sql/index.ts          — assemblage EVENT_LIFECYCLE_SQL + barrel
 */

export {
  USER_ROLE_FIX_SQL,
  EVENT_FIX_SQL,
  EVENT_LIFECYCLE_SQL,
} from './sql/index';
