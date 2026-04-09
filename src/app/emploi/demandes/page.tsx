/**
 * Page: Demandes d'emploi
 * Route: /emploi/demandes
 */

import Link from 'next/link';
import { Briefcase, Plus, Search, ArrowRight } from 'lucide-react';

export const metadata = {
  title: "Demandes d'emploi – Biguglia Connect",
  description: 'Consultez les demandes d\'emploi des habitants de Biguglia et ses environs.',
};

export default function DemandesEmploiPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Search className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Demandes d&apos;emploi
                </h1>
                <p className="text-purple-100 mt-1 text-base">
                  Biguglia et ses environs
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/emploi/demandes/publier"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-purple-600 font-bold rounded-xl shadow-lg hover:bg-purple-50 transition-all hover:scale-105 active:scale-100"
              >
                <Plus className="w-5 h-5" />
                Déposer ma demande
              </Link>
              <Link
                href="/emploi/offres"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-all"
              >
                <Briefcase className="w-4 h-4" />
                Voir les offres
              </Link>
            </div>
          </div>
          <p className="mt-5 text-purple-50 text-base max-w-2xl">
            Vous cherchez un emploi ? Déposez votre demande et laissez les employeurs de Biguglia vous trouver.
          </p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Search className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            Bientôt disponible
          </h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            La section &quot;Demandes d&apos;emploi&quot; sera disponible très prochainement.
            En attendant, consultez les offres d&apos;emploi disponibles !
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/emploi/offres"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-md"
            >
              <Briefcase className="w-5 h-5" />
              Voir les offres d&apos;emploi
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
