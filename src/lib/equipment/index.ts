/**
 * equipment/index.ts — Barrel d'export du module matériel
 *
 * Ré-exporte l'intégralité de l'API publique pour que les consommateurs
 * puissent continuer à importer depuis '@/lib/equipment' sans modification.
 *
 * Modules internes :
 *   _types.ts        — interfaces TypeScript (EquipmentItemFull, …)
 *   _availability.ts — configs disponibilité / remise / état
 *   _status.ts       — statuts, couleurs, transitions autorisées
 *   _rules.ts        — fonctions métier pures (canTransition, canDelete, …)
 *   _sql.ts          — script de migration SQL (EQUIPMENT_LIFECYCLE_SQL)
 */

// ── Types & interfaces ────────────────────────────────────────────────────────
export type {
  EquipmentItemFull,
  EquipmentPhotoFull,
  EquipmentRequest,
  EquipmentLoan,
  EquipmentStatusHistory,
} from './_types';

// ── Disponibilité ─────────────────────────────────────────────────────────────
export type {
  AvailabilityMode,
  PickupMode,
  LendDurationHint,
  ConditionLabel,
} from './_availability';

export {
  AVAILABILITY_MODE_CONFIG,
  PICKUP_MODE_CONFIG,
  LEND_DURATION_HINTS,
  CONDITION_CONFIG,
} from './_availability';

// ── Statuts ───────────────────────────────────────────────────────────────────
export type {
  EquipmentStatus,
  LoanRequestStatus,
  LoanStatus,
} from './_status';

export {
  EQUIPMENT_STATUS_CONFIG,
  LOAN_REQUEST_STATUS_CONFIG,
  ALLOWED_TRANSITIONS,
  TRANSITION_LABELS,
} from './_status';

// ── Règles métier ─────────────────────────────────────────────────────────────
export {
  getAllowedTransitions,
  canTransition,
  getTransitionLabel,
  canDelete,
  isPubliclyVisible,
  isRequestable,
} from './_rules';

// ── SQL de migration ─────────────────────────────────────────────────────────
export { EQUIPMENT_LIFECYCLE_SQL } from './_sql';
