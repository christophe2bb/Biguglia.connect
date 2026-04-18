

import Link from 'next/link';
import { Star } from 'lucide-react';
import { cn, formatRelative } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import type { useDashboardData } from '@/hooks/useDashboardData';
import { SectionHeader, SkeletonRows } from '../_components/DashWidgets';

type DashData = ReturnType<typeof useDashboardData>;
interface Props { dashData: DashData }

export default function AvisTab({ dashData }: Props) {
  const { stats, recentReviews, loading } = dashData;

  return (
    <div className="space-y-5">
      <SectionHeader icon={Star} title="Mes avis"
        subtitle="Réputation, avis reçus et donnés"
        color="text-amber-600" href="/dashboard/avis" linkLabel="Voir tout" />

      {/* ── Global rating ─── */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
        {stats.totalReviewsReceived === 0 ? (
          <div className="text-center">
            <Star className="w-12 h-12 mx-auto mb-3 text-amber-200" />
            <p className="font-bold text-amber-800">Pas encore d&apos;avis</p>
            <p className="text-sm text-amber-600 mt-1">Complétez vos premiers échanges pour recevoir des évaluations</p>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="text-center flex-shrink-0">
              <div className="text-5xl font-black text-amber-700">{stats.averageRating}</div>
              <div className="text-sm text-amber-600 mt-0.5">/ 5</div>
            </div>
            <div className="flex-1">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={cn('w-5 h-5', s <= Math.round(stats.averageRating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                ))}
              </div>
              <p className="text-sm text-amber-700 font-semibold">{stats.totalReviewsReceived} avis reçus</p>
              {stats.reviewsToGive > 0 && (
                <Link href="/mes-echanges?filter=to_review"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                  <Star className="w-3 h-3" /> {stats.reviewsToGive} avis à laisser
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Reviews list ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" /> Avis reçus
          </h3>
        </div>
        <div className="p-4">
          {loading ? <SkeletonRows n={3} h="h-16" /> :
           recentReviews.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun avis pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map(r => (
                <div key={r.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Avatar src={r.authorAvatar} name={r.authorName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900">{r.authorName}</span>
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={cn('w-3.5 h-3.5', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-700 mt-1 leading-relaxed">{r.comment}</p>}
                      <p className="text-xs text-gray-400 mt-1">{formatRelative(r.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <Link href="/dashboard/avis" className="block text-center text-xs font-semibold text-amber-600 hover:text-amber-700 py-2">
                Voir tous les avis →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
