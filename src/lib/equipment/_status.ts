/**
 * equipment/_status.ts — Statuts, labels, couleurs et transitions autorisées
 *
 * Responsabilité unique : mapper les valeurs d'énumération des statuts
 * vers leurs propriétés UI (label, couleur, icône, description) et définir
 * la table des transitions autorisées entre statuts.
 * Aucune dépendance externe — importable côté serveur et client.
 */

// ─── Union types ──────────────────────────────────────────────────────────────

export type EquipmentStatus =
  | 'disponible'
  | 'reserve'
  | 'prete'
  | 'rendu'
  | 'indisponible'
  | 'archive';

export type LoanRequestStatus =
  | 'en_attente'
  | 'acceptee'
  | 'refusee'
  | 'annulee'
  | 'terminee';

export type LoanStatus =
  | 'reserve'
  | 'en_cours'
  | 'retourne'
  | 'annule';

// ─── Labels, couleurs et descriptions ────────────────────────────────────────

export const EQUIPMENT_STATUS_CONFIG: Record<
  EquipmentStatus,
  { label: string; color: string; bg: string; border: string; dot: string; icon: string; description: string }
> = {
  disponible: {
    label:       'Disponible',
    color:       'text-emerald-700',
    bg:          'bg-emerald-50',
    border:      'border-emerald-200',
    dot:         'bg-emerald-500',
    icon:        '✅',
    description: 'Ce matériel peut être emprunté',
  },
  reserve: {
    label:       'Réservé',
    color:       'text-orange-700',
    bg:          'bg-orange-50',
    border:      'border-orange-200',
    dot:         'bg-orange-500',
    icon:        '🔒',
    description: 'Un emprunteur a été sélectionné',
  },
  prete: {
    label:       'Prêté',
    color:       'text-purple-700',
    bg:          'bg-purple-50',
    border:      'border-purple-200',
    dot:         'bg-purple-500',
    icon:        '🔄',
    description: 'Actuellement chez un emprunteur',
  },
  rendu: {
    label:       'Rendu',
    color:       'text-blue-700',
    bg:          'bg-blue-50',
    border:      'border-blue-200',
    dot:         'bg-blue-500',
    icon:        '📦',
    description: 'Le prêt est terminé, matériel restitué',
  },
  indisponible: {
    label:       'Indisponible',
    color:       'text-gray-600',
    bg:          'bg-gray-50',
    border:      'border-gray-200',
    dot:         'bg-gray-400',
    icon:        '⛔',
    description: 'Temporairement non disponible',
  },
  archive: {
    label:       'Archivé',
    color:       'text-gray-500',
    bg:          'bg-gray-100',
    border:      'border-gray-300',
    dot:         'bg-gray-500',
    icon:        '📁',
    description: 'Retiré du circuit de prêt',
  },
};

export const LOAN_REQUEST_STATUS_CONFIG: Record<
  LoanRequestStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  en_attente: { label: 'En attente', color: 'text-amber-700',   bg: 'bg-amber-50',   icon: '⏳' },
  acceptee:   { label: 'Acceptée',   color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '✅' },
  refusee:    { label: 'Refusée',    color: 'text-red-700',     bg: 'bg-red-50',     icon: '❌' },
  annulee:    { label: 'Annulée',    color: 'text-gray-600',    bg: 'bg-gray-50',    icon: '🚫' },
  terminee:   { label: 'Terminée',   color: 'text-blue-700',    bg: 'bg-blue-50',    icon: '🏁' },
};

// ─── Transitions autorisées ───────────────────────────────────────────────────

export const ALLOWED_TRANSITIONS: Record<EquipmentStatus, EquipmentStatus[]> = {
  disponible:   ['reserve', 'indisponible', 'archive'],
  reserve:      ['prete', 'disponible', 'archive'],
  prete:        ['rendu', 'archive'],
  rendu:        ['disponible', 'archive'],
  indisponible: ['disponible', 'archive'],
  archive:      [], // Fin de vie — aucune transition automatique
};

export const TRANSITION_LABELS: Record<string, string> = {
  'disponible→reserve':      'Réserver pour un emprunteur',
  'disponible→indisponible': 'Mettre en pause',
  'disponible→archive':      'Archiver',
  'reserve→prete':           'Marquer comme prêté (remis)',
  'reserve→disponible':      'Annuler la réservation',
  'reserve→archive':         'Archiver',
  'prete→rendu':             'Confirmer le retour',
  'prete→archive':           'Archiver',
  'rendu→disponible':        'Remettre en circulation',
  'rendu→archive':           'Archiver',
  'indisponible→disponible': 'Remettre disponible',
  'indisponible→archive':    'Archiver',
};
