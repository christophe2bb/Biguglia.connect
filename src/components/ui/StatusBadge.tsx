'use client';

/**
 * StatusBadge — Badge de statut universel pour Biguglia Connect
 *
 * Couvre tous les types de contenu du site avec un code couleur stable
 * et une icône optionnelle. En 1 seconde l'utilisateur sait si c'est
 * disponible, réservé, terminé, complet ou clos.
 */

import { cn } from '@/lib/utils';
import {
  CheckCircle2, Clock, XCircle, AlertCircle, Package,
  Lock, Zap, Users, CalendarCheck, CalendarX, Eye, EyeOff,
  Star, Recycle, BadgeCheck, Handshake, HandHeart,
  MapPin, Pause, Play,
} from 'lucide-react';

// ─── Config complète ───────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  dot: string;           // couleur du point pulsé (tailwind bg-xxx)
  priority: number;      // 0 = actif/vert, 1 = info, 2 = warning, 3 = danger/inactif
}> = {

  // ── Annonces ──────────────────────────────────────────────────────────────
  active: {
    label: 'Disponible', icon: Zap,
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500',
    priority: 0,
  },
  reserved: {
    label: 'Réservé', icon: Lock,
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500',
    priority: 1,
  },
  sold: {
    label: 'Vendu', icon: BadgeCheck,
    bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
    priority: 3,
  },
  expired: {
    label: 'Expiré', icon: Clock,
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-400',
    priority: 3,
  },
  archived: {
    label: 'Archivé', icon: Package,
    bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', dot: 'bg-gray-300',
    priority: 3,
  },

  // ── Matériel ──────────────────────────────────────────────────────────────
  available: {
    label: 'Disponible', icon: CheckCircle2,
    bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500',
    priority: 0,
  },
  pending: {
    label: 'Demande en attente', icon: Clock,
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500',
    priority: 1,
  },
  approved: {
    label: 'Prêt accepté', icon: CheckCircle2,
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500',
    priority: 0,
  },
  borrowed: {
    label: 'En prêt', icon: Handshake,
    bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500',
    priority: 1,
  },
  returned: {
    label: 'Rendu', icon: Recycle,
    bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
    priority: 3,
  },
  unavailable: {
    label: 'Indisponible', icon: XCircle,
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-400',
    priority: 3,
  },

  // ── Coups de main ─────────────────────────────────────────────────────────
  open: {
    label: 'Ouvert', icon: HandHeart,
    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500',
    priority: 0,
  },
  in_progress: {
    label: 'En cours', icon: Zap,
    bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500',
    priority: 1,
  },
  paused: {
    label: 'En pause', icon: Pause,
    bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
    priority: 2,
  },
  help_found: {
    label: 'Aide trouvée', icon: Star,
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500',
    priority: 2,
  },
  resolved: {
    label: 'Résolu', icon: CheckCircle2,
    bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-400',
    priority: 3,
  },
  closed: {
    label: 'Fermé', icon: XCircle,
    bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
    priority: 3,
  },

  // ── Promenades ────────────────────────────────────────────────────────────
  registration_open: {
    label: 'Inscriptions ouvertes', icon: Play,
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500',
    priority: 0,
  },
  almost_full: {
    label: 'Bientôt complet', icon: AlertCircle,
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500',
    priority: 1,
  },
  full: {
    label: 'Complet', icon: Users,
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500',
    priority: 2,
  },
  completed: {
    label: 'Terminé', icon: CheckCircle2,
    bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
    priority: 3,
  },
  cancelled: {
    label: 'Annulé', icon: XCircle,
    bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200', dot: 'bg-red-400',
    priority: 3,
  },

  // ── Événements ────────────────────────────────────────────────────────────
  upcoming: {
    label: 'À venir', icon: CalendarCheck,
    bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500',
    priority: 0,
  },
  past: {
    label: 'Passé', icon: CalendarX,
    bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400',
    priority: 3,
  },

  // ── Perdu / Trouvé ────────────────────────────────────────────────────────
  lost: {
    label: 'Perdu', icon: AlertCircle,
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500',
    priority: 0,
  },
  found: {
    label: 'Trouvé', icon: Eye,
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500',
    priority: 0,
  },
  returned_item: {
    label: 'Restitué', icon: CheckCircle2,
    bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-400',
    priority: 3,
  },
  draft: {
    label: 'Brouillon', icon: EyeOff,
    bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', dot: 'bg-gray-300',
    priority: 2,
  },

  // ── Associations ──────────────────────────────────────────────────────────
  recruiting: {
    label: 'Recrute', icon: Users,
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500',
    priority: 0,
  },
  event_soon: {
    label: 'Activité à venir', icon: CalendarCheck,
    bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500',
    priority: 0,
  },
  suspended: {
    label: 'Suspendu', icon: Pause,
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-400',
    priority: 3,
  },
  inactive: {
    label: 'Inactif', icon: EyeOff,
    bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', dot: 'bg-gray-300',
    priority: 3,
  },

  // ── Interactions / Échanges ───────────────────────────────────────────────
  requested: {
    label: 'Demande envoyée', icon: Clock,
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500',
    priority: 1,
  },
  accepted: {
    label: 'Accepté', icon: CheckCircle2,
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500',
    priority: 0,
  },
  rejected: {
    label: 'Refusé', icon: XCircle,
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-400',
    priority: 3,
  },
  done: {
    label: 'Terminé', icon: BadgeCheck,
    bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500',
    priority: 3,
  },
  disputed: {
    label: 'Litige', icon: AlertCircle,
    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500',
    priority: 2,
  },

  // ── Fallback ──────────────────────────────────────────────────────────────
  unknown: {
    label: 'Inconnu', icon: AlertCircle,
    bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200', dot: 'bg-gray-300',
    priority: 2,
  },
};

// ─── Helper : résoudre le statut affiché ──────────────────────────────────────
/**
 * Convertit un status brut en clé StatusConfig.
 * Ex: listing 'active' → 'active', outing terminé → 'completed', etc.
 */
export function resolveStatus(
  rawStatus: string,
  contentType?: 'listing' | 'equipment' | 'help_request' | 'outing' | 'event' | 'lost_found' | 'association' | 'borrow_request' | 'interaction',
  extra?: {
    isFull?: boolean;
    isAlmostFull?: boolean;
    eventDate?: string;         // ISO date string
    outingDate?: string;        // ISO date string
    lostFoundType?: 'perdu' | 'trouve';
    fillPct?: number;
  }
): string {
  const e = extra || {};

  // Promenades : statut calculé par date + remplissage
  if (contentType === 'outing') {
    const date = e.outingDate ? new Date(e.outingDate + 'T23:59:59') : null;
    if (date && date < new Date()) return 'completed';
    if (rawStatus === 'cancelled') return 'cancelled';
    if (e.isFull) return 'full';
    if (e.fillPct !== undefined && e.fillPct >= 70) return 'almost_full';
    return 'registration_open';
  }

  // Événements : statut calculé par date
  if (contentType === 'event') {
    const date = e.eventDate ? new Date(e.eventDate + 'T23:59:59') : null;
    if (rawStatus === 'cancelled') return 'cancelled';
    if (rawStatus === 'cancelled') return 'cancelled';
    if (e.isFull) return 'full';
    if (date && date < new Date()) return 'past';
    return 'upcoming';
  }

  // Perdu/Trouvé
  if (contentType === 'lost_found') {
    if (rawStatus === 'resolved') return 'returned_item';
    if (rawStatus === 'draft') return 'draft';
    return e.lostFoundType === 'trouve' ? 'found' : 'lost';
  }

  // Coups de main
  if (contentType === 'help_request') {
    if (rawStatus === 'paused') return 'paused';
    if (rawStatus === 'resolved') return 'resolved';
    if (rawStatus === 'draft') return 'draft';
    if (rawStatus === 'active') return 'open';
    return rawStatus;
  }

  // Matériel (borrow_request)
  if (contentType === 'borrow_request') {
    const map: Record<string, string> = {
      pending: 'pending', approved: 'approved', rejected: 'rejected',
      borrowed: 'borrowed', returned: 'returned', cancelled: 'cancelled',
    };
    return map[rawStatus] || 'unknown';
  }

  // Equipment item
  if (contentType === 'equipment') {
    return rawStatus === 'available' ? 'available' : rawStatus === 'unavailable' ? 'unavailable' : 'available';
  }

  // Associations
  if (contentType === 'association') {
    if (rawStatus === 'inactive') return 'inactive';
    if (rawStatus === 'draft') return 'draft';
    return 'active';
  }

  // Fallback : retourner rawStatus si connu, sinon 'unknown'
  return STATUS_CONFIG[rawStatus] ? rawStatus : 'unknown';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;                    // clé dans STATUS_CONFIG (ou rawStatus)
  contentType?: Parameters<typeof resolveStatus>[1];
  extra?: Parameters<typeof resolveStatus>[2];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;                 // point pulsé animé (uniquement status actif)
  variant?: 'filled' | 'outline' | 'dot-only';
  className?: string;
}

export default function StatusBadge({
  status,
  contentType,
  extra,
  size = 'sm',
  showIcon = true,
  showDot = false,
  variant = 'filled',
  className,
}: StatusBadgeProps) {
  const key    = resolveStatus(status, contentType, extra);
  const conf   = STATUS_CONFIG[key] || STATUS_CONFIG.unknown;
  const Icon   = conf.icon;
  const isActive = conf.priority === 0;

  const sizes = {
    xs: { badge: 'text-[10px] px-1.5 py-0.5', icon: 'w-2.5 h-2.5', dot: 'w-1.5 h-1.5' },
    sm: { badge: 'text-xs px-2 py-0.5',        icon: 'w-3 h-3',     dot: 'w-2 h-2'   },
    md: { badge: 'text-sm px-2.5 py-1',         icon: 'w-3.5 h-3.5', dot: 'w-2.5 h-2.5' },
    lg: { badge: 'text-base px-3 py-1.5',       icon: 'w-4 h-4',     dot: 'w-3 h-3'   },
  };

  const sz = sizes[size];

  if (variant === 'dot-only') {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <span className={cn('rounded-full flex-shrink-0', sz.dot, conf.dot, isActive && showDot && 'animate-pulse')} />
        <span className={cn('font-semibold', conf.text, sizes[size].badge.replace(/px-\S+ py-\S+ /, ''))}>{conf.label}</span>
      </span>
    );
  }

  if (variant === 'outline') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full border',
        conf.text, conf.border, sz.badge,
        className
      )}>
        {showDot && (
          <span className={cn('rounded-full flex-shrink-0', sz.dot, conf.dot, isActive && 'animate-pulse')} />
        )}
        {showIcon && <Icon className={cn(sz.icon, 'flex-shrink-0')} />}
        {conf.label}
      </span>
    );
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-semibold rounded-full border',
      conf.bg, conf.text, conf.border, sz.badge,
      className
    )}>
      {showDot && (
        <span className={cn('rounded-full flex-shrink-0', sz.dot, isActive && 'animate-pulse')} />
      )}
      {showIcon && <Icon className={cn(sz.icon, 'flex-shrink-0')} />}
      {conf.label}
    </span>
  );
}

// ─── Export utilitaire pour accès rapide au label/couleur ─────────────────────
export function getStatusConfig(
  rawStatus: string,
  contentType?: Parameters<typeof resolveStatus>[1],
  extra?: Parameters<typeof resolveStatus>[2]
) {
  const key = resolveStatus(rawStatus, contentType, extra);
  return STATUS_CONFIG[key] || STATUS_CONFIG.unknown;
}
