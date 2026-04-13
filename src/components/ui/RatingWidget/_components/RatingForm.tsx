'use client';

import { Star } from 'lucide-react';
import Stars from './Stars';

interface RatingFormProps {
  selectedRating: number;
  onRate: (r: number) => void;
  comment: string;
  onCommentChange: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
}

export default function RatingForm({
  selectedRating, onRate,
  comment, onCommentChange,
  submitting, onSubmit,
}: RatingFormProps) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Votre note :</p>
        <Stars rating={selectedRating} interactive size="md" onRate={onRate} />
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">Commentaire (optionnel) :</p>
        <textarea
          value={comment}
          onChange={e => onCommentChange(e.target.value)}
          placeholder="Partagez votre expérience…"
          rows={2}
          maxLength={300}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={!selectedRating || submitting}
        className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting
          ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          : <Star className="w-4 h-4 fill-white" />}
        {submitting ? 'Envoi…' : 'Publier mon avis'}
      </button>
    </div>
  );
}
