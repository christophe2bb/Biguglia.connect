// ─── Constantes partagées — Coups de main ─────────────────────────────────────
import {
  Truck, ShoppingCart, Wrench, Trees, Baby, Computer,
  Heart, Dog, Car, Package, HelpCircle, HandHeart,
} from 'lucide-react';
import type {
  HelpType, UrgencyLevel, Compensation, Duration, HelpFormValues,
} from './_types';

// ── Configs d'affichage ──────────────────────────────────────────────────────

export const TYPE_CONFIG: Record<
  HelpType,
  { label: string; emoji: string; color: string; bg: string; border: string; desc: string; gradient: string }
> = {
  demande: {
    label: "J'ai besoin d'aide",
    emoji: '🙋',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    desc: "Vous cherchez un coup de main",
    gradient: 'from-orange-500 to-amber-500',
  },
  offre: {
    label: "Je propose mon aide",
    emoji: '🤝',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    desc: "Vous êtes disponible pour aider",
    gradient: 'from-emerald-500 to-teal-500',
  },
  echange: {
    label: "Échange de services",
    emoji: '🔄',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    desc: "J'aide si on m'aide en retour",
    gradient: 'from-blue-500 to-indigo-500',
  },
};

export const CATEGORIES = [
  { value: 'demenagement',    label: 'Déménagement / transport',       icon: Truck,        emoji: '🚛' },
  { value: 'courses',         label: 'Courses / accompagnement',       icon: ShoppingCart, emoji: '🛒' },
  { value: 'bricolage',       label: 'Bricolage léger',                icon: Wrench,       emoji: '🔧' },
  { value: 'jardin',          label: 'Jardin / extérieur',             icon: Trees,        emoji: '🌿' },
  { value: 'garde',           label: 'Garde ponctuelle',               icon: Baby,         emoji: '👶' },
  { value: 'admin_numerique', label: 'Aide administrative / numérique',icon: Computer,     emoji: '💻' },
  { value: 'visite',          label: 'Visite / compagnie',             icon: Heart,        emoji: '💙' },
  { value: 'animaux',         label: 'Animaux',                        icon: Dog,          emoji: '🐾' },
  { value: 'vehicule',        label: 'Véhicule / covoiturage',         icon: Car,          emoji: '🚗' },
  { value: 'livraison',       label: 'Livraison locale',               icon: Package,      emoji: '📦' },
  { value: 'depannage',       label: 'Petit dépannage',                icon: HelpCircle,   emoji: '🔌' },
  { value: 'autre',           label: 'Autre entraide',                 icon: HandHeart,    emoji: '🤗' },
] as const;

export const URGENCY_CONFIG: Record<
  UrgencyLevel,
  { label: string; color: string; bg: string; dotColor: string }
> = {
  flexible:      { label: 'Flexible',            color: 'text-gray-600',  bg: 'bg-gray-100',  dotColor: 'bg-gray-400' },
  cette_semaine: { label: 'Cette semaine',        color: 'text-blue-600',  bg: 'bg-blue-100',  dotColor: 'bg-blue-500' },
  rapidement:    { label: 'Rapidement',           color: 'text-amber-600', bg: 'bg-amber-100', dotColor: 'bg-amber-500' },
  urgent:        { label: "Aujourd'hui / urgent", color: 'text-red-600',   bg: 'bg-red-100',   dotColor: 'bg-red-500' },
};

export const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: '15min',        label: '15 min' },
  { value: '30min',        label: '30 min' },
  { value: '1h',           label: '1 heure' },
  { value: '2h',           label: '2 heures' },
  { value: 'demi_journee', label: 'Demi-journée' },
  { value: 'journee',      label: 'Journée' },
  { value: 'variable',     label: 'Variable' },
];

export const COMPENSATION_CONFIG: Record<Compensation, { label: string; emoji: string }> = {
  gratuit:  { label: 'Gratuit / entraide pure',         emoji: '💚' },
  cafe:     { label: 'Café / apéro / merci symbolique', emoji: '☕' },
  echange:  { label: 'Échange de service',              emoji: '🔄' },
  frais:    { label: 'Petite participation aux frais',  emoji: '💶' },
  discuter: { label: 'À discuter',                      emoji: '💬' },
};

export const EQUIPMENT_OPTIONS = [
  'Voiture', 'Remorque', 'Outils', 'Escabeau', 'Gants',
  'Diable / chariot', 'Ordinateur', 'Autre',
];

export const CONDITIONS_OPTIONS = [
  "Présence d'escaliers",
  'Port de charge',
  'Enfant / animal sur place',
  'Accès facile',
  "Besoin d'être véhiculé",
  'Intervention à plusieurs préférable',
  'Rien de particulier',
];

export const FOR_WHO_OPTIONS = [
  'Pour moi',
  'Pour un proche',
  'Pour une personne âgée',
  'Pour une famille',
  'Pour une association',
  'Autre',
];

export const LOCATION_AREAS = [
  'Centre-ville', 'Mairie', 'Casatorra', 'Toga / proche gare',
  'Périphérie', 'Biguglia nord', 'Biguglia sud', 'Autre zone',
];

export const SECURITY_TIPS = [
  "🤝 Rencontrez-vous dans un lieu public quand c'est possible",
  "💰 Ne versez jamais d'argent sans confiance établie",
  '💬 Préférez la messagerie de la plateforme pour les premiers échanges',
  '🔒 Ne partagez pas vos coordonnées personnelles trop tôt',
  '🚨 Signalez tout comportement suspect',
];

// ── Formulaire vide ───────────────────────────────────────────────────────────
export const EMPTY_FORM: HelpFormValues = {
  help_type:           'demande',
  title:               '',
  category:            'autre',
  description:         '',
  urgency:             'flexible',
  help_date:           '',
  help_time:           '',
  sector_id:           '',
  location_area:       'Centre-ville',
  location_city:       'Biguglia',
  location_detail:     '',
  duration:            '1h',
  persons_needed:      1,
  compensation:        'gratuit',
  compensation_detail: '',
  equipment:           [],
  for_who:             'Pour moi',
  conditions:          [],
  visibility:          'public',
  contact_mode:        'messagerie',
  display_name:        'prenom_initiale',
  check1: false,
  check2: false,
  check3: false,
  check4: false,
  check5: false,
};

// ── Labels de statut ─────────────────────────────────────────────────────────
export const STATUS_LABELS: Record<string, string> = {
  active:      'Actif',
  in_progress: 'En cours',
  paused:      'En pause',
  resolved:    'Résolu',
  closed:      'Fermé',
  archived:    'Archivé',
};
