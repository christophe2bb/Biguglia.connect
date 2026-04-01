'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star, ArrowLeft, Award, ThumbsUp, Send, Clock,
  ChevronRight, Loader2, MessageSquare,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn, formatRelative } from '@/lib/utils';
import ProtectedPage from '@/components/providers/ProtectedPage';
import Avatar from '@/components/ui/Avatar';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  target_type: string;
  target_id: string;
  created_at: string;
  authorName: string;
  authorAvatar?: string;
  authorId: string;
  isReceived: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const TARGET_LABEL: Record<string, string> = {
  listing: 'Annonce', equipment: 'Matériel', help_request: 'Coup de main',
  outing: 'Promenade', event: 'Événement', association: 'Association',
  service_request: 'Service artisan',
};

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn(sz, s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200')} />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <Avatar src={review.authorAvatar} name={review.authorName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <span className="text-sm font-bold text-gray-900">{review.authorName}</span>
              <span className="text-xs text-gray-400 ml-2">
                {review.isReceived ? '→ vous a évalué' : '← vous avez évalué'}
              </span>
            </div>
            <StarDisplay rating={review.rating} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {TARGET_LABEL[review.target_type] || review.target_type}
            </span>
            <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
          </div>
          {review.comment ? (
            <p className="text-sm text-gray-700 leading-relaxed italic">"{review.comment}"</p>
          ) : (
            <p className="text-xs text-gray-400 italic">Aucun commentaire</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function MesAvisContent() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<ReviewItem[]>([]);
  const [given, setGiven] = useState<ReviewItem[]>([]);
  const [tab, setTab] = useState<'received' | 'given'>('received');

  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      const [{ data: recvData }, { data: givenData }] = await Promise.all([
        // Reviews received (I am the target_user)
        supabase.from('reviews')
          .select('id, rating, comment, target_type, target_id, created_at, author:profiles!reviews_author_id_fkey(id, full_name, avatar_url)')
          .eq('target_user_id', profile.id)
          .order('created_at', { ascending: false }),
        // Reviews given (I am the author)
        supabase.from('reviews')
          .select('id, rating, comment, target_type, target_id, created_at, target_user:profiles!reviews_target_user_id_fkey(id, full_name, avatar_url)')
          .eq('author_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

      setReceived((recvData || []).map((r: Record<string, unknown>) => {
        const author = r.author as Record<string, unknown> | null;
        return {
          id: r.id as string,
          rating: r.rating as number,
          comment: r.comment as string | undefined,
          target_type: r.target_type as string,
          target_id: r.target_id as string,
          created_at: r.created_at as string,
          authorName: (author?.full_name as string) || 'Anonyme',
          authorAvatar: author?.avatar_url as string | undefined,
          authorId: author?.id as string,
          isReceived: true,
        };
      }));

      setGiven((givenData || []).map((r: Record<string, unknown>) => {
        const targetUser = r.target_user as Record<string, unknown> | null;
        return {
          id: r.id as string,
          rating: r.rating as number,
          comment: r.comment as string | undefined,
          target_type: r.target_type as string,
          target_id: r.target_id as string,
          created_at: r.created_at as string,
          authorName: (targetUser?.full_name as string) || 'Anonyme',
          authorAvatar: targetUser?.avatar_url as string | undefined,
          authorId: targetUser?.id as string,
          isReceived: false,
        };
      }));

      setLoading(false);
    };
    load();
  }, [profile?.id]);

  const avgRating = received.length > 0
    ? Math.round(received.reduce((s, r) => s + r.rating, 0) / received.length * 10) / 10
    : null;

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: received.filter(r => r.rating === star).length,
    pct: received.length > 0 ? (received.filter(r => r.rating === star).length / received.length) * 100 : 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-black text-gray-900">Mes avis</h1>
            {received.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                ⭐ {avgRating}/5
              </span>
            )}
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTab('received')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all',
                tab === 'received' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              <ThumbsUp className="w-3.5 h-3.5" /> Reçus
              <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {received.length}
              </span>
            </button>
            <button
              onClick={() => setTab('given')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all',
                tab === 'given' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              <Send className="w-3.5 h-3.5" /> Donnés
              <span className="bg-gray-400 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {given.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Summary card (only for received) */}
        {tab === 'received' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
            {received.length === 0 ? (
              <div className="text-center py-2">
                <Award className="w-10 h-10 mx-auto mb-2 text-amber-200" />
                <p className="font-bold text-amber-800">Pas encore d'avis reçus</p>
                <p className="text-sm text-amber-600 mt-1 mb-4">Terminez vos premiers échanges pour recevoir des évaluations de confiance.</p>
                <Link href="/mes-echanges" className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors">
                  Mes échanges <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Big rating */}
                <div className="text-center flex-shrink-0">
                  <div className="text-5xl font-black text-amber-700">{avgRating}</div>
                  <div className="text-sm text-amber-600 mt-0.5">/ 5</div>
                  <StarDisplay rating={Math.round(avgRating || 0)} size="md" />
                  <p className="text-xs text-amber-600 mt-1 font-semibold">{received.length} avis</p>
                </div>
                {/* Distribution */}
                <div className="flex-1 w-full">
                  {ratingDist.map(({ star, count, pct }) => (
                    <div key={star} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-amber-700 font-bold w-3">{star}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 bg-amber-100 rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-amber-600 w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Reviews list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : tab === 'received' ? (
          received.length === 0 ? null : (
            <div className="space-y-3">
              {received.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )
        ) : (
          given.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Vous n'avez pas encore laissé d'avis</p>
              <p className="text-xs mt-1">Évaluez vos partenaires d'échange pour construire une communauté de confiance.</p>
              <Link href="/mes-echanges?filter=to_review" className="inline-flex items-center gap-1.5 mt-4 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors">
                <Clock className="w-4 h-4" /> Échanges à évaluer
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {given.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )
        )}

        {/* ── Pending reviews CTA */}
        <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Avis en attente</p>
            <p className="text-xs text-gray-500">Avez-vous des échanges terminés à évaluer ?</p>
          </div>
          <Link href="/mes-echanges?filter=to_review"
            className="flex-shrink-0 flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors">
            Voir <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function MesAvisPage() {
  return <ProtectedPage><MesAvisContent /></ProtectedPage>;
}
