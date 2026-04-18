'use client';

/**
 * RatesPanel — Taux acceptation / refus / correction + alertes risque.
 * Composant pur, reçoit les données du parent.
 */

import { AlertTriangle, Users, Activity } from 'lucide-react';
import type { ModerationStatsData } from '@/app/api/admin/moderation/stats-data/route';

interface Props { stats: ModerationStatsData }

export default function RatesPanel({ stats }: Props) {
  const total          = stats.total;
  const acceptanceRate = total > 0 ? Math.round((stats.published  / total) * 100) : 0;
  const refusalRate    = total > 0 ? Math.round((stats.refused    / total) * 100) : 0;
  const correctionRate = total > 0 ? Math.round((stats.correction / total) * 100) : 0;

  const rates = [
    { label: "Taux d'acceptation", value: acceptanceRate, count: stats.published,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '✅' },
    { label: 'Taux de refus',      value: refusalRate,    count: stats.refused,    color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     emoji: '❌' },
    { label: 'Taux de correction', value: correctionRate, count: stats.correction, color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '✏️' },
  ];

  return (
    <div className="space-y-6">
      {/* Taux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rates.map(({ label, value, count, color, bg, border, emoji }) => (
          <div key={label} className={`rounded-2xl border p-5 ${bg} ${border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">{emoji} {label}</span>
              <span className={`text-3xl font-black ${color}`}>{value}%</span>
            </div>
            <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-current ${color} transition-all`} style={{ width: `${value}%` }} />
            </div>
            <p className={`text-xs ${color} mt-2`}>{count} publication{count > 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Risques + alertes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-4 ${stats.highRisk > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-5 h-5 ${stats.highRisk > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="font-semibold text-gray-700">Haut risque</span>
          </div>
          <p className={`text-3xl font-black ${stats.highRisk > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{stats.highRisk}</p>
          <p className="text-xs text-gray-500 mt-1">publications nécessitant attention</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-700">Nouveaux auteurs</span>
          </div>
          <p className="text-3xl font-black text-blue-700">{stats.newAuthors}</p>
          <p className="text-xs text-gray-500 mt-1">en attente (membres récents)</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-gray-700">Archivées</span>
          </div>
          <p className="text-3xl font-black text-gray-600">{stats.archived}</p>
          <p className="text-xs text-gray-500 mt-1">publications archivées</p>
        </div>
      </div>
    </div>
  );
}
