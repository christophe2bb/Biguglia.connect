/**
 * admin/migration/_sql/index.ts
 *
 * Barrel re-export de tous les scripts SQL de migration.
 * Chaque fichier regroupe les scripts par domaine métier.
 */

export { MIGRATION_SQL }                               from './core';
export { REALTIME_SQL }                                from './realtime';
export { MESSAGING_SQL, INTERACTION_SQL, EXCHANGE_SQL } from './messaging';
export { CONV_FIX_BLOC1, CONV_FIX_BLOC2 }             from './messaging-fix';
export { RATING_SQL }                                  from './rating';
export { BUCKET_SQL }                                  from './storage';
export { ARTISAN_SQL }                                 from './artisan';
export {
  COLLECTION_COMMENTS_SQL,
  COMMUNITY_SQL,
  DISCUSSIONS_SQL,
}                                                      from './community';
export { RLS_STATUS_SQL }                              from './rls-status';
export { TRUST_STATS_FIX_SQL, TRUST_SQL }              from './trust';
export { COLLECTIONNEURS_V2_SQL }                      from './collectionneurs';
export {
  USER_ROLE_FIX_SQL,
  MODERATION_FIX_SQL,
  MODERATION_SQL,
}                                                      from './moderation';
export { EVENTS_BASE_SQL, REMINDER_SQL }               from './events';
export { FORUM_V2_SQL }                                from './forum';
export { PROFIL_PUBLIC_SQL }                           from './profiles';
export { LF_HISTORY_SQL, LF_MATCHES_SQL, LF_EXTRAS_SQL } from './lost-found';
export { SECTORS_SQL }                                 from './sectors';
export { SEARCH_SQL }                                  from './search';
export { STATUS_SQL, LISTINGS_COVER_SQL }              from './status';
export { ADMIN_LOGS_SQL }                              from './admin-logs';
