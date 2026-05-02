'use client';

import { cn } from '@/lib/utils';
import {
  SlidersHorizontal, LayoutGrid, List, Truck, MapPin, X,
} from 'lucide-react';
import { SECTORS, SECTOR_COLORS } from '@/lib/sectors';
import {
  MODE_CONFIG, CONDITION_CONFIG, RARITY_CONFIG,
  type CollectionMode, type RarityLevel, type ConditionLevel,
} from '@/lib/collectionneurs-config';

interface Props {
  // View
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  // Mode (quick bar)
  selectedMode: CollectionMode | 'all';
  setSelectedMode: (m: CollectionMode | 'all') => void;
  // Advanced filters
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  activeFiltersCount: number;
  selectedStatus: 'all' | 'actif' | 'reserve';
  setSelectedStatus: (v: 'all' | 'actif' | 'reserve') => void;
  selectedCond: ConditionLevel | 'all';
  setSelectedCond: (v: ConditionLevel | 'all') => void;
  selectedRarity: RarityLevel | 'all';
  setSelectedRarity: (v: RarityLevel | 'all') => void;
  priceMin: string;
  setPriceMin: (v: string) => void;
  priceMax: string;
  setPriceMax: (v: string) => void;
  sortBy: 'recent' | 'price_asc' | 'price_desc' | 'views' | 'featured';
  setSortBy: (v: 'recent' | 'price_asc' | 'price_desc' | 'views' | 'featured') => void;
  shippingOnly: boolean;
  setShippingOnly: (v: boolean) => void;
  localOnly: boolean;
  setLocalOnly: (v: boolean) => void;
  resetFilters: () => void;
  // Sector
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  sectorCounts: Record<string, number>;
  totalFiltered: number;
}

// ── Quick-mode toolbar + view toggle + filters button ─────────────────────────
export function ModeToolbar({
  viewMode, setViewMode,
  selectedMode, setSelectedMode,
  showFilters, setShowFilters,
  activeFiltersCount,
}: Pick<Props, 'viewMode' | 'setViewMode' | 'selectedMode' | 'setSelectedMode' |
  'showFilters' | 'setShowFilters' | 'activeFiltersCount'>) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {/* All */}
          <button
            onClick={() => setSelectedMode('all')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0',
              selectedMode === 'all' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Tout
          </button>

          {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(selectedMode === mode ? 'all' : mode)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0 border',
                  selectedMode === mode
                    ? cn(cfg.bg, cfg.color, cfg.border, 'shadow-sm')
                    : 'text-gray-600 hover:bg-gray-50 border-transparent'
                )}
              >
                <Icon className="w-4 h-4" />{cfg.label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-lg transition-colors', viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Filters button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors border',
                showFilters || activeFiltersCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Advanced filter panel ─────────────────────────────────────────────────────
export function AdvancedFilters({
  selectedStatus, setSelectedStatus,
  selectedCond,   setSelectedCond,
  selectedRarity, setSelectedRarity,
  priceMin, setPriceMin,
  priceMax, setPriceMax,
  sortBy,   setSortBy,
  shippingOnly, setShippingOnly,
  localOnly,    setLocalOnly,
  activeFiltersCount, resetFilters,
}: Pick<Props,
  'selectedStatus' | 'setSelectedStatus' | 'selectedCond' | 'setSelectedCond' |
  'selectedRarity' | 'setSelectedRarity' | 'priceMin' | 'setPriceMin' |
  'priceMax' | 'setPriceMax' | 'sortBy' | 'setSortBy' |
  'shippingOnly' | 'setShippingOnly' | 'localOnly' | 'setLocalOnly' |
  'activeFiltersCount' | 'resetFilters'
>) {
  return (
    <div className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Status */}
          <div>
            <p className="block text-xs font-semibold text-gray-500 mb-1">Statut</p>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as typeof selectedStatus)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="actif">Disponible</option>
              <option value="reserve">+ Réservés</option>
              <option value="all">Tout (historique)</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <p className="block text-xs font-semibold text-gray-500 mb-1">État</p>
            <select
              value={selectedCond}
              onChange={e => setSelectedCond(e.target.value as ConditionLevel | 'all')}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous états</option>
              {(Object.entries(CONDITION_CONFIG) as [ConditionLevel, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Rarity */}
          <div>
            <p className="block text-xs font-semibold text-gray-500 mb-1">Rareté</p>
            <select
              value={selectedRarity}
              onChange={e => setSelectedRarity(e.target.value as RarityLevel | 'all')}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toute rareté</option>
              {(Object.entries(RARITY_CONFIG) as [RarityLevel, { label: string; icon: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>

          {/* Price min */}
          <div>
            <p className="block text-xs font-semibold text-gray-500 mb-1">Prix min (€)</p>
            <input
              type="number" placeholder="0" value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Price max */}
          <div>
            <p className="block text-xs font-semibold text-gray-500 mb-1">Prix max (€)</p>
            <input
              type="number" placeholder="∞" value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort */}
          <div>
            <p className="block text-xs font-semibold text-gray-500 mb-1">Trier par</p>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="featured">⭐ En vedette d&apos;abord</option>
              <option value="recent">🕐 Plus récents</option>
              <option value="price_asc">💰 Prix croissant</option>
              <option value="price_desc">💰 Prix décroissant</option>
              <option value="views">👁️ Plus consultés</option>
            </select>
          </div>
        </div>

        {/* Transaction options */}
        <div className="flex items-center gap-4 mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={shippingOnly}
              onChange={e => setShippingOnly(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-500" /> Expédition possible
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox" checked={localOnly}
              onChange={e => setLocalOnly(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Remise en main propre
            </span>
          </label>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-semibold"
            >
              <X className="w-4 h-4" /> Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sector Explorer banner ────────────────────────────────────────────────────
export function SectorBar({
  filterSector,
  setFilterSector,
  sectorCounts,
  totalFiltered,
}: Pick<Props, 'filterSector' | 'setFilterSector' | 'sectorCounts' | 'totalFiltered'>) {
  const totalGeolocated = Object.values(sectorCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-black text-gray-900">🗺️ Explorer par quartier</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cliquez sur un secteur pour filtrer les offres</p>
          </div>
          <span className="text-xs text-gray-400 hidden sm:block">
            {totalGeolocated} offre{totalGeolocated !== 1 ? 's' : ''} géolocalisée{totalGeolocated !== 1 ? 's' : ''}
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
                ? 'bg-amber-50 border-amber-300 shadow-md scale-105'
                : 'bg-white border-gray-100 hover:bg-amber-50 hover:border-amber-200'
              }
            `}
          >
            <span className="text-2xl">🗺️</span>
            <span className={`text-[10px] font-bold leading-tight text-center ${
              !filterSector ? 'text-amber-700' : 'text-gray-700'
            }`}>
              Toute la ville
            </span>
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              !filterSector ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {totalFiltered}
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
  );
}
