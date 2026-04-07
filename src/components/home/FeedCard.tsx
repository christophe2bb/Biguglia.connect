// ─────────────────────────────────────────────────────────────────────────────
// FeedCard — Carte universelle pour HomeFeedItem
// Affiche : type badge, titre, summary, localisation, fraîcheur, auteur, CTA
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { MapPin, ArrowRight, AlertCircle } from 'lucide-react';
import type { HomeFeedItem, HomeFeedItemType } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

// ─── Config par type ─────────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  emoji: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
}

const TYPE_CONFIG: Record<HomeFeedItemType, TypeConfig> = {
  help_request: {
    label: 'Coup de main',
    emoji: '🤝',
    badgeClass: 'bg-orange-100 text-orange-700',
    borderClass: 'border-orange-100 hover:border-orange-200',
    dotClass: 'bg-orange-500',
  },
  event: {
    label: 'Événement',
    emoji: '🎉',
    badgeClass: 'bg-purple-100 text-purple-700',
    borderClass: 'border-purple-100 hover:border-purple-200',
    dotClass: 'bg-purple-500',
  },
  forum_topic: {
    label: 'Forum',
    emoji: '💬',
    badgeClass: 'bg-sky-100 text-sky-700',
    borderClass: 'border-sky-100 hover:border-sky-200',
    dotClass: 'bg-sky-500',
  },
  lost_found: {
    label: 'Perdu / Trouvé',
    emoji: '🔍',
    badgeClass: 'bg-rose-100 text-rose-700',
    borderClass: 'border-rose-100 hover:border-rose-200',
    dotClass: 'bg-rose-500',
  },
  listing: {
    label: 'Annonce',
    emoji: '📦',
    badgeClass: 'bg-blue-100 text-blue-700',
    borderClass: 'border-blue-100 hover:border-blue-200',
    dotClass: 'bg-blue-500',
  },
  outing: {
    label: 'Sortie',
    emoji: '🥾',
    badgeClass: 'bg-teal-100 text-teal-700',
    borderClass: 'border-teal-100 hover:border-teal-200',
    dotClass: 'bg-teal-500',
  },
  equipment: {
    label: 'Matériel',
    emoji: '🛠️',
    badgeClass: 'bg-amber-100 text-amber-700',
    borderClass: 'border-amber-100 hover:border-amber-200',
    dotClass: 'bg-amber-500',
  },
  association: {
    label: 'Association',
    emoji: '🏛️',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    borderClass: 'border-emerald-100 hover:border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
};

// ─── Composant ────────────────────────────────────────────────────────────────

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
        'group block bg-white border rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5',
        cfg.borderClass,
        className
      )}
    >
      {/* Header : type + fraîcheur */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full', cfg.badgeClass)}>
          <span>{cfg.emoji}</span>
          {cfg.label}
        </span>
        <FreshnessIndicator createdAt={item.createdAt} />
      </div>

      {/* Titre */}
      <h3 className={cn(
        'font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors',
        compact ? 'text-sm' : 'text-base'
      )}>
        {item.isUrgent && (
          <AlertCircle className="inline w-4 h-4 text-red-500 mr-1 flex-shrink-0 align-text-bottom" />
        )}
        {item.title}
      </h3>

      {/* Résumé */}
      {!compact && item.summary && (
        <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
          {item.summary}
        </p>
      )}

      {/* Badges */}
      {item.badges && item.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {item.badges.map(b => (
            <span key={b} className="inline-flex items-center text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Footer : localisation + auteur + CTA */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          {item.locationLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.locationLabel}</span>
            </span>
          )}
          {item.author && !compact && (
            <span className="text-xs text-gray-400 truncate hidden sm:inline">
              · {item.author.name}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:gap-2 transition-all flex-shrink-0">
          {item.actionLabel}
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
