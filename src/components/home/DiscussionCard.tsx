// ─────────────────────────────────────────────────────────────────────────────
// DiscussionCard — Carte spécialisée pour les sujets du forum
// Design coloré : barre top bleue, compteur réponses mis en avant, badge actif
// ─────────────────────────────────────────────────────────────────────────────


import Link from 'next/link';
import { MessageSquare, ArrowRight, MapPin, TrendingUp } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

interface DiscussionCardProps {
  item: HomeFeedItem;
  className?: string;
}

export default function DiscussionCard({ item, className }: DiscussionCardProps) {
  const replyCount = (item.metadata?.replyCount as number) ?? 0;
  const isHot   = replyCount >= 10;
  const isActive = replyCount >= 3;

  const topBarColor = isHot
    ? 'bg-gradient-to-r from-orange-400 to-red-500'
    : isActive
    ? 'bg-gradient-to-r from-sky-400 to-blue-500'
    : 'bg-gradient-to-r from-gray-200 to-gray-300';

  const iconBg   = isHot ? 'bg-orange-100' : isActive ? 'bg-sky-100' : 'bg-gray-100';
  const iconColor = isHot ? 'text-orange-600' : isActive ? 'text-sky-600' : 'text-gray-400';
  const badgeStyle = isHot
    ? 'bg-orange-100 text-orange-700 border border-orange-200'
    : isActive
    ? 'bg-sky-100 text-sky-700 border border-sky-200'
    : 'bg-gray-100 text-gray-500 border border-gray-200';
  const countBg  = isHot ? 'bg-orange-500' : isActive ? 'bg-sky-500' : 'bg-gray-400';
  const hoverBorder = isHot ? 'hover:border-orange-200' : isActive ? 'hover:border-sky-200' : 'hover:border-gray-200';

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group block bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5',
        hoverBorder,
        className
      )}
    >
      {/* Barre colorée en haut */}
      <div className={cn('h-1.5 w-full', topBarColor)} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icône + compteur réponses */}
          <div className={cn(
            'relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm',
            iconBg
          )}>
            {isHot
              ? <TrendingUp className={cn('w-5 h-5', iconColor)} />
              : <MessageSquare className={cn('w-5 h-5', iconColor)} />
            }
            {replyCount > 0 && (
              <span className={cn(
                'absolute -top-1.5 -right-1.5 text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-white px-1 shadow',
                countBg
              )}>
                {replyCount > 99 ? '99+' : replyCount}
              </span>
            )}
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {/* Badges méta */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isHot && (
                <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full', badgeStyle)}>
                  🔥 Trending
                </span>
              )}
              {!isHot && isActive && (
                <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full', badgeStyle)}>
                  💬 Actif
                </span>
              )}
              {!isHot && !isActive && (
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', badgeStyle)}>
                  Forum
                </span>
              )}
              <FreshnessIndicator
                createdAt={item.updatedAt ?? item.createdAt}
                showIcon={false}
              />
            </div>

            {/* Titre */}
            <h3 className={cn(
              'font-black text-[15px] text-gray-900 leading-snug line-clamp-2 transition-colors mb-1',
              isHot ? 'group-hover:text-orange-700' : 'group-hover:text-sky-700'
            )}>
              {item.title}
            </h3>

            {/* Résumé */}
            {item.summary && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 leading-relaxed">
                {item.summary}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
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
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-black group-hover:gap-2 transition-all flex-shrink-0',
            isHot ? 'text-orange-600' : 'text-sky-600'
          )}>
            Lire
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
