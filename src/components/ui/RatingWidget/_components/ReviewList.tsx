'use client';

import { useState } from 'react';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Stars from './Stars';
import type { ReviewRow } from '../_types';

interface ReviewListProps {
  targetType: string;
  targetId: string;
}

export default function ReviewList({ targetType, targetId }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('item_ratings')
      .select('id, rating, comment, created_at, user:profiles!item_ratings_user_id_fkey(full_name, avatar_url)')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .not('comment', 'is', null)
      .neq('comment', '')
      .order('created_at', { ascending: false })
      .limit(10);
    setReviews((data || []) as unknown as ReviewRow[]);
    setLoading(false);
  };

  const toggle = () => {
    if (!open) load();
    setOpen(v => !v);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <MessageSquare className="w-4 h-4 text-gray-400" />
        Commentaires
        <span className="ml-auto">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
          {loading ? (
            <div className="space-y-2 pt-3">
              {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun commentaire écrit.</p>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="pt-3 border-t border-gray-50 first:border-0 first:pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {r.user?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">
                      {r.user?.full_name || 'Anonyme'}
                    </p>
                    <Stars rating={r.rating} size="xs" />
                  </div>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
