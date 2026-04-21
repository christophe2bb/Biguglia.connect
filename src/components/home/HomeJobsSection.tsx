/**
 * HomeJobsSection — composant async Server Component
 * Charge les offres et demandes d'emploi récentes de manière isolée.
 * Utilisé avec <Suspense> dans page.tsx.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getRecentJobOffers, getRecentJobDemands } from '@/services/jobs/queries';
import type { JobOfferSearchResult, JobDemandSearchResult } from '@/types/jobs/_search';
import { JobOfferHomeCard, JobDemandHomeCard } from './JobHomeCard';

export default async function HomeJobsSection() {
  let recentOffers: JobOfferSearchResult[] = [];
  let recentDemands: JobDemandSearchResult[] = [];

  try {
    [recentOffers, recentDemands] = await Promise.all([
      getRecentJobOffers(3),
      getRecentJobDemands(3),
    ]);
  } catch { /* table inexistante → tableaux vides */ }

  const hasContent = recentOffers.length > 0 || recentDemands.length > 0;

  return (
    <>
      {hasContent && (
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* Colonne Offres */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center text-lg">💼</span>
                Dernières offres
              </h3>
              <Link href="/emploi/offres" className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentOffers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {recentOffers.slice(0, 3).map(offer => (
                  <JobOfferHomeCard key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 rounded-2xl border-2 border-dashed border-cyan-100 bg-cyan-50/40 text-cyan-400 text-sm font-medium">
                Aucune offre pour l&apos;instant
              </div>
            )}
          </div>

          {/* Colonne Candidatures */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-lg">🙋</span>
                Candidatures
              </h3>
              <Link href="/emploi/demandes" className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentDemands.length > 0 ? (
              <div className="flex flex-col gap-2">
                {recentDemands.slice(0, 3).map(demand => (
                  <JobDemandHomeCard key={demand.id} demand={demand} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 rounded-2xl border-2 border-dashed border-purple-100 bg-purple-50/40 text-purple-400 text-sm font-medium">
                Aucune candidature pour l&apos;instant
              </div>
            )}
          </div>
        </div>
      )}

      {/* Boutons d'action rapide */}
      {hasContent && (
        <div className="flex flex-wrap gap-3 mb-8">
          <Link href="/emploi/publier"
            className="inline-flex items-center gap-2 bg-cyan-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-cyan-700 transition-all shadow-md text-sm">
            + Publier une offre <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/emploi/demandes/publier"
            className="inline-flex items-center gap-2 border-2 border-purple-200 text-purple-700 px-5 py-3 rounded-2xl font-bold hover:bg-purple-50 transition-all text-sm">
            + Déposer ma candidature
          </Link>
        </div>
      )}

      {/* CTA si pas d'annonces */}
      {!hasContent && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-600 p-8 text-white shadow-xl">
            <div className="absolute -right-6 -top-6 text-[120px] opacity-10 leading-none select-none">💼</div>
            <div className="relative">
              <h3 className="text-2xl font-black mb-2">Vous recrutez ?</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Publiez votre offre en 4 étapes. Gratuit, visible immédiatement.
              </p>
              <Link href="/emploi/publier"
                className="inline-flex items-center gap-2 bg-white text-cyan-700 font-black px-5 py-3 rounded-2xl hover:bg-cyan-50 transition-all shadow-md text-sm">
                Publier une offre <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 p-8 text-white shadow-xl">
            <div className="absolute -right-6 -top-6 text-[120px] opacity-10 leading-none select-none">🙋</div>
            <div className="relative">
              <h3 className="text-2xl font-black mb-2">Vous cherchez un emploi ?</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Déposez votre profil. Visibilité immédiate auprès des employeurs locaux.
              </p>
              <Link href="/emploi/demandes/publier"
                className="inline-flex items-center gap-2 bg-white text-purple-700 font-black px-5 py-3 rounded-2xl hover:bg-purple-50 transition-all shadow-md text-sm">
                Déposer ma candidature <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bandeau chiffres */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { emoji: '🆓', label: 'Publication',  value: '100% gratuit' },
          { emoji: '⚡', label: 'Mise en ligne', value: 'Immédiate' },
          { emoji: '📍', label: 'Zone',          value: 'Biguglia & alentours' },
          { emoji: '🔒', label: 'Contact',       value: 'Sécurisé' },
        ].map(stat => (
          <div key={stat.label} className="flex flex-col items-center gap-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
            <span className="text-2xl">{stat.emoji}</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{stat.label}</span>
            <span className="text-sm font-black text-gray-900">{stat.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
