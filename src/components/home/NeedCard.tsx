// ─────────────────────────────────────────────────────────────────────────────
// NeedCard — Carte spécialisée pour les demandes d'aide (coups de main)
// Design coloré : accent fort sur l'urgence, barre gauche colorée
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import Link from 'next/link';
import { MapPin, HandHeart, AlertCircle, Clock } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

const URGENCY_CONFIG = {
  high: {
    borderLeft:  'border-l-4 border-l-red-500',
    iconBg:      'bg-red-100',
    iconColor:   'text-red-600',
    badge:       'bg-red-100 text-red-700 border border-red-200',
    label:       '🚨 Urgent',
    dot:         'bg-red-500 animate-pulse',
    titleColor:  'group-hover:text-red-700',
    ctaColor:    'text-red-600',
  },
  medium: {
    borderLeft:  'border-l-4 border-l-orange-400',
    iconBg:      'bg-orange-100',
    iconColor:   'text-orange-600',
    badge:       'bg-orange-100 text-orange-700 border border-orange-200',
    label:       '⏰ Cette semaine',
    dot:         'bg-orange-500',
    titleColor:  'group-hover:text-orange-700',
    ctaColor:    'text-orange-600',
  },
  low: {
    borderLeft:  'border-l-4 border-l-teal-400',
    iconBg:      'bg-teal-50',
    iconColor:   'text-teal-600',
    badge:       'bg-teal-100 text-teal-700 border border-teal-200',
    label:       '🤝 Quand vous pouvez',
    dot:         'bg-teal-400',
    titleColor:  'group-hover:text-teal-700',
    ctaColor:    'text-teal-600',
  },
};

interface NeedCardProps {
  item: HomeFeedItem;
  className?: string;
}

export default function NeedCard({ item, className }: NeedCardProps) {
  const cfg = URGENCY_CONFIG[item.urgency];

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group flex items-start gap-3.5 p-4 rounded-2xl border border-gray-100 bg-white transition-all hover:shadow-lg hover:-translate-y-0.5',
        cfg.borderLeft,
        className
      )}
    >
      {/* Icône urgence */}
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm',
        cfg.iconBg
      )}>
        {item.isUrgent
          ? <AlertCircle className={cn('w-5 h-5', cfg.iconColor)} />
          : <HandHeart className={cn('w-5 h-5', cfg.iconColor)} />
        }
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full', cfg.badge)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
          <FreshnessIndicator createdAt={item.createdAt} showIcon={false} />
        </div>

        {/* Titre */}
        <h3 className={cn(
          'font-black text-[15px] text-gray-900 leading-snug line-clamp-2 transition-colors mb-1',
          cfg.titleColor
        )}>
          {item.title}
        </h3>

        {/* Résumé */}
        {item.summary && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
            {item.summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            {item.locationLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3 flex-shrink-0 text-gray-300" />
                <span className="truncate max-w-[100px]">{item.locationLabel}</span>
              </span>
            )}
            {item.author && (
              <span className="text-xs text-gray-400 truncate hidden sm:inline">
                · {item.author.name}
              </span>
            )}
          </div>
          <span className={cn('text-xs font-black flex-shrink-0', cfg.ctaColor)}>
            Aider →
          </span>
        </div>
      </div>
    </Link>
  );
}
