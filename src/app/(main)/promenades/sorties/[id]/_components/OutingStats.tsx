import { Sun, Clock, Users, Mountain } from 'lucide-react';
import type { Outing } from '../_types';
import { DIFF_CONFIG } from '../_config';

type Props = {
  outing: Outing;
  activeCount: number;
  fillPct: number;
  dateLabel: string;
};

export default function OutingStats({ outing, activeCount, fillPct, dateLabel }: Props) {
  return (
    <>
      {/* ── Quick stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Sun,      color: 'text-emerald-500',                                      label: 'Date',         value: dateLabel },
          { icon: Clock,    color: 'text-sky-500',                                           label: 'Heure',        value: outing.outing_time },
          {
            icon: Users,
            color: fillPct >= 100 ? 'text-red-500' : 'text-purple-500',
            label: 'Participants',
            value: `${activeCount} / ${outing.max_participants}`,
          },
          {
            icon: Mountain,
            color: 'text-amber-500',
            label: 'Niveau',
            value: outing.difficulty ? DIFF_CONFIG[outing.difficulty].label : '—',
          },
        ].map(({ icon: Icon, color, label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center shadow-sm">
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-bold text-gray-800 leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Fill bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className={`font-bold flex items-center gap-1.5 ${fillPct >= 100 ? 'text-red-600' : 'text-emerald-700'}`}>
            <Users className="w-4 h-4" />
            {activeCount} / {outing.max_participants} places
            {fillPct >= 100 && ' · Complet'}
          </span>
          <span className="text-xs text-gray-500">{fillPct}% rempli</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-colors ${
              fillPct >= 100 ? 'bg-red-400' : fillPct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>
      </div>
    </>
  );
}
