'use client';

/**
 * Page: Déposer une demande d'emploi
 * Route: /emploi/demandes/publier
 *
 * Orchestrateur mince – toute la logique est dans useDemandPublishForm.
 */

import Link from 'next/link';
import { Search, AlertCircle } from 'lucide-react';
import { useDemandPublishForm } from './_hooks/useDemandPublishForm';
import { WizardStepper }     from './_components/WizardStepper';
import { WizardNav }         from './_components/WizardNav';
import { StepProfile }       from './_components/StepProfile';
import { StepExperience }    from './_components/StepExperience';
import { StepAvailability }  from './_components/StepAvailability';
import { StepContact }       from './_components/StepContact';
import { SuccessScreen }     from './_components/SuccessScreen';

export default function PublierDemandePage() {
  const {
    step, form, submitting, serverError, done, publishedSlug,
    set, toggleContractType, setCvFile,
    next, prev, canNext,
    handleSubmit, resetWizard,
  } = useDemandPublishForm();

  if (done) {
    return <SuccessScreen publishedSlug={publishedSlug} onReset={resetWizard} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/emploi/demandes"
            className="inline-flex items-center gap-2 text-purple-100 hover:text-white text-sm mb-4 transition-colors"
          >
            ← Retour aux demandes
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Déposer ma demande d&apos;emploi</h1>
              <p className="text-purple-100 text-sm">Gratuit · Visible immédiatement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-5">

        {/* ── Stepper ─────────────────────────────────────────────────── */}
        <WizardStepper step={step} />

        {/* ── Formulaire ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

          {/* Erreur serveur */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {step === 1 && (
            <StepProfile form={form} set={set} toggleContractType={toggleContractType} />
          )}
          {step === 2 && (
            <StepExperience form={form} set={set} setCvFile={setCvFile} />
          )}
          {step === 3 && (
            <StepAvailability form={form} set={set} />
          )}
          {step === 4 && (
            <StepContact form={form} set={set} />
          )}

          {/* ── Navigation ──────────────────────────────────────────── */}
          <WizardNav
            step={step}
            canNext={canNext()}
            submitting={submitting}
            onPrev={prev}
            onNext={next}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
