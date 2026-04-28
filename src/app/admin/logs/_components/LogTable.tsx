'use client';

/**
 * LogTable — Tableau des entrées du journal admin avec ligne de détail.
 * Composant extrait de logs/page.tsx pour alléger l'orchestrateur.
 */

import { Fragment, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { AdminActionLog } from '@/app/api/admin/logs/route';
import { actionLabel, actionColor, formatDate } from './log-config';

interface LogTableProps {
  logs:    AdminActionLog[];
  loading: boolean;
  hasFilters: boolean;
}

export default function LogTable({ logs, loading, hasFilters }: LogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  if (loading && logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-center py-16 text-gray-400">
          Aucun log trouvé{hasFilters ? ' pour ces filtres' : ''}.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Acteur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Cible</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Raison</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map((log) => (
              <Fragment key={log.id}>
                <tr
                  onClick={() => toggle(log.id)}
                  className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-xs">{log.actor_name ?? '—'}</span>
                      <span className="text-gray-400 font-mono text-[10px]">
                        {log.actor_email ?? log.actor_id.slice(0, 8) + '…'}
                      </span>
                      <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded w-fit ${log.actor_role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {log.actor_role}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-lg ${actionColor(log.action)}`}>
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {log.target_table && (
                        <span className="text-xs text-gray-600 font-medium">{log.target_table}</span>
                      )}
                      {log.target_id && (
                        <span className="text-[10px] font-mono text-gray-400 truncate max-w-[10rem]">
                          {log.target_id}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                    <span className="line-clamp-2">{log.reason ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {expandedId === log.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </td>
                </tr>

                {expandedId === log.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Métadonnées (meta)</span>
                      </div>
                      <pre className="text-xs font-mono text-slate-700 bg-slate-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-400">
                        <span>ID : <span className="font-mono">{log.id}</span></span>
                        <span>Acteur ID : <span className="font-mono">{log.actor_id}</span></span>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
