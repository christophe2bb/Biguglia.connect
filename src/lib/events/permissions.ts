/**
 * src/lib/events/permissions.ts
 *
 * Transitions de statut autorisées et règles métier :
 *   - getAllowedTransitions()  — transitions depuis un statut donné
 *   - canTransition()          — vérifie si une transition est licite
 *   - resolveEventStatus()     — statut effectif (date + capacité)
 *   - getRemainingPlaces()     — places restantes
 *   - canUserRegister()        — éligibilité d'inscription
 */

import type { EventStatus, EventStatusTransition } from './types';

// ─── Transitions autorisées ───────────────────────────────────────────────────
//
// Transitions interdites (implicitement) :
//   passe  → a_venir ❌
//   annule → a_venir ❌
//   archive → tout   ❌

export const EVENT_STATUS_TRANSITIONS: EventStatusTransition[] = [
  // a_venir
  { from: 'a_venir', to: 'complet', label: 'Marquer complet',    description: 'Capacité atteinte, fermer les inscriptions' },
  { from: 'a_venir', to: 'reporte', label: 'Reporter',           description: 'Nouveau date à définir',           requiresReason: true },
  { from: 'a_venir', to: 'annule',  label: 'Annuler',            description: 'Annuler définitivement',           requiresReason: true },
  { from: 'a_venir', to: 'passe',   label: 'Marquer passé',      description: "L'événement a eu lieu" },
  // complet
  { from: 'complet', to: 'a_venir', label: 'Rouvrir inscriptions', description: "Une place s'est libérée" },
  { from: 'complet', to: 'reporte', label: 'Reporter',           description: 'Reporter même si complet',         requiresReason: true },
  { from: 'complet', to: 'annule',  label: 'Annuler',            description: 'Annuler définitivement',           requiresReason: true },
  { from: 'complet', to: 'passe',   label: 'Marquer passé',      description: "L'événement a eu lieu" },
  // reporte
  { from: 'reporte', to: 'a_venir', label: 'Reprogrammer',       description: 'Nouvelle date définie, réouvrir' },
  { from: 'reporte', to: 'annule',  label: 'Annuler',            description: 'Finalement annuler',              requiresReason: true },
  // passe / annule → archive
  { from: 'passe',   to: 'archive', label: 'Archiver',           description: 'Déplacer vers les archives' },
  { from: 'annule',  to: 'archive', label: 'Archiver',           description: 'Déplacer vers les archives' },
];

export function getAllowedTransitions(status: EventStatus): EventStatusTransition[] {
  return EVENT_STATUS_TRANSITIONS.filter(t => t.from === status);
}

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return EVENT_STATUS_TRANSITIONS.some(t => t.from === from && t.to === to);
}

// ─── Règles métier ────────────────────────────────────────────────────────────

/** Mapping des valeurs legacy vers les statuts français normalisés. */
const LEGACY_STATUS_MAP: Record<string, EventStatus> = {
  active: 'a_venir', publie: 'a_venir', brouillon: 'a_venir', open: 'a_venir',
  cancelled: 'annule', annulee: 'annule', canceled: 'annule',
  completed: 'passe', done: 'passe', terminee: 'passe',
  archived: 'archive', archivee: 'archive',
  full: 'complet', complete: 'complet',
  postponed: 'reporte',
};

/**
 * Retourne le statut effectif d'un événement,
 * en tenant compte de la date et de la capacité.
 */
export function resolveEventStatus(
  status: string,
  eventDate: string | null | undefined,
  participantsCount: number,
  capacity: number | null,
  isUnlimited: boolean,
): EventStatus {
  // Statuts définitifs — on ne les override pas
  if (status === 'annule')  return 'annule';
  if (status === 'archive') return 'archive';
  if (status === 'reporte') return 'reporte';

  // Si la date est passée → passe
  if (eventDate) {
    const d = new Date(eventDate + 'T23:59:59');
    if (d < new Date() && (status === 'passe' || status === 'complet' || status === 'a_venir')) {
      return 'passe';
    }
  }

  // Capacité atteinte → complet
  if (!isUnlimited && capacity !== null && participantsCount >= capacity) {
    return 'complet';
  }

  // Statuts déjà normalisés
  if (status === 'a_venir' || status === 'complet' || status === 'passe') {
    return status as EventStatus;
  }

  // Mapping legacy
  return LEGACY_STATUS_MAP[status] ?? 'a_venir';
}

/**
 * Calcule le nombre de places restantes.
 * Retourne null si illimité ou pas de capacité définie.
 */
export function getRemainingPlaces(
  capacity: number | null,
  isUnlimited: boolean,
  participantsCount: number,
): number | null {
  if (isUnlimited || capacity === null) return null;
  return Math.max(0, capacity - participantsCount);
}

/**
 * Vérifie si un utilisateur peut s'inscrire à un événement.
 */
export function canUserRegister(
  eventStatus: EventStatus,
  registrationOpen: boolean,
  eventDate: string | null | undefined,
  remaining: number | null,
  isUnlimited: boolean,
): { allowed: boolean; reason?: string } {
  if (eventStatus === 'annule')  return { allowed: false, reason: 'Événement annulé' };
  if (eventStatus === 'archive') return { allowed: false, reason: 'Événement archivé' };
  if (eventStatus === 'passe')   return { allowed: false, reason: 'Événement terminé' };
  if (eventStatus === 'reporte') return { allowed: false, reason: 'Événement reporté' };
  if (!registrationOpen)         return { allowed: false, reason: 'Inscriptions fermées' };
  if (!isUnlimited && remaining !== null && remaining <= 0) {
    return { allowed: false, reason: 'Événement complet' };
  }
  if (eventDate) {
    const d = new Date(eventDate + 'T23:59:59');
    if (d < new Date()) return { allowed: false, reason: 'Date dépassée' };
  }
  return { allowed: true };
}
