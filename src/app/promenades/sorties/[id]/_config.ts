// ─── Config – Promenade sortie detail ─────────────────────────────────────────

import { MapPin, Users, MessageSquare, History } from 'lucide-react';
import type React from 'react';
import type { TabId } from './_types';

// Difficulty display config
export const DIFF_CONFIG: Record<
  'facile' | 'moyen' | 'difficile',
  { label: string; color: string }
> = {
  facile:    { label: 'Facile',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  moyen:     { label: 'Moyen',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  difficile: { label: 'Difficile', color: 'bg-red-100 text-red-700 border-red-200' },
};

// Tab definitions (historique is manager-only, filtered at runtime)
export type TabDef = {
  id: TabId;
  label: (count?: number) => string;
  icon: React.ElementType;
  managerOnly?: boolean;
};

export const TABS: TabDef[] = [
  { id: 'info',         label: ()      => 'Infos',                        icon: MapPin },
  { id: 'participants', label: (n = 0) => `Participants (${n})`,          icon: Users },
  { id: 'discussion',  label: ()      => 'Discussion',                   icon: MessageSquare },
  { id: 'historique',  label: ()      => 'Historique',                   icon: History, managerOnly: true },
];

// Participant status badge config
export const PARTICIPANT_STATUS: Record<string, { label: string; classes: string }> = {
  confirme: { label: 'Confirmé', classes: 'bg-blue-100 text-blue-700' },
  present:  { label: 'Présent',  classes: 'bg-green-100 text-green-700' },
  absent:   { label: 'Absent',   classes: 'bg-red-100 text-red-700' },
  inscrit:  { label: 'Inscrit',  classes: 'bg-emerald-100 text-emerald-700' },
};
