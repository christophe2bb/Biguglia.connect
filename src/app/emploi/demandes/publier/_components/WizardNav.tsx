'use client';

import { CheckCircle, ChevronRight } from 'lucide-react';
import type { Step } from '../_types';

interface Props {
  step: Step;
  canNext: boolean;
  submitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function WizardNav({ step, canNext, submitting, onPrev, onNext, onSubmit }: Props) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
      {/* Précédent */}
      <button
        onClick={onPrev}
        disabled={step === 1}
        className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← Précédent
      </button>

      {/* Suivant ou Soumettre */}
      {step < 4 ? (
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-6 py-2.5 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
        >
          Suivant <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={!canNext || submitting}
          className="px-8 py-2.5 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Publication…
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Déposer ma demande
            </>
          )}
        </button>
      )}
    </div>
  );
}
