'use client';

import type { DayStat } from '@/app/api/admin/reports/stats/route';

interface Props { data: DayStat[] }

export default function TimeSeriesChart({ data }: Props) {
  const max = Math.max(...data.map(d => d.count), 1);

  // Group by week for summary
  const weeks: { label: string; total: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const slice = data.slice(i * 7, i * 7 + 7);
    weeks.push({
      label: `S-${3 - i}`,
      total: slice.reduce((a, b) => a + b.count, 0),
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            📈 Évolution sur 30 jours
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Signalements reçus par jour (barres) · résolus (pointillés)</p>
        </div>
        {/* Mini weekly summary */}
        <div className="hidden sm:flex items-center gap-3">
          {weeks.map(w => (
            <div key={w.label} className="text-center">
              <p className="text-xs font-black text-gray-800">{w.total}</p>
              <p className="text-[10px] text-gray-400">{w.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => {
          const heightPct = max > 0 ? (d.count / max) * 100 : 0;
          const resolvedPct = d.count > 0 ? (d.resolved / d.count) * 100 : 0;
          const isToday = i === data.length - 1;
          const dayLabel = new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap shadow-xl">
                  <p className="font-bold">{dayLabel}</p>
                  <p>{d.count} signalement{d.count > 1 ? 's' : ''}</p>
                  {d.resolved > 0 && <p className="text-emerald-400">{d.resolved} résolu{d.resolved > 1 ? 's' : ''}</p>}
                </div>
                <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
              </div>
              {/* Bar */}
              <div className="w-full relative" style={{ height: `${Math.max(heightPct, 4)}%` }}>
                <div
                  className={`w-full h-full rounded-t-md transition-all ${
                    isToday ? 'bg-red-500' : d.count > 0 ? 'bg-red-300 hover:bg-red-400' : 'bg-gray-100'
                  }`}
                />
                {/* Resolved overlay */}
                {resolvedPct > 0 && (
                  <div
                    className="absolute bottom-0 left-0 w-full rounded-t-md bg-emerald-400 opacity-60"
                    style={{ height: `${resolvedPct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels — every 5 days */}
      <div className="flex justify-between mt-2 px-0.5">
        {data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map(d => (
          <span key={d.date} className="text-[10px] text-gray-400">
            {new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-red-300 flex-shrink-0" /> Signalements reçus
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-emerald-400 opacity-60 flex-shrink-0" /> Résolus
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-red-500 flex-shrink-0" /> Aujourd&apos;hui
        </span>
      </div>
    </div>
  );
}
