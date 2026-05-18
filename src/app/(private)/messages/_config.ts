import {
  MessageSquare, ShoppingBag, HandHeart, Dog,
  Users, MapPin, Wrench, Inbox, MailOpen, Clock,
  HardHat, Globe,
} from 'lucide-react';
import { RelatedTypeConfig, TabDef } from './_types';

// ─── Config type de contenu lié ───────────────────────────────────────────────
export const RELATED_CONFIG: Record<string, RelatedTypeConfig> = {
  listing:         { icon: ShoppingBag,   color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',   label: 'Annonce',        tab: 'listing' },
  equipment:       { icon: Wrench,        color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',   label: 'Matériel',       tab: 'equipment' },
  help_request:    { icon: HandHeart,     color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200', label: 'Coup de main',   tab: 'help_request' },
  lost_found:      { icon: Dog,           color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  label: 'Perdu/Trouvé',   tab: 'lost_found' },
  association:     { icon: Users,         color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200', label: 'Association',    tab: 'association' },
  outing:          { icon: MapPin,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',label: 'Promenade',      tab: 'outing' },
  event:           { icon: MapPin,        color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200', label: 'Événement',      tab: 'event' },
  collection_item: { icon: ShoppingBag,   color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',   label: 'Collectionneur', tab: 'collection_item' },
  service_request: { icon: Wrench,        color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200',  label: 'Artisan',        tab: 'service_request' },
  artisan:         { icon: HardHat,       color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  label: 'Artisan',        tab: 'artisan' },
  community:       { icon: Globe,         color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200',   label: 'Communauté',     tab: 'community' },
  general:         { icon: MessageSquare, color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200',   label: 'Message',        tab: 'general' },
};

// ─── Onglets principaux ───────────────────────────────────────────────────────
export const MAIN_TABS: TabDef[] = [
  { id: 'all',       label: 'Tous',      icon: Inbox },
  { id: 'unread',    label: 'Non lus',   icon: MailOpen },
  { id: 'to_handle', label: 'À traiter', icon: Clock },
];

/** IDs d'onglets principaux (ne sont PAS des filtres de type de contenu) */
export const MAIN_TAB_IDS = ['all', 'unread', 'to_handle'] as const;

// ─── Délais de reconnexion Realtime ───────────────────────────────────────────
export const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000] as const;
