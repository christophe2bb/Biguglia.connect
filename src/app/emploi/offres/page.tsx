/**
 * Page: Offres d'emploi local
 * Route: /emploi/offres
 */

import { Suspense } from 'react';
import { Briefcase, TrendingUp } from 'lucide-react';
import { getJobOffers } from '@/services/jobs/queries';
import { JobOfferCard } from '@/components/jobs/JobOfferCard';
import { JobFilters } from '@/components/jobs/JobFilters';
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

export const metadata = {
  title: 'Offres d\'emploi local - Biguglia Connect',
  description: 'Trouvez un emploi local à Biguglia et ses environs : CDI, CDD, saisonnier, extra, mission...',
};

export default async function OffresEmploiPage({ searchParams }: PageProps) {
  // Parse filters from URL
  const filters: Partial<JobOfferFilters> = {
    query: searchParams.query,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    sortBy: searchParams.sortBy as any,
    categories: searchParams.categories?.split(',') as any,
    contractTypes: searchParams.contractTypes?.split(',') as any,
    sectorId: searchParams.sectorId,
    isUrgent: searchParams.isUrgent === 'true' ? true : undefined,
    providesHousing: searchParams.providesHousing === 'true' ? true : undefined,
    salaryMin: searchParams.salaryMin ? parseInt(searchParams.salaryMin) : undefined,
  };

  // Fetch offers
  const { offers, total, page, limit } = await getJobOffers(filters);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white">
        <div className="container-custom py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Offres d'emploi local
              </h1>
              <p className="text-brand-100 mt-1">
                Biguglia et ses environs
              </p>
            </div>
          </div>
          <p className="text-lg text-brand-50 max-w-2xl">
            Découvrez les opportunités d'emploi près de chez vous : CDI, CDD, saisonnier, extra, mission...
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="container-custom py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Filters */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20">
              <Suspense fallback={<div className="bg-white rounded-lg border-2 border-gray-200 p-4 animate-pulse h-96" />}>
                <JobFiltersClient filters={filters} totalResults={total} />
              </Suspense>
            </div>
          </aside>

          {/* Main: Results */}
          <main className="lg:col-span-3">
            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-brand-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  {total > 0 ? (
                    <>
                      <span className="text-brand-600">{total}</span> offre
                      {total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}
                    </>
                  ) : (
                    'Aucune offre trouvée'
                  )}
                </h2>
              </div>

              {/* Sorting (mobile dropdown) */}
              <div className="hidden md:block">
                <select
                  defaultValue={filters.sortBy || 'date_desc'}
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-brand-400"
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams as any);
                    params.set('sortBy', e.target.value);
                    window.location.href = `/emploi/offres?${params.toString()}`;
                  }}
                >
                  <option value="date_desc">Plus récentes</option>
                  <option value="date_asc">Plus anciennes</option>
                  <option value="salary_desc">Salaire décroissant</option>
                  <option value="completeness_desc">Mieux remplies</option>
                </select>
              </div>
            </div>

            {/* Results list */}
            {offers.length > 0 ? (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <JobOfferCard
                    key={offer.id}
                    offer={offer}
                    variant={offer.visibility_level === 'featured' ? 'featured' : 'default'}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-12 text-center">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aucune offre trouvée
                </h3>
                <p className="text-gray-600 mb-6">
                  Essayez d'ajuster vos filtres de recherche ou revenez plus tard.
                </p>
                <a
                  href="/emploi/offres"
                  className="inline-flex items-center px-6 py-3 bg-brand-500 text-white font-semibold rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Réinitialiser les filtres
                </a>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                {page > 1 && (
                  <a
                    href={`/emploi/offres?${new URLSearchParams({ ...searchParams as any, page: String(page - 1) })}`}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    ← Précédent
                  </a>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <a
                        key={pageNum}
                        href={`/emploi/offres?${new URLSearchParams({ ...searchParams as any, page: String(pageNum) })}`}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${
                          pageNum === page
                            ? 'bg-brand-500 text-white'
                            : 'border-2 border-gray-200 hover:border-brand-400 hover:text-brand-600'
                        }`}
                      >
                        {pageNum}
                      </a>
                    );
                  })}
                </div>

                {page < totalPages && (
                  <a
                    href={`/emploi/offres?${new URLSearchParams({ ...searchParams as any, page: String(page + 1) })}`}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    Suivant →
                  </a>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Client component for filters (needed for interactivity)
'use client';

function JobFiltersClient({
  filters,
  totalResults,
}: {
  filters: Partial<JobOfferFilters>;
  totalResults: number;
}) {
  const handleFiltersChange = (newFilters: Partial<JobOfferFilters>) => {
    const params = new URLSearchParams();

    if (newFilters.query) params.set('query', newFilters.query);
    if (newFilters.categories?.length)
      params.set('categories', newFilters.categories.join(','));
    if (newFilters.contractTypes?.length)
      params.set('contractTypes', newFilters.contractTypes.join(','));
    if (newFilters.sectorId) params.set('sectorId', newFilters.sectorId);
    if (newFilters.isUrgent) params.set('isUrgent', 'true');
    if (newFilters.providesHousing) params.set('providesHousing', 'true');
    if (newFilters.salaryMin) params.set('salaryMin', String(newFilters.salaryMin));
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);

    window.location.href = `/emploi/offres?${params.toString()}`;
  };

  return (
    <JobFilters
      filters={filters}
      onFiltersChange={handleFiltersChange}
      totalResults={totalResults}
      variant="offers"
    />
  );
}
