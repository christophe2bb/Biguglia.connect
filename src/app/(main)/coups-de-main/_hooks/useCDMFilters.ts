'use client';

import { useState, useEffect, useMemo } from 'react';
import { CATEGORIES } from '../_constants';
import { SECTORS } from '@/lib/sectors';
import type { HelpRequest, HelpFilters, HelpType, UrgencyLevel } from '../_types';

const LS_KEY   = 'biguglia_saved_help';
const PAGE_SIZE = 12;

export type CDMFiltersReturn = {
  // Filtres
  filters: HelpFilters;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  setFilterType:    (v: 'all' | HelpType) => void;
  setFilterCat:     (v: string) => void;
  setFilterUrgency: (v: 'all' | UrgencyLevel) => void;
  setFilterSector:  (v: string | null) => void;
  setFilterFree:    (v: boolean) => void;
  setFilterMyHelp:  (v: boolean) => void;
  setSearch:        (v: string) => void;
  activeFiltersCount: number;
  resetFilters: () => void;
  // Favoris
  savedIds: Set<string>;
  toggleSave: (id: string) => void;
  // Résultats filtrés + pagination
  filtered:   HelpRequest[];
  paginated:  HelpRequest[];
  page:       number;
  setPage:    (v: number) => void;
  totalPages: number;
  // KPIs
  kpi: {
    totalActive: number;
    demandes: number;
    offres: number;
    echanges: number;
    urgents: number;
    gratuits: number;
  };
};

const INITIAL_FILTERS: HelpFilters = {
  filterType:    'all',
  filterCat:     'all',
  filterUrgency: 'all',
  filterSector:  null,
  filterFree:    false,
  filterMyHelp:  false,
  search:        '',
};

export function useCDMFilters(items: HelpRequest[]): CDMFiltersReturn {
  const [filters, setFilters]         = useState<HelpFilters>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]               = useState(1);

  // ── Favoris (localStorage) ────────────────────────────────────────────────
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = localStorage.getItem(LS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });

  const toggleSave = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(next))); } catch { /* noop */ }
      return next;
    });
  };

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filters]);

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const { filterType, filterCat, filterUrgency, filterSector, filterFree, filterMyHelp, search } = filters;
    return items.filter(item => {
      if (filterType    !== 'all' && item.help_type   !== filterType)    return false;
      if (filterCat     !== 'all' && item.category     !== filterCat)     return false;
      if (filterUrgency !== 'all' && item.urgency      !== filterUrgency) return false;
      if (filterSector  && item.sector_id !== filterSector)               return false;
      if (filterFree    && item.compensation !== 'gratuit')               return false;
      if (filterMyHelp  && !savedIds.has(item.id))                        return false;
      if (search) {
        const q          = search.toLowerCase();
        const catLabel   = CATEGORIES.find(c => c.value === item.category)?.label?.toLowerCase() ?? '';
        const sectorName = item.sector_id
          ? (SECTORS.find(s => s.id === item.sector_id)?.name?.toLowerCase() ?? '')
          : '';
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.description.toLowerCase().includes(q) &&
          !item.location_area.toLowerCase().includes(q) &&
          !catLabel.includes(q) &&
          !sectorName.includes(q) &&
          !(item.author?.full_name?.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
  }, [items, filters, savedIds]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => ({
    totalActive: items.filter(i => i.status === 'active').length,
    demandes:    items.filter(i => i.help_type === 'demande' && i.status === 'active').length,
    offres:      items.filter(i => i.help_type === 'offre'   && i.status === 'active').length,
    echanges:    items.filter(i => i.help_type === 'echange' && i.status === 'active').length,
    urgents:     items.filter(i => i.urgency   === 'urgent'  && i.status === 'active').length,
    gratuits:    items.filter(i => i.compensation === 'gratuit' && i.status === 'active').length,
  }), [items]);

  // ── Setters individuels ───────────────────────────────────────────────────
  const activeFiltersCount = [
    filters.filterType    !== 'all',
    filters.filterCat     !== 'all',
    filters.filterUrgency !== 'all',
    !!filters.filterSector,
    filters.filterFree,
    filters.filterMyHelp,
    !!filters.search,
  ].filter(Boolean).length;

  const resetFilters       = () => setFilters(INITIAL_FILTERS);
  const setFilterType      = (v: 'all' | HelpType)     => setFilters(f => ({ ...f, filterType: v }));
  const setFilterCat       = (v: string)               => setFilters(f => ({ ...f, filterCat: v }));
  const setFilterUrgency   = (v: 'all' | UrgencyLevel) => setFilters(f => ({ ...f, filterUrgency: v }));
  const setFilterSector    = (v: string | null)        => setFilters(f => ({ ...f, filterSector: v }));
  const setFilterFree      = (v: boolean)              => setFilters(f => ({ ...f, filterFree: v }));
  const setFilterMyHelp    = (v: boolean)              => setFilters(f => ({ ...f, filterMyHelp: v }));
  const setSearch          = (v: string)               => setFilters(f => ({ ...f, search: v }));

  return {
    filters, showFilters, setShowFilters,
    setFilterType, setFilterCat, setFilterUrgency, setFilterSector,
    setFilterFree, setFilterMyHelp, setSearch,
    activeFiltersCount, resetFilters,
    savedIds, toggleSave,
    filtered, paginated, page, setPage, totalPages,
    kpi,
  };
}
