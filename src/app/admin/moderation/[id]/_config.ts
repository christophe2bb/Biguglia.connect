/**
 * Configuration statique – page de modération détaillée
 */

import type { ContentType, DecisionKey } from './_types';

/* ── Niveau de risque ────────────────────────────────────────────────────── */
export const RISK_CONFIG = {
  low:      { label: 'Risque faible',   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🟢' },
  medium:   { label: 'Risque modéré',   color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '🟡' },
  high:     { label: 'Risque élevé',    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  emoji: '🟠' },
  critical: { label: 'Risque critique', color: 'text-red-700',     bg: 'bg-red-100',    border: 'border-red-300',     emoji: '🔴' },
} as const;

/* ── URLs publiques par type de contenu ─────────────────────────────────── */
export const CONTENT_URLS: Record<ContentType, string> = {
  listing:          '/annonces',
  equipment:        '/materiel',
  help_request:     '/coups-de-main',
  outing:           '/promenades',
  event:            '/evenements',
  lost_found:       '/perdu-trouve',
  collection_item:  '/collectionneurs',
  association:      '/associations',
  forum_post:       '/forum',
};

/** Résout l'URL publique d'une publication (ajoute l'id quand pertinent). */
export function resolveContentUrl(contentType: ContentType, contentId: string): string {
  const id_routed: ContentType[] = ['listing', 'equipment', 'forum_post'];
  const base = CONTENT_URLS[contentType] ?? '#';
  return id_routed.includes(contentType) ? `${base}/${contentId}` : base;
}

/* ── Table Supabase cible par type de contenu ──────────────────────────── */
export const TABLE_MAP: Record<ContentType, string> = {
  listing:         'listings',
  equipment:       'equipment_items',
  help_request:    'help_requests',
  outing:          'group_outings',
  event:           'events',
  lost_found:      'lost_found_items',
  collection_item: 'collection_items',
  association:     'associations',
  forum_post:      'forum_posts',
};

/* ── Messages toast de confirmation ────────────────────────────────────── */
export const DECISION_MSGS: Record<DecisionKey, string> = {
  accepter:            '✅ Publication acceptée et publiée',
  refuser:             '❌ Publication refusée',
  demander_correction: "✏️ Corrections demandées à l'auteur",
};
