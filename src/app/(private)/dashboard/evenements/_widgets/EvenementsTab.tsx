'use client';

import Link from 'next/link';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import {
  EVENT_STATUS_CONFIG, resolveEventStatus, type EventStatus,
} from '@/lib/events';
import EventCard, { type MyEvent } from './EventCard';

interface Props {
  myEvents: MyEvent[];
  loading: boolean;
  statusFilter: EventStatus | 'all';
  onFilterChange: (f: EventStatus | 'all') => void;
  onStatusChange: (id: string, to: EventStatus, requiresReason?: boolean) => void;
  onDelete: (id: string) => void;
}

export default function EvenementsTab({
  myEvents, loading, statusFilter, onFilterChange, onStatusChange, onDelete,
}: Props) {
  const filteredEvents = myEvents.filter(e => {
    if (statusFilter === 'all') return true;
    const resolved = resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited);
    return resolved === statusFilter || e.status === statusFilter;
  });

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Tous', color: 'bg-gray-100 text-gray-700' },
          ...Object.entries(EVENT_STATUS_CONFIG).map(([k, v]) => ({
            id: k, label: v.label, color: `${v.badgeBg} ${v.badgeText}`,
          }))
        ].map(f => (
          <button key={f.id}
            onClick={() => onFilterChange(f.id as EventStatus | 'all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              statusFilter === f.id ? `${f.color} ring-2 ring-offset-1 ring-purple-300` : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}>
            {f.label}
            {f.id !== 'all' && (
              <span className="ml-1 opacity-70">
                ({myEvents.filter(e => {
                  const resolved = resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited);
                  return resolved === f.id || e.status === f.id;
                }).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500">Aucun événement{statusFilter !== 'all' ? ' pour ce filtre' : ''}</p>
          {statusFilter === 'all' && (
            <Link href="/evenements/nouveau"
              className="mt-3 inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Créer un événement
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filteredEvents.map(ev => (
            <EventCard key={ev.id} event={ev} onStatusChange={onStatusChange} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
