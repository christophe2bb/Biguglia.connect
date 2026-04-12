/**
 * src/lib/events/types.ts
 *
 * Interfaces et types TypeScript du module Événements.
 */

// ─── Statuts événement ────────────────────────────────────────────────────────

export type EventStatus =
  | 'a_venir'
  | 'complet'
  | 'reporte'
  | 'annule'
  | 'passe'
  | 'archive';

export type EventParticipantStatus =
  | 'inscrit'
  | 'confirme'
  | 'annule'
  | 'present'
  | 'absent'
  | 'liste_attente';

// ─── Catégories ───────────────────────────────────────────────────────────────

export type EventCategory =
  | 'concert'
  | 'fete_locale'
  | 'marche_foire'
  | 'vide_grenier'
  | 'rencontre_asso'
  | 'atelier'
  | 'sortie_famille'
  | 'activite_enfant'
  | 'sport'
  | 'reunion_publique'
  | 'solidaire'
  | 'autres';

// ─── Configs UI ───────────────────────────────────────────────────────────────

export interface EventStatusConfig {
  label: string;
  description: string;
  color: string;        // Tailwind text color
  bg: string;           // Tailwind bg color
  border: string;       // Tailwind border color
  badgeBg: string;      // badge background
  badgeText: string;    // badge text color
  dotColor: string;     // dot indicator color
  icon: string;         // emoji icon
  canRegister: boolean; // inscriptions possibles
  priority: number;     // tri
}

export interface EventParticipantStatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}

export interface EventCategoryConfig {
  id: EventCategory;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

// ─── Transitions ──────────────────────────────────────────────────────────────

export interface EventStatusTransition {
  from: EventStatus;
  to: EventStatus;
  label: string;
  description: string;
  requiresReason?: boolean;
  adminOnly?: boolean;
}
