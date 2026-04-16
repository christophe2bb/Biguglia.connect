'use client';

import { ForumSector, ForumCategory } from '@/types';
import { Search, Filter, X, MapPin, Tag, List, LayoutGrid, Clock, Flame, MessageCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POST_TYPE_CONFIG } from '../_config';
import { SortMode } from '../_types';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  sectors:          ForumSector[];
  categories:       ForumCategory[];
  selectedSector:   string | null;
  selectedCategory: string | null;
  selectedType:     string | null;
  sortMode:         SortMode;
  searchInput:      string;
  searchQuery:      string;
  viewMode:         'list' | 'grid';
  showFilters:      boolean;
  statusFilter:     'all' | 'ouvert' | 'resolu';
  urgencyFilter:    'all' | 'haute';
  activeFiltersCount: number;
  setSelectedSector:   (v: string | null) => void;
  setSelectedCategory: (v: string | null) => void;
  setSelectedType:     (v: string | null) => void;
  setSortMode:         (v: SortMode) => void;
  setSearchInput:      (v: string) => void;
  setViewMode:         (v: 'list' | 'grid') => void;
  setShowFilters:      (v: boolean | ((prev: boolean) => boolean)) => void;
  setStatusFilter:     (v: 'all' | 'ouvert' | 'resolu') => void;
  setUrgencyFilter:    (v: 'all' | 'haute') => void;
  handleSearch:        (e: React.FormEvent) => void;
  clearFilters:        () => void;
  topicCount:          number;
  loading:             boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export function ForumFilters({
  sectors, categories,
  selectedSector, selectedCategory, selectedType,
  sortMode, searchInput, searchQuery, viewMode,
  showFilters, statusFilter, urgencyFilter, activeFiltersCount,
  setSelectedSector, setSelectedCategory, setSelectedType,
  setSortMode, setSearchInput, setViewMode, setShowFilters,
  setStatusFilter, setUrgencyFilter,
  handleSearch, clearFilters,
  topicCount, loading,
}: Props) {
  return (
    <div className="flex-1 min-w-0">

      {/* ── Filtres actifs pills ── */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedSector && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full font-semibold border border-violet-200">
              <MapPin className="w-3 h-3" />
              {sectors.find(s => s.id === selectedSector || s.slug === selectedSector)?.name ?? selectedSector}
              <button onClick={() => setSelectedSector(null)} className="ml-1 hover:text-violet-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold border border-indigo-200">
              <Tag className="w-3 h-3" />
              {categories.find(c => c.id === selectedCategory || c.slug === selectedCategory)?.name ?? selectedCategory}
              <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:text-indigo-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full font-semibold border border-sky-200">
              {POST_TYPE_CONFIG[selectedType]?.label ?? selectedType}
              <button onClick={() => setSelectedType(null)} className="ml-1 hover:text-sky-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-semibold border border-emerald-200">
              {statusFilter === 'resolu' ? '✅ Résolus' : '🟢 Ouverts'}
              <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-emerald-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {urgencyFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-semibold border border-red-200">
              🚨 Urgents
              <button onClick={() => setUrgencyFilter('all')} className="ml-1 hover:text-red-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full font-semibold border border-gray-200">
              <Search className="w-3 h-3" /> &quot;{searchQuery}&quot;
              <button onClick={() => { setSearchInput(''); clearFilters(); }} className="ml-1 hover:text-gray-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-semibold px-2">
            Tout effacer
          </button>
        </div>
      )}

      {/* ── Barre recherche ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Voirie, éclairage, fête, voisinage, idée…"
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 focus:bg-white transition-all"
            />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button type="submit" className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors flex-shrink-0 flex items-center gap-1.5">
            <Search className="w-4 h-4" /> <span className="hidden sm:inline">Chercher</span>
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={cn('px-3 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 flex-shrink-0',
              showFilters || activeFiltersCount > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50')}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="bg-white text-violet-700 rounded-full w-4 h-4 flex items-center justify-center text-xs font-black">{activeFiltersCount}</span>
            )}
          </button>
        </form>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div>
              <label className="text-xs font-black text-gray-500 mb-2 block uppercase tracking-wide">Type de post</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(POST_TYPE_CONFIG).map(([key, cfg]) => {
                  const I = cfg.icon;
                  return (
                    <button key={key}
                      onClick={() => setSelectedType(selectedType === key ? null : key)}
                      className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all',
                        selectedType === key ? cn(cfg.bg, cfg.color, cfg.border) : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                      <I className="w-3 h-3" /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Statut */}
              <div>
                <label className="text-xs font-black text-gray-500 mb-1.5 block uppercase tracking-wide">Statut</label>
                <div className="flex gap-1.5">
                  {([{ val: 'all', label: 'Tous' }, { val: 'ouvert', label: '🟢 Ouverts' }, { val: 'resolu', label: '✅ Résolus' }] as const).map(s => (
                    <button key={s.val} onClick={() => setStatusFilter(s.val)}
                      className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', statusFilter === s.val ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgence */}
              <div>
                <label className="text-xs font-black text-gray-500 mb-1.5 block uppercase tracking-wide">Urgence</label>
                <div className="flex gap-1.5">
                  <button onClick={() => setUrgencyFilter('all')}
                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', urgencyFilter === 'all' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                    Tous
                  </button>
                  <button onClick={() => setUrgencyFilter('haute')}
                    className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all', urgencyFilter === 'haute' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50')}>
                    🚨 Urgents
                  </button>
                </div>
              </div>

              {/* Vue */}
              <div>
                <label className="text-xs font-black text-gray-500 mb-1.5 block uppercase tracking-wide">Vue</label>
                <div className="flex gap-1.5">
                  <button onClick={() => setViewMode('list')} className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1', viewMode === 'list' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                    <List className="w-3.5 h-3.5" /> Liste
                  </button>
                  <button onClick={() => setViewMode('grid')} className={cn('flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1', viewMode === 'grid' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                    <LayoutGrid className="w-3.5 h-3.5" /> Grille
                  </button>
                </div>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="w-full text-xs text-red-500 hover:text-red-700 py-2 border border-red-200 rounded-xl bg-red-50 hover:bg-red-100 transition-all font-semibold">
                ✕ Effacer tous les filtres ({activeFiltersCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Barre tri + compteur + vue ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
          {([
            { key: 'recent',  icon: Clock,         label: 'Récents'   },
            { key: 'hot',     icon: Flame,         label: '🔥 Actifs' },
            { key: 'replies', icon: MessageCircle, label: 'Réponses'  },
            { key: 'views',   icon: Eye,           label: 'Vus'       },
          ] as { key: SortMode; icon: React.ComponentType<{ className?: string }>; label: string }[]).map(s => (
            <button key={s.key} onClick={() => setSortMode(s.key)}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                sortMode === s.key ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50')}>
              <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!loading && (
            <span className="text-xs text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-xl font-semibold shadow-sm">
              {topicCount} sujet{topicCount !== 1 ? 's' : ''}
            </span>
          )}
          <div className="flex gap-0.5 bg-white rounded-xl border border-gray-100 p-0.5 shadow-sm" role="group" aria-label="Mode d'affichage">
            <button
              onClick={() => setViewMode('list')}
              aria-label="Affichage liste"
              aria-pressed={viewMode === 'list'}
              className={cn('p-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400', viewMode === 'list' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Affichage grille"
              aria-pressed={viewMode === 'grid'}
              className={cn('p-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400', viewMode === 'grid' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
