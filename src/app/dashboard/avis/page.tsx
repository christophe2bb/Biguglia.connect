'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Star, ArrowLeft, Award, ThumbsUp, Send, Clock,
  ChevronRight, Loader2, MessageSquare, Shield,
  Tag, CheckCircle, AlertCircle, Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { cn, formatRelative } from '@/lib/utils';
import ProtectedPage from '@/components/providers/ProtectedPage';
import Avatar from '@/components/ui/Avatar';
import ReviewForm from '@/components/ui/ReviewForm';
import { TrustScoreCard, BadgePill } from '@/components/ui/TrustScore';
import {
  fetchTrustStats,
  fetchProfileBadges,
  THEME_CONFIG,
  type TrustProfileStats,
  type BadgeCode,
  type InteractionSourceType,
} from '@/lib/trust';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  source_type: string;
  source_id: string;
  created_at: string;
  author?: { id: string; full_name: string; avatar_url?: string };
  target_user?: { id: string; full_name: string; avatar_url?: string };
  would_recommend?: boolean | null;
  tags?: string[];
  isReceived: boolean;
}

interface PendingInteraction {
  id: string;
  source_type: InteractionSourceType;
  source_id: string;
  requester_id: string;
  receiver_id: string;
  review_requester_done: boolean;
  review_receiver_done: boolean;
  completed_at: string | null;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  source_title?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
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
  const otherUser = review.isReceived ? review.author : review.target_user;
  const cfg = THEME_CONFIG[review.source_type as InteractionSourceType];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <Avatar src={otherUser?.avatar_url} name={otherUser?.full_name || '?'} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div>
              <span className="text-sm font-bold text-gray-900">{otherUser?.full_name || 'Anonyme'}</span>
              <span className="text-xs text-gray-400 ml-2">
                {review.isReceived ? '→ vous a évalué' : '← vous avez évalué'}
              </span>
            </div>
            <StarDisplay rating={review.rating} />
          </div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {cfg?.emoji} {cfg?.label || review.source_type}
            </span>
            <span className="text-xs text-gray-400">{formatRelative(review.created_at)}</span>
            {review.would_recommend === true && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <ThumbsUp className="w-2.5 h-2.5" /> Recommande
              </span>
            )}
          </div>
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {review.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-100 flex items-center gap-0.5">
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          )}
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

// ─── PendingReviewCard ─────────────────────────────────────────────────────────
function PendingReviewCard({
  interaction, userId, onDone,
}: { interaction: PendingInteraction; userId: string; onDone: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const cfg = THEME_CONFIG[interaction.source_type];
  const isRequester = interaction.requester_id === userId;
  const alreadyDone = isRequester
    ? interaction.review_requester_done
    : interaction.review_receiver_done;

  if (alreadyDone) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4">
      {showForm ? (
        <ReviewForm
          interactionId={interaction.id}
          sourceType={interaction.source_type}
          sourceId={interaction.source_id}
          sourceTitle={interaction.source_title}
          targetUserId={interaction.other_user_id}
          targetUserName={interaction.other_user_name}
          targetUserAvatar={interaction.other_user_avatar}
          variant="inline"
          onSuccess={() => { setShowForm(false); onDone(); }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <div className="flex items-center gap-3">
          <Avatar src={interaction.other_user_avatar} name={interaction.other_user_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-gray-900">
              Évaluez <span className="text-amber-700">{interaction.other_user_name}</span>
            </p>
            <p className="text-xs text-gray-600 truncate mt-0.5">
              {cfg?.emoji} {cfg?.label || interaction.source_type}
              {interaction.source_title ? ` — ${interaction.source_title}` : ''}
            </p>
            {interaction.completed_at && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Terminé {formatRelative(interaction.completed_at)}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
          >
            <Star className="w-3.5 h-3.5" /> Évaluer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function MesAvisContent() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState<ReviewItem[]>([]);
  const [given, setGiven] = useState<ReviewItem[]>([]);
  const [pending, setPending] = useState<PendingInteraction[]>([]);
  const [trustStats, setTrustStats] = useState<TrustProfileStats | null>(null);
  const [trustBadges, setTrustBadges] = useState<BadgeCode[]>([]);
  const [tab, setTab] = useState<'score' | 'received' | 'given' | 'pending'>('score');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();

    const [
      { data: recvData },
      { data: givenData },
      { data: pendingData },
      stats,
      badges,
    ] = await Promise.all([
      // Reviews received — use new unified reviews table with unified fields
      supabase.from('reviews')
        .select('id, rating, comment, source_type, source_id, created_at, would_recommend, author:profiles!reviews_author_id_fkey(id, full_name, avatar_url), review_tags(tag)')
        .eq('target_user_id', profile.id)
        .eq('moderation_status', 'visible')
        .order('created_at', { ascending: false }),

      // Reviews given
      supabase.from('reviews')
        .select('id, rating, comment, source_type, source_id, created_at, would_recommend, target_user:profiles!reviews_target_user_id_fkey(id, full_name, avatar_url), review_tags(tag)')
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false }),

      // Pending interactions to review
      supabase.from('trust_interactions')
        .select('id, source_type, source_id, requester_id, receiver_id, review_requester_done, review_receiver_done, completed_at')
        .or(`requester_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .eq('review_unlocked', true)
        .eq('status', 'done'),

      fetchTrustStats(profile.id),
      fetchProfileBadges(profile.id),
    ]);

    // Enrich pending interactions
    const enrichedPending: (PendingInteraction | null)[] = await Promise.all(
      (pendingData || []).map(async (row: Record<string, unknown>) => {
        const isRequester = row.requester_id === profile.id;
        const alreadyDone = isRequester ? row.review_requester_done : row.review_receiver_done;
        if (alreadyDone) return null;

        const otherId = isRequester ? row.receiver_id : row.requester_id;
        const { data: otherProfile } = await supabase
          .from('profiles').select('full_name, avatar_url').eq('id', otherId as string).maybeSingle();

        // Try to get source title
        let sourceTitle = '';
        const tableMap: Record<string, string> = {
          listing: 'listings', equipment: 'equipment_items',
          help_request: 'help_requests', association: 'associations',
          outing: 'group_outings', event: 'local_events',
          service_request: 'service_requests', lost_found: 'lost_found_items',
        };
        const tbl = tableMap[row.source_type as string];
        if (tbl) {
          const { data: src } = await supabase.from(tbl).select('title, name').eq('id', row.source_id as string).maybeSingle();
          sourceTitle = (src as Record<string, unknown> | null)?.title as string || (src as Record<string, unknown> | null)?.name as string || '';
        }

        return {
          id: row.id as string,
          source_type: row.source_type as InteractionSourceType,
          source_id: row.source_id as string,
          requester_id: row.requester_id as string,
          receiver_id: row.receiver_id as string,
          review_requester_done: row.review_requester_done as boolean,
          review_receiver_done: row.review_receiver_done as boolean,
          completed_at: row.completed_at as string | null,
          other_user_id: otherId as string,
          other_user_name: (otherProfile?.full_name as string) || 'Membre',
          other_user_avatar: otherProfile?.avatar_url as string | undefined,
          source_title: sourceTitle,
        } as PendingInteraction;
      })
    );

    setReceived((recvData || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      rating: r.rating as number,
      comment: r.comment as string | undefined,
      source_type: r.source_type as string,
      source_id: r.source_id as string,
      created_at: r.created_at as string,
      would_recommend: r.would_recommend as boolean | null | undefined,
      author: r.author as ReviewItem['author'],
      tags: ((r.review_tags as Array<{ tag: string }>) || []).map(t => t.tag),
      isReceived: true,
    })));

    setGiven((givenData || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      rating: r.rating as number,
      comment: r.comment as string | undefined,
      source_type: r.source_type as string,
      source_id: r.source_id as string,
      created_at: r.created_at as string,
      would_recommend: r.would_recommend as boolean | null | undefined,
      target_user: r.target_user as ReviewItem['target_user'],
      tags: ((r.review_tags as Array<{ tag: string }>) || []).map(t => t.tag),
      isReceived: false,
    })));

    setPending(enrichedPending.filter(Boolean) as PendingInteraction[]);
    setTrustStats(stats);
    setTrustBadges(badges);
    setLoading(false);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

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
            <h1 className="text-lg font-black text-gray-900">Confiance & Avis</h1>
            {avgRating && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                ⭐ {avgRating}/5
              </span>
            )}
            {pending.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {pending.length} à laisser
              </span>
            )}
          </div>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'score',    label: 'Mon score',    icon: Shield,      color: 'purple' },
              { id: 'pending',  label: `À laisser${pending.length ? ` (${pending.length})` : ''}`, icon: AlertCircle, color: 'red', urgent: pending.length > 0 },
              { id: 'received', label: `Reçus${received.length ? ` (${received.length})` : ''}`, icon: ThumbsUp, color: 'amber' },
              { id: 'given',    label: `Donnés${given.length ? ` (${given.length})` : ''}`,    icon: Send,      color: 'gray' },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as typeof tab)}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                    tab === t.id
                      ? t.urgent
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── Score tab ──────────────────────────────────────────────────── */}
            {tab === 'score' && profile && (
              <div className="space-y-4">
                <TrustScoreCard
                  profile={{ id: profile.id, created_at: profile.created_at, role: profile.role, avatar_url: profile.avatar_url, phone: (profile as unknown as { phone?: string }).phone }}
                  stats={trustStats}
                  badges={trustBadges}
                  showDetails
                />

                {/* All badges */}
                {trustBadges.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Mes badges
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {trustBadges.map(b => <BadgePill key={b} code={b} size="md" />)}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {trustStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Échanges totaux', value: trustStats.interactions_total, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Terminés', value: trustStats.interactions_done, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Avis reçus', value: trustStats.reviews_received, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: '% recommandé', value: trustStats.recommend_pct != null ? `${trustStats.recommend_pct}%` : '—', color: 'text-purple-600', bg: 'bg-purple-50' },
                    ].map(s => (
                      <div key={s.label} className={cn('rounded-2xl p-3 text-center border border-current/10', s.bg)}>
                        <div className={cn('text-2xl font-black', s.color)}>{s.value}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4">
                  <p className="text-xs text-purple-700 leading-relaxed">
                    <strong>Score de confiance</strong> — calculé à partir de votre ancienneté, votre profil, vos échanges complétés et les avis reçus.
                    Plus vous interagissez et recevez de bons avis, plus votre score augmente. Les badges sont attribués automatiquement.
                  </p>
                </div>
              </div>
            )}

            {/* ── Pending tab ────────────────────────────────────────────────── */}
            {tab === 'pending' && (
              <div className="space-y-3">
                {pending.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
                    <p className="font-bold text-gray-700">Aucun avis en attente</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Vous avez évalué tous vos échanges terminés. Merci !
                    </p>
                    <Link href="/mes-echanges" className="inline-flex items-center gap-2 mt-4 bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors">
                      Mes échanges <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      <strong>{pending.length}</strong> échange{pending.length > 1 ? 's' : ''} terminé{pending.length > 1 ? 's' : ''} à évaluer.
                      Votre avis contribue à la confiance de la communauté.
                    </p>
                    {pending.map(interaction => (
                      <PendingReviewCard
                        key={interaction.id}
                        interaction={interaction}
                        userId={profile!.id}
                        onDone={load}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Received tab ───────────────────────────────────────────────── */}
            {tab === 'received' && (
              <>
                {/* Summary */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
                  {received.length === 0 ? (
                    <div className="text-center py-2">
                      <Award className="w-10 h-10 mx-auto mb-2 text-amber-200" />
                      <p className="font-bold text-amber-800">Pas encore d'avis reçus</p>
                      <p className="text-sm text-amber-600 mt-1 mb-4">Terminez vos premiers échanges pour recevoir des évaluations.</p>
                      <Link href="/mes-echanges" className="inline-flex items-center gap-2 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors">
                        Mes échanges <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="text-center flex-shrink-0">
                        <div className="text-5xl font-black text-amber-700">{avgRating}</div>
                        <div className="text-sm text-amber-600 mt-0.5">/ 5</div>
                        <div className="flex gap-0.5 justify-center mt-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={cn('w-4 h-4', s <= Math.round(avgRating || 0) ? 'fill-amber-400 text-amber-400' : 'text-amber-100')} />
                          ))}
                        </div>
                        <p className="text-xs text-amber-600 mt-1 font-semibold">{received.length} avis</p>
                      </div>
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

                {received.length > 0 && (
                  <div className="space-y-3">
                    {received.map(r => <ReviewCard key={r.id} review={r} />)}
                  </div>
                )}
              </>
            )}

            {/* ── Given tab ──────────────────────────────────────────────────── */}
            {tab === 'given' && (
              given.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Vous n'avez pas encore laissé d'avis</p>
                  <p className="text-xs mt-1">Évaluez vos partenaires d'échange après chaque interaction terminée.</p>
                  <button
                    onClick={() => setTab('pending')}
                    className="inline-flex items-center gap-1.5 mt-4 bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-amber-700 transition-colors"
                  >
                    <Clock className="w-4 h-4" /> Avis à laisser
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {given.map(r => <ReviewCard key={r.id} review={r} />)}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MesAvisPage() {
  return <ProtectedPage><MesAvisContent /></ProtectedPage>;
}
