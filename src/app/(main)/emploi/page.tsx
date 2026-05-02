/**
 * Page: Hub emploi — /emploi
 * ─────────────────────────────────────────────────────────────────────────────
 * Page d'index de la section emploi : présente les deux sous-sections
 * (offres d'emploi et candidatures) et redirige vers la bonne section.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Search, Plus, TrendingUp, ArrowRight } from 'lucide-react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Emploi à Biguglia — Offres et Candidatures Locales',
  description:
    'Trouvez un emploi ou recrutez à Biguglia et en Haute-Corse. Consultez les offres d\'emploi locales ou déposez votre candidature.',
  alternates: { canonical: `${SITE_URL}/emploi` },
  openGraph: {
    title:       'Emploi à Biguglia — Offres et Candidatures Locales',
    description: 'Offres d\'emploi et candidatures à Biguglia et en Haute-Corse.',
    url:         `${SITE_URL}/emploi`,
    type:        'website',
  },
};

export default function EmploiPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Briefcase className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">Emploi à Biguglia</h1>
              <p className="text-white/80 text-sm mt-1">
                Offres locales · CDI, CDD, saisonnier · Candidatures
              </p>
            </div>
          </div>
          <p className="text-white/70 text-sm max-w-xl mt-4 leading-relaxed">
            Connectez employeurs et candidats de Biguglia et de Haute-Corse.
            Déposez une offre, postulez, ou publiez votre CV.
          </p>
        </div>
      </div>

      {/* ── Deux sections ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Offres d'emploi */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-8">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-brand-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Offres d&apos;emploi</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Consultez les offres des employeurs locaux : CDI, CDD, temps partiel,
              saisonnier. Postulez directement depuis la plateforme.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/emploi/offres"
                className="inline-flex items-center gap-2 bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-brand-700 transition-colors">
                Voir les offres <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/emploi/publier"
                className="inline-flex items-center gap-2 border border-brand-200 text-brand-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-brand-50 transition-colors">
                <Plus className="w-4 h-4" /> Publier
              </Link>
            </div>
          </div>

          {/* Candidatures */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Candidatures</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Découvrez les profils de candidats disponibles à Biguglia et en Haute-Corse.
              Déposez votre CV pour être contacté par les employeurs.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/emploi/demandes"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-700 transition-colors">
                Voir les profils <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/emploi/demandes/publier"
                className="inline-flex items-center gap-2 border border-emerald-200 text-emerald-700 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-emerald-50 transition-colors">
                <Plus className="w-4 h-4" /> Déposer mon CV
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
