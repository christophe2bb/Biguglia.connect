'use client';

import Link from 'next/link';
import { Users, ChevronRight, Loader2 } from 'lucide-react';
import { resolveEventStatus } from '@/lib/events';
import StatusPill from './StatusPill';
import { type MyEvent } from './EventCard';

interface Props {
  myEvents: MyEvent[];
  loading: boolean;
}

export default function ParticipantsTab({ myEvents, loading }: Props) {
  const eventsWithParticipants = myEvents.filter(e => (e.participants_count ?? 0) > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (eventsWithParticipants.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="font-bold text-gray-500">Aucun participant pour l&apos;instant</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {eventsWithParticipants.map(ev => (
        <div key={ev.id} className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <StatusPill status={resolveEventStatus(ev.status, ev.event_date, ev.participants_count ?? 0, ev.capacity ?? null, ev.is_unlimited)} />
              <h3 className="font-bold text-gray-900 text-sm">{ev.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-purple-700 font-bold">
                <Users className="w-3.5 h-3.5" /> {ev.participants_count}
              </span>
              <Link href={`/evenements/${ev.id}?tab=participants`} className="p-1 hover:bg-gray-200 rounded-lg">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>
          {ev.capacity && !ev.is_unlimited && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${(ev.fill_percentage ?? 0) >= 90 ? 'bg-red-400' : (ev.fill_percentage ?? 0) >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(100, ev.fill_percentage ?? 0)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{ev.fill_percentage}%</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
