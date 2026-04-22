'use client';

import Link from 'next/link';
import { Eye, CheckCircle, XCircle, AlertTriangle, Ban, Loader2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import type { ReportEntry } from '@/app/api/admin/reports/route';
import { REASON_LABELS, TYPE_LABELS } from './signalement-config';

interface SignalementRowProps {
  report: ReportEntry;
  /** other reports with same target (for multi-report badge) */
  duplicateCount: number;
  processing: boolean;
  onUpdate: (id: string, status: 'resolved' | 'dismissed' | 'reviewed') => void;
  onBan: (targetId: string, targetType: string) => void;
}

export default function SignalementRow({
  report,
  duplicateCount,
  processing,
  onUpdate,
  onBan,
}: SignalementRowProps) {
  const reasonConf = REASON_LABELS[report.reason] ?? REASON_LABELS.autre;
  const typeConf   = TYPE_LABELS[report.target_type] ?? { label: report.target_type, icon: null };
  const TypeIcon   = typeConf.icon;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm transition-colors ${
        report.status === 'pending'  ? 'border-red-200' :
        report.status === 'reviewed' ? 'border-amber-200' :
        report.status === 'resolved' ? 'border-emerald-200 opacity-70' : 'border-gray-200 opacity-60'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${reasonConf.color}`}>
                {reasonConf.emoji} {reasonConf.label}
              </span>
              {TypeIcon && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  <TypeIcon className="w-3 h-3" /> {typeConf.label}
                </span>
              )}
              {duplicateCount > 1 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> {duplicateCount}× signalé
                </span>
              )}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  report.status === 'pending'  ? 'bg-red-100 text-red-600' :
                  report.status === 'reviewed' ? 'bg-amber-100 text-amber-600' :
                  report.status === 'resolved' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {report.status === 'pending' ? 'En attente' :
                 report.status === 'reviewed' ? 'En examen' :
                 report.status === 'resolved' ? 'Résolu' : 'Ignoré'}
              </span>
            </div>

            {report.target_title && (
              <p className="text-sm font-semibold text-gray-800 mb-1 truncate">📝 {report.target_title}</p>
            )}
            {report.description && (
              <p className="text-sm text-gray-600 italic mb-2">&quot;{report.description}&quot;</p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Avatar
                src={report.reporter?.avatar_url}
                name={report.reporter?.full_name ?? '?'}
                size="xs"
              />
              <span className="text-xs text-gray-400">
                Signalé par{' '}
                <span className="font-semibold text-gray-600">
                  {report.reporter?.full_name ?? 'Anonyme'}
                </span>
                {' · '}{formatRelative(report.created_at)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {typeConf.href && (
              <Link
                href={typeConf.href(report.target_id)}
                target="_blank"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Voir
              </Link>
            )}

            {report.status === 'pending' && (
              <>
                <button
                  onClick={() => onUpdate(report.id, 'reviewed')}
                  disabled={processing}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  En cours
                </button>
                <button
                  onClick={() => onUpdate(report.id, 'resolved')}
                  disabled={processing}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                </button>
                <button
                  onClick={() => onUpdate(report.id, 'dismissed')}
                  disabled={processing}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" /> Ignorer
                </button>
                {report.target_type === 'user' && (
                  <button
                    onClick={() => onBan(report.target_id, report.target_type)}
                    disabled={processing}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" /> Bannir
                  </button>
                )}
              </>
            )}

            {report.status === 'reviewed' && (
              <>
                <button
                  onClick={() => onUpdate(report.id, 'resolved')}
                  disabled={processing}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Résoudre
                </button>
                <button
                  onClick={() => onUpdate(report.id, 'dismissed')}
                  disabled={processing}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Ignorer
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
