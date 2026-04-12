'use client';

import { Search, Filter, RefreshCw, X, Flame, Bookmark } from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import { CATEGORIES, URGENCY_CONFIG } from '../_constants';
import type { HelpFilters, HelpType, UrgencyLevel } from '../_types';

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  filters: HelpFilters;
  showFilters: boolean;
  activeFiltersCount: number;
  savedIdsSize: number;
  loading: boolean;
  onSetSearch: (v: string) => void;
  onSetFilterType: (v: 'all' | HelpType) => void;
  onSetFilterCat: (v: string) => void;
  onSetFilterUrgency: (v: 'all' | UrgencyLevel) => void;
  onSetFilterSector: (v: string | null) => void;
  onSetFilterFree: (v: boolean) => void;
  onSetFilterMyHelp: (v: boolean) => void;
  onToggleShowFilters: () => void;
  onResetFilters: () => void;
  onRefresh: () => void;
};

// ─── HelpFilters ──────────────────────────────────────────────────────────────
export default function HelpFilters({
  filters, showFilters, activeFiltersCount, savedIdsSize, loading,
  onSetSearch, onSetFilterType, onSetFilterCat, onSetFilterUrgency,
  onSetFilterSector, onSetFilterFree, onSetFilterMyHelp,
  onToggleShowFilters, onResetFilters, onRefresh,
}: Props) {
  const { filterType, filterCat, filterUrgency, filterSector, filterFree, filterMyHelp, search } = filters;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
      {/* Ligne 1 : recherche + bouton filtre */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une annonce, lieu, auteur…"
            value={search}
            onChange={e => onSetSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
          />
          {search && (
            <button onClick={() => onSetSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleShowFilters}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            showFilters ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}>
          <Filter className="w-4 h-4" />
          Filtres
          {activeFiltersCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${showFilters ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'}`}>
              {activeFiltersCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-orange-600 transition-all">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Secteur — toujours visible */}
      <SectorFilter value={filterSector} onChange={onSetFilterSector} showAll compact label="Secteur" className="mb-3" />

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {/* Type */}
        <div className="flex bg-gray-100 rounded-xl overflow-hidden text-xs font-semibold">
          {([
            ['all',     'Tous'],
            ['demande', '🙋 Demandes'],
            ['offre',   '🤝 Offres'],
            ['echange', '🔄 Échanges'],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => onSetFilterType(v as 'all' | HelpType)}
              className={`px-3 py-2 transition-all ${filterType === v ? 'bg-gray-900 text-white rounded-xl' : 'text-gray-600 hover:bg-gray-200'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Urgence rapide */}
        <button
          type="button"
          onClick={() => onSetFilterUrgency(filterUrgency === 'urgent' ? 'all' : 'urgent')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
            filterUrgency === 'urgent'
              ? 'bg-red-100 text-red-700 border-red-300'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}>
          <Flame className="w-3 h-3" /> Urgent seulement
        </button>

        {/* Gratuit */}
        <button
          type="button"
          onClick={() => onSetFilterFree(!filterFree)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
            filterFree
              ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}>
          💚 Gratuit
        </button>

        {/* Mes favoris */}
        {savedIdsSize > 0 && (
          <button
            type="button"
            onClick={() => onSetFilterMyHelp(!filterMyHelp)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              filterMyHelp
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            <Bookmark className="w-3 h-3" /> Mes favoris ({savedIdsSize})
          </button>
        )}
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-3">
          <select
            value={filterCat}
            onChange={e => onSetFilterCat(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>

          <select
            value={filterUrgency}
            onChange={e => onSetFilterUrgency(e.target.value as 'all' | UrgencyLevel)}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="all">Toutes urgences</option>
            {Object.entries(URGENCY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
              <X className="w-3.5 h-3.5 inline mr-1" /> Effacer les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
}
