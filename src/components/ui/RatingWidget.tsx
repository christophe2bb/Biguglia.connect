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

import Image from 'next/image';
import { useEffect, useState, useMemo, useRef } from 'react';
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

interface RaterInfo {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  rater_name: string | null;
  rater_avatar: string | null;
}

/**
 * UserRatingBadge — affiche la note reçue par un artisan.
 *
 * Si artisanId est fourni, lit item_ratings (target_type='artisan', target_id=artisanId)
 * avec le nom du noteur via jointure profiles.
 * Le badge est cliquable et ouvre un mini-panel listant tous les noteurs.
 */
export function UserRatingBadge({
  userId: _userId, artisanId, artisanType, showNoRating, className,
}: {
  userId: string;
  artisanId?: string;          // id de artisan_profiles — pour lire les notes reçues
  artisanType?: 'professionnel' | 'particulier' | null;
  showNoRating?: boolean;      // afficher "Pas encore d'avis" si aucune note
  className?: string;
}) {
  const [avg, setAvg]       = useState<number | null>(null);
  const [count, setCount]   = useState(0);
  const [raters, setRaters] = useState<RaterInfo[]>([]);
  const [open, setOpen]     = useState(false);
  const panelRef            = useRef<HTMLDivElement>(null);
  const supabase            = useMemo(() => createClient(), []);

  // ── Charger les notes reçues ───────────────────────────────────────────────
  useEffect(() => {
    // Si on a un artisanId → notes reçues (target_type='artisan', target_id=artisanId)
    // Sinon pas d'affichage (l'ancienne logique author_id était incorrecte)
    if (!artisanId) return;

    supabase
      .from('item_ratings')
      .select('id, rating, comment, created_at, rater:profiles!item_ratings_user_id_fkey(full_name, avatar_url)')
      .eq('target_type', 'artisan')
      .eq('target_id', artisanId)
      .gte('rating', 1)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data?.length) return;
        const sum = data.reduce((s, r) => s + r.rating, 0);
        setAvg(sum / data.length);
        setCount(data.length);
        setRaters(
          data.map(r => {
            const raterRaw = r.rater as unknown as { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
            const rater = Array.isArray(raterRaw) ? (raterRaw[0] ?? null) : raterRaw;
            return {
              id:           r.id as string,
              rating:       r.rating as number,
              comment:      r.comment as string | null,
              created_at:   r.created_at as string,
              rater_name:   rater?.full_name ?? null,
              rater_avatar: rater?.avatar_url ?? null,
            };
          }),
        );
      });
  }, [artisanId, supabase]);

  // ── Fermer le panel en cliquant en dehors ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Fermer avec Échap ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const isPro = artisanType === 'professionnel';

  return (
    <span className={cn('inline-flex items-center gap-1 relative', className)}>
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

      {avg !== null && count >= 1 ? (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
          aria-expanded={open}
          aria-label={`Voir les ${count} avis`}
          className={cn(
            'inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer',
            ratingColor(avg),
          )}
        >
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          {avg.toFixed(1)}
          <span className="text-gray-400 font-normal">({count})</span>
        </button>
      ) : showNoRating ? (
        <span className="text-xs text-gray-400">Pas encore d&apos;avis</span>
      ) : null}

      {/* Mini-panel noteurs */}
      {open && count >= 1 && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Liste des personnes ayant noté"
          className="absolute bottom-full left-0 mb-2 z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-amber-50">
            <span className="text-xs font-semibold text-gray-800 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {count} avis · {avg!.toFixed(1)}/5
            </span>
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); }}
              aria-label="Fermer"
              className="p-0.5 rounded hover:bg-amber-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Liste noteurs */}
          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {raters.map(r => (
              <div key={r.id} className="px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2">
                  {/* Avatar */}
                  {r.rater_avatar ? (
                    <Image
                      src={r.rater_avatar}
                      alt={r.rater_name ?? 'avatar'}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                      unoptimized
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-brand-700">
                        {(r.rater_name ?? 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {r.rater_name ?? 'Utilisateur anonyme'}
                      </span>
                      {/* Étoiles */}
                      <span className="flex gap-0.5 flex-shrink-0">
                        {[1,2,3,4,5].map(i => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
                          />
                        ))}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-gray-500 italic line-clamp-2">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
