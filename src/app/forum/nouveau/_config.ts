// ─── Configuration statique du compositeur forum ─────────────────────────────
import {
  MapPin, Globe, Users,
  HelpCircle, Megaphone, Lightbulb, ThumbsUp, Heart,
  AlertTriangle, BookOpen, Star,
} from 'lucide-react';
import type {
  ForumSector, ForumCategory,
  PostTypeOption, UrgencyLevel, VisibilityOption,
} from './_types';

// ── Secteurs par défaut (fallback si la table Supabase est vide) ──────────────
export const SECTORS_DEFAULT: ForumSector[] = [
  { id: 'les-collines',  name: 'Les Collines',        slug: 'les-collines',  description: 'Quartier résidentiel sur les hauteurs', icon: '⛰️', color: 'emerald', display_order: 1 },
  { id: 'figabruna',     name: 'Figabruna',            slug: 'figabruna',     description: 'Secteur sud de Biguglia',               icon: '🌊', color: 'blue',    display_order: 2 },
  { id: 'village',       name: 'Village de Biguglia',  slug: 'village',       description: 'Cœur historique du village',            icon: '🏘️', color: 'amber',   display_order: 3 },
  { id: 'casatorra',     name: 'Casatorra',             slug: 'casatorra',     description: 'Secteur Casatorra',                     icon: '🌿', color: 'green',   display_order: 4 },
  { id: 'ortale',        name: 'Ortale',                slug: 'ortale',        description: 'Quartier Ortale',                       icon: '🏡', color: 'violet',  display_order: 5 },
  { id: 'la-plaine',     name: 'La Plaine',             slug: 'la-plaine',     description: 'Zone de la plaine et étang',            icon: '🌾', color: 'orange',  display_order: 6 },
  { id: 'la-marana',     name: 'La Marana',             slug: 'la-marana',     description: 'Zone de La Marana',                     icon: '🏖️', color: 'cyan',    display_order: 7 },
];

// ── Catégories par défaut ─────────────────────────────────────────────────────
export const CATEGORIES_DEFAULT: ForumCategory[] = [
  { id: 'vie-quartier',    name: 'Vie du quartier',      icon: '🏠', slug: 'vie-quartier',    description: 'Vie de quartier au quotidien',     display_order: 1 },
  { id: 'infos-pratiques', name: 'Infos pratiques',      icon: 'ℹ️', slug: 'infos-pratiques', description: 'Informations locales utiles',       display_order: 2 },
  { id: 'entraide',        name: 'Entraide',              icon: '🤝', slug: 'entraide',        description: 'Covoiturage, aide ponctuelle',     display_order: 3 },
  { id: 'securite',        name: 'Sécurité',              icon: '🚨', slug: 'securite',        description: 'Sécurité, vigilance de quartier',  display_order: 4 },
  { id: 'commerces',       name: 'Commerces & Services',  icon: '🛒', slug: 'commerces',       description: 'Commerces et services locaux',     display_order: 5 },
  { id: 'enfants-ecoles',  name: 'Enfants & Écoles',      icon: '🎒', slug: 'enfants-ecoles',  description: 'Enfants, écoles, activités',       display_order: 6 },
  { id: 'nature-animaux',  name: 'Nature & Animaux',      icon: '🌿', slug: 'nature-animaux',  description: 'Nature, animaux, environnement',   display_order: 7 },
  { id: 'travaux',         name: 'Travaux & Chantiers',   icon: '🔧', slug: 'travaux',         description: 'Travaux, chantiers, bricolage',    display_order: 8 },
  { id: 'evenements',      name: 'Événements locaux',     icon: '🎉', slug: 'evenements',      description: 'Événements, sorties locales',      display_order: 9 },
  { id: 'libre',           name: 'Discussion libre',      icon: '💬', slug: 'libre',           description: 'Discussion libre entre habitants', display_order: 10 },
];

// ── Types de post ─────────────────────────────────────────────────────────────
export const POST_TYPES: PostTypeOption[] = [
  { value: 'question',       icon: HelpCircle,    label: 'Question',             desc: 'Je cherche une info ou un conseil',       color: 'text-sky-700',    bg: 'bg-sky-50',     border: 'border-sky-300'    },
  { value: 'information',    icon: Megaphone,     label: 'Information',          desc: 'Je partage une info utile',               color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-300'   },
  { value: 'idee',           icon: Lightbulb,     label: 'Idée / Suggestion',    desc: 'Je propose une amélioration',             color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-300' },
  { value: 'avis',           icon: ThumbsUp,      label: 'Avis / Retour',        desc: 'Je donne mon avis sur un sujet',          color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-300'  },
  { value: 'besoin',         icon: Heart,         label: 'Besoin / Demande',     desc: "J'ai besoin d'aide ou d'un service",     color: 'text-rose-700',   bg: 'bg-rose-50',    border: 'border-rose-300'   },
  { value: 'alerte',         icon: AlertTriangle, label: 'Alerte douce',         desc: 'Je signale un problème local',            color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-300' },
  { value: 'retour',         icon: BookOpen,      label: "Retour d'expérience",  desc: 'Je partage mon vécu',                     color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-300'   },
  { value: 'recommandation', icon: Star,          label: 'Recommandation',       desc: 'Je recommande un lieu, artisan, service', color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-300' },
];

// ── Niveaux d'urgence ─────────────────────────────────────────────────────────
export const URGENCY_LEVELS: UrgencyLevel[] = [
  { value: 'basse',  emoji: '🟢', label: 'Info générale', desc: 'Pas urgent, pour information'        },
  { value: 'normal', emoji: '🟡', label: 'Normal',        desc: 'Sujet important mais pas pressé'      },
  { value: 'haute',  emoji: '🔴', label: 'Urgent',        desc: "Besoin d'attention rapide"            },
];

// ── Options de visibilité ─────────────────────────────────────────────────────
export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'public',  icon: Globe,  label: 'Public',      description: 'Visible par tous (même non connectés)'           },
  { value: 'membres', icon: Users,  label: 'Membres',     description: 'Visible uniquement par les membres connectés'    },
  { value: 'secteur', icon: MapPin, label: 'Mon secteur', description: 'Visible uniquement dans mon secteur'             },
];

// ── Palette de couleurs par secteur ──────────────────────────────────────────
export const SECTOR_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-300 text-emerald-800',
  blue:    'bg-blue-50 border-blue-300 text-blue-800',
  amber:   'bg-amber-50 border-amber-300 text-amber-800',
  green:   'bg-green-50 border-green-300 text-green-800',
  violet:  'bg-violet-50 border-violet-300 text-violet-800',
  orange:  'bg-orange-50 border-orange-300 text-orange-800',
  cyan:    'bg-cyan-50 border-cyan-300 text-cyan-800',
  gray:    'bg-gray-50 border-gray-300 text-gray-800',
};
