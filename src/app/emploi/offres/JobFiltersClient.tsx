/**
 * JobFiltersClient - Client component wrapper pour JobFilters
 * Nécessaire pour l'interactivité (navigation URL)
 */

'use client';

import { JobFilters } from '@/components/jobs/JobFilters';
import type { JobOfferFilters } from '@/types/jobs';

interface JobFiltersClientProps {
  filters: Partial<JobOfferFilters>;
  totalResults: number;
}

export function JobFiltersClient({ filters, totalResults }: JobFiltersClientProps) {
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
