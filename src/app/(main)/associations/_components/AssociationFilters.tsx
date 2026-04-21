'use client';

import { Search, X, Filter, BookmarkCheck } from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';
import { CAT_CONFIG, PUB_TYPE_CONFIG, PUBLIC_OPTIONS } from '../_constants';
import { SECTORS } from '@/lib/sectors';
import type { AssoCategory, PubType, Association } from '../_types';

interface AssociationFiltersProps {
  filterCat: AssoCategory | 'all';
  setFilterCat: (v: AssoCategory | 'all') => void;
  filterType: PubType | 'all';
  setFilterType: (v: PubType | 'all') => void;
  filterSector: string | null;
  setFilterSector: (v: string | null) => void;
  filterNeed: string;
  setFilterNeed: (v: string) => void;
  filterPublic: string;
  setFilterPublic: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  showAdvFilters: boolean;
  setShowAdvFilters: (fn: (prev: boolean) => boolean) => void;
  showSavedOnly: boolean;
  setShowSavedOnly: (fn: (prev: boolean) => boolean) => void;
  activeFiltersCount: number;
  resetFilters: () => void;
  savedAssos: Set<string>;
  assos: Association[];
  displayedAssos: Association[];
  loading: boolean;
}

export default function AssociationFilters({
  filterCat, setFilterCat, filterType, setFilterType,
  filterSector, setFilterSector, filterNeed, setFilterNeed,
  filterPublic, setFilterPublic, search, setSearch,
  showAdvFilters, setShowAdvFilters, showSavedOnly, setShowSavedOnly,
  activeFiltersCount, resetFilters, savedAssos, assos, displayedAssos, loading,
}: AssociationFiltersProps) {
  return (
    <div className="space-y-3 mb-6">
      {/* Barre de recherche enrichie */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Rechercher (nom, activité, besoin, public, tag…)" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={() => setShowAdvFilters(v => !v)}
          className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all',
            showAdvFilters || activeFiltersCount > 0 ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
          <Filter className="w-4 h-4" />
          {activeFiltersCount > 0 && <span className="w-5 h-5 bg-violet-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{activeFiltersCount}</span>}
        </button>
      </div>

      {/* Filtres actifs pills */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filterCat !== 'all' && (
            <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {CAT_CONFIG[filterCat as AssoCategory]?.emoji} {CAT_CONFIG[filterCat as AssoCategory]?.label ?? filterCat}
              <button onClick={() => setFilterCat('all')}><X className="w-3 h-3 ml-0.5" /></button>
            </span>
          )}
          {filterSector && (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
              📍 {SECTORS.find(s => s.slug === filterSector || s.id === filterSector)?.name ?? filterSector}
              <button onClick={() => setFilterSector(null)}><X className="w-3 h-3 ml-0.5" /></button>
            </span>
          )}
          {filterNeed && (
            <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-full">
              🙋 {filterNeed === 'benevoles' ? 'Bénévoles' : filterNeed === 'dons' ? 'Dons' : filterNeed === 'adherents' ? 'Adhérents' : filterNeed === 'partenaires' ? 'Partenaires' : filterNeed}
              <button onClick={() => setFilterNeed('')}><X className="w-3 h-3 ml-0.5" /></button>
            </span>
          )}
          {filterPublic && (
            <span className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-700 text-xs font-bold px-3 py-1.5 rounded-full">
              👤 {filterPublic}
              <button onClick={() => setFilterPublic('')}><X className="w-3 h-3 ml-0.5" /></button>
            </span>
          )}
          {showSavedOnly && (
            <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <BookmarkCheck className="w-3 h-3" /> Mes favoris
              <button onClick={() => setShowSavedOnly(() => false)}><X className="w-3 h-3 ml-0.5" /></button>
            </span>
          )}
          <button onClick={resetFilters}
            className="text-xs text-gray-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" /> Tout réinitialiser
          </button>
        </div>
      )}

      {/* Filtres avancés */}
      {showAdvFilters && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
          <SectorFilter value={filterSector} onChange={setFilterSector} compact label="Secteur" allowCitywide showAll />

          <div>
            <p className="block text-xs font-bold text-gray-500 mb-2">Type de fiche</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterType('all')}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                  filterType === 'all' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300')}>
                Tous
              </button>
              {(Object.entries(PUB_TYPE_CONFIG) as [PubType, typeof PUB_TYPE_CONFIG[PubType]][]).map(([key, conf]) => (
                <button key={key} onClick={() => setFilterType(filterType === key ? 'all' : key)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                    filterType === key ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300')}>
                  {conf.emoji} {conf.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-xs font-bold text-gray-500 mb-2">Besoin actif</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'benevoles', label: '🙋 Bénévoles' },
                { id: 'adherents', label: '👥 Adhérents' },
                { id: 'dons',      label: '💝 Dons' },
                { id: 'partenaires', label: '🤝 Partenaires' },
                { id: 'Matériel',  label: '📦 Matériel' },
              ].map(({ id, label }) => (
                <button key={id} onClick={() => setFilterNeed(filterNeed === id ? '' : id)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                    filterNeed === id ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300')}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="block text-xs font-bold text-gray-500 mb-2">Public cible</p>
            <div className="flex flex-wrap gap-2">
              {PUBLIC_OPTIONS.map(p => (
                <button key={p} onClick={() => setFilterPublic(filterPublic === p ? '' : p)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                    filterPublic === p ? 'bg-sky-500 text-white border-sky-500' : 'bg-white text-gray-500 border-gray-200 hover:border-sky-300')}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {savedAssos.size > 0 && (
            <button onClick={() => setShowSavedOnly(v => !v)}
              className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all',
                showSavedOnly ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-yellow-50')}>
              <BookmarkCheck className="w-4 h-4" /> Mes favoris ({savedAssos.size})
            </button>
          )}
        </div>
      )}

      {/* Catégories pills horizontales */}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setFilterCat('all')}
          className={cn('px-4 py-1.5 rounded-full text-xs font-bold border transition-all',
            filterCat === 'all' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300')}>
          Toutes
        </button>
        {(Object.entries(CAT_CONFIG) as [AssoCategory, typeof CAT_CONFIG[AssoCategory]][]).map(([key, conf]) => {
          const Icon = conf.icon;
          const count = assos.filter(a => a.category === key).length;
          return (
            <button key={key} type="button" onClick={() => setFilterCat(filterCat === key ? 'all' : key)}
              className={cn('inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all',
                filterCat === key ? 'bg-violet-500 text-white border-violet-500' : `bg-white ${conf.color} border-gray-200 hover:border-violet-300`)}>
              <span>{conf.emoji}</span>
              <Icon className="w-3 h-3" />{conf.label}
              {count > 0 && <span className={cn('text-[10px]', filterCat === key ? 'text-white/70' : 'text-gray-400')}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Compteur résultats */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-600">
          {loading ? 'Chargement…' : `${displayedAssos.length} association${displayedAssos.length !== 1 ? 's' : ''}`}
          {activeFiltersCount > 0 && <span className="text-violet-500 ml-1 font-normal">({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''})</span>}
        </p>
      </div>
    </div>
  );
}
