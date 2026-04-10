/**
 * Données statiques des 3 univers + type partagé.
 * Importé par UniversDropdown, MobileNav et Navbar.
 */
import {
  Wrench, Package, PartyPopper,
  ClipboardList, MessageSquare, Briefcase, Drill,
  Gem, Search, Calendar, Footprints, BookOpen, Handshake, Heart,
} from 'lucide-react';

export const UNIVERS = [
  // ── 1. SERVICES ──────────────────────────────────────────────────────────────
  {
    id: 'services',
    label: 'Services',
    icon: Wrench,
    color: 'text-orange-600',
    activeBg: 'bg-orange-50 text-orange-700',
    hoverBg: 'hover:bg-gray-50 hover:text-gray-900',
    dotColor: 'bg-orange-500',
    gradFrom: 'from-orange-500',
    gradTo: 'to-amber-500',
    headerBg: 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100',
    paths: ['/artisans'],
    items: [
      {
        href: '/artisans',
        icon: Wrench,
        label: 'Artisans',
        desc: 'Artisans vérifiés près de chez vous',
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-100',
      },
      {
        href: '/artisans/demande',
        icon: ClipboardList,
        label: 'Poster une demande',
        desc: 'Déposez votre besoin en 2 min',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-100',
      },
      {
        href: '/demandes',
        icon: MessageSquare,
        label: 'Tableau des demandes',
        desc: 'Consulter et répondre aux habitants',
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-100',
      },
    ],
  },

  // ── 2. VIE PRATIQUE ──────────────────────────────────────────────────────────
  {
    id: 'viepratique',
    label: 'Vie pratique',
    icon: Package,
    color: 'text-blue-600',
    activeBg: 'bg-blue-50 text-blue-700',
    hoverBg: 'hover:bg-gray-50 hover:text-gray-900',
    dotColor: 'bg-blue-500',
    gradFrom: 'from-blue-500',
    gradTo: 'to-teal-500',
    headerBg: 'bg-gradient-to-r from-blue-50 to-teal-50 border-blue-100',
    paths: ['/annonces', '/materiel', '/collectionneurs', '/perdu-trouve', '/emploi'],
    items: [
      {
        href: '/emploi/offres',
        icon: Briefcase,
        label: 'Emploi local',
        desc: 'CDI, CDD, saisonnier, extra…',
        iconColor: 'text-cyan-500',
        iconBg: 'bg-cyan-100',
      },
      {
        href: '/annonces',
        icon: Package,
        label: 'Annonces',
        desc: 'Vendez et achetez local',
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100',
      },
      {
        href: '/materiel',
        icon: Drill,
        label: 'Matériel',
        desc: "Prêt et emprunt d'outils",
        iconColor: 'text-teal-500',
        iconBg: 'bg-teal-100',
      },
      {
        href: '/collectionneurs',
        icon: Gem,
        label: 'Collectionneurs',
        desc: 'Timbres, vinyles, objets rares',
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-100',
      },
      {
        href: '/perdu-trouve',
        icon: Search,
        label: 'Perdu / Trouvé',
        desc: 'Signalez ou retrouvez un objet',
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-100',
      },
    ],
  },

  // ── 3. VIE LOCALE ────────────────────────────────────────────────────────────
  {
    id: 'vielocale',
    label: 'Vie locale',
    icon: PartyPopper,
    color: 'text-purple-600',
    activeBg: 'bg-purple-50 text-purple-700',
    hoverBg: 'hover:bg-gray-50 hover:text-gray-900',
    dotColor: 'bg-purple-500',
    gradFrom: 'from-purple-500',
    gradTo: 'to-pink-500',
    headerBg: 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100',
    paths: ['/evenements', '/promenades', '/forum', '/associations', '/coups-de-main'],
    items: [
      {
        href: '/evenements',
        icon: Calendar,
        label: 'Événements',
        desc: 'Concerts, matchs, fêtes de quartier',
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-100',
      },
      {
        href: '/promenades',
        icon: Footprints,
        label: 'Promenades',
        desc: 'Sentiers, nature, itinéraires',
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-100',
      },
      {
        href: '/forum',
        icon: BookOpen,
        label: 'Forum',
        desc: 'Discussions entre habitants',
        iconColor: 'text-violet-500',
        iconBg: 'bg-violet-100',
      },
      {
        href: '/associations',
        icon: Handshake,
        label: 'Associations',
        desc: 'Découvrez les associations locales',
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-100',
      },
      {
        href: '/coups-de-main',
        icon: Heart,
        label: 'Coups de main',
        desc: "Demandez ou proposez de l'aide",
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-100',
      },
    ],
  },
] as const;

export type UniversItem = typeof UNIVERS[number];
