'use client';

/**
 * HelpEditClient — Page de modification d'une annonce coups-de-main.
 * Réutilise HelpForm (formulaire multi-étapes existant).
 * Gère : vérification auteur, pré-remplissage, upload photos, soumission.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import HelpForm from '../../_components/HelpForm';
import { useHelpEdit } from './useHelpEdit';
import type { HelpRequest } from '../../_types';
import type { HelpRequest as HelpRequestDetail } from '../_types';

interface Props {
  item: HelpRequest;
}

export default function HelpEditClient({ item }: Props) {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();

  const {
    form, setForm,
    step, setStep,
    submitting,
    existingPhotoUrls,
    previews,
    totalPhotoCount,
    handlePhotoSelect,
    removePhoto,
    toggleArr,
    handleSubmit,
  } = useHelpEdit(item);

  // ── Gardes ────────────────────────────────────────────────────────────────
  // Attendre que le store auth soit initialisé avant de vérifier
  const isAuthor = !authLoading && profile?.id === item.author_id;
  const notOwner = !authLoading && !isAuthor;

  // Si l'utilisateur n'est pas connecté, rediriger vers connexion
  useEffect(() => {
    if (!authLoading && !profile) {
      router.replace(`/connexion?redirect=/coups-de-main/${item.id}/modifier`);
    }
  }, [authLoading, profile, item.id, router]);

  // ── Chargement auth ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // ── Pas connecté (redirect en cours) ─────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // ── Pas l'auteur ──────────────────────────────────────────────────────────
  if (notOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-sm text-gray-500 mb-6">
            Vous ne pouvez modifier que vos propres annonces.
          </p>
          <Link
            href={`/coups-de-main/${item.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voir l&apos;annonce
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* Navigation */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            href={`/coups-de-main/${item.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour à l&apos;annonce</span>
            <span className="sm:hidden">Retour</span>
          </Link>
          <span className="text-sm font-bold text-gray-500">✏️ Modifier l&apos;annonce</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Titre de la page */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">✏️ Modifier mon annonce</h1>
          <p className="text-sm text-gray-500 mt-1 truncate">
            « {item.title} »
          </p>
        </div>

        {/* Formulaire multi-étapes existant */}
        <HelpForm
          form={form}
          setForm={setForm}
          step={step}
          setStep={setStep}
          submitting={submitting}
          editingItem={true}
          previews={previews}
          photosCount={totalPhotoCount}
          onPhotoSelect={handlePhotoSelect}
          onRemovePhoto={removePhoto}
          onToggleArr={toggleArr}
          onSubmit={(isDraft = false) => handleSubmit(profile.id, isDraft)}
          onClose={() => router.push(`/coups-de-main/${item.id}`)}
        />

        {/* Info photos existantes */}
        {existingPhotoUrls.length > 0 && step === 3 && (
          <div className="mt-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 border border-blue-100">
            💡 <strong>{existingPhotoUrls.length} photo{existingPhotoUrls.length > 1 ? 's' : ''} existante{existingPhotoUrls.length > 1 ? 's' : ''}</strong> conservée{existingPhotoUrls.length > 1 ? 's' : ''} — cliquez × pour supprimer.
          </div>
        )}
      </div>
    </div>
  );
}
