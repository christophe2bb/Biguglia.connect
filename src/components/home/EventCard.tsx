// ─────────────────────────────────────────────────────────────────────────────
// EventCard — Carte spécialisée pour les événements et promenades
// Met l'emphase sur la date, le lieu et le compte à rebours
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Footprints } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import { cn } from '@/lib/utils';

function formatEventDate(dateStr: string): { day: string; month: string; time: string; countdown: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date);
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);

  let countdown = '';
  if (diffDays === 0) countdown = 'Aujourd\'hui';
  else if (diffDays === 1) countdown = 'Demain';
  else if (diffDays <= 7) countdown = `Dans ${diffDays} jours`;
  else countdown = `${day} ${month}`;

  return { day, month, time, countdown };
}

interface EventCardProps {
  item: HomeFeedItem;
  className?: string;
}

export default function EventCard({ item, className }: EventCardProps) {
  const isOuting = item.type === 'outing';
  const dateInfo = item.eventDate ? formatEventDate(item.eventDate) : null;

  const urgencyColor = item.urgency === 'high'
    ? 'from-orange-500 to-red-500'
    : item.urgency === 'medium'
    ? 'from-purple-500 to-indigo-600'
    : 'from-teal-500 to-emerald-600';

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group block bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      {/* Bande colorée + date */}
      <div className={cn('flex items-center gap-4 px-4 py-3 bg-gradient-to-r', urgencyColor)}>
        {dateInfo && (
          <div className="flex-shrink-0 text-center bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 min-w-[52px]">
            <p className="text-xl font-black text-white leading-none">{dateInfo.day}</p>
            <p className="text-xs font-bold text-white/80 uppercase">{dateInfo.month}</p>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isOuting
              ? <Footprints className="w-3.5 h-3.5 text-white/80" />
              : <Calendar className="w-3.5 h-3.5 text-white/80" />
            }
            <span className="text-xs font-bold text-white/80">{isOuting ? 'Sortie' : 'Événement'}</span>
          </div>
          {dateInfo && (
            <span className="text-sm font-black text-white">{dateInfo.countdown}</span>
          )}
        </div>
        {/* Badges */}
        {item.badges && item.badges.length > 0 && (
          <span className="text-xs font-bold text-white/90 bg-white/20 px-2 py-1 rounded-full flex-shrink-0">
            {item.badges[0]}
          </span>
        )}
      </div>

      {/* Corps */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors mb-2">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {item.summary}
          </p>
        )}

        <div className="flex items-center justify-between">
          {item.locationLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate max-w-[140px]">{item.locationLabel}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:gap-2 transition-all ml-auto flex-shrink-0">
            {item.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
