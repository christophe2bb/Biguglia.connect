/**
 * src/lib/events/index.ts
 *
 * Point d'entrée unique du module Événements.
 * Re-exporte tout depuis les sous-modules pour une compatibilité
 * ascendante totale avec les imports existants :
 *   import { ... } from '@/lib/events'
 *
 * Sous-modules :
 *   types.ts       — interfaces & types TypeScript
 *   mapping.ts     — configs UI (statuts, participants, catégories)
 *   permissions.ts — transitions & règles métier
 *   formatting.ts  — formatage de dates/heures
 *   sql.ts         — scripts SQL de migration
 */

export type {
  EventStatus,
  EventParticipantStatus,
  EventCategory,
  EventStatusConfig,
  EventParticipantStatusConfig,
  EventCategoryConfig,
  EventStatusTransition,
} from './types';

export {
  EVENT_STATUS_CONFIG,
  EVENT_PARTICIPANT_STATUS_CONFIG,
  EVENT_CATEGORY_CONFIG,
  EVENT_CATEGORIES_LIST,
  getEventCategory,
} from './mapping';

export {
  EVENT_STATUS_TRANSITIONS,
  getAllowedTransitions,
  canTransition,
  resolveEventStatus,
  getRemainingPlaces,
  canUserRegister,
} from './permissions';

export {
  formatEventDate,
  formatEventTime,
  daysUntilEvent,
  daysUntilLabel,
} from './formatting';

export {
  USER_ROLE_FIX_SQL,
  EVENT_FIX_SQL,
  EVENT_LIFECYCLE_SQL,
} from './sql';
