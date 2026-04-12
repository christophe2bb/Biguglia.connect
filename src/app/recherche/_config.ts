/**
 * Configuration statique — page Recherche
 * THEMES, CONTEXT_MAP, SORT_OPTIONS, getThemeLink
 */

import React from 'react';
import {
  Wrench, ShoppingBag, Package, Heart, Footprints, Calendar,
  BookOpen, Handshake, Trophy, HelpCircle, Briefcase,
} from 'lucide-react';

// ─── Thèmes ────────────────────────────────────────────────────────────────────
export const THEMES = {
  artisan:        { label: 'Artisans',     color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  icon: React.createElement(Wrench,      { className: 'w-4 h-4' }), activeBg: 'bg-orange-100',  activeText: 'text-orange-700' },
  annonce:        { label: 'Annonces',     color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',    icon: React.createElement(ShoppingBag, { className: 'w-4 h-4' }), activeBg: 'bg-blue-100',    activeText: 'text-blue-700' },
  materiel:       { label: 'Matériel',     color: 'text-sky-700',     bg: 'bg-sky-50',      border: 'border-sky-200',     icon: React.createElement(Package,     { className: 'w-4 h-4' }), activeBg: 'bg-sky-100',     activeText: 'text-sky-700' },
  aide:           { label: 'Entraide',     color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200',    icon: React.createElement(Heart,       { className: 'w-4 h-4' }), activeBg: 'bg-rose-100',    activeText: 'text-rose-700' },
  promenade:      { label: 'Promenades',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: React.createElement(Footprints,  { className: 'w-4 h-4' }), activeBg: 'bg-emerald-100', activeText: 'text-emerald-700' },
  evenement:      { label: 'Événements',   color: 'text-purple-700',  bg: 'bg-purple-50',   border: 'border-purple-200',  icon: React.createElement(Calendar,    { className: 'w-4 h-4' }), activeBg: 'bg-purple-100',  activeText: 'text-purple-700' },
  forum:          { label: 'Forum',        color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200',  icon: React.createElement(BookOpen,    { className: 'w-4 h-4' }), activeBg: 'bg-violet-100',  activeText: 'text-violet-700' },
  association:    { label: 'Associations', color: 'text-teal-700',    bg: 'bg-teal-50',     border: 'border-teal-200',    icon: React.createElement(Handshake,   { className: 'w-4 h-4' }), activeBg: 'bg-teal-100',    activeText: 'text-teal-700' },
  collectionneur: { label: 'Collections',  color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   icon: React.createElement(Trophy,      { className: 'w-4 h-4' }), activeBg: 'bg-amber-100',   activeText: 'text-amber-700' },
  perdu_trouve:   { label: 'Perdu/Trouvé', color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     icon: React.createElement(HelpCircle,  { className: 'w-4 h-4' }), activeBg: 'bg-red-100',     activeText: 'text-red-700' },
  emploi:         { label: 'Emploi',       color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200',  icon: React.createElement(Briefcase,   { className: 'w-4 h-4' }), activeBg: 'bg-indigo-100',  activeText: 'text-indigo-700' },
} as const;

export type ThemeKey = keyof typeof THEMES;

// ─── Suggestions contextuelles ────────────────────────────────────────────────
export const CONTEXT_MAP: Record<string, { themes: ThemeKey[]; label: string }> = {
  déménagement: { themes: ['aide', 'annonce', 'materiel'], label: 'déménagement' },
  demenagement: { themes: ['aide', 'annonce', 'materiel'], label: 'déménagement' },
  plantes:      { themes: ['aide', 'promenade', 'annonce'], label: 'plantes' },
  jardinage:    { themes: ['aide', 'materiel', 'annonce', 'artisan'], label: 'jardinage' },
  sport:        { themes: ['evenement', 'promenade', 'association'], label: 'sport' },
  covoiturage:  { themes: ['aide', 'annonce'], label: 'covoiturage' },
  vélo:         { themes: ['annonce', 'materiel', 'promenade'], label: 'vélo' },
  velo:         { themes: ['annonce', 'materiel', 'promenade'], label: 'vélo' },
  plombier:     { themes: ['artisan'], label: 'plombier' },
  plomberie:    { themes: ['artisan'], label: 'plomberie' },
  electricite:  { themes: ['artisan'], label: 'électricité' },
  musique:      { themes: ['evenement', 'association', 'forum'], label: 'musique' },
  enfants:      { themes: ['evenement', 'association', 'aide'], label: 'enfants' },
  animaux:      { themes: ['aide', 'forum', 'annonce'], label: 'animaux' },
  chien:        { themes: ['aide', 'promenade', 'annonce'], label: 'chien' },
};

// ─── Options de tri ───────────────────────────────────────────────────────────
export const SORT_OPTIONS = [
  { value: 'pertinence', label: 'Pertinence' },
  { value: 'recent',     label: 'Plus récent' },
  { value: 'gratuit',    label: "Gratuit d'abord" },
  { value: 'note',       label: 'Mieux noté' },
];

// ─── Lien vers la rubrique complète par thème ─────────────────────────────────
export function getThemeLink(theme: string): string {
  const map: Record<string, string> = {
    artisan:        '/artisans',
    annonce:        '/annonces',
    materiel:       '/materiel',
    aide:           '/coups-de-main',
    promenade:      '/promenades',
    evenement:      '/evenements',
    forum:          '/forum',
    association:    '/associations',
    collectionneur: '/collectionneurs',
    perdu_trouve:   '/perdu-trouve',
  };
  return map[theme] || '/';
}

// ─── Tendances (état vide) ────────────────────────────────────────────────────
export const TRENDING_SEARCHES = [
  'Plombier', 'Aide déménagement', 'Vélo', 'Cours sport',
  'Matériel jardinage', 'Covoiturage', 'Événement', 'Forum',
];
