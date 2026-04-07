// ─────────────────────────────────────────────────────────────────────────────
// DiscussionCard — Carte spécialisée pour les sujets du forum
// Met l'emphase sur le titre, les réponses et l'activité récente
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { MessageSquare, ArrowRight, MapPin } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import FreshnessIndicator from './FreshnessIndicator';
import { cn } from '@/lib/utils';

interface DiscussionCardProps {
  item: HomeFeedItem;
  className?: string;
}

export default function DiscussionCard({ item, className }: DiscussionCardProps) {
  const replyCount = (item.metadata?.replyCount as number) ?? 0;
  const isActive = replyCount >= 3;

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group flex items-start gap-3 p-4 rounded-2xl border bg-white transition-all hover:shadow-md hover:-translate-y-0.5',
        isActive ? 'border-sky-200' : 'border-gray-100',
        className
      )}
    >
      {/* Icône réponses */}
      <div className={cn(
        'relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
        isActive ? 'bg-sky-50' : 'bg-gray-50'
      )}>
        <MessageSquare className={cn('w-5 h-5', isActive ? 'text-sky-500' : 'text-gray-400')} />
        {replyCount > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 text-xs font-black rounded-full w-4.5 h-4.5 min-w-[18px] flex items-center justify-center text-white px-1',
            isActive ? 'bg-sky-500' : 'bg-gray-400'
          )}>
            {replyCount > 99 ? '99+' : replyCount}
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        {/* Méta */}
        <div className="flex items-center gap-2 mb-1.5">
          {isActive && (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
              🔥 Actif
            </span>
          )}
          <FreshnessIndicator
            createdAt={item.updatedAt ?? item.createdAt}
            showIcon={false}
          />
        </div>

        {/* Titre */}
        <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {item.title}
        </h3>

        {/* Résumé */}
        {item.summary && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {item.summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {item.locationLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {item.locationLabel}
              </span>
            )}
            {item.author && (
              <span className="text-xs text-gray-400 truncate hidden sm:inline">
                · {item.author.name}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:gap-2 transition-all flex-shrink-0">
            Lire
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
