// ─── Configuration statique de GlobalSearch ───────────────────────────────────
import {
  Wrench, ShoppingBag, Package, Heart, Footprints,
  Calendar, BookOpen, Handshake, ScanSearch, Briefcase,
} from 'lucide-react';

// ── Config des thèmes de résultats ────────────────────────────────────────────
export const THEME_CONFIG = {
  artisan: {
    label: 'Artisans',
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  annonce: {
    label: 'Annonces',
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    icon: <ShoppingBag className="w-3.5 h-3.5" />,
  },
  materiel: {
    label: 'Matériel',
    color: 'text-sky-600',
    bg: 'bg-sky-100',
    icon: <Package className="w-3.5 h-3.5" />,
  },
  aide: {
    label: 'Entraide',
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    icon: <Heart className="w-3.5 h-3.5" />,
  },
  promenade: {
    label: 'Promenades',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    icon: <Footprints className="w-3.5 h-3.5" />,
  },
  evenement: {
    label: 'Événements',
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  forum: {
    label: 'Forum',
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  association: {
    label: 'Associations',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    icon: <Handshake className="w-3.5 h-3.5" />,
  },
  perdu: {
    label: 'Perdu / Trouvé',
    color: 'text-rose-600',
    bg: 'bg-rose-100',
    icon: <ScanSearch className="w-3.5 h-3.5" />,
  },
  emploi: {
    label: 'Emploi',
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    icon: <Briefcase className="w-3.5 h-3.5" />,
  },
} as const;

export type ThemeKey = keyof typeof THEME_CONFIG;

// ── URLs des sections thématiques ─────────────────────────────────────────────
export const THEME_HREFS: Record<ThemeKey, string> = {
  artisan:     '/artisans',
  annonce:     '/annonces',
  materiel:    '/materiel',
  aide:        '/coups-de-main',
  promenade:   '/promenades',
  evenement:   '/evenements',
  forum:       '/forum',
  association: '/associations',
  perdu:       '/perdu-trouve',
  emploi:      '/emploi',
};

// ── Recherches populaires ─────────────────────────────────────────────────────
export const POPULAR_SEARCHES = [
  { label: 'Plombier Biguglia',   href: '/recherche?q=plombier' },
  { label: 'Aide déménagement',   href: '/recherche?q=déménagement' },
  { label: 'Vélo à vendre',       href: '/recherche?q=vélo' },
  { label: 'Cours de sport',      href: '/recherche?q=sport' },
  { label: 'Matériel jardinage',  href: '/recherche?q=jardinage' },
  { label: 'Covoiturage',         href: '/recherche?q=covoiturage' },
];

// ── Mapping taille → classes Tailwind ─────────────────────────────────────────
export const SIZE_TOKENS = {
  sm:  { input: 'h-9 text-sm pl-9 pr-8',      icon: 'left-2.5 w-4 h-4',  clearBtn: 'right-2',   btn: 'hidden' },
  md:  { input: 'h-11 text-sm pl-10 pr-9',     icon: 'left-3 w-4 h-4',    clearBtn: 'right-2.5', btn: 'hidden' },
  lg:  { input: 'h-14 text-base pl-12 pr-10',  icon: 'left-3.5 w-5 h-5',  clearBtn: 'right-3',   btn: 'hidden' },
  xl:  { input: 'h-16 text-lg pl-14 pr-36',    icon: 'left-4 w-6 h-6',    clearBtn: 'right-28',  btn: 'flex'   },
} as const;
