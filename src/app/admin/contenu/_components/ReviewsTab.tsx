'use client';

import { useState } from 'react';
import { Trash2, HardHat, ThumbsDown } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/utils';
import { ConfirmModal, StarRating } from '../_config';
import ContentFilters from './ContentFilters';
import ContentTable from './ContentTable';
import { useReviews } from '../_hooks/useReviews';
import type { ConfirmTarget } from '../_types';

const RATING_OPTIONS = [
  { value: '',  label: 'Toutes notes'     },
  { value: '1', label: '⭐ 1/5'           },
  { value: '2', label: '⭐⭐ 2/5'         },
  { value: '3', label: '⭐⭐⭐ 3/5'       },
  { value: '4', label: '⭐⭐⭐⭐ 4/5'     },
  { value: '5', label: '⭐⭐⭐⭐⭐ 5/5'   },
];

export default function ReviewsTab() {
  const {
    items, loading,
    search, setSearch,
    ratingFilter, setRatingFilter,
    fetchReviews, deleteItem,
  } = useReviews();

  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  return (
    <div>
      <ConfirmModal
        open={!!confirm}
        title="Supprimer l'avis"
        message={`Supprimer définitivement cet avis : "${confirm?.label}" ?`}
        onConfirm={() => { if (confirm) { deleteItem(confirm.id); setConfirm(null); } }}
        onCancel={() => setConfirm(null)}
      />

      <ContentFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher commentaire, auteur, artisan..."
        selectValue={ratingFilter}
        onSelectChange={setRatingFilter}
        selectOptions={RATING_OPTIONS}
        onRefresh={fetchReviews}
        count={items.length}
        countLabel="avis"
      />

      <ContentTable loading={loading} empty={items.length === 0} emptyMessage="Aucun avis trouvé">
        {items.map(review => (
          <div key={review.id} className="bg-white border rounded-xl p-4 flex items-start gap-4">
            <Avatar src={review.reviewer?.avatar_url} name={review.reviewer?.full_name || '?'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <StarRating rating={review.rating} />
                {review.artisan && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <HardHat className="w-3 h-3" />
                    {review.artisan.business_name}
                  </span>
                )}
                {review.rating <= 2 && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3" />Mauvaise note
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 line-clamp-2 mb-0.5">{review.comment}</p>
              <div className="text-xs text-gray-500">
                Par <span className="font-medium">{review.reviewer?.full_name || review.reviewer?.email}</span>
                {' · '}{formatRelative(review.created_at)}
              </div>
            </div>
            <button
              onClick={() => setConfirm({ id: review.id, label: review.comment?.slice(0, 60) + '…' })}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex-shrink-0"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </ContentTable>
    </div>
  );
}
