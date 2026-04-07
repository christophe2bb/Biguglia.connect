// NeedCard — Carte coup de main moderne

import Link from 'next/link';
import { MapPin, HandHeart, Zap } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

const URGENCY = {
  high: {
    gradient: 'from-red-500 to-orange-500',
    pill: 'bg-red-100 text-red-700',
    icon: 'text-red-500',
    label: '🔴 Urgent',
  },
  medium: {
    gradient: 'from-orange-500 to-amber-500',
    pill: 'bg-orange-100 text-orange-700',
    icon: 'text-orange-500',
    label: '🟡 Cette semaine',
  },
  low: {
    gradient: 'from-gray-400 to-gray-500',
    pill: 'bg-gray-100 text-gray-600',
    icon: 'text-gray-400',
    label: 'Quand vous pouvez',
  },
};

export default function NeedCard({ item, className }: { item: HomeFeedItem; className?: string }) {
  const cfg = URGENCY[item.urgency];

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group block bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
    >
      {/* Barre gradient urgence */}
      <div className={cn('h-1 bg-gradient-to-r', cfg.gradient)} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icône ronde */}
          <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', cfg.gradient)}>
            {item.isUrgent
              ? <Zap className="w-5 h-5 text-white" />
              : <HandHeart className="w-5 h-5 text-white" />
            }
          </div>

          <div className="flex-1 min-w-0">
            {/* Pills */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={cn('text-xs font-black px-2 py-0.5 rounded-full', cfg.pill)}>
                {cfg.label}
              </span>
              <FreshnessIndicator createdAt={item.createdAt} showIcon={false} />
            </div>

            {/* Titre */}
            <h3 className="font-black text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors">
              {item.title}
            </h3>

            {/* Résumé */}
            {item.summary && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                {item.summary}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 mt-2.5">
              {item.locationLabel && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {item.locationLabel}
                </span>
              )}
              {item.author && (
                <span className="text-xs text-gray-400 truncate">· {item.author.name}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
