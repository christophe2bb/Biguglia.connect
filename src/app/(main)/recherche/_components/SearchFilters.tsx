'use client';
/**
 * SearchFilters — barre de filtres thèmes + filtres avancés
 */

import { MapPin, X, SlidersHorizontal, Tag, LayoutGrid, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEMES, ThemeKey, SORT_OPTIONS } from '../_config';

interface Props {
  activeThemes: ThemeKey[];
  sortBy: string;
  filterFree: boolean;
  filterLocation: string;
  showFilters: boolean;
  onToggleTheme: (key: ThemeKey) => void;
  onClearThemes: () => void;
  onSortChange: (v: string) => void;
  onFilterFreeChange: (v: boolean) => void;
  onFilterLocationChange: (v: string) => void;
  onToggleFilters: () => void;
  onClearAdvanced: () => void;
}

export default function SearchFilters({
  activeThemes, sortBy, filterFree, filterLocation, showFilters,
  onToggleTheme, onClearThemes, onSortChange,
  onFilterFreeChange, onFilterLocationChange, onToggleFilters, onClearAdvanced,
}: Props) {
  const hasAdvanced = filterLocation || filterFree;

  return (
    <>
      {/* ── Filtres thèmes + raccourcis ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* Tous */}
        <button
          onClick={onClearThemes}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
            activeThemes.length === 0
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
          )}
        >
          <LayoutGrid className="w-3 h-3" /> Tous
        </button>

        {/* Par thème */}
        {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => onToggleTheme(key)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
              activeThemes.includes(key)
                ? cn(cfg.activeBg, cfg.activeText, cfg.border)
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {cfg.icon}{cfg.label}
          </button>
        ))}

        <div className="flex-shrink-0 w-px h-6 bg-gray-200 mx-1" />

        {/* Gratuit */}
        <button
          onClick={() => onFilterFreeChange(!filterFree)}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
            filterFree
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
          )}
        >
          <Tag className="w-3 h-3" /> Gratuit
        </button>

        {/* Filtres avancés */}
        <button
          onClick={onToggleFilters}
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border',
            showFilters
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
          )}
        >
          <SlidersHorizontal className="w-3 h-3" /> Filtres
          {hasAdvanced && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />}
        </button>
      </div>

      {/* ── Filtres avancés (expandable) ── */}
      {showFilters && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Quartier, ville…"
              value={filterLocation}
              onChange={e => onFilterLocationChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={e => onSortChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {hasAdvanced && (
            <button onClick={onClearAdvanced} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X className="w-3 h-3" /> Effacer les filtres
            </button>
          )}
        </div>
      )}
    </>
  );
}
