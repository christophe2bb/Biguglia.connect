// ─────────────────────────────────────────────────────────────────────────────
// EventCard — Carte spécialisée pour les événements et promenades
// Design fort : grande date en bandeau coloré, compte à rebours mis en avant
// IMPORTANT: 'use client' obligatoire — new Date() cause un hydration mismatch
// ─────────────────────────────────────────────────────────────────────────────



'use client';

import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Footprints } from 'lucide-react';
import type { HomeFeedItem } from '@/services/home/types';
import { cn } from '@/lib/utils';

function formatEventDate(dateStr: string): {
  day: string;
  month: string;
  countdown: string;
  isToday: boolean;
  isTomorrow: boolean;
  isSoon: boolean;
} {
  const normalized = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00';
  const date = new Date(normalized);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const eventStart = new Date(normalized);
  eventStart.setHours(0, 0, 0, 0);

  const diffDays = Math.round((eventStart.getTime() - todayStart.getTime()) / 86400000);

  const day   = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(date);
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date);

  let countdown = '';
  if (diffDays <= 0)        countdown = "Aujourd'hui !";
  else if (diffDays === 1)  countdown = 'Demain';
  else if (diffDays <= 7)   countdown = `Dans ${diffDays} jours`;
  else                       countdown = `Le ${day} ${month}`;

  return {
    day,
    month,
    countdown,
    isToday:   diffDays <= 0,
    isTomorrow: diffDays === 1,
    isSoon:    diffDays <= 3,
  };
}

interface EventCardProps {
  item: HomeFeedItem;
  className?: string;
}

export default function EventCard({ item, className }: EventCardProps) {
  const isOuting = item.type === 'outing';
  const dateInfo = item.eventDate ? formatEventDate(item.eventDate) : null;

  // Dégradé selon urgence / proximité
  const bannerGradient =
    dateInfo?.isToday   ? 'from-red-500 via-orange-500 to-amber-500' :
    dateInfo?.isSoon    ? 'from-violet-600 via-purple-600 to-indigo-500' :
    isOuting            ? 'from-teal-500 via-emerald-500 to-green-600' :
                          'from-indigo-500 via-blue-600 to-violet-600';

  return (
    <Link
      href={item.actionUrl}
      className={cn(
        'group block bg-white border border-gray-100 rounded-2xl overflow-hidden transition-[color,border-color,box-shadow,transform] hover:shadow-lg hover:-translate-y-0.5',
        dateInfo?.isToday ? 'hover:border-orange-200' :
        isOuting ? 'hover:border-teal-200' : 'hover:border-violet-200',
        className
      )}
    >
      {/* Bandeau date coloré */}
      <div className={cn('relative flex items-stretch bg-gradient-to-r', bannerGradient)}>

        {/* Bloc date */}
        {dateInfo && (
          <div className="flex flex-col items-center justify-center px-5 py-3.5 bg-black/10 min-w-[72px]">
            <span className="text-3xl font-black text-white leading-none">{dateInfo.day}</span>
            <span className="text-xs font-bold text-white/80 uppercase tracking-wider mt-0.5">{dateInfo.month}</span>
          </div>
        )}

        {/* Infos droite */}
        <div className="flex-1 px-4 py-3 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            {isOuting
              ? <Footprints className="w-3.5 h-3.5 text-white/70" />
              : <Calendar className="w-3.5 h-3.5 text-white/70" />
            }
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">
              {isOuting ? 'Sortie' : 'Événement'}
            </span>
          </div>

          {dateInfo && (
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-sm font-black text-white px-2 py-0.5 rounded-lg',
                dateInfo.isToday ? 'bg-white/30' : 'bg-white/15'
              )}>
                {dateInfo.countdown}
              </span>
              {dateInfo.isToday && (
                <span className="text-xs font-bold text-yellow-200 animate-pulse">● LIVE</span>
              )}
            </div>
          )}
        </div>

        {/* Badge en haut à droite */}
        {item.badges && item.badges.length > 0 && (
          <div className="absolute top-2 right-2">
            <span className="text-xs font-bold text-white bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
              {item.badges[0]}
            </span>
          </div>
        )}
      </div>

      {/* Corps */}
      <div className="p-4">
        <h3 className="font-black text-gray-900 text-[15px] leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors mb-1.5">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
            {item.summary}
          </p>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-gray-50">
          {item.locationLabel && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 truncate min-w-0">
              <MapPin className="w-3 h-3 flex-shrink-0 text-gray-300" />
              <span className="truncate max-w-[150px]">{item.locationLabel}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-black text-brand-600 group-hover:gap-2 transition-colors ml-auto flex-shrink-0">
            {item.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
