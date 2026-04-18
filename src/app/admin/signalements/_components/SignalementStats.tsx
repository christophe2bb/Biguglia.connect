

interface Stats {
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
  total: number;
}

interface SignalementStatsProps {
  stats: Stats;
}

export default function SignalementStats({ stats }: SignalementStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="rounded-2xl border p-4 bg-red-50 border-red-200 text-red-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-black">{stats.pending}</p>
            <p className="text-xs font-semibold opacity-80 mt-0.5">En attente</p>
          </div>
          <span className="text-3xl opacity-70">🚨</span>
        </div>
      </div>
      <div className="rounded-2xl border p-4 bg-gray-50 border-gray-200 text-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-xs font-semibold opacity-80 mt-0.5">Total</p>
          </div>
          <span className="text-3xl opacity-70">📊</span>
        </div>
      </div>
      <div className="rounded-2xl border p-4 bg-emerald-50 border-emerald-200 text-emerald-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-black">{stats.resolved}</p>
            <p className="text-xs font-semibold opacity-80 mt-0.5">Résolus</p>
          </div>
          <span className="text-3xl opacity-70">✅</span>
        </div>
      </div>
      <div className="rounded-2xl border p-4 bg-slate-50 border-slate-200 text-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-black">{stats.dismissed}</p>
            <p className="text-xs font-semibold opacity-80 mt-0.5">Ignorés</p>
          </div>
          <span className="text-3xl opacity-70">🚫</span>
        </div>
      </div>
    </div>
  );
}
