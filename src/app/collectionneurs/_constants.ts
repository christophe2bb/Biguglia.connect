// ─── Constants — Collectionneurs ──────────────────────────────────────────────
import type { CollectionCategory } from '@/lib/collectionneurs-config';

// ─── Catégories statiques (fallback si la table DB est vide) ─────────────────
export const STATIC_CATEGORIES: CollectionCategory[] = [
  { id: 'cat-1',  name: 'Timbres & philatélie',    slug: 'timbres',      icon: '📮', color: 'blue',    display_order: 1  },
  { id: 'cat-2',  name: 'Monnaies & numismatique',  slug: 'monnaies',     icon: '🪙', color: 'amber',   display_order: 2  },
  { id: 'cat-3',  name: 'Vinyles & musique',        slug: 'vinyles',      icon: '🎵', color: 'purple',  display_order: 3  },
  { id: 'cat-4',  name: 'Livres anciens',           slug: 'livres',       icon: '📚', color: 'emerald', display_order: 4  },
  { id: 'cat-5',  name: 'Figurines & jouets',       slug: 'figurines',    icon: '🧸', color: 'rose',    display_order: 5  },
  { id: 'cat-6',  name: 'Cartes & TCG',             slug: 'cards',        icon: '🃏', color: 'red',     display_order: 6  },
  { id: 'cat-7',  name: 'Art & tableaux',           slug: 'art',          icon: '🎨', color: 'pink',    display_order: 7  },
  { id: 'cat-8',  name: 'Vintage & mode',           slug: 'vintage',      icon: '👗', color: 'orange',  display_order: 8  },
  { id: 'cat-9',  name: 'Miniatures & maquettes',   slug: 'miniatures',   icon: '🏗️', color: 'indigo',  display_order: 9  },
  { id: 'cat-10', name: 'Automobilia',              slug: 'automobilia',  icon: '🚗', color: 'red',     display_order: 10 },
  { id: 'cat-11', name: 'BD & Mangas',              slug: 'bd-manga',     icon: '📖', color: 'indigo',  display_order: 11 },
  { id: 'cat-12', name: 'Jeux vidéo rétro',         slug: 'retro-gaming', icon: '🕹️', color: 'violet',  display_order: 12 },
  { id: 'cat-13', name: 'Montres & horlogerie',     slug: 'montres',      icon: '⌚', color: 'gray',    display_order: 13 },
  { id: 'cat-14', name: 'Militaria',                slug: 'militaria',    icon: '🎖️', color: 'stone',   display_order: 14 },
  { id: 'cat-15', name: 'Minéraux & fossiles',      slug: 'mineraux',     icon: '🪨', color: 'teal',    display_order: 15 },
  { id: 'cat-16', name: 'Autres',                   slug: 'autres',       icon: '📦', color: 'gray',    display_order: 99 },
];

// ─── Couleurs par catégorie ───────────────────────────────────────────────────
export const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'    },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200'  },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200'    },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
  pink:    { bg: 'bg-pink-50',    text: 'text-pink-700',    border: 'border-pink-200'    },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200'  },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200'  },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200'    },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200'  },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200'    },
  stone:   { bg: 'bg-stone-50',   text: 'text-stone-700',   border: 'border-stone-200'   },
};

export function getCatClasses(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP.gray;
}

// ─── Type forum local ─────────────────────────────────────────────────────────
export type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: { full_name: string; avatar_url?: string } | null;
  comment_count?: { count: number }[];
};

// ─── Taille de page ───────────────────────────────────────────────────────────
export const PAGE_SIZE = 24;
