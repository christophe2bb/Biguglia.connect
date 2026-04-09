/**
 * JobFilters - Composant de filtres pour recherche d'emploi
 * Utilisé dans : pages listing offres et demandes
 */

'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { JobOfferFilters } from '@/types/jobs';
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_LABELS,
} from '@/types/jobs/constants';

interface JobFiltersProps {
  filters: Partial<JobOfferFilters>;
  onFiltersChange: (filters: Partial<JobOfferFilters>) => void;
  totalResults?: number;
  variant?: 'offers' | 'demands';
}

export function JobFilters({
  filters,
  onFiltersChange,
  totalResults,
  variant = 'offers',
}: JobFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleQueryChange = (query: string) => {
    onFiltersChange({ ...filters, query });
  };

  const handleContractTypeToggle = (contractType: string) => {
    const current = filters.contractTypes || [];
    const updated = current.includes(contractType as any)
      ? current.filter((c) => c !== contractType)
      : [...current, contractType as any];
    onFiltersChange({ ...filters, contractTypes: updated.length > 0 ? updated : undefined });
  };

  const handleCategoryToggle = (category: string) => {
    const current = filters.categories || [];
    const updated = current.includes(category as any)
      ? current.filter((c) => c !== category)
      : [...current, category as any];
    onFiltersChange({ ...filters, categories: updated.length > 0 ? updated : undefined });
  };

  const handleExperienceToggle = (level: string) => {
    const current = filters.experienceLevels || [];
    const updated = current.includes(level as any)
      ? current.filter((l) => l !== level)
      : [...current, level as any];
    onFiltersChange({
      ...filters,
      experienceLevels: updated.length > 0 ? updated : undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({ query: filters.query });
  };

  const activeFiltersCount =
    (filters.contractTypes?.length || 0) +
    (filters.categories?.length || 0) +
    (filters.experienceLevels?.length || 0) +
    (filters.requiresLicense ? 1 : 0) +
    (filters.requiresVehicle ? 1 : 0) +
    (filters.providesHousing ? 1 : 0) +
    (filters.isUrgent ? 1 : 0);

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={
            variant === 'offers'
              ? 'Rechercher un poste, une entreprise...'
              : 'Rechercher un profil, une compétence...'
          }
          value={filters.query || ''}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 transition-colors"
        />
      </div>

      {/* Toggle filtres avancés */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres avancés
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-brand-500 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Résultats */}
      {totalResults !== undefined && (
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{totalResults}</span>{' '}
          {variant === 'offers' ? 'offre' : 'demande'}
          {totalResults > 1 ? 's' : ''} trouvée{totalResults > 1 ? 's' : ''}
        </div>
      )}

      {/* Filtres avancés */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Types de contrat */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Type de contrat</h3>
            <div className="flex flex-wrap gap-2">
              {CONTRACT_TYPES.map((contractType) => {
                const isSelected = filters.contractTypes?.includes(contractType);
                return (
                  <button
                    key={contractType}
                    onClick={() => handleContractTypeToggle(contractType)}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-colors
                      ${
                        isSelected
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                      }
                    `}
                  >
                    {CONTRACT_TYPE_LABELS[contractType]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catégories */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Catégorie</h3>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.slice(0, 10).map((category) => {
                const isSelected = filters.categories?.includes(category);
                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-colors
                      ${
                        isSelected
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                      }
                    `}
                  >
                    {JOB_CATEGORY_LABELS[category]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expérience */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Expérience</h3>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map((level) => {
                const isSelected = filters.experienceLevels?.includes(level);
                return (
                  <button
                    key={level}
                    onClick={() => handleExperienceToggle(level)}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-colors
                      ${
                        isSelected
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                      }
                    `}
                  >
                    {EXPERIENCE_LEVEL_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtres booléens (offres uniquement) */}
          {variant === 'offers' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Options</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isUrgent || false}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        isUrgent: e.target.checked || undefined,
                      })
                    }
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">Urgents uniquement</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.providesHousing || false}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        providesHousing: e.target.checked || undefined,
                      })
                    }
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">Avec logement</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.requiresLicense || false}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        requiresLicense: e.target.checked || undefined,
                      })
                    }
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">Permis requis</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.providesRemote || false}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        providesRemote: e.target.checked || undefined,
                      })
                    }
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">Télétravail possible</span>
                </label>
              </div>
            </div>
          )}

          {/* Salaire (slider range) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Salaire mensuel minimum
            </h3>
            <input
              type="range"
              min="800"
              max="5000"
              step="100"
              value={filters.salaryMin || 800}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  salaryMin: parseInt(e.target.value),
                })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
              <span>800€</span>
              <span className="font-semibold text-brand-600">
                {filters.salaryMin || 800}€
              </span>
              <span>5000€</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
