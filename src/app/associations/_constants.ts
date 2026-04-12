import {
  Dumbbell, Music, Handshake, Baby, Leaf, Star, Dog, Flag, Heart,
  BookOpen, Users, Building2, UserCheck, Zap, Package, Calendar,
  Gift,
} from 'lucide-react';
import type { AssoCategory, PubType, AssociationFormData } from './_types';

// ─── Configs catégories ───────────────────────────────────────────────────────
export const CAT_CONFIG: Record<AssoCategory, { label: string; icon: React.ElementType; color: string; bg: string; emoji: string }> = {
  sport:        { label: 'Sport',         icon: Dumbbell,   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200',   emoji: '⚽' },
  culture:      { label: 'Culture',       icon: Music,      color: 'text-purple-600',  bg: 'bg-purple-50 border-purple-200',   emoji: '🎭' },
  solidarite:   { label: 'Solidarité',    icon: Handshake,  color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200',       emoji: '🤝' },
  jeunesse:     { label: 'Jeunesse',      icon: Baby,       color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200',         emoji: '🧒' },
  environnement:{ label: 'Environnement', icon: Leaf,       color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', emoji: '🌿' },
  loisirs:      { label: 'Loisirs',       icon: Star,       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     emoji: '🎯' },
  animaux:      { label: 'Animaux',       icon: Dog,        color: 'text-lime-600',    bg: 'bg-lime-50 border-lime-200',       emoji: '🐾' },
  patrimoine:   { label: 'Patrimoine',    icon: Flag,       color: 'text-stone-600',   bg: 'bg-stone-50 border-stone-200',     emoji: '🏛️' },
  sante:        { label: 'Santé',         icon: Heart,      color: 'text-red-600',     bg: 'bg-red-50 border-red-200',         emoji: '❤️' },
  education:    { label: 'Éducation',     icon: BookOpen,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',       emoji: '📚' },
  seniors:      { label: 'Seniors',       icon: Users,      color: 'text-teal-600',    bg: 'bg-teal-50 border-teal-200',       emoji: '🧓' },
  autre:        { label: 'Autre',         icon: Building2,  color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200',       emoji: '🏢' },
};

// ─── Configs types de publication ────────────────────────────────────────────
export const PUB_TYPE_CONFIG: Record<PubType, { label: string; emoji: string; color: string; icon: React.ElementType }> = {
  vitrine:     { label: 'Présentation',        emoji: '🏛️', color: 'bg-blue-100 text-blue-700',       icon: Building2 },
  benevoles:   { label: 'Cherche bénévoles',   emoji: '🙋', color: 'bg-rose-100 text-rose-700',        icon: UserCheck },
  activite:    { label: 'Activité',            emoji: '🎯', color: 'bg-amber-100 text-amber-700',      icon: Zap },
  adherents:   { label: 'Cherche adhérents',   emoji: '👥', color: 'bg-purple-100 text-purple-700',    icon: Users },
  materiel:    { label: 'Cherche matériel',    emoji: '📦', color: 'bg-teal-100 text-teal-700',        icon: Package },
  evenement:   { label: 'Événement',           emoji: '🎉', color: 'bg-pink-100 text-pink-700',        icon: Calendar },
  dons:        { label: 'Appel aux dons',      emoji: '💝', color: 'bg-red-100 text-red-700',          icon: Gift },
  partenaires: { label: 'Cherche partenaires', emoji: '🤝', color: 'bg-emerald-100 text-emerald-700',  icon: Handshake },
};

// ─── Options formulaire ───────────────────────────────────────────────────────
export const NEEDS_OPTIONS = [
  'Bénévoles', 'Nouveaux adhérents', 'Participants', 'Matériel',
  'Sponsors', 'Dons', 'Local', 'Transport', 'Encadrants',
  'Compétences spécifiques', 'Communication / visibilité',
];

export const PUBLIC_OPTIONS = ['Enfants', 'Ados', 'Adultes', 'Seniors', 'Tout public', 'Familles'];

export const ACTIVITY_OPTIONS = [
  'Cours', 'Sorties', 'Entraînements', 'Ateliers', 'Événements',
  'Aide sociale', 'Accompagnement', 'Permanences', 'Actions terrain',
];

export const TAG_OPTIONS = [
  'bénévolat', 'sport', 'enfants', 'nature', 'musique', 'entraide',
  'quartier', 'patrimoine', 'seniors', 'culture', 'solidarité', 'loisirs',
];

// ─── Formulaire vide ──────────────────────────────────────────────────────────
export const EMPTY_FORM: AssociationFormData = {
  pub_type: 'vitrine',
  name: '',
  slogan: '',
  category: 'autre',
  description_short: '',
  description_full: '',
  location: 'Biguglia',
  address: '',
  schedule: '',
  public_target: [],
  age_min: '',
  age_max: '',
  membership_required: false,
  price_type: 'gratuit',
  price_detail: '',
  capacity: '',
  activities: [],
  frequency: '',
  tags: [],
  needs: [],
  need_detail: '',
  contact_name: '',
  contact_role: '',
  contact_phone: '',
  contact_email: '',
  contact_website: '',
  contact_facebook: '',
  contact_instagram: '',
  contact_mode: 'messagerie',
  show_phone: false,
  declared: false,
  rna_number: '',
  pmr_accessible: false,
  families_welcome: false,
  animals_ok: false,
  indoor: null,
  parking_nearby: false,
  material_provided: false,
  registration_required: false,
  places_limited: false,
  urgent_need: false,
  sector_id: '',
  is_accepting_members: false,
  is_accepting_volunteers: false,
  is_accepting_donations: false,
  is_accepting_partners: false,
};

// ─── Steps formulaire ─────────────────────────────────────────────────────────
export const FORM_STEPS = ['Type', 'Identité', 'Activités', 'Besoins & CDC', 'Photos', 'Contact & Options'];
