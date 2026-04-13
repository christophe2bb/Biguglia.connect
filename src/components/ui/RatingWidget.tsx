'use client';

/**
 * RatingWidget — Système de notation crédible Biguglia Connect
 *
 * Règle : on ne peut noter que si on a eu une interaction réelle.
 * La moyenne, distribution et commentaires sont toujours publics.
 * Le formulaire n'est visible que pour les utilisateurs éligibles.
 *
 * Ce fichier est un orchestrateur mince + barrel de re-export.
 * Toute la logique se trouve dans RatingWidget/ :
 *   useRatingWidget   — state, load, submitRating, votePoll, eligible
 *   _eligibility.ts   — checkEligibility par type de source
 *   _config.ts        — POLL_CONFIG, ratingColor
 *   _types.ts         — RatingTargetType, RatingData, etc.
 *   _components/      — Stars, RatingForm, RatingSummary, PollPanel, ReviewList
 */

import { useEffect, useState, useMemo } from 'react';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

import { useRatingWidget }  from './RatingWidget/useRatingWidget';
import RatingSummary        from './RatingWidget/_components/RatingSummary';
import PollPanel            from './RatingWidget/_components/PollPanel';
import ReviewList           from './RatingWidget/_components/ReviewList';
import Stars                from './RatingWidget/_components/Stars';
import { ratingColor }      from './RatingWidget/_config';

export type { RatingTargetType } from './RatingWidget/_types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RatingWidgetProps {
  targetType: import('./RatingWidget/_types').RatingTargetType;
  targetId: string;
  authorId?: string;
  userId?: string | null;
  compact?: boolean;
  showPoll?: boolean;
  className?: string;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function RatingWidget({
  targetType, targetId, authorId, userId,
  compact = false, showPoll = true, className,
}: RatingWidgetProps) {
  const {
    data, loading, tableExists,
    eligible,
    open, setOpen,
    selectedRating, setSelected,
    comment, setComment,
    submitting, submitted, setSubmitted,
    myVote, pollVotes, votingPoll,
    submitRating, votePoll,
  } = useRatingWidget({ targetType, targetId, userId, authorId });

  if (!tableExists) return null;

  const isOwnItem = userId === authorId;

  // ── Mode compact ──────────────────────────────────────────────────────────────
  if (compact) {
    if (loading) return <div className="h-4 w-16 bg-gray-100 animate-pulse rounded" />;
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <Stars rating={data.avg} size="xs" />
        {data.count > 0 && (
          <span className={cn('text-xs font-bold', ratingColor(data.avg))}>
            {data.avg.toFixed(1)}
          </span>
        )}
        <span className="text-xs text-gray-400">
          ({data.count > 0 ? `${data.count} avis` : 'Pas encore noté'})
        </span>
      </div>
    );
  }

  // ── Mode complet ──────────────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-3', className)}>

      <RatingSummary
        data={data}
        isOwnItem={isOwnItem}
        userId={userId}
        eligible={eligible}
        open={open}
        setOpen={setOpen}
        selectedRating={selectedRating}
        setSelected={setSelected}
        comment={comment}
        setComment={setComment}
        submitting={submitting}
        submitted={submitted}
        setSubmitted={setSubmitted}
        onSubmit={submitRating}
      />

      {showPoll && eligible && data.myRating && data.myRating >= 1 && (
        <PollPanel
          targetType={targetType}
          pollVotes={pollVotes}
          myVote={myVote}
          votingPoll={votingPoll}
          onVote={votePoll}
        />
      )}

      {data.count > 0 && (
        <ReviewList targetType={targetType} targetId={targetId} />
      )}
    </div>
  );
}

// ─── UserRatingBadge ──────────────────────────────────────────────────────────

export function UserRatingBadge({
  userId, artisanType, className,
}: {
  userId: string;
  artisanType?: 'professionnel' | 'particulier' | null;
  className?: string;
}) {
  const [avg, setAvg]     = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const supabase          = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('item_ratings')
      .select('rating')
      .eq('author_id', userId)
      .gte('rating', 1)
      .then(({ data }) => {
        if (!data?.length) return;
        const sum = data.reduce((s, r) => s + r.rating, 0);
        setAvg(sum / data.length);
        setCount(data.length);
      });
  }, [userId, supabase]);

  const isPro = artisanType === 'professionnel';

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {artisanType && (
        <span className={cn(
          'inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full border',
          isPro
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-green-50 border-green-200 text-green-700',
        )}>
          {isPro ? '🏢 PRO' : '👤 Particulier'}
        </span>
      )}
      {avg && count >= 1 && (
        <span className={cn(
          'inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200',
          ratingColor(avg),
        )}>
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          {avg.toFixed(1)}
          <span className="text-gray-400 font-normal">({count})</span>
        </span>
      )}
    </span>
  );
}
