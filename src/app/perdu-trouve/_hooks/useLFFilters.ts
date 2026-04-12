'use client';

import { useState } from 'react';
import type { LFStatus, LFType } from '../_types';

export type LFFiltersReturn = {
  flux: 'actif' | 'historique';
  setFlux: (v: 'actif' | 'historique') => void;
  filterType: 'all' | LFType;
  setFilterType: (v: 'all' | LFType) => void;
  filterCat: string;
  setFilterCat: (v: string) => void;
  filterStatus: LFStatus | 'all';
  setFilterStatus: (v: LFStatus | 'all') => void;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  search: string;
  setSearch: (v: string) => void;
};

export function useLFFilters(): LFFiltersReturn {
  const [flux, setFlux]                 = useState<'actif' | 'historique'>('actif');
  const [filterType, setFilterType]     = useState<'all' | LFType>('all');
  const [filterCat, setFilterCat]       = useState('all');
  const [filterStatus, setFilterStatus] = useState<LFStatus | 'all'>('all');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [search, setSearch]             = useState('');

  return {
    flux, setFlux,
    filterType, setFilterType,
    filterCat, setFilterCat,
    filterStatus, setFilterStatus,
    filterSector, setFilterSector,
    search, setSearch,
  };
}
