/**
 * Configuration statique – page détail collectionneurs
 */

import type { CollectionMode, CollectionStatus } from '@/lib/collectionneurs-config';

/* ── Transitions de statut autorisées par mode ───────────────────────────── */
export const TRANSITIONS: Record<CollectionMode, Partial<Record<CollectionStatus, CollectionStatus[]>>> = {
  vente: {
    actif:   ['reserve', 'vendu', 'retire'],
    reserve: ['actif', 'vendu', 'retire'],
    vendu:   ['archive'],
    retire:  ['archive'],
  },
  echange: {
    actif:   ['reserve', 'echange', 'retire'],
    reserve: ['actif', 'echange', 'retire'],
    echange: ['archive'],
    retire:  ['archive'],
  },
  don: {
    actif:   ['reserve', 'donne', 'retire'],
    reserve: ['actif', 'donne', 'retire'],
    donne:   ['archive'],
    retire:  ['archive'],
  },
  recherche: {
    actif:   ['trouve', 'retire'],
    trouve:  ['archive'],
    retire:  ['archive'],
  },
};

export function getAllowedTransitions(
  mode: CollectionMode,
  status: CollectionStatus,
): CollectionStatus[] {
  return TRANSITIONS[mode]?.[status] || [];
}

/* ── Labels des transitions ─────────────────────────────────────────────── */
export const TRANSITION_LABELS: Partial<Record<CollectionStatus, string>> = {
  actif:   '✅ Remettre en vente',
  reserve: '⏳ Marquer Réservé',
  vendu:   '💰 Marquer Vendu',
  echange: '🔄 Marquer Échangé',
  donne:   '❤️ Marquer Donné',
  trouve:  '🔍 Objet Trouvé',
  retire:  "❌ Retirer l'annonce",
  archive: '📦 Archiver',
};
