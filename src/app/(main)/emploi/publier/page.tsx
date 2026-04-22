'use client';

/**
 * Page: Publier une offre d'emploi
 * Route: /emploi/publier
 *
 * Orchestrateur pur : state & actions dans usePublierForm,
 * rendu de chaque étape délégué aux composants Step*.
 */

import Link from 'next/link';
import {
  Briefcase, ArrowLeft, ChevronRight, CheckCircle, AlertCircle,
} from 'lucide-react';
import { usePublierForm }   from './usePublierForm';
import { STEPS }            from './_config';
import StepOffre            from './_components/StepOffre';
import StepEmployeur        from './_components/StepEmployeur';
import StepConditions       from './_components/StepConditions';
import StepContact          from './_components/StepContact';

export default function PublierOffrePage() {
  const {
    step, form, submitting, serverError, done, publishedSlug,
    set, toggleBenefit, next, prev, canNext, handleSubmit, resetForm,
  } = usePublierForm();

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Offre publiée !</h2>
          <p className="text-gray-500 mb-8 text-sm">
            Votre offre est maintenant visible sur Biguglia Connect.
          </p>
          <div className="flex flex-col gap-3">
            {publishedSlug && (
              <Link
                href={`/emploi/offres/${publishedSlug}`}
                className="w-full py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors"
              >
                Voir mon offre →
              </Link>
            )}
            <Link
              href="/emploi/offres"
              className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              Retour aux offres
            </Link>
            <button
              onClick={resetForm}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
              Publier une autre offre
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/emploi/offres"
            className="inline-flex items-center gap-2 text-brand-100 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour aux offres
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Publier une offre d&apos;emploi</h1>
              <p className="text-brand-100 text-sm">Gratuit · Publié immédiatement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-5">

        {/* ── Stepper ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const Icon      = s.icon;
              const active    = step === s.id;
              const completed = step > s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                      completed ? 'bg-green-500 text-white'
                      : active  ? 'bg-brand-500 text-white shadow-lg shadow-brand-200'
                                : 'bg-gray-100 text-gray-400'
                    }`}>
                      {completed
                        ? <CheckCircle className="w-5 h-5" />
                        : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs mt-1 font-medium hidden sm:block ${
                      active ? 'text-brand-600' : completed ? 'text-green-600' : 'text-gray-400'
                    }`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full ${completed ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

          {/* Server error banner */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Step content */}
          {step === 1 && <StepOffre       form={form} set={set} />}
          {step === 2 && <StepEmployeur   form={form} set={set} />}
          {step === 3 && <StepConditions  form={form} set={set} toggleBenefit={toggleBenefit} />}
          {step === 4 && <StepContact     form={form} set={set} />}

          {/* ── Navigation ── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={prev}
              disabled={step === 1}
              className="px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Précédent
            </button>

            {step < 4 ? (
              <button
                onClick={next}
                disabled={!canNext()}
                className="px-6 py-2.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canNext() || submitting}
                className="px-8 py-2.5 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Publication…</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Publier l&apos;offre</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
