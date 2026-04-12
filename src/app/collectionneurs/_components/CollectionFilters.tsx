'use client';

import { cn } from '@/lib/utils';
import {
  SlidersHorizontal, LayoutGrid, List, Truck, MapPin, X,
} from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
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
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0',
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
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
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
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border',
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Statut</label>
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">État</label>
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Rareté</label>
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
            <label className="block text-xs font-semibold text-gray-500 mb-1">Prix min (€)</label>
            <input
              type="number" placeholder="0" value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Price max */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Prix max (€)</label>
            <input
              type="number" placeholder="∞" value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Trier par</label>
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

// ── Sector bar ────────────────────────────────────────────────────────────────
export function SectorBar({
  filterSector,
  setFilterSector,
}: Pick<Props, 'filterSector' | 'setFilterSector'>) {
  return (
    <div className="border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <SectorFilter value={filterSector} onChange={setFilterSector} compact label="Secteur" />
      </div>
    </div>
  );
}
