/**
 * src/lib/events/mapping.ts
 *
 * Tables de correspondance (configs UI) pour les statuts,
 * les statuts de participants et les catégories d'événements.
 */

import type {
  EventStatus,
  EventParticipantStatus,
  EventCategory,
  EventStatusConfig,
  EventParticipantStatusConfig,
  EventCategoryConfig,
} from './types';

// ─── Statuts événement ────────────────────────────────────────────────────────

export const EVENT_STATUS_CONFIG: Record<EventStatus, EventStatusConfig> = {
  a_venir: {
    label: 'À venir',
    description: 'Événement confirmé, inscriptions ouvertes',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: '🟢',
    canRegister: true,
    priority: 1,
  },
  complet: {
    label: 'Complet',
    description: 'Capacité maximale atteinte',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    dotColor: 'bg-amber-500',
    icon: '🟡',
    canRegister: false,
    priority: 2,
  },
  reporte: {
    label: 'Reporté',
    description: 'Événement reporté à une nouvelle date',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-800',
    dotColor: 'bg-violet-500',
    icon: '🔵',
    canRegister: false,
    priority: 3,
  },
  annule: {
    label: 'Annulé',
    description: 'Événement définitivement annulé',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    dotColor: 'bg-red-500',
    icon: '🔴',
    canRegister: false,
    priority: 4,
  },
  passe: {
    label: 'Passé',
    description: "L'événement a eu lieu",
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    dotColor: 'bg-slate-400',
    icon: '⚪',
    canRegister: false,
    priority: 5,
  },
  archive: {
    label: 'Archivé',
    description: 'Archivé, masqué des flux actifs',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
    dotColor: 'bg-gray-400',
    icon: '⬜',
    canRegister: false,
    priority: 6,
  },
};

// ─── Statuts participants ─────────────────────────────────────────────────────

export const EVENT_PARTICIPANT_STATUS_CONFIG: Record<EventParticipantStatus, EventParticipantStatusConfig> = {
  inscrit: {
    label: 'Inscrit',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: '✅',
  },
  confirme: {
    label: 'Confirmé',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: '🔵',
  },
  annule: {
    label: 'Désisté',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: '❌',
  },
  present: {
    label: 'Présent',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '👍',
  },
  absent: {
    label: 'Absent',
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: '❓',
  },
  liste_attente: {
    label: "Liste d'attente",
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '⏳',
  },
};

// ─── Catégories ───────────────────────────────────────────────────────────────

export const EVENT_CATEGORY_CONFIG: Record<EventCategory, EventCategoryConfig> = {
  concert:         { id: 'concert',         label: 'Concert & spectacle',      icon: '🎵', color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  fete_locale:     { id: 'fete_locale',     label: 'Fête locale',              icon: '🎉', color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  marche_foire:    { id: 'marche_foire',    label: 'Marché & foire',           icon: '🛒', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  vide_grenier:    { id: 'vide_grenier',    label: 'Vide-grenier',             icon: '📦', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  rencontre_asso:  { id: 'rencontre_asso',  label: 'Rencontre associative',    icon: '🤝', color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200' },
  atelier:         { id: 'atelier',         label: 'Atelier & formation',      icon: '🎨', color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  sortie_famille:  { id: 'sortie_famille',  label: 'Sortie famille',           icon: '👨‍👩‍👧‍👦', color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200' },
  activite_enfant: { id: 'activite_enfant', label: 'Activité enfant',          icon: '🧸', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  sport:           { id: 'sport',           label: 'Sport & activité',         icon: '⚽', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  reunion_publique:{ id: 'reunion_publique',label: 'Réunion publique',         icon: '🏛️', color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  solidaire:       { id: 'solidaire',       label: 'Action solidaire',         icon: '💚', color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200' },
  autres:          { id: 'autres',          label: 'Autres',                   icon: '📌', color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200' },
};

export const EVENT_CATEGORIES_LIST: EventCategoryConfig[] = Object.values(EVENT_CATEGORY_CONFIG);

export function getEventCategory(id: string): EventCategoryConfig {
  return EVENT_CATEGORY_CONFIG[id as EventCategory] ?? EVENT_CATEGORY_CONFIG.autres;
}
