// ─── Forum configuration — static constants & helpers ────────────────────────
import {
  HelpCircle, Megaphone, Lightbulb, ThumbsUp, Heart,
  AlertTriangle, BookOpen, Star,
  Calendar, TreePine, ShoppingBag, Wrench, Dog,
} from 'lucide-react';
import { ForumSector } from '@/types';

// ─── Secteurs par défaut ─────────────────────────────────────────────────────
export const SECTORS_DEFAULT: Omit<ForumSector, 'topic_count'>[] = [
  { id: 'les-collines', name: 'Les Collines',        slug: 'les-collines', description: 'Quartier résidentiel sur les hauteurs', icon: '⛰️', color: 'emerald', display_order: 1 },
  { id: 'figabruna',    name: 'Figabruna',            slug: 'figabruna',    description: 'Secteur sud de Biguglia',               icon: '🌊', color: 'blue',    display_order: 2 },
  { id: 'village',      name: 'Village de Biguglia',  slug: 'village',      description: 'Cœur historique du village',            icon: '🏘️', color: 'amber',   display_order: 3 },
  { id: 'casatorra',    name: 'Casatorra',             slug: 'casatorra',    description: 'Secteur Casatorra',                     icon: '🌿', color: 'green',   display_order: 4 },
  { id: 'ortale',       name: 'Ortale',                slug: 'ortale',       description: 'Quartier Ortale',                       icon: '🏡', color: 'violet',  display_order: 5 },
  { id: 'la-plaine',    name: 'La Plaine',             slug: 'la-plaine',    description: 'Zone de la plaine et étang',            icon: '🌾', color: 'orange',  display_order: 6 },
  { id: 'la-marana',    name: 'La Marana',             slug: 'la-marana',    description: 'Zone de La Marana',                     icon: '🏖️', color: 'cyan',    display_order: 7 },
];

// ─── Couleurs par secteur ────────────────────────────────────────────────────
export const SECTOR_COLORS: Record<string, { bg: string; text: string; border: string; badge: string; dot: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', ring: 'ring-emerald-300' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400',    ring: 'ring-blue-300'    },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400',   ring: 'ring-amber-300'   },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   badge: 'bg-green-100 text-green-700',     dot: 'bg-green-400',   ring: 'ring-green-300'   },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400',  ring: 'ring-violet-300'  },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400',  ring: 'ring-orange-300'  },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    badge: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-400',    ring: 'ring-cyan-300'    },
  gray:    { bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200',    badge: 'bg-gray-100 text-gray-700',       dot: 'bg-gray-400',    ring: 'ring-gray-300'    },
};

// ─── Catégories ──────────────────────────────────────────────────────────────
export const CATEGORIES_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; desc: string; priority: 'high' | 'medium' | 'low' }> = {
  'vie-pratique':   { icon: '🔧', color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  desc: 'Voirie, éclairage, déchets, eau',        priority: 'high'   },
  'vie-locale':     { icon: '🏘️', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   desc: 'Fêtes, animations, mairie, école',        priority: 'high'   },
  'besoins':        { icon: '🙋', color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    desc: 'Demandes, avis, recommandations',         priority: 'high'   },
  'recommandations':{ icon: '⭐', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  desc: 'Bonnes adresses, artisans, services',     priority: 'high'   },
  'idees':          { icon: '💡', color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  desc: 'Propositions, idées pour la ville',       priority: 'high'   },
  'promenades':     { icon: '🌿', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Balades, sentiers, spots nature',          priority: 'medium' },
  'vigilance':      { icon: '👁️', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     desc: 'Informations utiles, sécurité douce',     priority: 'medium' },
  'entraide':       { icon: '🤝', color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',    desc: 'Covoiturage, aide ponctuelle',            priority: 'medium' },
  'vie-quartier':   { icon: '🏠', color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     desc: 'Vie de quartier au quotidien',            priority: 'medium' },
  'infos-pratiques':{ icon: 'ℹ️', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    desc: 'Informations locales utiles',             priority: 'medium' },
  'securite':       { icon: '🚨', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     desc: 'Sécurité, vigilance de quartier',         priority: 'medium' },
  'commerces':      { icon: '🛒', color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  desc: 'Commerces et services locaux',            priority: 'low'    },
  'enfants-ecoles': { icon: '🎒', color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',    desc: 'Enfants, écoles, activités',              priority: 'low'    },
  'nature-animaux': { icon: '🌿', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Nature, animaux, environnement',          priority: 'low'    },
  'travaux':        { icon: '🔧', color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  desc: 'Travaux, chantiers, bricolage',           priority: 'low'    },
  'evenements':     { icon: '🎉', color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  desc: 'Événements, sorties locales',             priority: 'low'    },
  'libre':          { icon: '💬', color: 'text-gray-700',    bg: 'bg-gray-50',    border: 'border-gray-200',    desc: 'Discussion libre entre habitants',        priority: 'low'    },
};

export function getCatConfig(slug?: string) {
  if (!slug) return CATEGORIES_CONFIG['libre'];
  return CATEGORIES_CONFIG[slug] ?? CATEGORIES_CONFIG['libre'];
}

// ─── Types de post ────────────────────────────────────────────────────────────
export const POST_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string; border: string }> = {
  question:      { icon: HelpCircle,    label: 'Question',        color: 'text-sky-700',     bg: 'bg-sky-100',     border: 'border-sky-200'    },
  information:   { icon: Megaphone,     label: 'Info',            color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-200'   },
  idee:          { icon: Lightbulb,     label: 'Idée',            color: 'text-violet-700',  bg: 'bg-violet-100',  border: 'border-violet-200' },
  avis:          { icon: ThumbsUp,      label: 'Avis',            color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200'  },
  besoin:        { icon: Heart,         label: 'Besoin',          color: 'text-rose-700',    bg: 'bg-rose-100',    border: 'border-rose-200'   },
  alerte:        { icon: AlertTriangle, label: 'Alerte douce',    color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-200' },
  retour:        { icon: BookOpen,      label: "Retour d'exp.",   color: 'text-teal-700',    bg: 'bg-teal-100',    border: 'border-teal-200'   },
  recommandation:{ icon: Star,          label: 'Recommandation',  color: 'text-yellow-700',  bg: 'bg-yellow-100',  border: 'border-yellow-200' },
};

// ─── Niveaux d'urgence ────────────────────────────────────────────────────────
export const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  haute:  { label: 'Urgent',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300',   dot: 'bg-red-500'    },
  normal: { label: 'Normal',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300', dot: 'bg-amber-500'  },
  basse:  { label: 'Info',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300', dot: 'bg-green-500'  },
};

// ─── Modules inter-app ────────────────────────────────────────────────────────
export const MODULE_LINKS = [
  { href: '/evenements',    icon: Calendar,     label: 'Événements',     color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { href: '/promenades',    icon: TreePine,     label: 'Promenades',     color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { href: '/coups-de-main', icon: Heart,        label: 'Coups de main',  color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200'    },
  { href: '/annonces',      icon: ShoppingBag,  label: 'Annonces',       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200'    },
  { href: '/artisans',      icon: Wrench,       label: 'Artisans',       color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200'  },
  { href: '/perdu-trouve',  icon: Dog,          label: 'Perdu / Trouvé', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'     },
];

// ─── Raccourcis catégories hero ───────────────────────────────────────────────
export const HERO_SHORTCUTS = [
  { slug: 'vie-pratique',    icon: '🔧', label: 'Problème local'  },
  { slug: 'idees',           icon: '💡', label: 'Idée'            },
  { slug: 'besoins',         icon: '🙋', label: 'Besoin / Avis'  },
  { slug: 'entraide',        icon: '🤝', label: 'Entraide'        },
  { slug: 'evenements',      icon: '🎉', label: 'Événement'       },
  { slug: 'recommandations', icon: '⭐', label: 'Bonne adresse'  },
];

// ─── Catégories par défaut (fallback si table vide) ──────────────────────────
export const DEFAULT_CATEGORIES = [
  { id: 'vie-quartier',    name: 'Vie du quartier',     icon: '🏠', slug: 'vie-quartier',    description: '', display_order: 1 },
  { id: 'infos-pratiques', name: 'Infos pratiques',     icon: 'ℹ️', slug: 'infos-pratiques', description: '', display_order: 2 },
  { id: 'entraide',        name: 'Entraide',             icon: '🤝', slug: 'entraide',        description: '', display_order: 3 },
  { id: 'securite',        name: 'Sécurité',             icon: '🚨', slug: 'securite',        description: '', display_order: 4 },
  { id: 'commerces',       name: 'Commerces & Services', icon: '🛒', slug: 'commerces',       description: '', display_order: 5 },
  { id: 'enfants-ecoles',  name: 'Enfants & Écoles',     icon: '🎒', slug: 'enfants-ecoles',  description: '', display_order: 6 },
  { id: 'nature-animaux',  name: 'Nature & Animaux',     icon: '🌿', slug: 'nature-animaux',  description: '', display_order: 7 },
  { id: 'travaux',         name: 'Travaux & Chantiers',  icon: '🔧', slug: 'travaux',         description: '', display_order: 8 },
  { id: 'evenements',      name: 'Événements locaux',    icon: '🎉', slug: 'evenements',      description: '', display_order: 9 },
  { id: 'libre',           name: 'Discussion libre',     icon: '💬', slug: 'libre',           description: '', display_order: 10 },
];
