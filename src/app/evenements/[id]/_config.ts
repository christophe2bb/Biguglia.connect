// ─── Config statique — Détail événement ──────────────────────────────────────

import type { EventStatus } from '@/lib/events';
import type { TabId } from './_types';
import { Info, Users, MessageSquare, History } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export interface TabConfig {
  id: TabId;
  label: (participantCount: number) => string;
  icon: LucideIcon;
}

export const TABS_CONFIG: TabConfig[] = [
  { id: 'info',         label: () => 'Informations',              icon: Info },
  { id: 'participants', label: (n) => `Participants (${n})`,      icon: Users },
  { id: 'discussion',  label: () => 'Discussion',                  icon: MessageSquare },
  { id: 'historique',  label: () => 'Historique',                  icon: History },
];

// ─── Descriptions des transitions (modal) ────────────────────────────────────
export const EVENT_TRANSITION_DESCRIPTIONS: Partial<Record<EventStatus, string>> = {
  annule:  "Cette action annule définitivement l'événement et notifie les participants.",
  reporte: 'Indiquez une nouvelle date et une raison. Les participants seront notifiés.',
  complet: "Marquer l'événement comme complet et fermer les inscriptions.",
  a_venir: 'Rouvrir les inscriptions pour cet événement.',
  passe:   "Marquer l'événement comme terminé.",
  archive: "Archiver l'événement — il sera masqué des flux actifs.",
};

// ─── Messages de notification par statut ─────────────────────────────────────
export const EVENT_NOTIFY_MESSAGES: Partial<Record<EventStatus, (title: string, reason?: string) => string>> = {
  annule:  (t, r) => `❌ L'événement "${t}" a été annulé${r ? ` : ${r}` : '.'}`,
  reporte: (t, r) => `🔵 L'événement "${t}" a été reporté${r ? ` : ${r}` : '.'}`,
  passe:   (t)    => `⚪ L'événement "${t}" est maintenant terminé.`,
  complet: (t)    => `🟡 L'événement "${t}" est complet — vous êtes sur liste d'attente.`,
  a_venir: (t)    => `🟢 Les inscriptions pour "${t}" sont à nouveau ouvertes !`,
  archive: (t)    => `📦 L'événement "${t}" a été archivé.`,
};
