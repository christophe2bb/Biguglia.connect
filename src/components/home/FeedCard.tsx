// ─────────────────────────────────────────────────────────────────────────────
// FeedCard — Carte universelle pour HomeFeedItem — design coloré et accrocheur
// Barre colorée en haut + badge type + titre + résumé + footer
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import Link from 'next/link';
import { MapPin, ArrowRight, AlertCircle } from 'lucide-react';
import type { HomeFeedItem, HomeFeedItemType } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

// ─── Config par type ─────────────────────────────────────────────────────────

interface TypeConfig {
  label: string;
  emoji: string;
  topBar: string;        // couleur de la barre top
  badgeClass: string;
  badgeDot: string;      // couleur du point live
  hoverBorder: string;
  ctaColor: string;
}

const TYPE_CONFIG: Record<HomeFeedItemType, TypeConfig> = {
  help_request: {
    label: 'Coup de main',
    emoji: '🤝',
    topBar: 'bg-gradient-to-r from-orange-400 to-amber-500',
    badgeClass: 'bg-orange-100 text-orange-700 border border-orange-200',
    badgeDot: 'bg-orange-500',
    hoverBorder: 'hover:border-orange-300',
    ctaColor: 'text-orange-600 group-hover:text-orange-700',
  },
  event: {
    label: 'Événement',
    emoji: '🎉',
    topBar: 'bg-gradient-to-r from-violet-500 to-purple-600',
    badgeClass: 'bg-violet-100 text-violet-700 border border-violet-200',
    badgeDot: 'bg-violet-500',
    hoverBorder: 'hover:border-violet-300',
    ctaColor: 'text-violet-600 group-hover:text-violet-700',
  },
  forum_topic: {
    label: 'Forum',
    emoji: '💬',
    topBar: 'bg-gradient-to-r from-sky-400 to-blue-500',
    badgeClass: 'bg-sky-100 text-sky-700 border border-sky-200',
    badgeDot: 'bg-sky-500',
    hoverBorder: 'hover:border-sky-300',
    ctaColor: 'text-sky-600 group-hover:text-sky-700',
  },
  lost_found: {
    label: 'Perdu / Trouvé',
    emoji: '🔍',
    topBar: 'bg-gradient-to-r from-rose-400 to-pink-500',
    badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
    badgeDot: 'bg-rose-500',
    hoverBorder: 'hover:border-rose-300',
    ctaColor: 'text-rose-600 group-hover:text-rose-700',
  },
  listing: {
    label: 'Annonce',
    emoji: '📦',
    topBar: 'bg-gradient-to-r from-blue-400 to-indigo-500',
    badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
    badgeDot: 'bg-blue-500',
    hoverBorder: 'hover:border-blue-300',
    ctaColor: 'text-blue-600 group-hover:text-blue-700',
  },
  outing: {
    label: 'Sortie',
    emoji: '🥾',
    topBar: 'bg-gradient-to-r from-teal-400 to-emerald-500',
    badgeClass: 'bg-teal-100 text-teal-700 border border-teal-200',
    badgeDot: 'bg-teal-500',
    hoverBorder: 'hover:border-teal-300',
    ctaColor: 'text-teal-600 group-hover:text-teal-700',
  },
  equipment: {
    label: 'Matériel',
    emoji: '🛠️',
    topBar: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
    badgeDot: 'bg-amber-500',
    hoverBorder: 'hover:border-amber-300',
    ctaColor: 'text-amber-600 group-hover:text-amber-700',
  },
  association: {
    label: 'Association',
    emoji: '🏛️',
    topBar: 'bg-gradient-to-r from-emerald-500 to-green-600',
    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    badgeDot: 'bg-emerald-500',
    hoverBorder: 'hover:border-emerald-300',
    ctaColor: 'text-emerald-600 group-hover:text-emerald-700',
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
        'group block bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5',
        cfg.hoverBorder,
        className
      )}
    >
      {/* Barre colorée en haut */}
      <div className={cn('h-1.5 w-full', cfg.topBar)} />

      <div className="p-4">
        {/* Header : badge type + fraîcheur */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full',
            cfg.badgeClass
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.badgeDot)} />
            <span>{cfg.emoji}</span>
            {cfg.label}
          </span>
          <FreshnessIndicator createdAt={item.createdAt} />
        </div>

        {/* Titre */}
        <h3 className={cn(
          'font-black text-gray-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors mb-1.5',
          compact ? 'text-sm' : 'text-[15px]'
        )}>
          {item.isUrgent && (
            <AlertCircle className="inline w-4 h-4 text-red-500 mr-1 flex-shrink-0 align-text-bottom" />
          )}
          {item.title}
        </h3>

        {/* Résumé */}
        {!compact && item.summary && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-3">
            {item.summary}
          </p>
        )}

        {/* Badges optionnels */}
        {item.badges && item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {item.badges.map(b => (
              <span key={b} className="inline-flex items-center text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Footer : localisation + auteur + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            {item.locationLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0 text-gray-300" />
                <span className="truncate">{item.locationLabel}</span>
              </span>
            )}
            {item.author && !compact && (
              <span className="text-xs text-gray-400 truncate hidden sm:inline">
                · {item.author.name}
              </span>
            )}
          </div>
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-black group-hover:gap-2 transition-all flex-shrink-0',
            cfg.ctaColor
          )}>
            {item.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
