// EventCard — Carte événement / promenade moderne

import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Footprints } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import { cn } from '@/lib/utils';

function formatEventDate(dateStr: string) {
  const normalized = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
  const date = new Date(normalized);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const eventStart = new Date(normalized); eventStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((eventStart.getTime() - todayStart.getTime()) / 86400000);

  const day   = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date);

  let countdown = '';
  if (diffDays <= 0)       countdown = '🔥 Aujourd\'hui';
  else if (diffDays === 1) countdown = '⏰ Demain';
  else if (diffDays <= 7)  countdown = `Dans ${diffDays} jours`;
  else                     countdown = `${day} ${month}`;

  const isImminent = diffDays <= 1;
  const isSoon = diffDays <= 7;

  return { day, month, countdown, isImminent, isSoon };
}

export default function EventCard({ item, className }: { item: HomeFeedItem; className?: string }) {
  const isOuting = item.type === 'outing';
  const dateInfo = item.eventDate ? formatEventDate(item.eventDate) : null;

  // Gradient selon urgence temporelle
  const gradient = dateInfo?.isImminent
    ? 'from-red-500 to-orange-500'
    : dateInfo?.isSoon
    ? 'from-purple-500 to-violet-600'
    : 'from-blue-500 to-indigo-600';

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group block bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
    >
      {/* Header coloré */}
      <div className={cn('bg-gradient-to-r px-5 py-4 flex items-center gap-4', gradient)}>
        {/* Date */}
        {dateInfo && (
          <div className="flex-shrink-0 text-center bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 min-w-[52px]">
            <p className="text-2xl font-black text-white leading-none">{dateInfo.day}</p>
            <p className="text-xs font-bold text-white/80 uppercase tracking-wide">{dateInfo.month}</p>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Type */}
          <div className="flex items-center gap-1.5 mb-1">
            {isOuting
              ? <Footprints className="w-3.5 h-3.5 text-white/70" />
              : <Calendar className="w-3.5 h-3.5 text-white/70" />
            }
            <span className="text-xs font-bold text-white/70 uppercase tracking-wide">
              {isOuting ? 'Sortie' : 'Événement'}
            </span>
          </div>

          {/* Countdown */}
          {dateInfo && (
            <span className="text-sm font-black text-white">{dateInfo.countdown}</span>
          )}
        </div>

        {/* Badge si semaine */}
        {dateInfo?.isSoon && !dateInfo.isImminent && (
          <span className="text-xs font-bold text-white/90 bg-white/20 px-2.5 py-1 rounded-full flex-shrink-0">
            Cette semaine
          </span>
        )}
      </div>

      {/* Corps */}
      <div className="p-4">
        <h3 className="font-black text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-gray-700 transition-colors mb-2">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
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
          <span className="inline-flex items-center gap-1 text-xs font-black text-brand-600 group-hover:gap-2 transition-all ml-auto flex-shrink-0">
            {item.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
