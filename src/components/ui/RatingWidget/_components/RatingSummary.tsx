'use client';

import { Star, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Stars from './Stars';
import RatingForm from './RatingForm';
import { ratingColor } from '../_config';
import type { RatingData } from '../_types';

interface RatingSummaryProps {
  data: RatingData;
  isOwnItem: boolean;
  userId?: string | null;
  eligible: boolean | null;
  open: boolean;
  setOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  selectedRating: number;
  setSelected: (r: number) => void;
  comment: string;
  setComment: (v: string) => void;
  submitting: boolean;
  submitted: boolean;
  setSubmitted: (v: boolean) => void;
  onSubmit: () => void;
}

export default function RatingSummary({
  data, isOwnItem, userId, eligible,
  open, setOpen,
  selectedRating, setSelected,
  comment, setComment,
  submitting, submitted, setSubmitted,
  onSubmit,
}: RatingSummaryProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">

      {/* ── En-tête + score global ── */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          Avis de la communauté
        </h3>
        {data.count > 0 && (
          <div className="flex items-center gap-1.5">
            <span className={cn('text-2xl font-black', ratingColor(data.avg))}>
              {data.avg.toFixed(1)}
            </span>
            <div>
              <Stars rating={data.avg} size="sm" />
              <p className="text-xs text-gray-400">{data.count} avis</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Distribution étoiles ── */}
      {data.count > 0 && (
        <div className="space-y-1 mb-4">
          {[5, 4, 3, 2, 1].map(star => {
            const c   = data.distribution[star - 1];
            const pct = data.count > 0 ? Math.round((c / data.count) * 100) : 0;
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
                <span className="text-xs text-gray-400 w-6 text-right">{c}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Message neutre (aucun avis, non éligible) ── */}
      {data.count === 0 && !isOwnItem && eligible !== true && eligible !== null && (
        <p className="text-sm text-gray-400 text-center py-2">Aucun avis pour le moment.</p>
      )}

      {/* ── Auteur de sa propre publication ── */}
      {isOwnItem && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 text-xs">
          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
          Vous ne pouvez pas noter votre propre publication.
        </div>
      )}

      {/* ── Vérification éligibilité en cours ── */}
      {!isOwnItem && userId && eligible === null && (
        <div className="h-10 bg-gray-100 animate-pulse rounded-xl" />
      )}

      {/* ── Utilisateur éligible ── */}
      {!isOwnItem && eligible === true && (
        <>
          {data.count === 0 && (
            <p className="text-sm text-gray-400 text-center py-2 mb-1">
              Pas encore d&apos;avis — soyez le premier !
            </p>
          )}

          {data.myRating ? (
            /* Déjà noté */
            <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <Stars rating={data.myRating} size="sm" />
              <span className="text-xs text-emerald-700 font-semibold">
                Votre note : {data.myRating}/5
              </span>
              <button
                onClick={() => { setOpen(true); setSubmitted(false); }}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Modifier
              </button>
            </div>
          ) : (
            /* Pas encore noté */
            <button
              onClick={() => setOpen(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors"
            >
              <Star className="w-4 h-4" />
              {open ? 'Fermer' : 'Laisser un avis'}
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </>
      )}

      {/* ── Non connecté ── */}
      {!isOwnItem && !userId && data.count > 0 && (
        <p className="text-xs text-gray-400 text-center pt-1">
          <Link href="/connexion" className="underline hover:text-amber-600">
            Connectez-vous
          </Link>{' '}pour laisser un avis si vous avez échangé.
        </p>
      )}

      {/* ── Formulaire de notation ── */}
      {open && eligible && (
        <RatingForm
          selectedRating={selectedRating}
          onRate={setSelected}
          comment={comment}
          onCommentChange={setComment}
          submitting={submitting}
          onSubmit={onSubmit}
        />
      )}

      {/* ── Confirmation soumission ── */}
      {submitted && (
        <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 text-sm font-semibold text-center">
          ✅ Merci pour votre avis !
        </div>
      )}
    </div>
  );
}
