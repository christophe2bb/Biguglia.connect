/**
 * Page: Offres d'emploi local
 * Route: /emploi/offres
 */

import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biguglia-connect.vercel.app';

export const metadata: Metadata = {
  title: 'Offres d\'Emploi à Biguglia — Recrutement Local en Corse',
  description:
    'Consultez les offres d\'emploi à Biguglia et en Haute-Corse : CDI, CDD, temps partiel, saisonnier. Postulez directement aux employeurs locaux.',
  keywords: [
    'offres emploi Biguglia', 'recrutement Haute-Corse', 'emploi Corse',
    'CDI Biguglia', 'job Corse', 'travail Haute-Corse',
  ],
  alternates: { canonical: `${SITE_URL}/emploi/offres` },
  openGraph: {
    title:       'Offres d\'Emploi à Biguglia — Recrutement Local',
    description: 'CDI, CDD, saisonnier à Biguglia et en Haute-Corse. Postulez aux offres des employeurs locaux.',
    url:         `${SITE_URL}/emploi/offres`,
    images:      [{ url: `${SITE_URL}/images/biguglia-village.jpg`, width: 1200, height: 630, alt: 'Emploi à Biguglia' }],
    type:        'website',
  },
};
import { Suspense } from 'react';
import { Briefcase, TrendingUp, Plus, Search, Bell } from 'lucide-react';
import { getJobOffers } from '@/services/jobs/queries';
import { JobOfferCard } from '@/components/jobs/JobOfferCard';
import { JobFiltersClient } from './JobFiltersClient';
import { SortSelectClient } from './SortSelectClient';
import type { JobOfferFilters } from '@/types/jobs';

interface PageProps {
  searchParams: {
    query?: string;
    page?: string;
    sortBy?: string;
    categories?: string;
    contractTypes?: string;
    sectorId?: string;
    isUrgent?: string;
    providesHousing?: string;
    salaryMin?: string;
  };
}


export default async function OffresEmploiPage({ searchParams }: PageProps) {
  /* ── Filtres depuis l'URL ─────────────────────────────────────── */
  const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;

  const filters: Partial<JobOfferFilters> = {
    query: searchParams.query,
    page: currentPage,
    sortBy: searchParams.sortBy as JobOfferFilters['sortBy'],
    categories: searchParams.categories?.split(',') as JobOfferFilters['categories'],
    contractTypes: searchParams.contractTypes?.split(',') as JobOfferFilters['contractTypes'],
    sectorId: searchParams.sectorId,
    isUrgent: searchParams.isUrgent === 'true' ? true : undefined,
    providesHousing: searchParams.providesHousing === 'true' ? true : undefined,
    salaryMin: searchParams.salaryMin ? parseInt(searchParams.salaryMin) : undefined,
  };

  /* ── Fetch ────────────────────────────────────────────────────── */
  const { offers, total, page, limit } = await getJobOffers(filters);
  const totalPages = Math.ceil(total / limit);
  const hasFilters = !!(
    filters.query ||
    filters.categories?.length ||
    filters.contractTypes?.length ||
    filters.sectorId ||
    filters.isUrgent ||
    filters.providesHousing ||
    filters.salaryMin
  );

  /* ── Pagination helper ────────────────────────────────────────── */
  const pageUrl = (p: number) => {
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    sp.set('page', String(p));
    return `/emploi/offres?${sp.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            {/* Titre */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Offres d&apos;emploi local
                </h1>
                <p className="text-brand-100 mt-1 text-base">
                  Biguglia et ses environs · {total} offre{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* CTA boutons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/emploi/publier"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white text-brand-600 font-bold rounded-xl shadow-lg hover:bg-brand-50 transition-all hover:scale-105 active:scale-100"
              >
                <Plus className="w-5 h-5" />
                Publier une offre
              </Link>
              <Link
                href="/emploi/demandes"
                className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-all backdrop-blur-sm"
              >
                <Search className="w-4 h-4" />
                Voir les demandes
              </Link>
            </div>
          </div>

          <p className="mt-5 text-brand-50 text-base max-w-2xl">
            CDI, CDD, saisonnier, extra, mission… Trouvez ou publiez une opportunité
            d&apos;emploi en quelques clics, directement dans votre village.
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
                <JobFiltersClient filters={filters} totalResults={total} />
              </Suspense>

              {/* Encart "Publier" dans la sidebar */}
              <div className="mt-4 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl p-5 text-white">
                <Briefcase className="w-8 h-8 mb-3 opacity-80" />
                <h3 className="font-bold text-base mb-1">Vous recrutez ?</h3>
                <p className="text-brand-100 text-sm mb-4">
                  Publiez votre offre gratuitement et touchez les habitants de Biguglia.
                </p>
                <Link
                  href="/emploi/publier"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-white text-brand-600 font-bold rounded-lg hover:bg-brand-50 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Publier une offre
                </Link>
              </div>
            </div>
          </aside>

          {/* ── LISTE DES OFFRES ────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* Barre résultats + tri */}
            <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-600 flex-shrink-0" />
                <span className="text-gray-900 font-bold text-lg">
                  {total > 0 ? (
                    <>
                      <span className="text-brand-600">{total}</span>{' '}
                      offre{total > 1 ? 's' : ''} trouvée{total > 1 ? 's' : ''}
                    </>
                  ) : (
                    'Aucune offre'
                  )}
                </span>
                {hasFilters && (
                  <span className="ml-2 px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full">
                    Filtrées
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <SortSelectClient
                  currentSort={filters.sortBy || 'date_desc'}
                  currentParams={searchParams as Record<string, string>}
                />
              </div>
            </div>

            {/* Résultats */}
            {offers.length > 0 ? (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <JobOfferCard
                    key={offer.id}
                    offer={offer}
                    variant={
                      offer.visibility_level === 'featured' ? 'featured' : 'default'
                    }
                  />
                ))}
              </div>
            ) : (
              /* ── État vide ── */
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                <div className="w-20 h-20 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Briefcase className="w-10 h-10 text-brand-400" />
                </div>

                {hasFilters ? (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Aucune offre pour ces critères
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                      Essayez de modifier vos filtres ou réinitialisez la recherche pour voir
                      toutes les offres disponibles.
                    </p>
                    <Link
                      href="/emploi/offres"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors"
                    >
                      Voir toutes les offres
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Pas encore d&apos;offres publiées
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                      Soyez le premier à publier une offre d&apos;emploi local à Biguglia !
                      C&apos;est gratuit et prend moins de 5 minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link
                        href="/emploi/publier"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors shadow-md"
                      >
                        <Plus className="w-5 h-5" />
                        Publier une offre
                      </Link>
                      <Link
                        href="/emploi/demandes"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-brand-400 hover:text-brand-600 transition-colors"
                      >
                        <Bell className="w-5 h-5" />
                        Voir les demandes
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
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-sm hover:border-brand-400 hover:text-brand-600 transition-colors"
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
                          ? 'bg-brand-500 text-white shadow-md'
                          : 'border-2 border-gray-200 text-gray-700 hover:border-brand-400 hover:text-brand-600'
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}

                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-sm hover:border-brand-400 hover:text-brand-600 transition-colors"
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
