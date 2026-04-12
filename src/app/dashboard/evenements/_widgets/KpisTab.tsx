'use client';

import Link from 'next/link';
import { TrendingUp, Users } from 'lucide-react';
import { EVENT_STATUS_CONFIG, resolveEventStatus, formatEventDate } from '@/lib/events';
import { type MyEvent } from './EventCard';

interface DashStats {
  total: number;
  a_venir: number;
  complet: number;
  reporte: number;
  passe: number;
  annule: number;
  totalParticipants: number;
  avgFill: number;
}

interface Props {
  myEvents: MyEvent[];
  stats: DashStats;
}

export default function KpisTab({ myEvents, stats }: Props) {
  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-purple-700">{stats.total}</p>
          <p className="text-sm font-semibold text-purple-600 opacity-80">Total événements</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-emerald-700">{stats.totalParticipants}</p>
          <p className="text-sm font-semibold text-emerald-600 opacity-80">Total participants</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-blue-700">{stats.avgFill}%</p>
          <p className="text-sm font-semibold text-blue-600 opacity-80">Taux de remplissage moyen</p>
        </div>
      </div>

      {/* Status breakdown */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">Répartition par statut</h3>
        <div className="space-y-2">
          {Object.entries(EVENT_STATUS_CONFIG).map(([k, v]) => {
            const count = myEvents.filter(e => {
              const resolved = resolveEventStatus(e.status, e.event_date, e.participants_count ?? 0, e.capacity ?? null, e.is_unlimited);
              return resolved === k || e.status === k;
            }).length;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={k} className="flex items-center gap-3">
                <div className="w-24 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${v.dotColor}`} />
                  <span className={`text-xs font-bold ${v.badgeText}`}>{v.label}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className={`${v.dotColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top events by attendance */}
      {myEvents.some(e => (e.participants_count ?? 0) > 0) && (
        <div>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" /> Top événements par participation
          </h3>
          <div className="space-y-2">
            {[...myEvents]
              .filter(e => (e.participants_count ?? 0) > 0)
              .sort((a, b) => (b.participants_count ?? 0) - (a.participants_count ?? 0))
              .slice(0, 5)
              .map(ev => (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Link href={`/evenements/${ev.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate hover:text-purple-700">{ev.title}</p>
                    <p className="text-xs text-gray-500">{formatEventDate(ev.event_date, false)}</p>
                  </Link>
                  <div className="flex items-center gap-1 text-purple-700 font-bold text-sm flex-shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    {ev.participants_count}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Cancellation rate */}
      {stats.total > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="font-bold text-orange-800 text-sm mb-1">Taux d&apos;annulation</p>
          <p className="text-2xl font-black text-orange-700">
            {Math.round((stats.annule / stats.total) * 100)}%
          </p>
          <p className="text-xs text-orange-600 mt-0.5">
            {stats.annule} événement{stats.annule > 1 ? 's' : ''} annulé{stats.annule > 1 ? 's' : ''} sur {stats.total}
          </p>
        </div>
      )}
    </div>
  );
}
