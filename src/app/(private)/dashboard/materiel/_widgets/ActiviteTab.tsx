

import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { type EquipmentLoan } from '@/lib/equipment';

interface ActivityMonth {
  key: string;
  label: string;
  count: number;
}

interface Props {
  allLoans: EquipmentLoan[];
  activityData: ActivityMonth[];
  maxActivity: number;
  loanHistory: EquipmentLoan[];
}

export default function ActiviteTab({ allLoans, activityData, maxActivity, loanHistory }: Props) {
  const thisMonthKey = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();
  const thisMonthCount = activityData.find(m => m.key === thisMonthKey)?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Graphique emprunts par mois */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-5">
          <BarChart2 className="w-5 h-5 text-teal-600" /> Emprunts par mois (12 derniers mois)
        </h3>
        {allLoans.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Aucun prêt enregistré pour l&apos;instant</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2 h-40">
              {activityData.map(m => (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-teal-700">{m.count > 0 ? m.count : ''}</span>
                  <div className="w-full rounded-t-lg transition-colors" style={{
                    height: `${Math.round((m.count / maxActivity) * 120)}px`,
                    minHeight: m.count > 0 ? '4px' : '2px',
                    backgroundColor: m.count > 0 ? '#14b8a6' : '#e5e7eb',
                  }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {activityData.map(m => (
                <div key={m.key} className="flex-1 text-center">
                  <span className="text-[9px] text-gray-400 leading-none">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <div className="font-bold text-teal-700 text-lg">{allLoans.length}</div>
                <div className="text-xs text-gray-500">Total prêts</div>
              </div>
              <div>
                <div className="font-bold text-emerald-700 text-lg">{loanHistory.filter(l => l.status === 'retourne').length}</div>
                <div className="text-xs text-gray-500">Terminés</div>
              </div>
              <div>
                <div className="font-bold text-orange-700 text-lg">{thisMonthCount}</div>
                <div className="text-xs text-gray-500">Ce mois-ci</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top matériels empruntés */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-bold text-gray-900 mb-4">🏆 Matériels les plus empruntés</h3>
        {allLoans.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucun prêt pour l&apos;instant</p>
        ) : (() => {
          const counts = allLoans.reduce<Record<string, { title: string; count: number }>>((acc, l) => {
            const title = (l.equipment as { title?: string })?.title || l.equipment_id;
            if (!acc[l.equipment_id]) acc[l.equipment_id] = { title, count: 0 };
            acc[l.equipment_id].count++;
            return acc;
          }, {});
          return (
            <div className="space-y-2">
              {Object.entries(counts)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 5)
                .map(([equipId, { title, count }], idx) => (
                  <div key={equipId} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                    <Link href={`/materiel/${equipId}`} className="flex-1 text-sm text-gray-700 hover:text-brand-700 truncate">
                      {title}
                    </Link>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                      {count} prêt{count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
