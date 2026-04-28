/**
 * src/app/(private)/notifications/notif-config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Données statiques et utilitaires purs du module Notifications.
 * Sans 'use client' — importable depuis Server Components si besoin.
 *
 * Exports :
 *   NOTIF_CONFIG  — mapping type → icône, couleurs, onglet, priorité
 *   TABS          — configuration des onglets (id, label, icône)
 *   PAGE_SIZE     — nombre de notifications par page (cursor-based pagination)
 *   COUNTS_LIMIT  — plafond du fetch léger des compteurs
 *   RECONNECT_DELAYS — backoff exponentiel Realtime (ms)
 *   TabId         — union type des IDs d'onglet
 *   TabCounters   — structure des compteurs par onglet
 *   getConfig()   — résolution du config par type de notification
 *   tabTypes()    — liste des types appartenant à un onglet donné
 *   groupByDate() — regroupement des notifications par tranche de date
 *   PriorityDot   — indicateur visuel de priorité (composant React)
 */

import {
  Bell, BellOff, CheckCheck, MessageSquare, Info, AlertCircle, Star,
  Heart, Calendar, MapPin, Package, ShoppingBag, Wrench,
  Handshake, Gem, Search, Megaphone, Award, Clock,
  Zap,
} from 'lucide-react';
import type { Notification } from '@/types';

// ─── Config par type de notification ──────────────────────────────────────────

export const NOTIF_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
  tab: string;
  priority: 'high' | 'medium' | 'low';
}> = {
  // ── Messaging
  message:          { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Message',         tab: 'messages',  priority: 'high'   },
  new_message:      { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Message',         tab: 'messages',  priority: 'high'   },
  new_conversation: { icon: MessageSquare, color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  label: 'Nouvelle conv.',  tab: 'messages',  priority: 'high'   },

  // ── Activité sur contenu
  review:           { icon: Star,          color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  label: 'Avis reçu',       tab: 'activity',  priority: 'medium' },
  review_request:   { icon: Star,          color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  label: "Demande d'avis",  tab: 'activity',  priority: 'medium' },
  review_received:  { icon: Star,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Avis publié',     tab: 'activity',  priority: 'medium' },
  listing_reserved: { icon: ShoppingBag,   color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Réservation',     tab: 'activity',  priority: 'high'   },
  listing_sold:     { icon: ShoppingBag,   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Vendu',           tab: 'activity',  priority: 'high'   },
  loan_requested:   { icon: Package,       color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Prêt demandé',    tab: 'activity',  priority: 'high'   },
  loan_returned:    { icon: Package,       color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Retour matériel', tab: 'activity',  priority: 'medium' },
  help_accepted:    { icon: Heart,         color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  label: 'Aide acceptée',   tab: 'activity',  priority: 'high'   },
  help_resolved:    { icon: Heart,         color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  label: 'Aide terminée',   tab: 'activity',  priority: 'medium' },
  outing_joined:    { icon: MapPin,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Participation',   tab: 'activity',  priority: 'medium' },
  outing_completed: { icon: MapPin,        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Promenade faite', tab: 'activity',  priority: 'low'    },
  event_joined:     { icon: Calendar,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  label: 'Inscription',     tab: 'activity',  priority: 'medium' },
  event_reported:   { icon: Calendar,      color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    label: 'Signalement',     tab: 'activity',  priority: 'high'   },
  event_cancelled:  { icon: Calendar,      color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Annulé',          tab: 'activity',  priority: 'high'   },
  badge_awarded:    { icon: Award,         color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Badge obtenu',    tab: 'activity',  priority: 'low'    },

  // ── Compte / Profil
  account_update:   { icon: Info,          color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200',   label: 'Compte',          tab: 'system',    priority: 'medium' },
  artisan_approved: { icon: Wrench,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Artisan validé',  tab: 'system',    priority: 'high'   },

  // ── Modération / Système
  content_approved: { icon: CheckCheck,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Approuvé',        tab: 'system',    priority: 'high'   },
  content_rejected: { icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Refusé',          tab: 'system',    priority: 'high'   },
  alert:            { icon: Zap,           color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Alerte',          tab: 'system',    priority: 'high'   },
  moderation:       { icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Modération',      tab: 'system',    priority: 'high'   },
  info:             { icon: Info,          color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200',   label: 'Info',            tab: 'system',    priority: 'low'    },

  // ── Rappels
  event:            { icon: Calendar,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  label: 'Événement',       tab: 'reminders', priority: 'medium' },
  help:             { icon: Heart,         color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  label: 'Coup de main',    tab: 'reminders', priority: 'medium' },
  listing:          { icon: ShoppingBag,   color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Annonce',         tab: 'reminders', priority: 'low'    },
  equipment:        { icon: Package,       color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Matériel',        tab: 'reminders', priority: 'low'    },
  lost_found:       { icon: Search,        color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Perdu/Trouvé',    tab: 'reminders', priority: 'medium' },
  outing:           { icon: MapPin,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Promenade',       tab: 'reminders', priority: 'medium' },
  association:      { icon: Handshake,     color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200',  label: 'Association',     tab: 'reminders', priority: 'low'    },
  collection:       { icon: Gem,           color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    label: 'Collectionneur',  tab: 'reminders', priority: 'low'    },
  artisan:          { icon: Wrench,        color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Artisan',         tab: 'reminders', priority: 'medium' },
};

export function getConfig(type?: string) {
  if (!type) return NOTIF_CONFIG.info;
  return NOTIF_CONFIG[type] ?? NOTIF_CONFIG.info;
}

// ─── Onglets ──────────────────────────────────────────────────────────────────

export type TabId = 'all' | 'unread' | 'messages' | 'activity' | 'system' | 'reminders';

export const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'all',       label: 'Toutes',   icon: Bell },
  { id: 'unread',    label: 'Non lues', icon: BellOff },
  { id: 'messages',  label: 'Messages', icon: MessageSquare },
  { id: 'activity',  label: 'Activité', icon: Megaphone },
  { id: 'system',    label: 'Système',  icon: AlertCircle },
  { id: 'reminders', label: 'Rappels',  icon: Clock },
];

/** Extrait les types appartenant à un onglet donné. */
export function tabTypes(tabId: TabId): string[] | null {
  if (tabId === 'all' || tabId === 'unread') return null;
  return Object.entries(NOTIF_CONFIG)
    .filter(([, cfg]) => cfg.tab === tabId)
    .map(([type]) => type);
}

// ─── Pagination ────────────────────────────────────────────────────────────────

/** Nombre de notifications chargées par page (cursor-based pagination serveur). */
export const PAGE_SIZE = 30;
/** Plafond pour le fetch léger des compteurs d'onglets (sans corps). */
export const COUNTS_LIMIT = 500;
/** Délais de reconnexion Realtime (backoff exponentiel, en ms). */
export const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

// ─── Compteurs ────────────────────────────────────────────────────────────────

export interface TabCounters {
  all: number;
  unread: number;
  messages: number;
  activity: number;
  system: number;
  reminders: number;
  messagesUnread: number;
  activityUnread: number;
  systemUnread: number;
  remindersUnread: number;
}

// ─── Regroupement par date ────────────────────────────────────────────────────

export function groupByDate(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const todayStr     = now.toDateString();
  const yesterday    = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const weekAgo      = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    "Aujourd'hui": [],
    'Hier':        [],
    'Cette semaine': [],
    'Plus ancien': [],
  };

  for (const n of notifs) {
    const d = new Date(n.created_at);
    if (d.toDateString() === todayStr)         groups["Aujourd'hui"].push(n);
    else if (d.toDateString() === yesterdayStr) groups['Hier'].push(n);
    else if (d >= weekAgo)                      groups['Cette semaine'].push(n);
    else                                        groups['Plus ancien'].push(n);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─── Badge de priorité ────────────────────────────────────────────────────────

export function PriorityDot({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  if (priority === 'high')   return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />;
  if (priority === 'medium') return <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />;
  return null;
}
