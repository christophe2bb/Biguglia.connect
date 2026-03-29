import type { Metadata } from 'next';
import { Shield, CheckCircle, AlertTriangle, Phone } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Confiance & Sécurité' };

export default function ConfidencePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex p-3 bg-brand-50 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Confiance & Sécurité</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Biguglia Connect met tout en œuvre pour créer un environnement de confiance entre habitants et artisans.
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Validation des artisans
          </h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Chaque artisan est examiné et validé manuellement par l&apos;administrateur avant d&apos;être publié.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Les profils artisans en attente ne sont jamais visibles par le public.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Un badge &ldquo;Vérifié&rdquo; indique clairement les artisans approuvés.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              Les avis clients ne peuvent être laissés que par de vrais utilisateurs inscrits.
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            Protection de vos données
          </h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5">✓</span>
              Vos messages sont strictement privés — uniquement accessibles aux participants de la conversation.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5">✓</span>
              Vos informations personnelles ne sont jamais partagées sans votre consentement.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5">✓</span>
              Les données sont stockées de manière sécurisée conformément au RGPD.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-500 mt-0.5">✓</span>
              Vous pouvez supprimer votre compte et vos données à tout moment.
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Prêt de matériel — règles importantes
          </h2>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <p className="text-orange-700 text-sm font-medium">
              Le prêt de matériel s&apos;effectue entre particuliers. Biguglia Connect facilite la mise en relation mais n&apos;est pas responsable des équipements prêtés.
            </p>
          </div>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li>• Vérifiez toujours l&apos;état du matériel avant et après le prêt.</li>
            <li>• Respectez les règles d&apos;utilisation définies par le propriétaire.</li>
            <li>• En cas de problème, contactez directement la personne et signalez via la plateforme.</li>
            <li>• La caution est fixée par le propriétaire — remettez-la en mains propres.</li>
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Signaler un problème</h2>
          <p className="text-gray-600 mb-4">
            Vous avez constaté un comportement suspect, un contenu inapproprié ou un profil faux ?
            Utilisez le bouton &ldquo;Signaler&rdquo; disponible sur chaque contenu, ou contactez-nous directement.
          </p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 font-medium mb-1">Limitation de responsabilité</p>
            <p className="text-xs text-gray-500">
              Biguglia Connect est une plateforme de mise en relation. Elle ne garantit pas la qualité des travaux effectués par les artisans, ni la fiabilité des transactions entre particuliers. Nous encourageons la prudence et le bon sens dans toutes vos interactions.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-10 text-center">
        <p className="text-gray-500 mb-4">Une question sur la sécurité ?</p>
        <Link href="/aide" className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors">
          <Phone className="w-4 h-4" /> Contacter le support
        </Link>
      </div>
    </div>
  );
}
