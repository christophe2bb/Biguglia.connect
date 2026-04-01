'use client';

/**
 * RatingWidget — Système de notation universel Biguglia Connect
 *
 * Utilisable sur toutes les rubriques :
 *   - listing, equipment, help_request, lost_found, association,
 *     outing, collection_item, event, promenade, service_request
 *
 * Affiche :
 *   • Les étoiles de notation (1-5)
 *   • Le nombre de notes
 *   • Un mini-sondage contextuel par rubrique (optionnel)
 *   • Un formulaire d'ajout de note (si connecté et pas encore noté)
 */

import { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
export type RatingTargetType =
  | 'listing' | 'equipment' | 'help_request' | 'lost_found'
  | 'association' | 'outing' | 'collection_item' | 'event'
  | 'promenade' | 'service_request';

interface RatingData {
  avg: number;
  count: number;
  myRating: number | null;
  distribution: number[]; // index 0..4 = 1..5 étoiles
}

interface PollOption {
  label: string;
  emoji: string;
}

// ─── Config sondages par rubrique ─────────────────────────────────────────────
const POLL_CONFIG: Record<RatingTargetType, { question: string; options: PollOption[] }> = {
  listing: {
    question: 'Annonce conforme ?',
    options: [
      { label: 'Conforme', emoji: '✅' },
      { label: 'Prix ok', emoji: '💰' },
      { label: 'Bon état', emoji: '👍' },
      { label: 'À améliorer', emoji: '⚠️' },
    ],
  },
  equipment: {
    question: 'Matériel en bon état ?',
    options: [
      { label: 'Parfait état', emoji: '⭐' },
      { label: 'Bon état', emoji: '👍' },
      { label: 'Fonctionnel', emoji: '🔧' },
      { label: 'Usure visible', emoji: '⚠️' },
    ],
  },
  help_request: {
    question: 'Comment s\'est passée l\'entraide ?',
    options: [
      { label: 'Super aide', emoji: '🤝' },
      { label: 'Très réactif', emoji: '⚡' },
      { label: 'Agréable', emoji: '😊' },
      { label: 'À améliorer', emoji: '📝' },
    ],
  },
  lost_found: {
    question: 'Annonce utile ?',
    options: [
      { label: 'Très utile', emoji: '🔍' },
      { label: 'Bien décrit', emoji: '📝' },
      { label: 'Photo claire', emoji: '📷' },
      { label: 'Résolu !', emoji: '✅' },
    ],
  },
  association: {
    question: 'Votre avis sur l\'association ?',
    options: [
      { label: 'Très active', emoji: '🏃' },
      { label: 'Accueil top', emoji: '🤗' },
      { label: 'Projets intéressants', emoji: '💡' },
      { label: 'Bien organisée', emoji: '📋' },
    ],
  },
  outing: {
    question: 'La sortie était comment ?',
    options: [
      { label: 'Magnifique', emoji: '🌄' },
      { label: 'Bien organisée', emoji: '📋' },
      { label: 'Conviviale', emoji: '👥' },
      { label: 'Trop difficile', emoji: '😅' },
    ],
  },
  collection_item: {
    question: 'Article bien décrit ?',
    options: [
      { label: 'Rare & beau', emoji: '💎' },
      { label: 'Bien documenté', emoji: '📖' },
      { label: 'Prix correct', emoji: '💰' },
      { label: 'Photos nettes', emoji: '📷' },
    ],
  },
  event: {
    question: 'L\'événement était ?',
    options: [
      { label: 'Excellent !', emoji: '🎉' },
      { label: 'Bien organisé', emoji: '📋' },
      { label: 'Ambiance top', emoji: '🎶' },
      { label: 'À améliorer', emoji: '📝' },
    ],
  },
  promenade: {
    question: 'La promenade était ?',
    options: [
      { label: 'Superbe vue', emoji: '🌟' },
      { label: 'Bien balisée', emoji: '🗺️' },
      { label: 'Accessible', emoji: '👣' },
      { label: 'Difficile', emoji: '⛰️' },
    ],
  },
  service_request: {
    question: 'Prestation réalisée ?',
    options: [
      { label: 'Excellent travail', emoji: '⭐' },
      { label: 'Dans les délais', emoji: '⏱️' },
      { label: 'Prix honnête', emoji: '💰' },
      { label: 'Je recommande', emoji: '👍' },
    ],
  },
};

// ─── Couleur par note ─────────────────────────────────────────────────────────
function ratingColor(avg: number) {
  if (avg >= 4.5) return 'text-emerald-600';
  if (avg >= 3.5) return 'text-amber-500';
  if (avg >= 2.5) return 'text-orange-500';
  return 'text-red-500';
}

// ─── Stars display ────────────────────────────────────────────────────────────
function Stars({
  rating, interactive = false, size = 'sm', onRate,
}: {
  rating: number; interactive?: boolean; size?: 'xs' | 'sm' | 'md'; onRate?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const display = interactive ? (hovered || rating) : rating;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            sz, 'transition-all duration-100',
            i <= Math.round(display)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-200',
            interactive && 'cursor-pointer hover:scale-110'
          )}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate && onRate(i)}
        />
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RatingWidgetProps {
  targetType: RatingTargetType;
  targetId: string;
  authorId?: string;           // ID de l'auteur de l'item (pour badge sur profil)
  userId?: string | null;       // utilisateur connecté
  compact?: boolean;            // mode compact (dans les cartes)
  showPoll?: boolean;           // afficher le mini-sondage
  className?: string;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function RatingWidget({
  targetType, targetId, authorId, userId, compact = false, showPoll = true, className,
}: RatingWidgetProps) {
  const [data, setData] = useState<RatingData>({ avg: 0, count: 0, myRating: null, distribution: [0,0,0,0,0] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Poll
  const [myVote, setMyVote] = useState<number | null>(null);
  const [pollVotes, setPollVotes] = useState<number[]>([0, 0, 0, 0]);
  const [votingPoll, setVotingPoll] = useState(false);
  const [tableExists, setTableExists] = useState(true);

  const supabase = createClient();
  const pollConf = POLL_CONFIG[targetType];

  // ── Chargement ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Moyennes et distribution
      const { data: rows, error } = await supabase
        .from('item_ratings')
        .select('rating, user_id, poll_choice')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) {
        // Table n'existe pas encore
        if (error.code === '42P01') setTableExists(false);
        setLoading(false);
        return;
      }
      setTableExists(true);

      const dist = [0, 0, 0, 0, 0];
      const pVotes = [0, 0, 0, 0];
      let sum = 0;
      let myR: number | null = null;
      let myP: number | null = null;

      (rows || []).forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) {
          dist[r.rating - 1]++;
          sum += r.rating;
        }
        if (r.poll_choice !== null && r.poll_choice >= 0 && r.poll_choice < 4) {
          pVotes[r.poll_choice]++;
        }
        if (r.user_id === userId) {
          myR = r.rating;
          myP = r.poll_choice;
        }
      });

      const count = rows?.filter(r => r.rating >= 1 && r.rating <= 5).length || 0;
      setData({ avg: count > 0 ? sum / count : 0, count, myRating: myR, distribution: dist });
      setPollVotes(pVotes);
      setMyVote(myP);
      if (myR) setSelectedRating(myR);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Soumettre note ──────────────────────────────────────────────────────────
  const submitRating = async () => {
    if (!userId || !selectedRating || submitting) return;
    setSubmitting(true);
    try {
      await supabase.from('item_ratings').upsert({
        target_type: targetType,
        target_id: targetId,
        user_id: userId,
        rating: selectedRating,
        comment: comment.trim() || null,
        author_id: authorId || null,
      }, { onConflict: 'target_type,target_id,user_id' });
      setSubmitted(true);
      setOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Voter sondage ───────────────────────────────────────────────────────────
  const votePoll = async (idx: number) => {
    if (!userId || votingPoll || myVote !== null) return;
    setVotingPoll(true);
    try {
      await supabase.from('item_ratings').upsert({
        target_type: targetType,
        target_id: targetId,
        user_id: userId,
        rating: data.myRating ?? 0,
        poll_choice: idx,
        author_id: authorId || null,
      }, { onConflict: 'target_type,target_id,user_id' });
      setMyVote(idx);
      setPollVotes(prev => prev.map((v, i) => i === idx ? v + 1 : v));
    } finally {
      setVotingPoll(false);
    }
  };

  // ── Si table pas encore créée ────────────────────────────────────────────────
  if (!tableExists) return null;

  const totalPollVotes = pollVotes.reduce((a, b) => a + b, 0);
  const canRate = !!userId && userId !== authorId;

  // ── Mode compact (dans les cartes) ──────────────────────────────────────────
  if (compact) {
    if (loading) return <div className="h-4 w-16 bg-gray-100 animate-pulse rounded" />;
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Stars rating={data.avg} size="xs" />
        {data.count > 0 ? (
          <span className={cn('text-xs font-bold', ratingColor(data.avg))}>
            {data.avg.toFixed(1)}
          </span>
        ) : null}
        <span className="text-xs text-gray-400">
          ({data.count > 0 ? `${data.count} avis` : 'Pas encore noté'})
        </span>
      </div>
    );
  }

  // ── Mode complet ─────────────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-3', className)}>
      {/* ── Résumé ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Avis de la communauté
          </h3>
          {data.count > 0 && (
            <div className="flex items-center gap-1.5">
              <span className={cn('text-2xl font-black', ratingColor(data.avg))}>{data.avg.toFixed(1)}</span>
              <div>
                <Stars rating={data.avg} size="sm" />
                <p className="text-xs text-gray-400">{data.count} avis</p>
              </div>
            </div>
          )}
        </div>

        {/* Distribution */}
        {data.count > 0 && (
          <div className="space-y-1 mb-3">
            {[5, 4, 3, 2, 1].map(star => {
              const count = data.distribution[star - 1];
              const pct = data.count > 0 ? Math.round((count / data.count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-3">{star}</span>
                  <Star className="w-3 h-3 fill-amber-300 text-amber-300 flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', star >= 4 ? 'bg-emerald-400' : star === 3 ? 'bg-amber-400' : 'bg-red-300')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bouton noter */}
        {!canRate ? (
          !userId ? (
            <Link href="/connexion" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Connectez-vous pour noter
            </Link>
          ) : null
        ) : data.myRating ? (
          <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <Stars rating={data.myRating} size="sm" />
            <span className="text-xs text-emerald-700 font-semibold">Votre note : {data.myRating}/5</span>
            <button onClick={() => { setOpen(true); setSubmitted(false); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline">
              Modifier
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors"
          >
            <Star className="w-4 h-4" />
            {open ? 'Fermer' : 'Laisser un avis'}
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {/* Formulaire de notation */}
        {open && canRate && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Votre note :</p>
              <Stars
                rating={selectedRating}
                interactive
                size="md"
                onRate={setSelectedRating}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Commentaire (optionnel) :</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Partagez votre expérience…"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
                maxLength={300}
              />
            </div>
            <button
              onClick={submitRating}
              disabled={!selectedRating || submitting}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Star className="w-4 h-4 fill-white" />
              )}
              {submitting ? 'Envoi…' : 'Publier mon avis'}
            </button>
          </div>
        )}

        {submitted && (
          <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 text-sm font-semibold text-center">
            ✅ Merci pour votre avis !
          </div>
        )}
      </div>

      {/* ── Mini-sondage ── */}
      {showPoll && pollConf && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-blue-500" />
            {pollConf.question}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {pollConf.options.map((opt, idx) => {
              const votes = pollVotes[idx] || 0;
              const pct = totalPollVotes > 0 ? Math.round((votes / totalPollVotes) * 100) : 0;
              const isMyVote = myVote === idx;
              const hasVoted = myVote !== null;

              return (
                <button
                  key={idx}
                  onClick={() => !hasVoted && votePoll(idx)}
                  disabled={!userId || (hasVoted && !isMyVote) || votingPoll}
                  className={cn(
                    'relative overflow-hidden flex items-center gap-2 p-3 rounded-xl border text-sm transition-all text-left',
                    isMyVote
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-bold'
                      : hasVoted
                        ? 'border-gray-100 bg-gray-50 text-gray-500'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                  )}
                >
                  {/* Barre de progression en fond */}
                  {hasVoted && (
                    <div
                      className={cn('absolute inset-y-0 left-0 rounded-xl transition-all', isMyVote ? 'bg-blue-100' : 'bg-gray-100')}
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <span className="relative text-base">{opt.emoji}</span>
                  <span className="relative flex-1 text-xs font-medium leading-tight">{opt.label}</span>
                  {hasVoted && (
                    <span className={cn('relative text-xs font-black ml-auto', isMyVote ? 'text-blue-600' : 'text-gray-400')}>
                      {pct}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!userId && (
            <p className="text-xs text-gray-400 text-center mt-2">
              <Link href="/connexion" className="text-blue-500 hover:underline">Connectez-vous</Link> pour voter
            </p>
          )}
          {totalPollVotes > 0 && (
            <p className="text-xs text-gray-400 text-right mt-2">{totalPollVotes} vote{totalPollVotes > 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* ── Liste des commentaires ── */}
      {data.count > 0 && (
        <ReviewList targetType={targetType} targetId={targetId} />
      )}
    </div>
  );
}

// ─── Liste des commentaires ────────────────────────────────────────────────────
function ReviewList({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [reviews, setReviews] = useState<Array<{
    id: string; rating: number; comment: string | null; created_at: string;
    user: { full_name: string | null; avatar_url: string | null } | null;
  }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('item_ratings')
      .select('id, rating, comment, created_at, user:profiles!item_ratings_user_id_fkey(full_name, avatar_url)')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .not('comment', 'is', null)
      .neq('comment', '')
      .order('created_at', { ascending: false })
      .limit(10);
    setReviews((data || []) as unknown as typeof reviews);
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
        <span className="ml-auto">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
          {loading ? (
            <div className="space-y-2 pt-3">
              {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun commentaire écrit pour l&apos;instant.</p>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="pt-3 border-t border-gray-50 first:border-0 first:pt-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                    {r.user?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{r.user?.full_name || 'Anonyme'}</p>
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

// ─── Badge note utilisateur (affiché à côté du nom) ───────────────────────────
export function UserRatingBadge({ userId, className }: { userId: string; className?: string }) {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('item_ratings')
      .select('rating')
      .eq('author_id', userId)
      .gte('rating', 1)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const sum = data.reduce((s, r) => s + r.rating, 0);
        setAvg(sum / data.length);
        setCount(data.length);
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!avg || count < 2) return null;

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200', ratingColor(avg), className)}>
      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
      {avg.toFixed(1)}
      <span className="text-gray-400 font-normal">({count})</span>
    </span>
  );
}
