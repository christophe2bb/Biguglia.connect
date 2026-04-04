'use client';

/**
 * ModerationBadge — Badge de statut de modération pour les auteurs
 *
 * Affiche de manière transparente et rassurante le statut de modération
 * d'une publication depuis le point de vue de l'auteur.
 */

import { cn } from '@/lib/utils';
import {
  Clock, CheckCircle2, AlertTriangle, XCircle, Archive,
  Pencil, ShieldOff, Info,
} from 'lucide-react';
import type { ModerationStatus } from '@/lib/moderation';

// ─── Config des statuts ───────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ModerationStatus, {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  dot?: string;
}> = {
  brouillon: {
    label: 'Brouillon',
    sublabel: 'Non soumis',
    icon: Pencil,
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
  },
  en_attente_validation: {
    label: 'En attente de validation',
    sublabel: 'Nous relisons votre publication',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
  },
  a_corriger: {
    label: 'Corrections demandées',
    sublabel: 'Modifiez et resoumettez',
    icon: AlertTriangle,
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  refuse: {
    label: 'Refusée',
    sublabel: 'Non publiée',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  publie: {
    label: 'Publiée',
    sublabel: 'Visible par tous',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-400',
  },
  archive: {
    label: 'Archivée',
    sublabel: 'Masquée',
    icon: Archive,
    bg: 'bg-gray-50',
    text: 'text-gray-400',
    border: 'border-gray-200',
  },
  supprime_moderation: {
    label: 'Supprimée',
    sublabel: 'Retirée par la modération',
    icon: ShieldOff,
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface ModerationBadgeProps {
  status: ModerationStatus | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showSublabel?: boolean;
  showDot?: boolean;
  showInfo?: boolean;
  reason?: string;       // motif de refus ou correction
  className?: string;
  variant?: 'filled' | 'outline';
}

export default function ModerationBadge({
  status,
  size = 'sm',
  showSublabel = false,
  showDot = true,
  showInfo = false,
  reason,
  className,
  variant = 'filled',
}: ModerationBadgeProps) {
  const key = (status in STATUS_CONFIG ? status : 'brouillon') as ModerationStatus;
  const conf = STATUS_CONFIG[key];
  const Icon = conf.icon;

  const sizes = {
    xs: { badge: 'text-[10px] px-1.5 py-0.5 gap-1', icon: 'w-2.5 h-2.5', dot: 'w-1.5 h-1.5' },
    sm: { badge: 'text-xs px-2 py-0.5 gap-1',        icon: 'w-3 h-3',     dot: 'w-2 h-2'   },
    md: { badge: 'text-sm px-2.5 py-1 gap-1.5',       icon: 'w-3.5 h-3.5', dot: 'w-2 h-2'   },
    lg: { badge: 'text-base px-3 py-1.5 gap-2',       icon: 'w-4 h-4',     dot: 'w-2.5 h-2.5' },
  };
  const sz = sizes[size];

  const isActive = key === 'en_attente_validation' || key === 'publie' || key === 'a_corriger';

  if (showSublabel) {
    return (
      <div className={cn(
        'flex flex-col gap-0.5 rounded-xl border p-3',
        conf.bg, conf.border, className
      )}>
        <div className={cn('flex items-center gap-2 font-semibold', conf.text)}>
          {showDot && conf.dot && (
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', conf.dot, isActive && 'animate-pulse')} />
          )}
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span>{conf.label}</span>
        </div>
        <p className={cn('text-xs opacity-75 pl-6', conf.text)}>{conf.sublabel}</p>
        {reason && (
          <div className={cn('mt-2 flex items-start gap-1.5 text-xs', conf.text)}>
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="opacity-90">{reason}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <span className={cn(
      'inline-flex items-center font-semibold rounded-full border',
      conf.text,
      variant === 'filled' ? cn(conf.bg, conf.border) : conf.border,
      sz.badge,
      className
    )}>
      {showDot && conf.dot && (
        <span className={cn('rounded-full flex-shrink-0', sz.dot, conf.dot, isActive && 'animate-pulse')} />
      )}
      <Icon className={cn(sz.icon, 'flex-shrink-0')} />
      {conf.label}
      {showInfo && reason && (
        <Info className={cn(sz.icon, 'flex-shrink-0 ml-0.5 opacity-60')} />
      )}
    </span>
  );
}

// ─── Export utilitaire ────────────────────────────────────────────────────────
export function getModerationStatusConfig(status: string) {
  const key = (status in STATUS_CONFIG ? status : 'brouillon') as ModerationStatus;
  return STATUS_CONFIG[key];
}

export { STATUS_CONFIG as MODERATION_STATUS_CONFIG };
