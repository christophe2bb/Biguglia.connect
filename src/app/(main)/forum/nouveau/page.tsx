'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useForumComposer } from './_hooks/useForumComposer';
import StepIndicator from './_components/StepIndicator';
import ForumComposerForm from './_components/ForumComposerForm';
import ForumComposerSidebar from './_components/ForumComposerSidebar';

export default function NouveauSujetPage() {
  const composer = useForumComposer();

  const {
    profile, step, setStep,
    sectors, categories,
    loading, uploadingPhotos,
    similarTopics, searchingDuplicates, showSimilar, setShowSimilar,
    photos, photoPreviews, fileInputRef,
    handlePhotoSelect, removePhoto,
    tagInput, setTagInput, addTag, removeTag, handleTagKeyDown,
    form, setForm,
    canGoNext, nextStep, prevStep,
    handleSubmit,
    selectedSector, selectedCategory,
  } = composer;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/forum"
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Retour au forum
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Étape {step}/4</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={cn('w-5 h-1.5 rounded-full transition-colors', s <= step ? 'bg-violet-500' : 'bg-gray-200')} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ── Page title ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">✍️ Nouveau sujet</h1>
          <p className="text-gray-500 text-sm">
            Partagez une info, posez une question ou lancez une discussion — en moins de 60 secondes.
          </p>
        </div>

        {/* ── Step indicator ─────────────────────────────────────────────── */}
        <StepIndicator current={step} />

        {/* ── Steps 1–3 : form ───────────────────────────────────────────── */}
        {step !== 4 && (
          <ForumComposerForm
            step={step}
            sectors={sectors}
            categories={categories}
            form={form}
            setForm={setForm}
            setStep={setStep}
            similarTopics={similarTopics}
            searchingDuplicates={searchingDuplicates}
            showSimilar={showSimilar}
            setShowSimilar={setShowSimilar}
            photos={photos}
            photoPreviews={photoPreviews}
            fileInputRef={fileInputRef}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={removePhoto}
            tagInput={tagInput}
            setTagInput={setTagInput}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            onTagKeyDown={handleTagKeyDown}
          />
        )}

        {/* ── Step 4 : visibility + recap ────────────────────────────────── */}
        {step === 4 && (
          <ForumComposerSidebar
            form={form}
            setForm={setForm}
            selectedSector={selectedSector}
            selectedCategory={selectedCategory}
            photoPreviews={photoPreviews}
            authorInitial={profile?.full_name?.[0] ?? '?'}
          />
        )}

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-6">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={prevStep} className="flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Retour
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!canGoNext()}
              className="flex items-center gap-1 flex-1 justify-center"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              loading={loading || uploadingPhotos}
              className="flex items-center gap-2 flex-1 justify-center bg-violet-600 hover:bg-violet-700"
            >
              <Send className="w-4 h-4" />
              {uploadingPhotos ? 'Envoi des photos…' : 'Publier le sujet'}
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          En publiant, vous acceptez la{' '}
          <Link href="/forum/charte" className="text-violet-500 hover:underline">charte du forum</Link>.
        </p>
      </div>
    </div>
  );
}
