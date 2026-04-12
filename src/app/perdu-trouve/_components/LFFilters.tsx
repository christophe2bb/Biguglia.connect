'use client';

import { Search, Bell, Archive } from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import type { LFStatus, LFType } from '../_types';
import { CATEGORIES, STATUS_CONFIG, ACTIVE_STATUSES, HISTORY_STATUSES } from '../_constants';

interface Props {
  // Flux
  flux: 'actif' | 'historique';
  setFlux: (f: 'actif' | 'historique') => void;
  activeCount: number;
  historyCount: number;
  // Sector
  filterSector: string | null;
  setFilterSector: (s: string | null) => void;
  // Search
  search: string;
  setSearch: (s: string) => void;
  // Status / Type combined
  filterStatus: LFStatus | 'all';
  setFilterStatus: (s: LFStatus | 'all') => void;
  filterType: 'all' | LFType;
  setFilterType: (t: 'all' | LFType) => void;
  // Category
  filterCat: string;
  setFilterCat: (c: string) => void;
}

export default function LFFilters({
  flux, setFlux, activeCount, historyCount,
  filterSector, setFilterSector,
  search, setSearch,
  filterStatus, setFilterStatus, filterType, setFilterType,
  filterCat, setFilterCat,
}: Props) {
  return (
    <>
      {/* ── Flux toggle ── */}
      <div className="flex items-center gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
        <button
          onClick={() => setFlux('actif')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            flux === 'actif' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <Bell className="w-4 h-4" /> Flux actif
          {activeCount > 0 && (
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
              flux === 'actif' ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-700'
            }`}>
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFlux('historique')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            flux === 'historique' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <Archive className="w-4 h-4" /> Historique
          {historyCount > 0 && (
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${
              flux === 'historique' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {historyCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Sector filter ── */}
      <SectorFilter
        value={filterSector}
        onChange={setFilterSector}
        showAll={true}
        compact={true}
        label="Secteur"
        className="mb-4"
      />

      {/* ── Search + status/type + category ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-52 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (titre, couleur, marque, lieu…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>

        {/* Status / type filter */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden text-sm font-semibold shadow-sm">
          <button
            onClick={() => { setFilterStatus('all'); setFilterType('all'); }}
            className={`px-3 py-2.5 text-xs transition-all ${
              filterStatus === 'all' && filterType === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}>
            Tous
          </button>
          {(flux === 'actif' ? ACTIVE_STATUSES : HISTORY_STATUSES).map(s => {
            const cfg = STATUS_CONFIG[s];
            const isTypeFilter = s === 'perdu' || s === 'trouve';
            const isActiveBtn  = isTypeFilter ? filterType === s : filterStatus === s;
            return (
              <button key={s}
                onClick={() => {
                  if (isTypeFilter) {
                    setFilterType(s as 'perdu' | 'trouve');
                    setFilterStatus('all');
                  } else {
                    setFilterStatus(s);
                    setFilterType('all');
                  }
                }}
                className={`px-3 py-2.5 text-xs transition-all ${
                  isActiveBtn ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Category filter */}
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="all">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
    </>
  );
}
