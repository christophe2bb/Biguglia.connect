// ─── Dashboard — shared constants & config ────────────────────────────────────
import {
  PenLine, Package, Wrench, Heart, Calendar, Footprints,
  Trophy, HelpCircle,
} from 'lucide-react';

// ── Status display helpers ────────────────────────────────────────────────────

export const STATUS_FR: Record<string, string> = {
  active: 'Actif', available: 'Disponible', unavailable: 'Indisponible',
  reserved: 'Réservé', sold: 'Vendu', archived: 'Archivé', expired: 'Expiré',
  requested: 'Demandé', pending: 'En attente', accepted: 'Accepté',
  in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé',
  open: 'Ouvert', resolved: 'Résolu', paused: 'En pause',
};

export const STATUS_COLOR: Record<string, string> = {
  active:      'bg-emerald-100 text-emerald-700',
  available:   'bg-emerald-100 text-emerald-700',
  open:        'bg-emerald-100 text-emerald-700',
  reserved:    'bg-amber-100 text-amber-700',
  pending:     'bg-amber-100 text-amber-700',
  requested:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  accepted:    'bg-sky-100 text-sky-700',
  sold:        'bg-gray-100 text-gray-500',
  archived:    'bg-gray-100 text-gray-500',
  expired:     'bg-red-100 text-red-600',
  cancelled:   'bg-red-100 text-red-600',
  completed:   'bg-teal-100 text-teal-700',
  resolved:    'bg-teal-100 text-teal-700',
  unavailable: 'bg-gray-100 text-gray-500',
  paused:      'bg-orange-100 text-orange-700',
};

// ── Status breakdown chips (per content type) ─────────────────────────────────

export type StatusChip = { key: string; label: string; color: string; dot: string };

export const STATUS_CHIPS: Record<string, StatusChip[]> = {
  listing: [
    { key: 'active',   label: 'Actif',   color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { key: 'reserved', label: 'Réservé', color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500'   },
    { key: 'sold',     label: 'Vendu',   color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400'    },
    { key: 'expired',  label: 'Expiré',  color: 'bg-red-100 text-red-600',         dot: 'bg-red-400'     },
    { key: 'archived', label: 'Archivé', color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-300'    },
  ],
  equipment: [
    { key: 'available',   label: 'Disponible',  color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { key: 'reserved',    label: 'Réservé',      color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500'   },
    { key: 'borrowed',    label: 'Prêté',        color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500'    },
    { key: 'unavailable', label: 'Indisponible', color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400'    },
    { key: 'archived',    label: 'Archivé',      color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-300'    },
  ],
  help: [
    { key: 'active',      label: 'Actif',    color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { key: 'in_progress', label: 'En cours', color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500'    },
    { key: 'paused',      label: 'En pause', color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-400'  },
    { key: 'resolved',    label: 'Résolu',   color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500'    },
    { key: 'closed',      label: 'Fermé',    color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400'    },
    { key: 'archived',    label: 'Archivé',  color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-300'    },
  ],
  lost_found: [
    { key: 'active',   label: 'En cours', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
    { key: 'resolved', label: 'Résolu',   color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500'    },
    { key: 'closed',   label: 'Fermé',    color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400'    },
    { key: 'archived', label: 'Archivé',  color: 'bg-gray-100 text-gray-500',       dot: 'bg-gray-300'    },
  ],
};

// ── Interaction source labels ─────────────────────────────────────────────────

export const INTERACTION_SOURCE_LABEL: Record<string, string> = {
  listing:         'Annonce',
  equipment:       'Matériel',
  help_request:    'Entraide',
  association:     'Association',
  outing:          'Promenade',
  event:           'Événement',
  collection_item: 'Collection',
  service_request: 'Demande artisan',
  lost_found:      'Perdu/Trouvé',
};

// ── Community themes (sidebar + tiles) ───────────────────────────────────────

export const COMMUNITY_THEMES: Record<string, {
  emoji: string; label: string; color: string; bg: string; border: string;
}> = {
  collectionneurs: { emoji: '🏆', label: 'Collectionneurs', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
  promenades:      { emoji: '🥾', label: 'Promenades',      color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200'  },
  evenements:      { emoji: '🎉', label: 'Événements',      color: 'text-pink-700',   bg: 'bg-pink-50',   border: 'border-pink-200'   },
  associations:    { emoji: '🤝', label: 'Associations',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
  'coups-de-main': { emoji: '🙌', label: 'Coups de main',   color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  materiel:        { emoji: '🔧', label: 'Matériel',        color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200'   },
  annonces:        { emoji: '📢', label: 'Annonces',        color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  'perdu-trouve':  { emoji: '🔍', label: 'Perdu/Trouvé',    color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200'    },
};

// ── Quick actions ─────────────────────────────────────────────────────────────

export const QUICK_ACTIONS = [
  { icon: PenLine,    label: 'Nouvelle demande', href: '/artisans/demande',   grad: 'from-brand-500 to-orange-500'   },
  { icon: Package,    label: 'Publier annonce',  href: '/annonces/nouvelle',  grad: 'from-blue-500 to-indigo-500'    },
  { icon: Wrench,     label: 'Prêter matériel',  href: '/materiel/nouveau',   grad: 'from-emerald-500 to-teal-500'   },
  { icon: Heart,      label: 'Coup de main',     href: '/coups-de-main',      grad: 'from-rose-500 to-pink-500'      },
  { icon: Calendar,   label: 'Créer événement',  href: '/evenements/nouveau', grad: 'from-purple-500 to-violet-500'  },
  { icon: Footprints, label: 'Organiser sortie', href: '/promenades',         grad: 'from-green-500 to-emerald-500'  },
  { icon: Trophy,     label: 'Collectionner',    href: '/collectionneurs',    grad: 'from-amber-500 to-yellow-500'   },
  { icon: HelpCircle, label: 'Perdu/Trouvé',     href: '/perdu-trouve',       grad: 'from-red-500 to-rose-500'       },
] as const;

// ── Tab definitions type ──────────────────────────────────────────────────────

export type DashTab = 'overview' | 'contenus' | 'interactions' | 'messages' | 'avis' | 'historique';
