/**
 * Configuration statique — module conversation
 * CONTEXT_CONFIG  : métadonnées UI par related_type (icône, couleur, href)
 * EXCHANGEABLE_TYPES : types activant le panneau de confirmation d'échange
 * Constantes de reconnexion Realtime / polling
 */

import {
  ShoppingBag, HandHeart, Dog, Users, MapPin, Wrench, MessageSquare,
} from 'lucide-react';

// ─── Config contexte par related_type ─────────────────────────────────────────
export const CONTEXT_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  border: string;
  href: (id: string) => string;
}> = {
  listing:         { icon: ShoppingBag,   label: 'Annonce',         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   href: id => `/annonces/${id}` },
  equipment:       { icon: Wrench,        label: 'Matériel',        color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   href: id => `/materiel/${id}` },
  help_request:    { icon: HandHeart,     label: 'Coup de main',    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', href: () => `/coups-de-main` },
  lost_found:      { icon: Dog,           label: 'Perdu / Trouvé',  color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  href: () => `/perdu-trouve` },
  association:     { icon: Users,         label: 'Association',     color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', href: () => `/associations` },
  outing:          { icon: MapPin,        label: 'Sortie groupée',  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', href: () => `/promenades` },
  collection_item: { icon: ShoppingBag,   label: 'Collectionneur',  color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   href: () => `/collectionneurs` },
  service_request: { icon: Wrench,        label: 'Demande artisan', color: 'text-brand-700',   bg: 'bg-brand-50',   border: 'border-brand-200',  href: id => `/demandes/${id}` },
  general:         { icon: MessageSquare, label: 'Conversation',    color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200',   href: () => `/` },
};

// ─── Types activant le panneau de confirmation d'échange ──────────────────────
export const EXCHANGEABLE_TYPES: Record<string, {
  label: string;
  verb: string;
  color: string;
  bg: string;
  border: string;
}> = {
  listing:         { label: 'Annonce',        verb: 'la vente',      color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  equipment:       { label: 'Matériel',        verb: 'le prêt',       color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200'   },
  help_request:    { label: 'Coup de main',    verb: "l'aide",        color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  association:     { label: 'Association',     verb: 'le contact',    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  collection_item: { label: 'Collection',      verb: "l'échange",     color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200'   },
  service_request: { label: 'Demande artisan', verb: 'la prestation', color: 'text-brand-700',  bg: 'bg-brand-50',  border: 'border-brand-200'  },
};

// ─── Constantes de reconnexion Realtime ───────────────────────────────────────
/** Délais successifs entre tentatives de reconnexion Realtime (ms) */
export const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000] as const;

/** Intervalle du polling de secours quand le Realtime est indisponible (ms) */
export const FALLBACK_POLL_INTERVAL = 5000;
