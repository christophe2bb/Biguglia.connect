'use client';
/**
 * RecherchePage — orchestrateur
 * ─────────────────────────────────────────────────────────────────────────────
 * Délègue toute la logique à useSearchPage et compose les blocs UI :
 *   SearchFilters        → filtres thèmes + avancés
 *   SearchResultsHeader  → compteur + vue + suggestions
 *   ThemeBlockSection    → blocs de résultats par thème
 *   SearchEmpty          → landing (aucune query)
 *   SearchNoResults      → aucun résultat
 */

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import GlobalSearch from '@/components/ui/GlobalSearch';
import { useSearchPage } from './useSearchPage';
import SearchFilters from './_components/SearchFilters';
import SearchResultsHeader from './_components/SearchResultsHeader';
import ThemeBlockSection from './_components/ThemeBlockSection';
import { SearchEmpty, SearchNoResults } from './_components/SearchEmpty';

// ─── Contenu principal (requiert useSearchParams → Suspense boundary) ─────────
function RechercheContent() {
  const {
    query, loading, blocks, totalCount,
    view, setView, activeThemes, setActiveThemes,
    sortBy, setSortBy, filterFree, setFilterFree,
    filterLocation, setFilterLocation, showFilters, setShowFilters,
    contextSuggestions, toggleTheme, handleSearch,
  } = useSearchPage();

  const isEmpty = !loading && query.trim() && blocks.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header sticky ── */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <GlobalSearch
            size="lg"
            placeholder="Rechercher artisans, annonces, événements, promenades…"
            onSearch={handleSearch}
            overlay={false}
            initialValue={query}
            className="mb-4"
          />
          <SearchFilters
            activeThemes={activeThemes}
            sortBy={sortBy}
            filterFree={filterFree}
            filterLocation={filterLocation}
            showFilters={showFilters}
            onToggleTheme={toggleTheme}
            onClearThemes={() => setActiveThemes([])}
            onSortChange={setSortBy}
            onFilterFreeChange={setFilterFree}
            onFilterLocationChange={setFilterLocation}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onClearAdvanced={() => { setFilterLocation(''); setFilterFree(false); }}
          />
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Landing (aucune query) */}
        {!query.trim() && <SearchEmpty onSearch={handleSearch} />}

        {/* Suggestions contextuelles + compteur + toggle vue */}
        {query.trim() && (
          <SearchResultsHeader
            query={query}
            totalCount={totalCount}
            loading={loading}
            view={view}
            activeThemes={activeThemes}
            contextSuggestions={contextSuggestions}
            onViewChange={setView}
            onToggleTheme={toggleTheme}
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-500">Recherche en cours dans tous les thèmes…</p>
          </div>
        )}

        {/* Aucun résultat */}
        {isEmpty && (
          <SearchNoResults
            query={query}
            activeThemes={activeThemes}
            onClearThemes={() => setActiveThemes([])}
            onSearch={handleSearch}
          />
        )}

        {/* Blocs de résultats */}
        {!loading && blocks.length > 0 && (
          <div>
            {blocks.map(block => (
              <ThemeBlockSection key={block.key} block={block} view={view} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export avec Suspense (useSearchParams requiert un boundary) ───────────────
export default function RecherchePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    }>
      <RechercheContent />
    </Suspense>
  );
}
