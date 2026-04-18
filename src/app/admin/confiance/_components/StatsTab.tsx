'use client';

import { BarChart3, Star, TrendingUp, AlertTriangle, ThumbsUp, EyeOff, XCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { THEME_CONFIG, type InteractionSourceType } from '@/lib/trust';
import type { AdminReviewEntry, AdminRiskMember, AdminThemeStat } from '@/app/api/admin/confiance/route';
import { adminFetch } from '@/lib/admin-fetch';
import toast from 'react-hot-toast';

interface StatsTabProps {
  reviews: AdminReviewEntry[];
  riskMembers: AdminRiskMember[];
  themeStats: AdminThemeStat[];
  moderating: string | null;
  onModerate: (id: string, action: 'visible' | 'hidden' | 'deleted') => void;
}

export default function StatsTab({ reviews, riskMembers, themeStats, moderating, onModerate }: StatsTabProps) {
  const summaryCards = [
    { label: 'Avis total',      value: themeStats.reduce((s, t) => s + t.total_reviews, 0), icon: Star,          color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Thèmes actifs',   value: themeStats.length,                                     icon: TrendingUp,    color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'Membres à risque', value: riskMembers.length,                                   icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-3">
        {summaryCards.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-2xl p-4 border border-current/10', s.bg)}>
              <Icon className={cn('w-6 h-6 mb-2', s.color)} />
              <div className={cn('text-3xl font-black', s.color)}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Theme chart */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-500" /> Avis par thème
        </h3>
        <div className="space-y-3">
          {themeStats.map(stat => {
            const cfg = THEME_CONFIG[stat.source_type as InteractionSourceType];
            const maxCount = Math.max(...themeStats.map(s => s.total_reviews), 1);
            return (
              <div key={stat.source_type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">
                    {cfg?.emoji || '•'} {cfg?.label || stat.source_type}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={cn('w-3 h-3', s <= Math.round(stat.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 font-semibold w-8 text-right">{stat.total_reviews}</span>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-700"
                    style={{ width: `${(stat.total_reviews / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent visible reviews */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
          <ThumbsUp className="w-5 h-5 text-emerald-500" /> Derniers avis publiés
        </h3>
        <div className="space-y-3">
          {reviews.filter(r => r.moderation_status === 'visible').slice(0, 10).map(review => {
            const cfg = THEME_CONFIG[review.source_type as InteractionSourceType];
            return (
              <div key={review.id} className="border border-gray-100 rounded-xl p-3 flex items-start gap-2">
                <Avatar src={review.author?.avatar_url} name={review.author?.full_name || '?'} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-800">{review.author?.full_name}</span>
                    <span className="text-[10px] text-gray-400">→</span>
                    <span className="text-xs font-semibold text-gray-700">{review.target_user?.full_name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {cfg?.emoji} {cfg?.label}
                    </span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={cn('w-3 h-3', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">&quot;{review.comment}&quot;</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => onModerate(review.id, 'hidden')}
                    disabled={moderating === review.id}
                    aria-label="Masquer cet avis"
                    className="p-1 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onModerate(review.id, 'deleted')}
                    disabled={moderating === review.id}
                    aria-label="Supprimer cet avis"
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
