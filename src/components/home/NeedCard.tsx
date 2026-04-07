// ─────────────────────────────────────────────────────────────────────────────
// NeedCard — Carte spécialisée pour les demandes d'aide (coups de main)
// Met l'emphase sur l'urgence, la localisation et l'action
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { MapPin, HandHeart, AlertCircle } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

const URGENCY_CONFIG = {
  high: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-700',
    dot: 'bg-red-500 animate-pulse',
    label: 'Urgent',
  },
  medium: {
    border: 'border-orange-200',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
    label: 'Cette semaine',
  },
  low: {
    border: 'border-gray-200',
    bg: 'bg-white',
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
    label: 'Quand vous pouvez',
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
        'group flex items-start gap-3 p-4 rounded-2xl border bg-white transition-all hover:shadow-md hover:-translate-y-0.5',
        cfg.border,
        className
      )}
    >
      {/* Icône */}
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bg)}>
        <HandHeart className={cn('w-5 h-5', item.isUrgent ? 'text-red-500' : 'text-orange-500')} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        {/* Badges urgence + fraîcheur */}
        <div className="flex items-center gap-2 mb-1.5">
          {item.isUrgent && (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              Urgent
            </span>
          )}
          {!item.isUrgent && (
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.badge)}>
              {cfg.label}
            </span>
          )}
          <FreshnessIndicator createdAt={item.createdAt} showIcon={false} />
        </div>

        {/* Titre */}
        <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {item.title}
        </h3>

        {/* Résumé */}
        {item.summary && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {item.summary}
          </p>
        )}

        {/* Localisation + auteur */}
        <div className="flex items-center gap-2 mt-2">
          {item.locationLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {item.locationLabel}
            </span>
          )}
          {item.author && (
            <span className="text-xs text-gray-400 truncate">
              · {item.author.name}
            </span>
          )}
        </div>
      </div>

      {/* Indicateur droite */}
      <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', cfg.dot)} />
    </Link>
  );
}
