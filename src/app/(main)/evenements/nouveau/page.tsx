'use client';

import Link from 'next/link';
import { ArrowLeft, PartyPopper, Loader2, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { STEPS } from './_config';
import { useNewEventForm } from './_hooks/useNewEventForm';
import { StepEssentiel } from './_steps/StepEssentiel';
import { StepDetails }   from './_steps/StepDetails';
import { StepPratique }  from './_steps/StepPratique';
import { StepPhotos }    from './_steps/StepPhotos';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NouvelEvenementPage() {
  const { profile } = useAuthStore();

  const {
    step, stepIndex, goNext, goBack, goToStep,
    form, setField,
    photoInputRef, photos, photoPreviews, handlePhotoSelect, removePhoto,
    submitting, handleSubmit,
  } = useNewEventForm(profile?.id, profile?.full_name, profile?.home_sector_id);

  // ── Auth gate ─────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center max-w-sm">
          <PartyPopper className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h2 className="font-black text-gray-900 text-xl mb-2">Connexion requise</h2>
          <p className="text-gray-500 text-sm mb-4">Connectez-vous pour créer un événement.</p>
          <Link href="/connexion" className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/evenements" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour aux événements
          </Link>
          <h1 className="text-2xl font-black">Créer un événement</h1>
          <p className="text-white/70 text-sm mt-1">Partagez votre événement avec la communauté de Biguglia</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.id} onClick={() => goToStep(s.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                s.id === step
                  ? 'bg-purple-600 text-white shadow-sm'
                  : i < stepIndex
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
              {i < stepIndex && <span className="text-emerald-500 text-xs">✓</span>}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">

            {step === 'essentiel' && (
              <StepEssentiel
                form={form} setField={setField}
                organizerPlaceholder={profile.full_name ?? "Nom de l'association ou personne"}
              />
            )}

            {step === 'details' && (
              <StepDetails form={form} setField={setField} />
            )}

            {step === 'pratique' && (
              <StepPratique form={form} setField={setField} />
            )}

            {step === 'photos' && (
              <StepPhotos
                form={form} photos={photos} photoPreviews={photoPreviews}
                photoInputRef={photoInputRef}
                handlePhotoSelect={handlePhotoSelect}
                removePhoto={removePhoto}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4 gap-3">
            <button
              type="button" onClick={goBack} disabled={stepIndex === 0}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-30 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>

            {step !== 'photos' ? (
              <button
                type="button" onClick={goNext}
                className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all"
              >
                Suivant <Plus className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !form.title || !form.event_date}
                className="flex items-center gap-2 bg-purple-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                  : <><PartyPopper className="w-4 h-4" /> Publier l&apos;événement</>}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
