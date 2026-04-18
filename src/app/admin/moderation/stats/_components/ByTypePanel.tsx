

/**
 * ByTypePanel — Répartition par thème (type de contenu) + décisions récentes.
 * Composant pur, reçoit les données du parent.
 */

import Link from 'next/link';
import {
  BarChart3, Clock, ChevronRight,
  Package, Wrench, Heart, Footprints, Calendar, MapPin,
  BookOpen, Handshake, Star,
} from 'lucide-react';
import type { ModerationStatsData, ContentType, ByTypeStat, RecentDecision } from '@/app/api/admin/moderation/stats-data/route';
import { CONTENT_TYPE_LABELS } from '@/lib/moderation';
import { formatRelative } from '@/lib/utils';

const CONTENT_ICONS: Record<ContentType, React.ElementType> = {
  listing: Package, equipment: Wrench, help_request: Heart,
  outing: Footprints, event: Calendar, lost_found: MapPin,
  collection_item: Star, association: Handshake, forum_post: BookOpen,
};

interface Props { stats: ModerationStatsData }

export default function ByTypePanel({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Répartition par thème */}
      {stats.byType.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Répartition par thème
          </h2>
          <div className="space-y-3">
            {stats.byType.map(({ type, count, pending, refused }: ByTypeStat) => {
              const meta = CONTENT_TYPE_LABELS[type as ContentType];
              const Icon = CONTENT_ICONS[type as ContentType] || Package;
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-700 w-28 flex-shrink-0">
                    {meta?.emoji} {meta?.label}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full"
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-8 text-right">{count}</span>
                  {pending > 0 && (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                      {pending} en attente
                    </span>
                  )}
                  {refused > 0 && (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                      {refused} refusées
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Décisions récentes */}
      {stats.recentDecisions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Décisions récentes
          </h2>
          <div className="space-y-2.5">
            {stats.recentDecisions.map((dec: RecentDecision) => {
              const Icon = CONTENT_ICONS[dec.content_type as ContentType] || Package;
              const statusColor =
                dec.status === 'publie' ? 'text-emerald-600' :
                dec.status === 'refuse'  ? 'text-red-600' :
                'text-amber-600';
              const statusEmoji =
                dec.status === 'publie' ? '✅' :
                dec.status === 'refuse'  ? '❌' : '✏️';
              return (
                <Link
                  key={dec.id}
                  href={`/admin/moderation/${dec.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{dec.content_title}</p>
                    <p className="text-[10px] text-gray-400">
                      {dec.author?.full_name} · {formatRelative(dec.reviewed_at)}
                    </p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${statusColor}`}>
                    {statusEmoji}
                  </span>
                  <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
