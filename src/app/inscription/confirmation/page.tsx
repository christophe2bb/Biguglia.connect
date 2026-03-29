import Link from 'next/link';
import { Mail, CheckCircle } from 'lucide-react';

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
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
      </div>
    </div>
  );
}
