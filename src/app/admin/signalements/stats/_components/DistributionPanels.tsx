'use client';

import type { ByTypeStat, ByReasonStat, ByStatusStat } from '@/app/api/admin/reports/stats/route';
import { TYPE_LABELS, REASON_LABELS } from '../../_components/signalement-config';

interface Props {
  byType:   ByTypeStat[];
  byReason: ByReasonStat[];
  byStatus: ByStatusStat[];
}

const STATUS_CFG: Record<string, { label: string; emoji: string; bar: string; text: string }> = {
  pending:   { label: 'En attente', emoji: '🚨', bar: 'bg-red-400',     text: 'text-red-600' },
  reviewed:  { label: 'En examen',  emoji: '👀', bar: 'bg-amber-400',   text: 'text-amber-600' },
  resolved:  { label: 'Résolus',    emoji: '✅', bar: 'bg-emerald-400', text: 'text-emerald-600' },
  dismissed: { label: 'Ignorés',    emoji: '🚫', bar: 'bg-slate-400',   text: 'text-slate-500' },
};

function HBar({ pct, cls }: { pct: number; cls: string }) {
  return (
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${cls} transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
    </div>
  );
}

export default function DistributionPanels({ byType, byReason, byStatus }: Props) {
  const maxType   = Math.max(...byType.map(t => t.count), 1);
  const maxReason = Math.max(...byReason.map(r => r.count), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

      {/* ── Par statut ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          🗂 Répartition par statut
        </h3>
        <div className="space-y-3">
          {byStatus.map(s => {
            const cfg = STATUS_CFG[s.status] ?? { label: s.status, emoji: '•', bar: 'bg-gray-400', text: 'text-gray-600' };
            return (
              <div key={s.status}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{cfg.emoji} {cfg.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${cfg.text}`}>{s.count}</span>
                    <span className="text-[10px] text-gray-400">{s.pct}%</span>
                  </div>
                </div>
                <HBar pct={s.pct} cls={cfg.bar} />
              </div>
            );
          })}
        </div>

        {/* Donut-style summary */}
        <div className="mt-4 pt-4 border-t border-gray-50">
          <div className="flex rounded-full overflow-hidden h-3">
            {byStatus.map(s => {
              const cfg = STATUS_CFG[s.status];
              return s.pct > 0 ? (
                <div key={s.status} className={`${cfg?.bar ?? 'bg-gray-300'}`} style={{ width: `${s.pct}%` }} title={`${cfg?.label}: ${s.pct}%`} />
              ) : null;
            })}
          </div>
        </div>
      </div>

      {/* ── Par type de contenu ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          📂 Par type de contenu
        </h3>
        {byType.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucune donnée</p>
        ) : (
          <div className="space-y-3">
            {byType.map(t => {
              const cfg  = TYPE_LABELS[t.type];
              const barW = Math.round((t.count / maxType) * 100);
              return (
                <div key={t.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[140px]">
                      {cfg?.label ?? t.type}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-black text-gray-800">{t.count}</span>
                      <span className="text-[10px] text-gray-400">{t.pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <HBar pct={barW} cls="bg-brand-400" />
                  </div>
                  {(t.pending > 0 || t.resolved > 0) && (
                    <div className="flex gap-2 mt-0.5">
                      {t.pending > 0  && <span className="text-[10px] text-red-500">🔴 {t.pending} en attente</span>}
                      {t.resolved > 0 && <span className="text-[10px] text-emerald-500">✅ {t.resolved} résolus</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Par raison ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          ⚡ Par raison du signalement
        </h3>
        {byReason.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucune donnée</p>
        ) : (
          <div className="space-y-3">
            {byReason.map(r => {
              const cfg  = REASON_LABELS[r.reason] ?? REASON_LABELS.autre;
              const barW = Math.round((r.count / maxReason) * 100);
              const resRate = r.count > 0 ? Math.round((r.resolved / r.count) * 100) : 0;
              return (
                <div key={r.reason}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md border ${cfg.color} truncate max-w-[140px]`}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-black text-gray-800">{r.count}</span>
                      <span className="text-[10px] text-gray-400">{r.pct}%</span>
                    </div>
                  </div>
                  <HBar pct={barW} cls="bg-orange-300" />
                  <p className="text-[10px] text-gray-400 mt-0.5">{resRate}% résolus</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
