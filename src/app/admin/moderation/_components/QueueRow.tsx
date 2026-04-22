'use client';

import Link from 'next/link';
import {
  CheckCircle, XCircle, Eye, ChevronRight,
  Package, Wrench, Heart, Footprints, Calendar, MapPin,
  BookOpen, Handshake, Flag, Star,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ModerationBadge from '@/components/ui/ModerationBadge';
import { formatRelative } from '@/lib/utils';
import {
  CONTENT_TYPE_LABELS, TRUST_LEVEL_CONFIG,
  type ModerationStatus, type ContentType, type TrustLevel,
} from '@/lib/moderation';
import type { QueueItem as ApiQueueItem } from '@/app/api/admin/moderation/queue/route';

type QueueItem = ApiQueueItem & {
  author_trust: TrustLevel;
  status: ModerationStatus;
  content_type: ContentType;
};

const CONTENT_ICONS: Record<ContentType, React.ElementType> = {
  listing:         Package,
  equipment:       Wrench,
  help_request:    Heart,
  outing:          Footprints,
  event:           Calendar,
  lost_found:      MapPin,
  collection_item: Star,
  association:     Handshake,
  forum_post:      BookOpen,
};

const RISK_CONFIG = {
  low:      { label: 'Faible',    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🟢' },
  medium:   { label: 'Modéré',    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   emoji: '🟡' },
  high:     { label: 'Élevé',     color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  emoji: '🟠' },
  critical: { label: 'Critique',  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     emoji: '🔴' },
};

interface QueueRowProps {
  item: QueueItem;
  onQuickDecision: (id: string, decision: 'accepter' | 'refuser') => void;
}

export default function QueueRow({ item, onQuickDecision }: QueueRowProps) {
  const ContentIcon = CONTENT_ICONS[item.content_type] || Flag;
  const contentMeta = CONTENT_TYPE_LABELS[item.content_type];
  const risk = RISK_CONFIG[item.risk_level || 'low'];
  const trustCfg = TRUST_LEVEL_CONFIG[item.author_trust || 'nouveau'];

  const isUrgent = item.risk_level === 'critical' || item.risk_level === 'high';
  const isNew = item.author?.created_at
    ? (Date.now() - new Date(item.author.created_at).getTime()) < 7 * 24 * 3600 * 1000
    : false;

  return (
    <div className={`bg-white rounded-2xl border transition-colors hover:shadow-sm ${
      isUrgent ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
    }`}>
      <div className="p-4 flex flex-col sm:flex-row gap-4">
        {/* Indicateur risque + type */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 sm:w-16 sm:flex-shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${risk.bg} border ${risk.border}`}>
            <ContentIcon className={`w-5 h-5 ${risk.color}`} />
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide ${risk.color}`}>
            {risk.emoji} {risk.label}
          </span>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${risk.bg} ${risk.color} ${risk.border}`}>
              {contentMeta?.emoji} {contentMeta?.label}
            </span>
            {item.resubmit_count > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                🔄 {item.resubmit_count}e soumission
              </span>
            )}
            {isNew && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                🌱 Nouveau membre
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {item.content_title || '(Sans titre)'}
          </h3>
          {item.content_excerpt && (
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.content_excerpt}</p>
          )}

          {item.validation_errors && item.validation_errors.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.validation_errors.slice(0, 3).map((err, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                  ⚠ {err.label || err.field}
                </span>
              ))}
              {item.validation_errors.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  +{item.validation_errors.length - 3} autres
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <Avatar
                src={item.author?.avatar_url}
                name={item.author?.full_name || '?'}
                size="xs"
              />
              <span className="text-xs text-gray-600 font-medium">
                {item.author?.full_name || 'Inconnu'}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${trustCfg.color} ${trustCfg.bg} ${trustCfg.border}`}>
                {trustCfg.emoji} {trustCfg.label}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {formatRelative(item.submitted_at)}
            </span>
          </div>
        </div>

        {/* Complétude */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2 sm:flex-shrink-0">
          <div className="text-center">
            <div className={`text-lg font-black ${
              item.completeness >= 80 ? 'text-emerald-600' :
              item.completeness >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>{item.completeness}%</div>
            <div className="text-[10px] text-gray-400">complétude</div>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-colors ${
                  item.completeness >= 80 ? 'bg-emerald-400' :
                  item.completeness >= 50 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${item.completeness}%` }}
              />
            </div>
          </div>

          <ModerationBadge status={item.status} size="xs" showDot />

          {item.status === 'en_attente_validation' && (
            <div className="flex gap-1">
              <button
                onClick={() => onQuickDecision(item.id, 'accepter')}
                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                title="Accepter"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onQuickDecision(item.id, 'refuser')}
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                title="Refuser"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          <Link
            href={`/admin/moderation/${item.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Examiner
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
