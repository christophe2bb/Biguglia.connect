/**
 * equipment/_rules.ts — Règles métier du cycle de vie matériel
 *
 * Fonctions pures : transitions, suppression, visibilité publique, requestabilité.
 * Aucun effet de bord, aucune dépendance Supabase — testables unitairement.
 */

import {
  ALLOWED_TRANSITIONS,
  TRANSITION_LABELS,
  EQUIPMENT_STATUS_CONFIG,
  type EquipmentStatus,
} from './_status';

// ─── Transitions ─────────────────────────────────────────────────────────────

/** Retourne la liste des statuts vers lesquels on peut passer depuis `current`. */
export function getAllowedTransitions(current: EquipmentStatus): EquipmentStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

/** Indique si la transition `from → to` est autorisée. */
export function canTransition(from: EquipmentStatus, to: EquipmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Retourne le libellé de la transition `from → to`, avec fallback générique. */
export function getTransitionLabel(from: EquipmentStatus, to: EquipmentStatus): string {
  return TRANSITION_LABELS[`${from}→${to}`] ?? `Passer à ${EQUIPMENT_STATUS_CONFIG[to]?.label}`;
}

// ─── Suppression ─────────────────────────────────────────────────────────────

/** Indique si un objet matériel peut être supprimé, avec raison si interdit. */
export function canDelete(
  status: EquipmentStatus,
  hasActiveLoan: boolean,
): { allowed: boolean; reason?: string } {
  if (hasActiveLoan)      return { allowed: false, reason: 'Un prêt est en cours' };
  if (status === 'prete')  return { allowed: false, reason: 'Matériel actuellement prêté' };
  if (status === 'reserve') return { allowed: false, reason: 'Une réservation est active' };
  return { allowed: true };
}

// ─── Visibilité / requestabilité ─────────────────────────────────────────────

/** `false` uniquement pour les items archivés. */
export function isPubliclyVisible(status: EquipmentStatus): boolean {
  return status !== 'archive';
}

/** `true` uniquement quand le matériel est disponible. */
export function isRequestable(status: EquipmentStatus): boolean {
  return status === 'disponible';
}
