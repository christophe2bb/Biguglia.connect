// ─── Forum [id] — static configuration ────────────────────────────────────────
import {
  HelpCircle, Megaphone, Lightbulb, ThumbsUp, Heart,
  AlertTriangle, BookOpen, Star, CheckCircle2, Flame, Frown, Laugh,
} from 'lucide-react';

// ─── Post type badges ─────────────────────────────────────────────────────────
export const POST_TYPE_BADGE: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  question:      { icon: HelpCircle,    label: 'Question',        color: 'text-sky-700',    bg: 'bg-sky-100'    },
  information:   { icon: Megaphone,     label: 'Info',            color: 'text-blue-700',   bg: 'bg-blue-100'   },
  idee:          { icon: Lightbulb,     label: 'Idée',            color: 'text-violet-700', bg: 'bg-violet-100' },
  avis:          { icon: ThumbsUp,      label: 'Avis',            color: 'text-amber-700',  bg: 'bg-amber-100'  },
  besoin:        { icon: Heart,         label: 'Besoin',          color: 'text-rose-700',   bg: 'bg-rose-100'   },
  alerte:        { icon: AlertTriangle, label: 'Alerte douce',    color: 'text-orange-700', bg: 'bg-orange-100' },
  retour:        { icon: BookOpen,      label: "Retour d'exp.",   color: 'text-teal-700',   bg: 'bg-teal-100'   },
  recommandation:{ icon: Star,          label: 'Recommandation',  color: 'text-yellow-700', bg: 'bg-yellow-100' },
};

// ─── Urgence badges ───────────────────────────────────────────────────────────
export const URGENCY_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  haute:  { label: 'Urgent',  color: 'text-red-700',   bg: 'bg-red-100'   },
  normal: { label: 'Normal',  color: 'text-amber-700', bg: 'bg-amber-100' },
  basse:  { label: '',        color: '',               bg: ''             },
};

// ─── Secteur → tailwind classes ───────────────────────────────────────────────
export const SECTOR_COLORS: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue:    'bg-blue-100 text-blue-700',
  amber:   'bg-amber-100 text-amber-700',
  green:   'bg-green-100 text-green-700',
  violet:  'bg-violet-100 text-violet-700',
  orange:  'bg-orange-100 text-orange-700',
  gray:    'bg-gray-100 text-gray-700',
};

// ─── Emojis de réaction ───────────────────────────────────────────────────────
export const REACTION_EMOJIS = [
  { emoji: '👍', label: "J'aime",  icon: ThumbsUp    },
  { emoji: '❤️', label: 'Adore',   icon: Heart       },
  { emoji: '😂', label: 'Drôle',   icon: Laugh       },
  { emoji: '😢', label: 'Triste',  icon: Frown       },
  { emoji: '🔥', label: 'Chaud',   icon: Flame       },
  { emoji: '👏', label: 'Bravo',   icon: CheckCircle2},
];
