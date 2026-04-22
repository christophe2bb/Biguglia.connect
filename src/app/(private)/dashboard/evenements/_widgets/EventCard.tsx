'use client';

import Link from 'next/link';
import {
  Calendar, Users, Clock, MapPin, Eye, Edit2, Trash2,
  XCircle, RefreshCw, Archive, CheckCircle,
} from 'lucide-react';
import {
  getAllowedTransitions, resolveEventStatus, formatEventDate,
  type EventStatus,
} from '@/lib/events';
import StatusPill from './StatusPill';

export interface MyEvent {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  event_date: string;
  start_time: string;
  location: string;
  status: string;
  capacity?: number | null;
  is_unlimited: boolean;
  registration_open: boolean;
  created_at: string;
  participants_count?: number;
  confirmed_count?: number;
  remaining_places?: number | null;
  fill_percentage?: number | null;
}

interface Props {
  event: MyEvent;
  onStatusChange: (id: string, to: EventStatus, requiresReason?: boolean) => void;
  onDelete: (id: string) => void;
}

export default function EventCard({ event, onStatusChange, onDelete }: Props) {
  const resolvedStatus = resolveEventStatus(
    event.status, event.event_date,
    event.participants_count ?? 0,
    event.capacity ?? null,
    event.is_unlimited,
  );
  const transitions = getAllowedTransitions(resolvedStatus);
  const fillPct = event.fill_percentage ?? (
    !event.is_unlimited && event.capacity
      ? Math.round(((event.participants_count ?? 0) / event.capacity) * 100)
      : null
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusPill status={resolvedStatus} />
              {!event.registration_open && resolvedStatus === 'a_venir' && (
                <span className="text-xs bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded-full border border-orange-200">
                  Inscriptions fermées
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{event.title}</h3>
            {event.subtitle && <p className="text-xs text-gray-500 line-clamp-1">{event.subtitle}</p>}
          </div>
          <Link href={`/evenements/${event.id}`}
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <Eye className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatEventDate(event.event_date, false)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.start_time?.substring(0, 5)}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
        </div>

        {/* Participants & fill */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-sm font-bold text-gray-900">{event.participants_count ?? 0}</span>
            {!event.is_unlimited && event.capacity && (
              <span className="text-xs text-gray-400">/ {event.capacity}</span>
            )}
            {event.is_unlimited && <span className="text-xs text-gray-400">participants</span>}
          </div>
          {fillPct !== null && (
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${fillPct >= 90 ? 'bg-red-400' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, fillPct)}%` }}
              />
            </div>
          )}
          {fillPct !== null && <span className="text-xs text-gray-500 w-9 text-right">{fillPct}%</span>}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-1.5">
          <Link href={`/evenements/${event.id}/modifier`}
            className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors">
            <Edit2 className="w-3 h-3" /> Modifier
          </Link>
          {transitions.slice(0, 3).map(t => (
            <button key={t.to} onClick={() => onStatusChange(event.id, t.to, t.requiresReason)}
              className={`flex items-center gap-1 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                t.to === 'annule' ? 'bg-red-50 hover:bg-red-100 text-red-600' :
                t.to === 'reporte' ? 'bg-violet-50 hover:bg-violet-100 text-violet-600' :
                t.to === 'archive' ? 'bg-gray-50 hover:bg-gray-100 text-gray-500' :
                'bg-purple-50 hover:bg-purple-100 text-purple-600'
              }`}>
              {t.to === 'annule' && <XCircle className="w-3 h-3" />}
              {t.to === 'reporte' && <RefreshCw className="w-3 h-3" />}
              {t.to === 'archive' && <Archive className="w-3 h-3" />}
              {t.to === 'complet' && <Users className="w-3 h-3" />}
              {t.to === 'a_venir' && <CheckCircle className="w-3 h-3" />}
              {t.to === 'passe' && <Clock className="w-3 h-3" />}
              {t.label}
            </button>
          ))}
          {(event.participants_count ?? 0) === 0 && (
            <button onClick={() => onDelete(event.id)}
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-500 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors">
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
