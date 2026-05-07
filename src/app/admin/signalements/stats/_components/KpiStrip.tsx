'use client';

import type { ReportKPI } from '@/app/api/admin/reports/stats/route';

interface Props { kpi: ReportKPI }

function KpiCard({
  value, label, sub, emoji, bg, text, border, pulse,
}: {
  value: string | number; label: string; sub?: string;
  emoji: string; bg: string; text: string; border: string; pulse?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${bg} ${border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-3xl font-black tabular-nums ${text} ${pulse ? 'animate-pulse' : ''}`}>{value}</p>
          <p className={`text-xs font-semibold mt-1 ${text} opacity-80`}>{label}</p>
          {sub && <p className={`text-[10px] mt-0.5 ${text} opacity-60`}>{sub}</p>}
        </div>
        <span className="text-2xl flex-shrink-0">{emoji}</span>
      </div>
    </div>
  );
}

export default function KpiStrip({ kpi }: Props) {
  return (
    <div className="space-y-3">
      {/* Ligne 1 — volumes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard value={kpi.total}    label="Total"        emoji="📊" bg="bg-gray-50"    text="text-gray-800"    border="border-gray-200" />
        <KpiCard value={kpi.pending}  label="En attente"   emoji="🚨" bg="bg-red-50"     text="text-red-700"     border="border-red-200"  pulse={kpi.pending > 0} />
        <KpiCard value={kpi.reviewed} label="En examen"    emoji="👀" bg="bg-amber-50"   text="text-amber-700"   border="border-amber-200" />
        <KpiCard value={kpi.resolved} label="Résolus"      emoji="✅" bg="bg-emerald-50" text="text-emerald-700" border="border-emerald-200" />
        <KpiCard value={kpi.dismissed}label="Ignorés"      emoji="🚫" bg="bg-slate-50"   text="text-slate-600"   border="border-slate-200" />
        <KpiCard value={kpi.todayCount}label="Aujourd'hui" emoji="📅" bg="bg-blue-50"    text="text-blue-700"    border="border-blue-200" />
        <KpiCard value={kpi.last7d}   label="7 derniers j" emoji="📆" bg="bg-indigo-50"  text="text-indigo-700"  border="border-indigo-200" />
      </div>

      {/* Ligne 2 — taux + délais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Taux résolution */}
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">Taux résolution</span>
            <span className="text-xl font-black text-emerald-600">{kpi.resolutionRate}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${kpi.resolutionRate}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{kpi.resolved} / {kpi.total} signalements</p>
        </div>

        {/* Taux rejet */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">Taux rejet</span>
            <span className="text-xl font-black text-slate-600">{kpi.dismissRate}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-400 rounded-full transition-all" style={{ width: `${kpi.dismissRate}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{kpi.dismissed} rejetés</p>
        </div>

        {/* Délai moyen */}
        <div className={`rounded-2xl border bg-white p-4 ${
          kpi.avgResolutionHours == null ? 'border-gray-200' :
          kpi.avgResolutionHours <= 4  ? 'border-emerald-300' :
          kpi.avgResolutionHours <= 24 ? 'border-amber-300'   : 'border-red-300'
        }`}>
          <p className="text-xs font-semibold text-gray-600 mb-1">⏱ Délai moyen</p>
          <p className={`text-2xl font-black tabular-nums ${
            kpi.avgResolutionHours == null ? 'text-gray-400' :
            kpi.avgResolutionHours <= 4  ? 'text-emerald-600' :
            kpi.avgResolutionHours <= 24 ? 'text-amber-600'   : 'text-red-600'
          }`}>
            {kpi.avgResolutionHours != null ? `${kpi.avgResolutionHours}h` : '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {kpi.minResolutionHours != null && kpi.maxResolutionHours != null
              ? `min ${kpi.minResolutionHours}h — max ${kpi.maxResolutionHours}h`
              : 'aucun traitement enregistré'}
          </p>
        </div>

        {/* 30 jours */}
        <KpiCard value={kpi.last30d} label="30 derniers jours" sub={`≈ ${(kpi.last30d / 30).toFixed(1)}/j`} emoji="📈" bg="bg-purple-50" text="text-purple-700" border="border-purple-200" />

        {/* Efficacité traitement */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Score efficacité</p>
          <p className={`text-2xl font-black ${
            kpi.resolutionRate >= 80 ? 'text-emerald-600' :
            kpi.resolutionRate >= 50 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {kpi.resolutionRate >= 80 ? 'Excellent' :
             kpi.resolutionRate >= 50 ? 'Moyen' : 'À améliorer'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {kpi.resolutionRate >= 80 ? '> 80% résolus ✓' :
             kpi.resolutionRate >= 50 ? '50-80% résolus' : '< 50% résolus ⚠️'}
          </p>
        </div>
      </div>
    </div>
  );
}
