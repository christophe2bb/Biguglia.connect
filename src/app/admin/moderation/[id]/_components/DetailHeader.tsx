'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import ModerationBadge from '@/components/ui/ModerationBadge';
import { formatRelative } from '@/lib/utils';
import { CONTENT_TYPE_LABELS } from '@/lib/moderation';
import { RISK_CONFIG } from '../_config';
import type { QueueDetail } from '../_types';

interface Props {
  item: QueueDetail;
  contentUrl: string;
  onRefresh: () => void;
}

export function DetailHeader({ item, contentUrl, onRefresh }: Props) {
  const risk        = RISK_CONFIG[item.risk_level ?? 'low'];
  const contentMeta = CONTENT_TYPE_LABELS[item.content_type];

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      {/* Gauche : retour + titre */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/moderation"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-sm font-bold px-2.5 py-1 rounded-full border ${risk.bg} ${risk.color} ${risk.border}`}
            >
              {risk.emoji} {risk.label}
            </span>
            <span className="text-sm font-semibold text-gray-500">
              {contentMeta?.emoji} {contentMeta?.label}
            </span>
            {item.resubmit_count > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                🔄 Soumission #{item.resubmit_count + 1}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 line-clamp-1">
            {item.content_title || '(Sans titre)'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Soumis {formatRelative(item.submitted_at)}
          </p>
        </div>
      </div>

      {/* Droite : badge statut + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ModerationBadge status={item.status} size="md" showDot />
        <Link
          href={contentUrl}
          target="_blank"
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Voir la publication"
        >
          <ExternalLink className="w-4 h-4 text-gray-600" />
        </Link>
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
