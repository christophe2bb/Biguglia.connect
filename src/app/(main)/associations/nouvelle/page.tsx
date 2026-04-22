'use client';

/**
 * Route /associations/nouvelle
 * ─────────────────────────────────────────────────────────────────────────────
 * Page de création d'une fiche association.
 * – Utilisateur connecté  → formulaire complet en 6 étapes (réutilise
 *   AssociationForm + useAssoForm, les mêmes composants que /associations).
 * – Utilisateur non connecté → écran d'invitation à se connecter avec
 *   redirect_to=/associations/nouvelle après authentification.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ChevronLeft, Building2, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useAssoForm } from '../_hooks/useAssoForm';

// Lazy-load the form (avoids shipping its ~15 KB unless needed)
const AssociationForm = dynamic(() => import('../_components/AssociationForm'), {
  loading: () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 bg-gray-100 rounded-2xl" />
      <div className="h-64 bg-gray-100 rounded-2xl" />
      <div className="h-12 bg-gray-100 rounded-2xl" />
    </div>
  ),
  ssr: false,
});

// No-op fetch so useAssoForm can be used standalone (submissions still work)
const noop = async () => {};

export default function NouvelleAssociationPage() {
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();

  const {
    form, setForm,
    photos, previews,
    submitting, step, setStep,
    photoRef,
    handlePhotoSelect, removePhoto, toggle, resetForm,
    handleSubmit,
    showForm, setShowForm,
  } = useAssoForm(noop);

  // Auto-open the form once auth is resolved and user is logged in
  useEffect(() => {
    if (!authLoading && profile) {
      setShowForm(true);
    }
  }, [authLoading, profile, setShowForm]);

  // After a successful submit, the hook calls fetchAssos (noop here).
  // We redirect to /associations on form cancel or after submit.
  const handleCancel = () => {
    resetForm();
    router.push('/associations');
  };

  const handleFormSubmit = async (asDraft?: boolean) => {
    if (!profile) return;
    await handleSubmit(profile.id, profile.full_name ?? '', asDraft);
    // On success, navigate to the directory so users can see their new entry
    router.push('/associations');
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">

          {/* Icon */}
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-violet-500" />
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-3">
            Connectez-vous pour référencer votre association
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            La création d&apos;une fiche association est réservée aux membres de Biguglia Connect.
            L&apos;inscription est gratuite et prend moins d&apos;une minute.
          </p>

          {/* Benefits */}
          <ul className="text-left space-y-3 mb-8 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            {[
              { icon: '🏛️', text: 'Fiche visible par tous les habitants de Biguglia' },
              { icon: '🙋', text: 'Recrutez bénévoles et adhérents directement sur la plateforme' },
              { icon: '🎉', text: 'Publiez vos événements et actualités associatifs' },
              { icon: '💬', text: 'Recevez des messages via la messagerie interne' },
              { icon: '0 €', text: 'Totalement gratuit — sans publicité' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 text-center">{icon}</span>
                {text}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/connexion?redirect_to=/associations/nouvelle`}
              className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black px-6 py-3 rounded-xl text-sm transition-colors shadow-md"
            >
              <LogIn className="w-4 h-4" /> Se connecter
            </Link>
            <Link
              href={`/inscription?redirect_to=/associations/nouvelle`}
              className="inline-flex items-center justify-center gap-2 border border-violet-300 text-violet-700 hover:bg-violet-50 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Créer un compte <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <Link
            href="/associations"
            className="mt-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Revenir à l&apos;annuaire
          </Link>
        </div>
      </div>
    );
  }

  // ── Authenticated: full form ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      {/* ── Sticky header ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/associations"
            className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Retour aux associations
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <Building2 className="w-3.5 h-3.5 text-violet-400" />
            Référencer une association
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1">
            🏛️ Référencer mon association
          </h1>
          <p className="text-gray-500 text-sm">
            Faites connaître votre association à toute la communauté de Biguglia — gratuitement, en moins de 5 minutes.
          </p>
        </div>

        {/* Form */}
        {showForm && (
          <AssociationForm
            form={form}
            setForm={setForm}
            photos={photos}
            previews={previews}
            submitting={submitting}
            step={step}
            setStep={setStep}
            editingAsso={null}
            photoRef={photoRef as React.RefObject<HTMLInputElement | null>}
            onPhotoSelect={handlePhotoSelect}
            onRemovePhoto={removePhoto}
            onToggle={toggle}
            onCancel={handleCancel}
            onSubmit={handleFormSubmit}
          />
        )}
      </div>
    </div>
  );
}
