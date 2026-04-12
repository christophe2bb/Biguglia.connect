// ─── Config statique — Wizard création collectionneurs ───────────────────────

import { Tag, Star, Gem, Camera, CheckCircle2 } from 'lucide-react';
import type { CollectionneurFormData } from './_types';

// ─── Étapes du wizard ─────────────────────────────────────────────────────────
export const STEPS = [
  { id: 1, label: 'Mode',        icon: Tag },
  { id: 2, label: 'Catégorie',   icon: Star },
  { id: 3, label: 'Objet',       icon: Gem },
  { id: 4, label: 'Photos',      icon: Camera },
  { id: 5, label: 'Publication', icon: CheckCircle2 },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

// ─── Limites médias ───────────────────────────────────────────────────────────
export const MAX_PHOTOS  = 12;
export const MAX_FILE_MB = 8;
export const MAX_TAGS    = 8;

// ─── État initial du formulaire ───────────────────────────────────────────────
export const EMPTY_FORM: CollectionneurFormData = {
  mode:                    'vente',
  category_id:             '',
  subcategory:             '',
  title:                   '',
  description:             '',
  condition:               'bon',
  rarity_level:            'commun',
  year_period:             '',
  brand:                   '',
  series_name:             '',
  authenticity_declared:   false,
  provenance:              '',
  defects_noted:           '',
  dimensions:              '',
  material:                '',
  price:                   '',
  exchange_expected:       '',
  shipping_available:      false,
  local_meetup_available:  true,
  city:                    '',
  postal_code:             '',
  sector_id:               '',
  tags:                    [],
  photos:                  [],
};

// ─── Catégories de fallback (si la table Supabase est vide) ──────────────────
export const FALLBACK_CATEGORIES = [
  { id: '1',  name: 'Jeux & Jouets anciens',   slug: 'jeux-jouets',     icon: '🎲', color: 'bg-purple-100 text-purple-700', display_order: 1 },
  { id: '2',  name: 'Monnaies & Timbres',       slug: 'monnaies-timbres',icon: '🪙', color: 'bg-yellow-100 text-yellow-700', display_order: 2 },
  { id: '3',  name: 'Livres & BD',              slug: 'livres-bd',       icon: '📚', color: 'bg-blue-100 text-blue-700',    display_order: 3 },
  { id: '4',  name: 'Vinyles & Cassettes',      slug: 'vinyles',         icon: '🎵', color: 'bg-pink-100 text-pink-700',    display_order: 4 },
  { id: '5',  name: 'Cartes & Figurines',       slug: 'cartes-figurines',icon: '🃏', color: 'bg-red-100 text-red-700',     display_order: 5 },
  { id: '6',  name: 'Céramique & Porcelaine',   slug: 'ceramique',       icon: '🏺', color: 'bg-orange-100 text-orange-700',display_order: 6 },
  { id: '7',  name: 'Photographies & Art',      slug: 'photo-art',       icon: '🎨', color: 'bg-indigo-100 text-indigo-700',display_order: 7 },
  { id: '8',  name: 'Montres & Bijoux',         slug: 'montres-bijoux',  icon: '⌚', color: 'bg-amber-100 text-amber-700', display_order: 8 },
  { id: '9',  name: 'Mobilier & Décoration',    slug: 'mobilier-deco',   icon: '🛋️', color: 'bg-teal-100 text-teal-700',   display_order: 9 },
  { id: '10', name: 'Sportifs & Militaires',    slug: 'sport-militaire', icon: '🏅', color: 'bg-green-100 text-green-700', display_order: 10 },
  { id: '0',  name: 'Autre',                    slug: 'autre',           icon: '📦', color: 'bg-gray-100 text-gray-700',   display_order: 99 },
];
