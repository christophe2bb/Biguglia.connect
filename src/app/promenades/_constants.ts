import {
  Footprints, Mountain, Bike, Waves, Leaf, Navigation, Users, Camera,
  CheckCircle2, AlertTriangle, X,
} from 'lucide-react';

// ─── Configs ──────────────────────────────────────────────────────────────────

export const DIFF_CONFIG = {
  facile:    { label: 'Facile',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: '🟢', barColor: 'bg-emerald-400' },
  moyen:     { label: 'Moyen',     color: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   icon: '🟡', barColor: 'bg-amber-400' },
  difficile: { label: 'Difficile', color: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     icon: '🔴', barColor: 'bg-red-400' },
} as const;

export const TYPE_CONFIG = {
  balade:    { icon: Footprints, label: 'Balade',          color: 'text-sky-600',      bg: 'bg-sky-50',      border: 'border-sky-200',      emoji: '🥾',  gradient: 'from-sky-500 to-blue-600' },
  randonnee: { icon: Mountain,   label: 'Randonnée',       color: 'text-orange-600',   bg: 'bg-orange-50',   border: 'border-orange-200',   emoji: '⛰️',  gradient: 'from-orange-500 to-red-600' },
  velo:      { icon: Bike,       label: 'Vélo',            color: 'text-purple-600',   bg: 'bg-purple-50',   border: 'border-purple-200',   emoji: '🚴',  gradient: 'from-purple-500 to-violet-600' },
  plage:     { icon: Waves,      label: 'Plage',           color: 'text-yellow-600',   bg: 'bg-yellow-50',   border: 'border-yellow-200',   emoji: '🏖️',  gradient: 'from-yellow-400 to-orange-500' },
  nature:    { icon: Leaf,       label: 'Nature',          color: 'text-emerald-600',  bg: 'bg-emerald-50',  border: 'border-emerald-200',  emoji: '🌿',  gradient: 'from-emerald-500 to-teal-600' },
  moto:      { icon: Navigation, label: 'Moto découverte', color: 'text-gray-700',     bg: 'bg-gray-50',     border: 'border-gray-200',     emoji: '🏍️',  gradient: 'from-gray-600 to-slate-700' },
  famille:   { icon: Users,      label: 'Famille',         color: 'text-pink-600',     bg: 'bg-pink-50',     border: 'border-pink-200',     emoji: '👨‍👩‍👧',  gradient: 'from-pink-500 to-rose-600' },
  photo:     { icon: Camera,     label: 'Spot photo',      color: 'text-violet-600',   bg: 'bg-violet-50',   border: 'border-violet-200',   emoji: '📸',  gradient: 'from-violet-500 to-purple-600' },
} as const;

export const TERRAIN_STATUS_CONFIG = {
  good:      { label: 'Terrain OK',      color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2, dot: 'bg-emerald-500' },
  degraded:  { label: 'Terrain dégradé', color: 'text-amber-700',   bg: 'bg-amber-100',   icon: AlertTriangle, dot: 'bg-amber-500' },
  closed:    { label: 'Accès fermé',     color: 'text-red-700',     bg: 'bg-red-100',     icon: X,             dot: 'bg-red-500' },
} as const;

export const QUICK_FILTERS = [
  { id: 'balade',    label: 'Balade',         emoji: '🥾' },
  { id: 'famille',   label: 'Famille',        emoji: '👨‍👩‍👧' },
  { id: 'chien',     label: 'Avec chien',     emoji: '🐕' },
  { id: 'velo',      label: 'Vélo',           emoji: '🚴' },
  { id: 'photo',     label: 'Spot photo',     emoji: '📸' },
  { id: 'facile',    label: 'Facile',         emoji: '🟢' },
  { id: 'sunset',    label: 'Coucher soleil', emoji: '🌅' },
  { id: 'poussette', label: 'Poussette',      emoji: '🍼' },
  { id: 'court',     label: '< 1h',           emoji: '⚡' },
] as const;

export const DEFAULT_OUTING_FORM = {
  title: '',
  description: '',
  outing_date: '',
  outing_time: '09:00',
  max_participants: '10',
  meeting_point: '',
  parking_info: '',
  parking_available: false,
  stroller_accessible: false,
  difficulty: 'facile' as const,
  kids_friendly: false,
  dogs_allowed: false,
  sector_id: '',
};

export const DEFAULT_PROMENADE_FORM = {
  title: '',
  description: '',
  distance_km: '',
  duration_min: '',
  difficulty: 'facile',
  type: 'balade',
  tags: '',
  start_point: '',
  dogs_allowed: false,
  stroller_friendly: false,
  parking_available: false,
  water_access: false,
  shade_level: 'none' as const,
  best_time_of_day: 'anytime' as const,
  route_loop: false,
  practical_tips: '',
  safety_notes: '',
  sector_id: '',
};

export const DEFAULT_ADV_FILTERS = {
  dogs: false,
  stroller: false,
  parking: false,
  water: false,
  shade: false,
  sunset: false,
  duration_max: '',
  loop: false,
};
