import {
  Dumbbell, Music, Handshake, Baby, Leaf, Star, Dog,
  Flag, Heart, BookOpen, Users, Building2,
} from 'lucide-react';
import type { AssoCategory, PubType, Association, NeedPicto } from './_types';

// ─── Category config ─────────────────────────────────────────────────────────

export const CAT_CONFIG: Record<AssoCategory, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  emoji: string;
}> = {
  sport:         { label: 'Sport',         icon: Dumbbell,   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200',   emoji: '⚽' },
  culture:       { label: 'Culture',       icon: Music,      color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200',   emoji: '🎭' },
  solidarite:    { label: 'Solidarité',    icon: Handshake,  color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',       emoji: '🤝' },
  jeunesse:      { label: 'Jeunesse',      icon: Baby,       color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200',         emoji: '🧒' },
  environnement: { label: 'Environnement', icon: Leaf,       color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', emoji: '🌿' },
  loisirs:       { label: 'Loisirs',       icon: Star,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     emoji: '🎯' },
  animaux:       { label: 'Animaux',       icon: Dog,        color: 'text-lime-600',    bg: 'bg-lime-50 border-lime-200',       emoji: '🐾' },
  patrimoine:    { label: 'Patrimoine',    icon: Flag,       color: 'text-stone-600',   bg: 'bg-stone-50 border-stone-200',     emoji: '🏛️' },
  sante:         { label: 'Santé',         icon: Heart,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         emoji: '❤️' },
  education:     { label: 'Éducation',     icon: BookOpen,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',       emoji: '📚' },
  seniors:       { label: 'Seniors',       icon: Users,      color: 'text-teal-600',    bg: 'bg-teal-50 border-teal-200',       emoji: '🧓' },
  autre:         { label: 'Autre',         icon: Building2,  color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200',       emoji: '🏢' },
};

// ─── Publication type config ──────────────────────────────────────────────────

export const PUB_TYPE_CONFIG: Record<PubType, { label: string; emoji: string; color: string }> = {
  vitrine:     { label: 'Présentation',        emoji: '🏛️', color: 'bg-blue-100 text-blue-700' },
  benevoles:   { label: 'Cherche bénévoles',   emoji: '🙋', color: 'bg-rose-100 text-rose-700' },
  activite:    { label: 'Activité',            emoji: '🎯', color: 'bg-amber-100 text-amber-700' },
  adherents:   { label: 'Cherche adhérents',   emoji: '👥', color: 'bg-purple-100 text-purple-700' },
  materiel:    { label: 'Cherche matériel',    emoji: '📦', color: 'bg-teal-100 text-teal-700' },
  evenement:   { label: 'Événement',           emoji: '🎉', color: 'bg-pink-100 text-pink-700' },
  dons:        { label: 'Appel aux dons',      emoji: '💝', color: 'bg-red-100 text-red-700' },
  partenaires: { label: 'Cherche partenaires', emoji: '🤝', color: 'bg-emerald-100 text-emerald-700' },
};

// ─── CTA label per pub_type ───────────────────────────────────────────────────

export function getCtaLabel(pubType: PubType): string {
  const map: Record<PubType, string> = {
    benevoles:   '🙋 Devenir bénévole',
    dons:        '💝 Faire un don',
    adherents:   '👥 Adhérer',
    partenaires: '🤝 Devenir partenaire',
    materiel:    '📦 Proposer du matériel',
    vitrine:     '✉️ Contacter',
    activite:    '✉️ Contacter',
    evenement:   '✉️ Contacter',
  };
  return map[pubType] ?? '✉️ Contacter';
}

// ─── Needs pictos builder ─────────────────────────────────────────────────────

export function buildNeedsPictos(asso: Association): NeedPicto[] {
  return [
    asso.is_accepting_members  || asso.needs.includes('Nouveaux adhérents')
      ? { icon: '👥', label: 'Adhérents',   color: 'bg-purple-50 text-purple-700 border-purple-200' } : null,
    asso.is_accepting_volunteers || asso.needs.includes('Bénévoles')
      ? { icon: '🙋', label: 'Bénévoles',   color: 'bg-rose-50 text-rose-700 border-rose-200' } : null,
    asso.needs.includes('Matériel')
      ? { icon: '📦', label: 'Matériel',    color: 'bg-teal-50 text-teal-700 border-teal-200' } : null,
    asso.is_accepting_partners || asso.needs.includes('Sponsors')
      ? { icon: '🤝', label: 'Partenaires', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : null,
    asso.is_accepting_donations || asso.needs.includes('Dons')
      ? { icon: '💝', label: 'Dons',        color: 'bg-red-50 text-red-700 border-red-200' } : null,
  ].filter(Boolean) as NeedPicto[];
}
