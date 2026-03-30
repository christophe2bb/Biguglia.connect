import Link from 'next/link';
import { Suspense } from 'react';
import { Mail, CheckCircle, Hammer } from 'lucide-react';

function ConfirmationContent({ artisan }: { artisan: boolean }) {
  if (artisan) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Hammer className="w-8 h-8 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Compte artisan créé !</h1>
        <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-brand-600" />
        </div>
        <p className="text-gray-600 leading-relaxed mb-4">
          Un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien pour activer votre compte.
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-orange-700">
            <strong>Étapes suivantes :</strong>
          </p>
          <ol className="text-sm text-orange-700 mt-2 space-y-1 list-decimal list-inside">
            <li>Vérifiez votre email et cliquez sur le lien de confirmation</li>
            <li>Connectez-vous avec vos identifiants</li>
            <li>Complétez votre profil artisan (nom d&apos;entreprise, documents…)</li>
            <li>L&apos;administrateur validera votre dossier sous 24–48h</li>
          </ol>
        </div>
        <Link
          href="/connexion"
          className="inline-flex items-center justify-center w-full bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors"
        >
          Se connecter
        </Link>
        <p className="text-xs text-gray-400 mt-4">
          Pas reçu d&apos;email ? Vérifiez vos spams ou{' '}
          <Link href="/connexion" className="text-brand-600 hover:underline">contactez le support</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Vérifiez votre email</h1>
      <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Mail className="w-6 h-6 text-brand-600" />
      </div>
      <p className="text-gray-600 leading-relaxed mb-8">
        Un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien pour activer votre compte.
      </p>
      <Link
        href="/connexion"
        className="inline-flex items-center justify-center w-full bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors"
      >
        Aller à la connexion
      </Link>
      <p className="text-xs text-gray-400 mt-4">
        Pas reçu d&apos;email ? Vérifiez vos spams ou{' '}
        <Link href="/connexion" className="text-brand-600 hover:underline">contactez le support</Link>.
      </p>
    </div>
  );
}

function ConfirmationPageInner() {
  // Lire le paramètre artisan côté client via searchParams n'est pas possible dans un Server Component
  // On utilise une approche côté client ci-dessous
  return null;
}

// Version client pour lire les search params
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Confirmation — Biguglia Connect' };

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams: { artisan?: string };
}) {
  const isArtisan = searchParams?.artisan === '1';
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ConfirmationContent artisan={isArtisan} />
      </div>
    </div>
  );
}
