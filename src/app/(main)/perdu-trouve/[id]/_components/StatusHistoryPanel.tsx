'use client';

import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { STATUS_CONFIG } from '../_config';
import type { LFStatus, LFStatusHistory } from '../_types';

type Props = {
  history: LFStatusHistory[];
  showHistory: boolean;
  onToggle: () => void;
};

export function StatusHistoryPanel({ history, showHistory, onToggle }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:hidden">
      {/* Toggle button */}
      <button
        className="w-full flex items-center gap-2 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
        onClick={onToggle}
      >
        <Eye className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-bold text-gray-700 flex-1">
          Historique des statuts ({history.length})
        </p>
        {showHistory
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Entries */}
      {showHistory && (
        <div className="border-t border-gray-50 px-5 pb-4">
          <div className="space-y-2 mt-3">
            {history.map(h => {
              const newCfg = STATUS_CONFIG[h.new_status as LFStatus] ?? STATUS_CONFIG.perdu;
              const oldCfg = h.old_status
                ? (STATUS_CONFIG[h.old_status as LFStatus] ?? null)
                : null;
              return (
                <div key={h.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-base">{newCfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">
                      {oldCfg ? `${oldCfg.icon} ${oldCfg.label} → ` : ''}{newCfg.icon} {newCfg.label}
                    </p>
                    {h.reason && <p className="text-xs text-gray-400 italic">{h.reason}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{formatRelative(h.created_at)}</p>
                    {h.changer?.full_name && (
                      <p className="text-xs text-gray-400">{h.changer.full_name}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
