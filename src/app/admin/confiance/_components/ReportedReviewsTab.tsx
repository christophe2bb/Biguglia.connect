'use client';

import Link from 'next/link';
import {
  CheckCircle, Eye, EyeOff, Flag, Loader2, Star, Tag, XCircle, ChevronRight,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { cn, formatRelative } from '@/lib/utils';
import { THEME_CONFIG, type InteractionSourceType } from '@/lib/trust';
import type { AdminReviewEntry } from '@/app/api/admin/confiance/route';

interface ReportedReviewsTabProps {
  reviews: AdminReviewEntry[];
  moderating: string | null;
  onModerate: (id: string, action: 'visible' | 'hidden' | 'deleted') => void;
}

export default function ReportedReviewsTab({ reviews, moderating, onModerate }: ReportedReviewsTabProps) {
  const reportedOnly = reviews.filter(r => r.moderation_status === 'reported');

  if (reportedOnly.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
        <p className="font-bold text-gray-700">Aucun avis signalé</p>
        <p className="text-sm text-gray-500 mt-1">Tous les avis ont été modérés.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reportedOnly.map(review => {
        const cfg = THEME_CONFIG[review.source_type as InteractionSourceType];
        const isMod = moderating === review.id;
        return (
          <div key={review.id} className="bg-white border-2 border-orange-200 rounded-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar src={review.author?.avatar_url} name={review.author?.full_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">{review.author?.full_name || 'Anonyme'}</span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="text-sm font-bold text-gray-700">{review.target_user?.full_name || '?'}</span>
                  <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Flag className="w-2.5 h-2.5" /> Signalé
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded">
                    {cfg?.emoji} {cfg?.label || review.source_type}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-700 italic bg-gray-50 rounded-lg p-2">&quot;{review.comment}&quot;</p>
                )}
                {review.review_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {review.review_tags.map((t: { tag: string }) => (
                      <span key={t.tag} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" /> {t.tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-gray-100 pt-3">
              <button
                onClick={() => onModerate(review.id, 'visible')}
                disabled={isMod}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {isMod ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                Restaurer
              </button>
              <button
                onClick={() => onModerate(review.id, 'hidden')}
                disabled={isMod}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <EyeOff className="w-3.5 h-3.5" /> Masquer
              </button>
              <button
                onClick={() => onModerate(review.id, 'deleted')}
                disabled={isMod}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Supprimer
              </button>
              <Link
                href={`/profil/${review.target_user?.id}`}
                className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                Voir profil <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
