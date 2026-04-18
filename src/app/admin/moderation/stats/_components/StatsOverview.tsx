

/**
 * StatsOverview — KPIs principaux pour le tableau de bord de modération.
 * Composant pur, reçoit les données du parent.
 */

import type { ModerationStatsData } from '@/app/api/admin/moderation/stats-data/route';

function BigStat({ value, label, emoji, color, subtext }: {
  value: string | number; label: string; emoji: string; color: string; subtext?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
      <div className="text-3xl mb-1">{emoji}</div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-1">{label}</div>
      {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  );
}

interface Props { stats: ModerationStatsData }

export default function StatsOverview({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <BigStat value={stats.total}     label="Total traité"     emoji="📊" color="text-gray-900" />
      <BigStat value={stats.pending}   label="En attente"       emoji="⏳" color="text-amber-600" subtext="à traiter" />
      <BigStat value={stats.last24h}   label="Dernières 24h"    emoji="🕐" color="text-indigo-600" subtext="nouvelles soumissions" />
      <BigStat
        value={stats.avgReviewHours != null ? `${stats.avgReviewHours.toFixed(1)}h` : '—'}
        label="Délai moyen"
        emoji="⏱️"
        color={stats.avgReviewHours != null && stats.avgReviewHours <= 24 ? 'text-emerald-600' : 'text-red-600'}
        subtext="objectif <24h"
      />
    </div>
  );
}
