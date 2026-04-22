/**
 * Page: Demandes d'emploi local
 * Route: /emploi/demandes
 */

import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Candidats à Biguglia — Demandes d\'Emploi et CV Locaux',
  description:
    'Découvrez les candidats à l\'emploi à Biguglia et en Haute-Corse. Profils disponibles, compétences et souhaits de poste pour votre recrutement local.',
  keywords: [
    'candidats emploi Biguglia', 'recherche emploi Corse', 'CV Haute-Corse',
    'demande emploi Biguglia', 'candidature Biguglia',
  ],
  alternates: { canonical: `${SITE_URL}/emploi/demandes` },
  openGraph: {
    title:       'Candidats à l\'Emploi à Biguglia — Profils Locaux',
    description: 'Profils de candidats à l\'emploi à Biguglia et Haute-Corse. Trouvez votre futur collaborateur local.',
    url:         `${SITE_URL}/emploi/demandes`,
    images:      [{ url: `${SITE_URL}/images/biguglia-village.jpg`, width: 1200, height: 630, alt: 'Candidats emploi Biguglia' }],
    type:        'website',
  },
};
import { Suspense } from 'react';
import { Search, Plus, Briefcase, TrendingUp } from 'lucide-react';
import { getJobDemands } from '@/services/jobs/queries';
import { JobDemandCard } from '@/components/jobs/JobDemandCard';
import { DemandFiltersClient } from './DemandFiltersClient';
import { SortSelectClient } from './SortSelectClient';
import type { JobDemandFilters } from '@/types/jobs';

interface PageProps {
  searchParams: Promise<{
    query?: string;
    page?: string;
    sortBy?: string;
    categories?: string;
    sectorId?: string;
    isUrgent?: string;
    hasLicense?: string;
    hasVehicle?: string;
  }>;
}


export default async function DemandesEmploiPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  /* ── Filtres depuis l'URL ─────────────────────────────────────── */
  const currentPage = sp.page ? parseInt(sp.page) : 1;

  const filters: Partial<JobDemandFilters> = {
    query: sp.query,
    page: currentPage,
    sortBy: sp.sortBy as JobDemandFilters['sortBy'],
    categories: sp.categories?.split(',') as JobDemandFilters['categories'],
    sectorId: sp.sectorId,
    isUrgent: sp.isUrgent === 'true' ? true : undefined,
    hasLicense: sp.hasLicense === 'true' ? true : undefined,
    hasVehicle: sp.hasVehicle === 'true' ? true : undefined,
  };

  /* ── Fetch ────────────────────────────────────────────────────── */
  const { demands, total, page, limit } = await getJobDemands(filters);
  const totalPages = Math.ceil(total / limit);
  const hasFilters = !!(
    filters.query ||
    filters.categories?.length ||
    filters.sectorId ||
    filters.isUrgent ||
    filters.hasLicense ||
    filters.hasVehicle
  );

  /* ── Pagination helper ────────────────────────────────────────── */
  const pageUrl = (p: number) => {
    const urlSp = new URLSearchParams(sp as Record<string, string>);
    urlSp.set('page', String(p));
    return `/emploi/demandes?${urlSp.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            {/* Titre */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Search className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Demandes d&apos;emploi
                </h1>
                <p className="text-purple-100 mt-1 text-base">
                  Biguglia et ses environs · {total} profil{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* CTA boutons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/emploi/demandes/publier"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-purple-600 font-bold rounded-xl shadow-lg hover:bg-purple-50 transition-[colors,transform] hover:scale-105 active:scale-100"
              >
                <Plus className="w-5 h-5" />
                Déposer ma demande
              </Link>
              <Link
                href="/emploi/offres"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                <Briefcase className="w-4 h-4" />
                Voir les offres
              </Link>
            </div>
          </div>

          <p className="mt-5 text-purple-50 text-base max-w-2xl">
            Vous cherchez un profil ? Découvrez les candidats disponibles à Biguglia.
            Déposez votre demande d&apos;emploi pour être trouvé par les employeurs locaux.
          </p>
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── SIDEBAR FILTRES ─────────────────────────────────── */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="lg:sticky lg:top-20">
              <Suspense
                fallback={
                  <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-96" />
                }
              >
                <DemandFiltersClient filters={filters} totalResults={total} />
              </Suspense>

              {/* Encart CTA dans la sidebar */}
              <div className="mt-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-5 text-white">
                <Search className="w-8 h-8 mb-3 opacity-80" />
                <h3 className="font-bold text-base mb-1">Vous cherchez un emploi ?</h3>
                <p className="text-purple-100 text-sm mb-4">
                  Déposez votre profil gratuitement et laissez les employeurs de Biguglia vous contacter.
                </p>
                <Link
                  href="/emploi/demandes/publier"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Déposer ma demande
                </Link>
              </div>
            </div>
          </aside>

          {/* ── LISTE DES DEMANDES ────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* Barre résultats + tri */}
            <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <span className="text-gray-900 font-bold text-lg">
                  {total > 0 ? (
                    <>
                      <span className="text-purple-600">{total}</span>{' '}
                      profil{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
                    </>
                  ) : (
                    'Aucun profil'
                  )}
                </span>
                {hasFilters && (
                  <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    Filtrés
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <SortSelectClient
                  currentSort={filters.sortBy || 'date_desc'}
                  currentParams={sp as Record<string, string>}
                />
              </div>
            </div>

            {/* Résultats */}
            {demands.length > 0 ? (
              <div className="space-y-4">
                {demands.map((demand) => (
                  <JobDemandCard
                    key={demand.id}
                    demand={demand}
                    variant="default"
                  />
                ))}
              </div>
            ) : (
              /* ── État vide ── */
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Search className="w-10 h-10 text-purple-400" />
                </div>

                {hasFilters ? (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Aucun profil pour ces critères
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      Essayez de modifier vos filtres ou réinitialisez la recherche pour voir
                      tous les profils disponibles.
                    </p>
                    <Link
                      href="/emploi/demandes"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors"
                    >
                      Voir tous les profils
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Pas encore de demandes publiées
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                      Soyez le premier à déposer votre demande d&apos;emploi à Biguglia !
                      C&apos;est gratuit et prend moins de 5 minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link
                        href="/emploi/demandes/publier"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-colors shadow-md"
                      >
                        <Plus className="w-5 h-5" />
                        Déposer ma demande
                      </Link>
                      <Link
                        href="/emploi/offres"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:text-purple-600 transition-colors"
                      >
                        <Briefcase className="w-5 h-5" />
                        Voir les offres
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
                {page > 1 && (
                  <Link
                    href={pageUrl(page - 1)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-sm hover:border-purple-400 hover:text-purple-600 transition-colors"
                  >
                    ← Précédent
                  </Link>
                )}

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <Link
                      key={p}
                      href={pageUrl(p)}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg font-semibold text-sm transition-colors ${
                        p === page
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'border-2 border-gray-200 text-gray-700 hover:border-purple-400 hover:text-purple-600'
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}

                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-sm hover:border-purple-400 hover:text-purple-600 transition-colors"
                  >
                    Suivant →
                  </Link>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
