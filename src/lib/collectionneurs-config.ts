/**
 * Collectionneurs — Types, configs et constantes partagées
 * Importé par page.tsx, [id]/page.tsx, nouveau/page.tsx, modifier/page.tsx, dashboard/collectionneurs/page.tsx
 */

import { Tag, ArrowLeftRight, Gift, Search } from 'lucide-react';
import type { ElementType } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CollectionMode = 'vente' | 'echange' | 'don' | 'recherche';
export type CollectionStatus =
  | 'actif' | 'reserve' | 'vendu' | 'echange' | 'donne' | 'trouve' | 'retire' | 'archive';
export type RarityLevel = 'commun' | 'peu_commun' | 'rare' | 'tres_rare' | 'unique';
export type ConditionLevel = 'neuf' | 'excellent' | 'bon' | 'passable';

export interface CollectionCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  display_order: number;
}

export interface CollectionItem {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  category?: CollectionCategory | null;
  mode: CollectionMode;
  item_type?: string; // backward compat
  status: CollectionStatus;
  price?: number | null;
  exchange_expected?: string | null;
  condition: ConditionLevel;
  rarity_level?: RarityLevel;
  year_period?: string | null;
  brand?: string | null;
  series_name?: string | null;
  authenticity_declared?: boolean;
  shipping_available?: boolean;
  local_meetup_available?: boolean;
  city?: string | null;
  tags: string[];
  author_id: string;
  author?: { id: string; full_name: string; avatar_url?: string; created_at?: string } | null;
  views_count?: number;
  favorites_count?: number;
  messages_count?: number;
  is_featured?: boolean;
  published_at?: string;
  created_at: string;
  updated_at?: string;
  photos?: { id?: string; url?: string; image_url?: string; preview?: string; is_cover?: boolean; sort_order?: number }[];
  // extra v2 fields
  postal_code?: string | null;
  provenance?: string | null;
  defects_noted?: string | null;
  dimensions?: string | null;
  material?: string | null;
  moderation_status?: string | null;
  moderation_note?: string | null;
  offers_count?: number;
  subcategory?: string | null;
  // enrichment
  isFavorited?: boolean;
}

// ─── Config modes ─────────────────────────────────────────────────────────────

export const MODE_CONFIG: Record<CollectionMode, {
  label: string;
  icon: ElementType;
  color: string;
  bg: string;
  border: string;
  dot: string;
  cta: string;
  verbDone: string;
}> = {
  vente: {
    label: 'Vente', icon: Tag,
    color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500',
    cta: 'Je suis acheteur', verbDone: 'Vendu',
  },
  echange: {
    label: 'Échange', icon: ArrowLeftRight,
    color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500',
    cta: 'Proposer un échange', verbDone: 'Échangé',
  },
  don: {
    label: 'Don gratuit', icon: Gift,
    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500',
    cta: 'Je suis intéressé', verbDone: 'Donné',
  },
  recherche: {
    label: 'Recherche', icon: Search,
    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500',
    cta: "J'ai cet objet", verbDone: 'Trouvé',
  },
};

export const STATUS_CONFIG: Record<CollectionStatus, { label: string; color: string; bg: string; closed: boolean }> = {
  actif:   { label: 'Disponible', color: 'text-emerald-700', bg: 'bg-emerald-100', closed: false },
  reserve: { label: 'Réservé',    color: 'text-amber-700',   bg: 'bg-amber-100',   closed: false },
  vendu:   { label: 'Vendu',      color: 'text-gray-600',    bg: 'bg-gray-100',    closed: true  },
  echange: { label: 'Échangé',    color: 'text-gray-600',    bg: 'bg-gray-100',    closed: true  },
  donne:   { label: 'Donné',      color: 'text-gray-600',    bg: 'bg-gray-100',    closed: true  },
  trouve:  { label: 'Trouvé',     color: 'text-gray-600',    bg: 'bg-gray-100',    closed: true  },
  retire:  { label: 'Retiré',     color: 'text-red-600',     bg: 'bg-red-50',      closed: true  },
  archive: { label: 'Archivé',    color: 'text-gray-500',    bg: 'bg-gray-100',    closed: true  },
};

export const RARITY_CONFIG: Record<RarityLevel, { label: string; color: string; icon: string }> = {
  commun:     { label: 'Courant',    color: 'text-gray-500',   icon: '⚪' },
  peu_commun: { label: 'Peu commun', color: 'text-blue-600',   icon: '🔵' },
  rare:       { label: 'Rare',       color: 'text-purple-600', icon: '🟣' },
  tres_rare:  { label: 'Très rare',  color: 'text-amber-600',  icon: '🟡' },
  unique:     { label: 'Unique',     color: 'text-red-600',    icon: '🔴' },
};

export const CONDITION_CONFIG: Record<ConditionLevel, { label: string; color: string }> = {
  neuf:      { label: 'Neuf',      color: 'text-emerald-600' },
  excellent: { label: 'Excellent', color: 'text-sky-600'     },
  bon:       { label: 'Bon état',  color: 'text-amber-600'   },
  passable:  { label: 'Passable',  color: 'text-gray-500'    },
};
