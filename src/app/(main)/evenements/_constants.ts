import {
  Music, Utensils, Dumbbell, Heart, Palette,
  PartyPopper, Baby, Mic2, ShoppingBag, Building2,
} from 'lucide-react';
import type { EventCat } from './_types';

// ─── Catégories d'événements ──────────────────────────────────────────────────
export const EVENT_CATEGORIES: EventCat[] = [
  { id: 'fete',        label: 'Fête & animation', icon: PartyPopper,  color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500',  emoji: '🎉', description: 'Fêtes communales, repas, bals, carnavals' },
  { id: 'culture',     label: 'Culture & arts',   icon: Palette,      color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-500',  emoji: '🎭', description: 'Concerts, spectacles, expositions' },
  { id: 'sport',       label: 'Sport & plein air', icon: Dumbbell,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500', emoji: '🏃', description: 'Tournois, marches, randonnées, sport' },
  { id: 'association', label: 'Association',       icon: Heart,        color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500',    emoji: '🤝', description: 'Collectes, forum associatif, solidarité' },
  { id: 'citoyen',     label: 'Citoyen & mairie',  icon: Building2,   color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500',    emoji: '🏛️', description: 'Réunions publiques, permanences mairie' },
  { id: 'marche',      label: 'Marché & commerce', icon: ShoppingBag, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-500',   emoji: '🛍️', description: 'Marchés, brocantes, vide-greniers' },
  { id: 'famille',     label: 'Enfance & famille', icon: Baby,        color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',    dot: 'bg-sky-500',     emoji: '👨‍👩‍👧', description: 'Ateliers, kermesses, activités famille' },
  // héritage compat
  { id: 'musique',     label: 'Musique',           icon: Music,        color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',   dot: 'bg-pink-500',    emoji: '🎵', description: 'Concerts, scènes ouvertes, festivals' },
  { id: 'repas',       label: 'Repas & fête',      icon: Utensils,    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500',  emoji: '🍽️', description: 'Repas partagés, barbecues, fêtes' },
  { id: 'nature',      label: 'Nature & sport',    icon: Dumbbell,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500', emoji: '🌿', description: 'Sorties nature, randonnées, écologie' },
  { id: 'social',      label: 'Vie sociale',       icon: Heart,        color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500',    emoji: '🎊', description: 'Rencontres, animations de quartier' },
  { id: 'conference',  label: 'Conférence',        icon: Mic2,        color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   dot: 'bg-teal-500',    emoji: '🎤', description: 'Conférences, débats, présentations' },
];

// ─── Couleurs pastels calendrier ──────────────────────────────────────────────
export const CAT_PASTEL: Record<string, { bg: string; ring: string; text: string; emoji: string }> = {
  fete:        { bg: '#fff7ed', ring: '#fb923c', text: '#c2410c', emoji: '🎉' },
  culture:     { bg: '#f3e8ff', ring: '#c084fc', text: '#7e22ce', emoji: '🎭' },
  sport:       { bg: '#ecfdf5', ring: '#34d399', text: '#065f46', emoji: '🏃' },
  association: { bg: '#fff1f2', ring: '#fb7185', text: '#be123c', emoji: '🤝' },
  citoyen:     { bg: '#eff6ff', ring: '#60a5fa', text: '#1d4ed8', emoji: '🏛️' },
  marche:      { bg: '#fffbeb', ring: '#fbbf24', text: '#92400e', emoji: '🛍️' },
  famille:     { bg: '#e0f2fe', ring: '#38bdf8', text: '#0369a1', emoji: '👨‍👩‍👧' },
  musique:     { bg: '#fce7f3', ring: '#f472b6', text: '#be185d', emoji: '🎵' },
  repas:       { bg: '#fff7ed', ring: '#fb923c', text: '#c2410c', emoji: '🍽️' },
  nature:      { bg: '#ecfdf5', ring: '#34d399', text: '#065f46', emoji: '🌿' },
  social:      { bg: '#fff1f2', ring: '#fb7185', text: '#be123c', emoji: '🎊' },
  conference:  { bg: '#f0fdfa', ring: '#2dd4bf', text: '#0f766e', emoji: '🎤' },
};

// ─── Labels jours/mois ────────────────────────────────────────────────────────
export const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
