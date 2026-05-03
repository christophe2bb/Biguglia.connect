'use client';

import React from 'react';
import { CalendarDays, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import EventCard from './EventCard';
import SectorExplorer from './SectorExplorer';
import type { LocalEvent } from '../_types';

interface Props {
  loading: boolean;
  thisWeekDays: string[];
  thisWeekByDay: Record<string, LocalEvent[]>;
  thisWeekEvents: LocalEvent[];
  today: string;
  userId?: string;
  onJoin: (id: string, joined: boolean) => void;
  onStatusChange: (id: string, s: string) => void;
  onToggleSave: (id: string) => void;
  savedEvents: Set<string>;
  onShowAgenda: () => void;
  sectorCounts: Record<string, number>;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  totalFiltered: number;
}

export default function TabSemaine({
  loading, thisWeekDays, thisWeekByDay, thisWeekEvents, today,
  userId, onJoin, onStatusChange, onToggleSave, savedEvents, onShowAgenda,
  sectorCounts, filterSector, setFilterSector, totalFiltered,
}: Props) {
  const getTomorrowKey = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  return (
    <div>
      <SectorExplorer
        sectorCounts={sectorCounts}
        filterSector={filterSector}
        setFilterSector={setFilterSector}
        totalFiltered={totalFiltered}
      />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-purple-500" />
            Cette semaine
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Événements des 7 prochains jours</p>
        </div>
        {thisWeekEvents.length > 0 && (
          <span className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
            {thisWeekEvents.length} événement{thisWeekEvents.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
        </div>
      ) : thisWeekDays.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <CalendarDays className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500 text-lg">Aucun événement cette semaine</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Consultez le calendrier pour les prochaines dates.</p>
          <button onClick={onShowAgenda}
            className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
            <Calendar className="w-4 h-4" /> Voir le calendrier
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {thisWeekDays.map(dayKey => {
            const dayEvs   = thisWeekByDay[dayKey];
            const dayDate  = new Date(dayKey + 'T00:00:00');
            const isToday  = dayKey === today;
            const isTomorrow = dayKey === getTomorrowKey();
            const dayLabel = isToday
              ? "Aujourd'hui"
              : isTomorrow
              ? 'Demain'
              : dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase());
            return (
              <div key={dayKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isToday ? 'bg-red-500 animate-pulse' : 'bg-purple-400')} />
                  <h3 className={cn('font-black text-sm', isToday ? 'text-red-600' : 'text-gray-700')}>{dayLabel}</h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-semibold">{dayEvs.length} événement{dayEvs.length > 1 ? 's' : ''}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {dayEvs.map(ev => (
                    <EventCard key={ev.id} event={ev} userId={userId} onJoin={onJoin} onStatusChange={onStatusChange} onToggleSave={onToggleSave} savedEvents={savedEvents} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
