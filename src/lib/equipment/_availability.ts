/**
 * equipment/_availability.ts — Types et configs de disponibilité / remise / état
 *
 * Responsabilité unique : mapping des valeurs métier « disponibilité »
 * vers leurs labels, icônes et descriptions affichés dans l'UI.
 * Aucune dépendance externe — importable côté serveur et client.
 */

// ─── Union types ──────────────────────────────────────────────────────────────

export type AvailabilityMode = 'toujours' | 'sur_demande' | 'creneaux';
export type PickupMode       = 'remise_en_main' | 'retrait_prêteur' | 'point_rdv';
export type LendDurationHint = '2h' | 'journee' | 'week-end' | 'semaine' | 'libre';
export type ConditionLabel   = 'neuf' | 'tres_bon' | 'bon' | 'usage';

// ─── Configs ─────────────────────────────────────────────────────────────────

export const AVAILABILITY_MODE_CONFIG: Record<
  AvailabilityMode,
  { label: string; icon: string; description: string }
> = {
  toujours:    { label: 'Toujours disponible', icon: '✅', description: 'Disponible sans délai de préavis' },
  sur_demande: { label: 'Sur demande',         icon: '💬', description: 'Contactez le prêteur pour convenir d\'un créneau' },
  creneaux:    { label: 'Créneaux définis',    icon: '📅', description: 'Disponible sur des plages horaires précises' },
};

export const PICKUP_MODE_CONFIG: Record<
  PickupMode,
  { label: string; icon: string }
> = {
  remise_en_main:   { label: 'Remise en main propre',   icon: '🤝' },
  'retrait_prêteur': { label: 'Retrait chez le prêteur', icon: '🏠' },
  point_rdv:        { label: 'Point de rendez-vous',    icon: '📍' },
};

export const LEND_DURATION_HINTS: Record<LendDurationHint, { label: string }> = {
  '2h':       { label: '2 heures'    },
  journee:    { label: 'Journée'     },
  'week-end': { label: 'Week-end'    },
  semaine:    { label: 'Semaine'     },
  libre:      { label: 'Durée libre' },
};

export const CONDITION_CONFIG: Record<
  ConditionLabel,
  { label: string; icon: string; color: string }
> = {
  neuf:     { label: 'Neuf',                  icon: '🌟', color: 'text-emerald-700' },
  tres_bon: { label: 'Très bon état',          icon: '✅', color: 'text-green-700'   },
  bon:      { label: 'Bon état',               icon: '👍', color: 'text-blue-700'    },
  usage:    { label: 'Usagé mais fonctionnel', icon: '⚙️', color: 'text-amber-700'   },
};
