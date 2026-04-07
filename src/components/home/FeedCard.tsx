// FeedCard — Carte universelle moderne avec accent couleur par type

import Link from 'next/link';
import { ArrowRight, AlertCircle, MapPin } from 'lucide-react';
import type { HomeFeedItem, HomeFeedItemType } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

interface TypeConfig {
  label: string;
  emoji: string;
  accent: string;   // gradient barre top
  pill: string;     // badge bg+text
  arrow: string;    // couleur flèche
}

const TYPE_CONFIG: Record<HomeFeedItemType, TypeConfig> = {
  help_request: {
    label: 'Coup de main', emoji: '🤝',
    accent: 'from-orange-500 to-red-500',
    pill: 'bg-orange-100 text-orange-700',
    arrow: 'text-orange-600',
  },
  event: {
    label: 'Événement', emoji: '🎉',
    accent: 'from-purple-500 to-violet-600',
    pill: 'bg-purple-100 text-purple-700',
    arrow: 'text-purple-600',
  },
  forum_topic: {
    label: 'Forum', emoji: '💬',
    accent: 'from-sky-500 to-blue-600',
    pill: 'bg-sky-100 text-sky-700',
    arrow: 'text-sky-600',
  },
  lost_found: {
    label: 'Perdu / Trouvé', emoji: '🔍',
    accent: 'from-rose-500 to-pink-600',
    pill: 'bg-rose-100 text-rose-700',
    arrow: 'text-rose-600',
  },
  listing: {
    label: 'Annonce', emoji: '📦',
    accent: 'from-blue-500 to-indigo-600',
    pill: 'bg-blue-100 text-blue-700',
    arrow: 'text-blue-600',
  },
  outing: {
    label: 'Sortie', emoji: '🥾',
    accent: 'from-teal-500 to-emerald-600',
    pill: 'bg-teal-100 text-teal-700',
    arrow: 'text-teal-600',
  },
  equipment: {
    label: 'Matériel', emoji: '🛠️',
    accent: 'from-amber-500 to-yellow-600',
    pill: 'bg-amber-100 text-amber-700',
    arrow: 'text-amber-600',
  },
  association: {
    label: 'Association', emoji: '🏛️',
    accent: 'from-emerald-500 to-green-600',
    pill: 'bg-emerald-100 text-emerald-700',
    arrow: 'text-emerald-600',
  },
};

interface FeedCardProps {
  item: HomeFeedItem;
  compact?: boolean;
  className?: string;
}

export default function FeedCard({ item, compact = false, className }: FeedCardProps) {
  const cfg = TYPE_CONFIG[item.type];

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group block bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-200',
        className
      )}
    >
      {/* Barre couleur top */}
      <div className={cn('h-1 bg-gradient-to-r', cfg.accent)} />

      <div className="p-4">
        {/* Header : type + fraîcheur */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={cn('inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full', cfg.pill)}>
            <span className="text-sm leading-none">{cfg.emoji}</span>
            {cfg.label}
          </span>
          <FreshnessIndicator createdAt={item.createdAt} />
        </div>

        {/* Urgent */}
        {item.isUrgent && (
          <div className="flex items-center gap-1 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-black text-red-600">Urgent</span>
          </div>
        )}

        {/* Titre */}
        <h3 className={cn(
          'font-black text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors',
          compact ? 'text-sm' : 'text-base'
        )}>
          {item.title}
        </h3>

        {/* Résumé */}
        {!compact && item.summary && (
          <p className="text-sm text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
            {item.summary}
          </p>
        )}

        {/* Badges */}
        {item.badges && item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {item.badges.map(b => (
              <span key={b} className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5 min-w-0 text-xs text-gray-400">
            {item.locationLabel && (
              <>
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[120px]">{item.locationLabel}</span>
              </>
            )}
            {item.author && !compact && (
              <span className="truncate hidden sm:inline">· {item.author.name}</span>
            )}
          </div>
          <span className={cn('inline-flex items-center gap-1 text-xs font-black group-hover:gap-2 transition-all flex-shrink-0', cfg.arrow)}>
            {item.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
