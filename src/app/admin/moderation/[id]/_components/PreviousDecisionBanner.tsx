'use client';

import { Archive, CheckCircle, XCircle } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import type { QueueDetail } from '../_types';

interface Props {
  item: QueueDetail;
}

export function PreviousDecisionBanner({ item }: Props) {
  const isPublished = item.status === 'publie';
  const isRefused   = item.status === 'refuse';

  const colorCls = isPublished
    ? 'bg-emerald-50 border-emerald-200'
    : isRefused
      ? 'bg-red-50 border-red-200'
      : 'bg-gray-50 border-gray-200';

  const Icon = isPublished ? CheckCircle : isRefused ? XCircle : Archive;
  const iconCls = isPublished ? 'text-emerald-600' : isRefused ? 'text-red-600' : 'text-gray-500';
  const decisionLabel = isPublished ? 'Acceptée' : isRefused ? 'Refusée' : 'Traitée';

  return (
    <div className={`rounded-2xl border p-4 ${colorCls}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${iconCls}`} />
        <span className="font-semibold text-gray-800">Décision : {decisionLabel}</span>
        {item.reviewed_at && (
          <span className="text-xs text-gray-500 ml-auto">
            {formatRelative(item.reviewed_at)}
          </span>
        )}
      </div>
      {(item.refusal_reason || item.correction_reason) && (
        <p className="text-sm text-gray-700">
          Motif : <strong>{item.refusal_reason || item.correction_reason}</strong>
        </p>
      )}
      {item.moderator_note && (
        <p className="text-xs text-gray-600 mt-2 italic">
          Note : {item.moderator_note}
        </p>
      )}
    </div>
  );
}
