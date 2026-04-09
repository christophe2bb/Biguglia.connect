/**
 * JobFiltersClient - Client component wrapper pour JobFilters
 * Nécessaire pour l'interactivité (navigation URL)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { JobOfferFilters } from '@/types/jobs';
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
} from '@/types/jobs/constants';

interface JobFiltersClientProps {
  filters: Partial<JobOfferFilters>;
  totalResults: number;
}

export function JobFiltersClient({ filters, totalResults }: JobFiltersClientProps) {
  const router = useRouter();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const updateFilters = (newFilters: Partial<JobOfferFilters>) => {
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

    router.push(`/emploi/offres?${params.toString()}`);
  };

  const handleContractTypeToggle = (contractType: string) => {
    const current = localFilters.contractTypes || [];
    const updated = current.includes(contractType as any)
      ? current.filter((c) => c !== contractType)
      : [...current, contractType as any];
    const newFilters = { ...localFilters, contractTypes: updated.length > 0 ? updated : undefined };
    setLocalFilters(newFilters);
    updateFilters(newFilters);
  };

  const handleCategoryToggle = (category: string) => {
    const current = localFilters.categories || [];
    const updated = current.includes(category as any)
      ? current.filter((c) => c !== category)
      : [...current, category as any];
    const newFilters = { ...localFilters, categories: updated.length > 0 ? updated : undefined };
    setLocalFilters(newFilters);
    updateFilters(newFilters);
  };

  const clearFilters = () => {
    setLocalFilters({});
    router.push('/emploi/offres');
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Filtres</h2>
          {totalResults !== undefined && (
            <span className="text-xs text-gray-500">{totalResults} résultat{totalResults > 1 ? 's' : ''}</span>
          )}
        </div>
        <button
          onClick={clearFilters}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Réinitialiser
        </button>
      </div>

      {/* Filters body */}
      <div className="p-4 space-y-6">
        {/* Search */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 block">
            Recherche
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Mots-clés..."
              defaultValue={localFilters.query || ''}
              onChange={(e) => {
                const newFilters = { ...localFilters, query: e.target.value || undefined };
                setLocalFilters(newFilters);
                updateFilters(newFilters);
              }}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Contract Types */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 block">
            Type de contrat
          </label>
          <div className="space-y-2">
            {CONTRACT_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={localFilters.contractTypes?.includes(type as any) || false}
                  onChange={() => handleContractTypeToggle(type)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-brand-600">
                  {CONTRACT_TYPE_LABELS[type as keyof typeof CONTRACT_TYPE_LABELS]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 block">
            Catégorie
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {JOB_CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={localFilters.categories?.includes(cat as any) || false}
                  onChange={() => handleCategoryToggle(cat)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-brand-600">
                  {JOB_CATEGORY_LABELS[cat as keyof typeof JOB_CATEGORY_LABELS]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
