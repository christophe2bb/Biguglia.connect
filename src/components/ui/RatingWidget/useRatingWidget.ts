'use client';

/**
 * useRatingWidget — Toute la logique du widget de notation
 *
 * Expose :
 *   data, loading, tableExists          — état des notes agrégées
 *   eligible                            — null = vérif en cours
 *   open, setOpen                       — ouverture du formulaire
 *   selectedRating, setSelected         — étoiles sélectionnées
 *   comment, setComment                 — texte optionnel
 *   submitting, submitted               — état soumission
 *   myVote, pollVotes, votingPoll       — état sondage
 *   submitRating, votePoll              — actions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { checkEligibility } from './_eligibility';
import type { RatingData, RatingTargetType } from './_types';

const DEFAULT_DATA: RatingData = { avg: 0, count: 0, myRating: null, distribution: [0, 0, 0, 0, 0] };

export function useRatingWidget({
  targetType,
  targetId,
  userId,
  authorId,
}: {
  targetType: RatingTargetType;
  targetId: string;
  userId?: string | null;
  authorId?: string;
}) {
  const supabase = useMemo(() => createClient(), []);

  // ── Data state ───────────────────────────────────────────────────────────────
  const [data, setData]               = useState<RatingData>(DEFAULT_DATA);
  const [loading, setLoading]         = useState(true);
  const [tableExists, setTableExists] = useState(true);

  // ── Eligibility ───────────────────────────────────────────────────────────────
  const [eligible, setEligible]       = useState<boolean | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────────
  const [open, setOpen]               = useState(false);
  const [selectedRating, setSelected] = useState(0);
  const [comment, setComment]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);

  // ── Poll state ────────────────────────────────────────────────────────────────
  const [myVote, setMyVote]           = useState<number | null>(null);
  const [pollVotes, setPollVotes]     = useState<number[]>([0, 0, 0, 0]);
  const [votingPoll, setVotingPoll]   = useState(false);

  // ── Load ratings ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('item_ratings')
        .select('rating, user_id, poll_choice')
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (error) {
        if (error.code === '42P01') setTableExists(false);
        return;
      }
      setTableExists(true);

      const dist   = [0, 0, 0, 0, 0];
      const pVotes = [0, 0, 0, 0];
      let sum = 0, myR: number | null = null, myP: number | null = null;

      (rows || []).forEach((r: Record<string, unknown>) => {
        if ((r.rating as number) >= 1 && (r.rating as number) <= 5) { dist[(r.rating as number) - 1]++; sum += (r.rating as number); }
        if (r.poll_choice !== null && (r.poll_choice as number) >= 0 && (r.poll_choice as number) < 4) pVotes[r.poll_choice as number]++;
        if (r.user_id === userId) { myR = (r.rating as number) || null; myP = r.poll_choice as number | null; }
      });

      const count = (rows || []).filter((r: Record<string, unknown>) => (r.rating as number) >= 1 && (r.rating as number) <= 5).length;
      setData({ avg: count > 0 ? sum / count : 0, count, myRating: myR, distribution: dist });
      setPollVotes(pVotes);
      setMyVote(myP);
      if (myR) setSelected(myR);
    } finally {
      setLoading(false);
    }
  }, [supabase, targetType, targetId, userId]);

  // ── Check eligibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    load();
    if (!userId) { setEligible(false); return; }
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: import('@supabase/supabase-js').Session | null } }) => {
      checkEligibility(supabase, targetType, targetId, userId, authorId, session?.access_token ?? null)
        .then(setEligible);
    });
  }, [load, supabase, targetType, targetId, userId, authorId]);

  // ── Submit rating ─────────────────────────────────────────────────────────────
  const submitRating = async () => {
    if (!userId || !selectedRating || submitting || !eligible) return;
    setSubmitting(true);
    try {
      await supabase.from('item_ratings').upsert(
        {
          target_type: targetType,
          target_id:   targetId,
          user_id:     userId,
          rating:      selectedRating,
          comment:     comment.trim() || null,
          author_id:   authorId || null,
        },
        { onConflict: 'target_type,target_id,user_id' },
      );
      setSubmitted(true);
      setOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Vote poll ─────────────────────────────────────────────────────────────────
  const votePoll = async (idx: number) => {
    if (!userId || !eligible || votingPoll || myVote !== null) return;
    setVotingPoll(true);
    try {
      await supabase.from('item_ratings').upsert(
        {
          target_type:  targetType,
          target_id:    targetId,
          user_id:      userId,
          rating:       data.myRating ?? 0,
          poll_choice:  idx,
          author_id:    authorId || null,
        },
        { onConflict: 'target_type,target_id,user_id' },
      );
      setMyVote(idx);
      setPollVotes(prev => prev.map((v, i) => (i === idx ? v + 1 : v)));
    } finally {
      setVotingPoll(false);
    }
  };

  return {
    // data
    data, loading, tableExists,
    // eligibility
    eligible,
    // form
    open, setOpen,
    selectedRating, setSelected,
    comment, setComment,
    submitting, submitted, setSubmitted,
    // poll
    myVote, pollVotes, votingPoll,
    // actions
    submitRating, votePoll,
  };
}
