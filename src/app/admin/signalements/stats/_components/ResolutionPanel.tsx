'use client';

import type { ResolutionByType } from '@/app/api/admin/reports/stats/route';
import { TYPE_LABELS } from '../../_components/signalement-config';

interface Props { data: ResolutionByType[] }

function DelayBadge({ hours }: { hours: number | null }) {
  if (hours == null) return <span className="text-gray-300 text-xs">—</span>;
  const cls =
    hours <= 2  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    hours <= 12 ? 'bg-green-100 text-green-700 border-green-200' :
    hours <= 24 ? 'bg-amber-100 text-amber-700 border-amber-200' :
    hours <= 72 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                  'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border tabular-nums ${cls}`}>
      {hours}h
    </span>
  );
}

export default function ResolutionPanel({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-gray-400 text-sm">Aucun signalement traité — pas de données de délai disponibles.</p>
      </div>
    );
  }

  const maxAvg = Math.max(...data.map(d => d.avg_hours ?? 0), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            ⏱ Délai de traitement par type de contenu
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Temps entre réception et première décision (heures)</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> &lt;12h</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 12–24h</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> &gt;24h</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Type</th>
              <th className="text-center text-xs font-semibold text-gray-500 pb-3 px-2">Signalements</th>
              <th className="text-center text-xs font-semibold text-gray-500 pb-3 px-2">Délai min</th>
              <th className="text-center text-xs font-semibold text-gray-500 pb-3 px-2">Délai moyen</th>
              <th className="text-center text-xs font-semibold text-gray-500 pb-3 px-2">Délai max</th>
              <th className="text-left text-xs font-semibold text-gray-500 pb-3 pl-4">Visualisation</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const typeCfg = TYPE_LABELS[row.type];
              const barPct  = maxAvg > 0 && row.avg_hours != null ? Math.round((row.avg_hours / maxAvg) * 100) : 0;
              const barCls  =
                (row.avg_hours ?? 999) <= 12 ? 'bg-emerald-400' :
                (row.avg_hours ?? 999) <= 24 ? 'bg-amber-400' : 'bg-red-400';
              return (
                <tr key={row.type} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4">
                    <span className="text-xs font-semibold text-gray-700">{typeCfg?.label ?? row.type}</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-xs font-bold text-gray-800">{row.count}</span>
                  </td>
                  <td className="py-3 px-2 text-center"><DelayBadge hours={row.min_hours} /></td>
                  <td className="py-3 px-2 text-center"><DelayBadge hours={row.avg_hours} /></td>
                  <td className="py-3 px-2 text-center"><DelayBadge hours={row.max_hours} /></td>
                  <td className="py-3 pl-4 w-32">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barCls} transition-all`} style={{ width: `${Math.max(barPct, 3)}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Légende SLA */}
      <div className="mt-5 pt-4 border-t border-gray-50">
        <p className="text-[10px] font-semibold text-gray-500 mb-2">Objectifs SLA recommandés :</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Excellent', range: '< 2h',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Bon',       range: '2h – 12h', cls: 'bg-green-50 text-green-700 border-green-200' },
            { label: 'Acceptable',range: '12h – 24h',cls: 'bg-amber-50 text-amber-700 border-amber-200' },
            { label: 'Lent',      range: '24h – 72h',cls: 'bg-orange-50 text-orange-700 border-orange-200' },
            { label: 'Critique',  range: '> 72h',    cls: 'bg-red-50 text-red-700 border-red-200' },
          ].map(s => (
            <span key={s.label} className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${s.cls}`}>
              {s.label} · {s.range}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
