'use client';

import { useEffect } from 'react';
import { useLFFilters } from './useLFFilters';
import { useLFData }    from './useLFData';
import { useLFActions, computeMatchScore } from './useLFActions';
import { useLFForm }    from './useLFForm';

// Re-export pour backward compat
export { computeMatchScore };

// ─── Hook agrégateur ─────────────────────────────────────────────────────────
export function useLostFound(profileId?: string) {
  const filters = useLFFilters();
  const data    = useLFData(filters);
  const actions = useLFActions(data.items, data.fetchItems, profileId);
  const form    = useLFForm(data.fetchItems);

  // Déclencher fetchItems à chaque changement de filtres
  useEffect(() => {
    data.fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.flux, filters.filterType, filters.filterCat,
    filters.filterStatus, filters.filterSector, filters.search,
  ]);

  return {
    // Données
    items:    data.items,
    loading:  data.loading,
    dbReady:  data.dbReady,
    fetchItems: data.fetchItems,
    // Stats
    perdusCount:    data.perdusCount,
    trouveCount:    data.trouveCount,
    identifieCount: data.identifieCount,
    restitueCount:  data.restitueCount,
    // Filtres
    ...filters,
    // Actions
    handleDelete:        actions.handleDelete,
    handleStatusChange:  actions.handleStatusChange,
    getSuggestedMatches: actions.getSuggestedMatches,
    // Formulaire
    ...form,
  };
}
