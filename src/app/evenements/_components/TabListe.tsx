'use client';

import React from 'react';
import { Calendar, Loader2, Search, X, Filter, ChevronDown, Zap, BookmarkCheck, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectorFilter from '@/components/ui/SectorFilter';
import EventCard from './EventCard';
import { EVENT_CATEGORIES } from '../_constants';
import type { LocalEvent, QuickFilter } from '../_types';

interface Props {
  loading: boolean;
  filteredEvents: LocalEvent[];
  activeFiltersCount: number;
  // Filter state
  filterCat: string;         setFilterCat: (v: string) => void;
  filterStatus: string;      setFilterStatus: (v: string) => void;
  filterSector: string|null; setFilterSector: (v: string|null) => void;
  searchQuery: string;       setSearchQuery: (v: string) => void;
  quickFilter: QuickFilter;  setQuickFilter: (v: QuickFilter) => void;
  showAdvFilters: boolean;   setShowAdvFilters: (v: boolean) => void;
  filterInscription: boolean; setFilterInscription: (fn: (v: boolean) => boolean) => void;
  filterFree: boolean;        setFilterFree: (fn: (v: boolean) => boolean) => void;
  showSavedOnly: boolean;     setShowSavedOnly: (fn: (v: boolean) => boolean) => void;
  savedEvents: Set<string>;
  // Callbacks
  userId?: string;
  onJoin: (id: string, joined: boolean) => void;
  onStatusChange: (id: string, s: string) => void;
  onToggleSave: (id: string) => void;
  profile: { id: string } | null;
  onCreateClick: () => void;
  onResetFilters: () => void;
}

export default function TabListe({
  loading, filteredEvents, activeFiltersCount,
  filterCat, setFilterCat, filterStatus, setFilterStatus,
  filterSector, setFilterSector, searchQuery, setSearchQuery,
  quickFilter, setQuickFilter, showAdvFilters, setShowAdvFilters,
  filterInscription, setFilterInscription, filterFree, setFilterFree,
  showSavedOnly, setShowSavedOnly, savedEvents,
  userId, onJoin, onStatusChange, onToggleSave, profile, onCreateClick, onResetFilters,
}: Props) {
  const quickFilterLabel = (qf: QuickFilter): string => {
    if (qf === 'aujourd_hui') return "Aujourd'hui";
    if (qf === 'ce_weekend') return 'Ce week-end';
    if (qf === 'famille') return 'En famille';
    if (qf === 'gratuit') return 'Gratuit';
    if (qf === 'officiel') return 'Officiel';
    return '';
  };

  return (
    <div>
      {/* ── Filtres ── */}
      <div className="mb-5 space-y-3">
        {/* Barre recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un événement (titre, lieu, organisateur, tag…)"
            className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white shadow-sm" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtres actifs pills */}
        {(quickFilter || filterInscription || filterFree || showSavedOnly) && (
          <div className="flex flex-wrap gap-2">
            {quickFilter && (
              <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Zap className="w-3 h-3" />
                {quickFilterLabel(quickFilter)}
                <button onClick={() => setQuickFilter(null)} className="ml-0.5 hover:text-purple-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterInscription && (
              <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Inscription requise
                <button onClick={() => setFilterInscription(() => false)} className="ml-0.5 hover:text-amber-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterFree && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                🎟️ Gratuit seulement
                <button onClick={() => setFilterFree(() => false)} className="ml-0.5 hover:text-emerald-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {showSavedOnly && (
              <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <BookmarkCheck className="w-3 h-3" /> Mes favoris
                <button onClick={() => setShowSavedOnly(() => false)} className="ml-0.5 hover:text-yellow-900"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Secteur */}
        <SectorFilter value={filterSector} onChange={setFilterSector} showAll allowCitywide compact label="Secteur" />

        {/* Statut */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all',     label: 'Tous' },
            { id: 'a_venir', label: '🟢 À venir' },
            { id: 'complet', label: '🟡 Complet' },
            { id: 'reporte', label: '🔵 Reporté' },
            { id: 'annule',  label: '🔴 Annulé' },
            { id: 'passe',   label: '⚪ Passé' },
          ].map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                filterStatus === s.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50')}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Filtres rapides supplémentaires */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterInscription(f => !f)}
            className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
              filterInscription ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
            <CheckCircle2 className="w-3 h-3" /> Inscription requise
          </button>
          <button onClick={() => setFilterFree(f => !f)}
            className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
              filterFree ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
            🎟️ Gratuit
          </button>
          {savedEvents.size > 0 && (
            <button onClick={() => setShowSavedOnly(f => !f)}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                showSavedOnly ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
              <BookmarkCheck className="w-3 h-3" /> Favoris ({savedEvents.size})
            </button>
          )}
        </div>

        {/* Catégories + toggle avancé */}
        <div>
          <button onClick={() => setShowAdvFilters(!showAdvFilters)}
            className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-2 hover:text-purple-600 transition-colors">
            <Filter className="w-3.5 h-3.5" /> Filtrer par catégorie
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAdvFilters && 'rotate-180')} />
          </button>
          {showAdvFilters && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterCat('all')}
                className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all',
                  filterCat === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50')}>
                Toutes
              </button>
              {EVENT_CATEGORIES.slice(0, 7).map(c => (
                <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
                  className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all',
                    filterCat === c.id ? `${c.bg} ${c.color} border ${c.border}` : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50')}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-700">
          {loading ? 'Chargement…' : `${filteredEvents.length} événement${filteredEvents.length !== 1 ? 's' : ''}`}
          {activeFiltersCount > 0 && (
            <span className="text-purple-500 ml-1 font-normal">
              ({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''})
            </span>
          )}
        </p>
        {activeFiltersCount > 0 && (
          <button onClick={onResetFilters}
            className="text-xs text-gray-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" /> Réinitialiser
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Calendar className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500 text-lg">Aucun événement</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Modifiez les filtres ou proposez un événement !</p>
          {profile && (
            <button onClick={onCreateClick}
              className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Créer un événement
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEvents.map(ev => (
            <EventCard key={ev.id} event={ev} userId={userId} onJoin={onJoin}
              onStatusChange={onStatusChange} onToggleSave={onToggleSave} savedEvents={savedEvents} />
          ))}
        </div>
      )}
    </div>
  );
}
