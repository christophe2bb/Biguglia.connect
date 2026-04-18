'use client';

import { Star } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import { formatRelative } from '@/lib/utils';
import type { Review } from '@/types';

interface ReviewsPanelProps {
  reviews: Review[];
  loading: boolean;
  avgRating: number;
  reviewCount: number;
}

export default function ReviewsPanel({ reviews, loading, avgRating, reviewCount }: ReviewsPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400" /> Avis clients
        </h2>
        {reviewCount > 0 && (
          <span className="text-sm text-gray-500">{avgRating}★ sur {reviewCount} avis</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200">
          <Star className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="font-medium text-gray-600">Pas encore d&apos;avis</p>
          <p className="text-sm text-gray-400 mt-1">Les avis de vos clients apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  src={(review.reviewer as { avatar_url?: string })?.avatar_url}
                  name={(review.reviewer as { full_name?: string })?.full_name || 'Client'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-800 text-sm">
                      {(review.reviewer as { full_name?: string })?.full_name || 'Client'}
                    </span>
                    <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                  {review.comment && (
                    <p className="text-sm text-gray-600 mt-1.5 leading-snug">{review.comment}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
