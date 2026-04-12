'use client';

import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { AssoCategory, PubType } from '../_types';
import type { AssoDataFilters } from './useAssoData';

const LS_KEY = 'biguglia_saved_assos';

export type AssoFiltersReturn = AssoDataFilters & {
  showAdvFilters:   boolean;
  setShowAdvFilters:Dispatch<SetStateAction<boolean>>;
  setFilterCat:     (v: AssoCategory | 'all') => void;
  setFilterType:    (v: PubType | 'all') => void;
  setFilterSector:  (v: string | null) => void;
  setFilterNeed:    (v: string) => void;
  setFilterPublic:  (v: string) => void;
  setSearch:        (v: string) => void;
  activeFiltersCount: number;
  resetFilters:     () => void;
  // Saved / favoris
  savedAssos:       Set<string>;
  showSavedOnly:    boolean;
  setShowSavedOnly: Dispatch<SetStateAction<boolean>>;
  toggleSaved:      (id: string) => void;
};

export function useAssoFilters(): AssoFiltersReturn {
  const [filterCat,    setFilterCat]    = useState<AssoCategory | 'all'>('all');
  const [filterType,   setFilterType]   = useState<PubType | 'all'>('all');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterNeed,   setFilterNeed]   = useState('');
  const [filterPublic, setFilterPublic] = useState('');
  const [search,       setSearch]       = useState('');
  const [showAdvFilters, setShowAdvFilters] = useState(false);

  // ── Favoris ───────────────────────────────────────────────────────────────
  const [savedAssos, setSavedAssos]     = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setSavedAssos(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const toggleSaved = (id: string) => {
    setSavedAssos(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Compteur filtres actifs ───────────────────────────────────────────────
  const activeFiltersCount = [
    filterCat    !== 'all',
    filterType   !== 'all',
    !!filterSector,
    !!filterNeed,
    !!filterPublic,
    !!search.trim(),
    showSavedOnly,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilterCat('all');
    setFilterType('all');
    setFilterSector(null);
    setFilterNeed('');
    setFilterPublic('');
    setSearch('');
    setShowSavedOnly(false);
  };

  return {
    // AssoDataFilters (passés à useAssoData)
    filterCat, filterType, filterSector, filterNeed, filterPublic, search,
    // UI
    showAdvFilters, setShowAdvFilters,
    setFilterCat, setFilterType, setFilterSector,
    setFilterNeed, setFilterPublic, setSearch,
    activeFiltersCount, resetFilters,
    // Saved
    savedAssos, showSavedOnly, setShowSavedOnly, toggleSaved,
  };
}
