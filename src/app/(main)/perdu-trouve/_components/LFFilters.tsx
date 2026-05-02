'use client';

import { Search, Bell, Archive } from 'lucide-react';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';
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
  sectorCounts: Record<string, number>;
  totalItems: number;
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
  sectorCounts, totalItems,
  search, setSearch,
  filterStatus, setFilterStatus, filterType, setFilterType,
  filterCat, setFilterCat,
}: Props) {
  const totalGeolocated = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* ── Flux toggle ── */}
      <div className="flex items-center gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
        <button
          onClick={() => setFlux('actif')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
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

      {/* ── Explorer par quartier ── */}
      <div className="bg-white rounded-2xl border border-gray-100 mb-4">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-gray-900">🗺️ Explorer par quartier</h2>
              <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un secteur pour filtrer les annonces</p>
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">
              {totalGeolocated} annonce{totalGeolocated !== 1 ? 's' : ''} géolocalisée{totalGeolocated !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {/* Toute la ville */}
            <button
              type="button"
              onClick={() => setFilterSector(null)}
              className={`
                flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
                transition-all duration-200 cursor-pointer
                ${!filterSector
                  ? 'bg-orange-50 border-orange-300 shadow-md scale-105'
                  : 'bg-white border-gray-100 hover:bg-orange-50 hover:border-orange-200'
                }
              `}
            >
              <span className="text-2xl">🗺️</span>
              <span className={`text-[10px] font-bold leading-tight text-center ${
                !filterSector ? 'text-orange-700' : 'text-gray-700'
              }`}>
                Toute la ville
              </span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                !filterSector ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {totalItems}
              </span>
            </button>

            {SECTORS.map(sector => {
              const count  = sectorCounts[sector.id] || 0;
              const colors = SECTOR_COLORS[sector.color];
              const active = filterSector === sector.id;
              return (
                <button
                  key={sector.id}
                  type="button"
                  onClick={() => setFilterSector(active ? null : sector.id)}
                  className={`
                    relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3
                    transition-all duration-200 cursor-pointer select-none
                    ${active
                      ? `${colors.bg} ${colors.border} shadow-md scale-105`
                      : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                    }
                  `}
                >
                  <span className="text-2xl">{sector.icon}</span>
                  <span className={`text-[10px] font-bold leading-tight text-center ${
                    active ? colors.text : 'text-gray-700'
                  }`}>
                    {sector.name}
                  </span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? colors.badgeSolid : count > 0 ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-300'
                  }`}>
                    {count > 0 ? count : '–'}
                  </span>
                  {active && (
                    <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full ${colors.badgeSolid} flex items-center justify-center`}>
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
            className={`px-3 py-2.5 text-xs transition-colors ${
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
                className={`px-3 py-2.5 text-xs transition-colors ${
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
