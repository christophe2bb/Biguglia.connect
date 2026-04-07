// DiscussionCard — Carte forum moderne

import Link from 'next/link';
import { MessageSquare, ArrowRight, TrendingUp } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

export default function DiscussionCard({ item, className }: { item: HomeFeedItem; className?: string }) {
  const replyCount = (item.metadata?.replyCount as number) ?? 0;
  const isHot = replyCount >= 5;
  const isActive = replyCount >= 2;

  const accent = isHot ? 'from-red-500 to-orange-500' : isActive ? 'from-sky-500 to-blue-600' : 'from-gray-300 to-gray-400';
  const iconBg  = isHot ? 'bg-red-50'  : isActive ? 'bg-sky-50'  : 'bg-gray-50';
  const iconClr = isHot ? 'text-red-500' : isActive ? 'text-sky-500' : 'text-gray-400';
  const pillClr = isHot ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700';

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group block bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
    >
      {/* Barre top */}
      <div className={cn('h-1 bg-gradient-to-r', accent)} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icône avec compteur */}
          <div className="relative flex-shrink-0">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
              <MessageSquare className={cn('w-5 h-5', iconClr)} />
            </div>
            {replyCount > 0 && (
              <span className={cn(
                'absolute -top-1.5 -right-1.5 text-xs font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-white px-1',
                isHot ? 'bg-red-500' : 'bg-sky-500'
              )}>
                {replyCount > 99 ? '99+' : replyCount}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Méta */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {isHot && (
                <span className={cn('inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full', pillClr)}>
                  <TrendingUp className="w-3 h-3" />
                  Populaire
                </span>
              )}
              {!isHot && isActive && (
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', pillClr)}>
                  Actif
                </span>
              )}
              <FreshnessIndicator createdAt={item.updatedAt ?? item.createdAt} showIcon={false} />
            </div>

            {/* Titre */}
            <h3 className="font-black text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors">
              {item.title}
            </h3>

            {/* Résumé */}
            {item.summary && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-1 leading-relaxed">
                {item.summary}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-2.5">
              {item.author && (
                <span className="text-xs text-gray-400 truncate">par {item.author.name}</span>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-black text-sky-600 group-hover:gap-2 transition-all ml-auto flex-shrink-0">
                Lire
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
