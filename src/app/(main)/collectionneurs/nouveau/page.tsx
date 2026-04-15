'use client';

/**
 * Nouvelle annonce collectionneurs — Page orchestrateur.
 *
 * Wizard 5 étapes :
 *   1. StepMode      — vente / échange / don / recherche
 *   2. StepCategorie — catégorie + sous-catégorie
 *   3. StepObjet     — description, état, rareté, localisation, tags
 *   4. StepPhotos    — upload + grille photos
 *   5. StepPreview   — aperçu + checklist + publication
 *
 * Toute la logique est dans useCollectionneurForm.
 */

import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useCollectionneurForm } from './useCollectionneurForm';
import { STEPS } from './_config';

import StepMode      from './_components/StepMode';
import StepCategorie from './_components/StepCategorie';
import StepObjet     from './_components/StepObjet';
import StepPhotos    from './_components/StepPhotos';
import StepPreview   from './_components/StepPreview';

export default function NouvelleAnnoncePage() {
  const ctx = useCollectionneurForm();

  // ── Succès ────────────────────────────────────────────────────────────────
  if (ctx.submitted && ctx.createdId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonce publiée !</h1>
          <p className="text-gray-500 mb-6">
            Votre objet est maintenant visible par la communauté des collectionneurs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/collectionneurs/${ctx.createdId}`}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition text-center"
            >
              Voir mon annonce
            </Link>
            <Link
              href="/collectionneurs"
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl font-semibold transition text-center"
            >
              Retour à la liste
            </Link>
          </div>
          <button
            onClick={ctx.resetForm}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Publier une autre annonce
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header sticky avec stepper ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/collectionneurs" className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900 flex-1">Nouvelle annonce</h1>
          <span className="text-sm text-gray-500">Étape {ctx.step}/{STEPS.length}</span>
        </div>

        {/* Stepper */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon   = s.icon;
              const done   = ctx.step > s.id;
              const active = ctx.step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    onClick={() => done ? ctx.setStep(s.id) : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap',
                      active && 'bg-blue-600 text-white',
                      done   && 'text-emerald-700 hover:bg-emerald-50 cursor-pointer',
                      !active && !done && 'text-gray-400 cursor-default',
                    )}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={cn('h-px flex-1 mx-1', ctx.step > s.id ? 'bg-emerald-400' : 'bg-gray-200')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Contenu de l'étape courante ── */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {ctx.step === 1 && (
          <StepMode
            value={ctx.form.mode}
            onChange={mode => ctx.update('mode', mode)}
          />
        )}
        {ctx.step === 2 && (
          <StepCategorie
            categories={ctx.categories}
            categoryId={ctx.form.category_id}
            subcategory={ctx.form.subcategory}
            onCategoryChange={id => ctx.update('category_id', id)}
            onSubcategoryChange={v => ctx.update('subcategory', v)}
          />
        )}
        {ctx.step === 3 && (
          <StepObjet
            form={ctx.form}
            update={ctx.update}
            tagInput={ctx.tagInput}
            onTagInputChange={ctx.setTagInput}
          />
        )}
        {ctx.step === 4 && (
          <StepPhotos
            photos={ctx.form.photos}
            fileInputRef={ctx.fileInputRef}
            onFiles={ctx.handleFiles}
            onRemove={ctx.removePhoto}
            onSetCover={ctx.setCover}
          />
        )}
        {ctx.step === 5 && (
          <StepPreview
            form={ctx.form}
            categories={ctx.categories}
            onJumpToStep={ctx.setStep}
          />
        )}
      </div>

      {/* ── Barre de navigation fixe en bas ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          {ctx.step > 1 && (
            <button
              onClick={ctx.goPrev}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
          )}
          <button
            onClick={ctx.goNext}
            disabled={ctx.submitting}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition',
              ctx.step === 5 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700',
              ctx.submitting && 'opacity-60 cursor-not-allowed',
            )}
          >
            {ctx.submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Publication en cours…</>
            ) : ctx.step === 5 ? (
              <><CheckCircle2 className="w-5 h-5" /> Publier l&apos;annonce</>
            ) : (
              <>Continuer <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
