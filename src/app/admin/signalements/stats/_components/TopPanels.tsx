'use client';

import Link from 'next/link';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type { TopReporter, TopTarget, Recidivist } from '@/app/api/admin/reports/stats/route';
import { TYPE_LABELS } from '../../_components/signalement-config';

interface Props {
  topReporters: TopReporter[];
  topTargets:   TopTarget[];
  recidivists:  Recidivist[];
}

export default function TopPanels({ topReporters, topTargets, recidivists }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

      {/* ── Top signaleurs ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          🏅 Top signaleurs actifs
          <span className="text-[10px] text-gray-400 font-normal ml-auto">membres ayant le + signalé</span>
        </h3>
        {topReporters.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucun signalement enregistré</p>
        ) : (
          <div className="space-y-2.5">
            {topReporters.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2.5">
                <span className={`text-xs font-black w-5 text-center flex-shrink-0 ${
                  i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <Avatar src={r.avatar_url} name={r.full_name} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{r.full_name}</p>
                </div>
                <span className="text-sm font-black text-gray-800 flex-shrink-0">{r.count}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">signal.</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-50 italic">
          Un nombre élevé peut indiquer un membre très impliqué ou un abus de signalement.
        </p>
      </div>

      {/* ── Top cibles ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          🎯 Contenus les plus signalés
        </h3>
        {topTargets.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucun contenu signalé</p>
        ) : (
          <div className="space-y-2">
            {topTargets.map((t, i) => {
              const typeCfg = TYPE_LABELS[t.target_type];
              const href = typeCfg?.href?.(t.target_id);
              return (
                <div key={`${t.target_type}:${t.target_id}`}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs font-black text-gray-300 w-5 text-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {t.target_title ?? t.target_id.slice(0, 12) + '…'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {typeCfg?.label ?? t.target_type}
                      {' · '}
                      <span className={`font-semibold ${
                        t.status === 'resolved' ? 'text-emerald-500' :
                        t.status === 'pending'  ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        {t.status === 'resolved' ? '✅ résolu' :
                         t.status === 'pending'  ? '🔴 en attente' : '👀 en cours'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-sm font-black text-red-600">{t.count}×</span>
                    {href && (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Récidivistes ── */}
      <div className={`bg-white rounded-2xl border p-5 ${recidivists.length > 0 ? 'border-orange-200' : 'border-gray-100'}`}>
        <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
          {recidivists.length > 0
            ? <><AlertTriangle className="w-4 h-4 text-orange-500" /> Contenus récidivistes</>
            : <>🔍 Contenus récidivistes</>}
        </h3>
        <p className="text-[10px] text-gray-400 mb-4">Signalés 2 fois ou plus</p>
        {recidivists.length === 0 ? (
          <div className="flex flex-col items-center py-4">
            <span className="text-3xl mb-2">✅</span>
            <p className="text-xs text-gray-500 font-semibold">Aucun récidiviste</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Tous les contenus n&apos;ont été signalés qu&apos;une fois</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recidivists.map(r => {
              const typeCfg = TYPE_LABELS[r.target_type];
              return (
                <div key={`${r.target_type}:${r.target_id}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 border border-orange-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {r.target_title ?? r.target_id.slice(0, 14) + '…'}
                    </p>
                    <p className="text-[10px] text-gray-500">{typeCfg?.label ?? r.target_type}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-xs font-black text-orange-600">{r.total}× signalé</span>
                    {r.pending > 0 && (
                      <span className="text-[10px] text-red-500 font-semibold">{r.pending} en attente</span>
                    )}
                  </div>
                  <Link href={`/admin/signalements`}
                    className="p-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
