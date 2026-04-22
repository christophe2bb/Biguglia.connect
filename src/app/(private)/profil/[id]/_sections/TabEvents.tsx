

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, PartyPopper } from 'lucide-react';
import { EVENT_STATUS_CONFIG } from '@/lib/events';
import { type EventItem, formatEventDate } from '../_types';

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: EventItem }) {
  const cfg = EVENT_STATUS_CONFIG[event.status as keyof typeof EVENT_STATUS_CONFIG] ?? {
    label: event.status,
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
  };

  return (
    <Link
      href={`/evenements/${event.id}`}
      className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-colors group"
    >
      {/* Cover or placeholder */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        {event.cover_photo_url
          ? <Image src={event.cover_photo_url} alt="" fill className="object-cover" />
          : <PartyPopper className="w-6 h-6 text-purple-300" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-purple-700 transition-colors">
          {event.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5">
            <Calendar className="w-3 h-3" /> {formatEventDate(event.event_date)}
          </span>
          {event.location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> {event.location}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
        {cfg.label}
      </span>
    </Link>
  );
}

// ── TabEvents ─────────────────────────────────────────────────────────────────

interface Props {
  upcomingEvents: EventItem[];
  pastEvents: EventItem[];
}

export function TabEvents({ upcomingEvents, pastEvents }: Props) {
  const total = upcomingEvents.length + pastEvents.length;

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
        <PartyPopper className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Aucun événement organisé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            À venir / En cours ({upcomingEvents.length})
          </h3>
          <div className="space-y-2">
            {upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        </div>
      )}
      {pastEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">
            Passés ({pastEvents.length})
          </h3>
          <div className="space-y-2 opacity-75">
            {pastEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        </div>
      )}
    </div>
  );
}
