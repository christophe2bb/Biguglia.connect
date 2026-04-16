'use client';

/**
 * ArtisanFilters — Barre de filtres pour la page admin artisans.
 *
 * Extrait de page.tsx pour alléger l'orchestrateur.
 * Reçoit les valeurs et callbacks depuis la page parente.
 */

import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

type FilterValue = 'pending' | 'verified' | 'all';

interface ArtisanFiltersProps {
  search: string;
  filter: FilterValue;
  totalCount: number;
  filteredCount: number;
  onSearch: (value: string) => void;
  onFilter: (value: FilterValue) => void;
  onRefresh: () => void;
}

export default function ArtisanFilters({
  search,
  filter,
  totalCount,
  filteredCount,
  onSearch,
  onFilter,
  onRefresh,
}: ArtisanFiltersProps) {
  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={filter}
          onChange={(e) => onFilter(e.target.value as FilterValue)}
          className="sm:w-52"
        >
          <option value="pending">⏳ En attente de validation</option>
          <option value="verified">✅ Artisans vérifiés</option>
          <option value="all">📋 Tous les dossiers</option>
        </Select>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex-shrink-0"
          title="Actualiser"
        >
          ↻ Actualiser
        </button>
      </div>

      {/* Compteur */}
      {search && (
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{filteredCount}</span>
          {' '}résultat{filteredCount > 1 ? 's' : ''} sur {totalCount}
        </p>
      )}
    </div>
  );
}
