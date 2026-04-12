'use client';
/**
 * SearchResultsHeader — compteur de résultats, toggle vue, suggestions contextuelles
 */

import { List, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEMES, ThemeKey } from '../_config';

interface Props {
  query: string;
  totalCount: number;
  loading: boolean;
  view: 'grid' | 'list';
  activeThemes: ThemeKey[];
  contextSuggestions: { themes: ThemeKey[]; label: string } | null;
  onViewChange: (v: 'grid' | 'list') => void;
  onToggleTheme: (key: ThemeKey) => void;
}

export default function SearchResultsHeader({
  query, totalCount, loading, view, activeThemes,
  contextSuggestions, onViewChange, onToggleTheme,
}: Props) {
  return (
    <>
      {/* ── Suggestions contextuelles ── */}
      {contextSuggestions && query.trim() && !loading && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <span className="text-amber-500 mt-0.5">💡</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Pour « {contextSuggestions.label} », on vous suggère aussi :
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {contextSuggestions.themes
                .filter(t => !activeThemes.includes(t))
                .map(t => (
                  <button
                    key={t}
                    onClick={() => onToggleTheme(t)}
                    className={cn('flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:opacity-80', THEMES[t].bg, THEMES[t].color)}
                  >
                    {THEMES[t].icon}{THEMES[t].label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Compteur + toggle vue ── */}
      {query.trim() && !loading && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {totalCount > 0 ? (
                <>{totalCount} résultat{totalCount > 1 ? 's' : ''} pour <span className="text-brand-600">« {query} »</span></>
              ) : (
                <>Résultats pour <span className="text-brand-600">« {query} »</span></>
              )}
            </h1>
            {activeThemes.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                Filtrés par : {activeThemes.map(t => THEMES[t].label).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => onViewChange('list')}
              className={cn('p-1.5 rounded-md transition-colors', view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewChange('grid')}
              className={cn('p-1.5 rounded-md transition-colors', view === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
              title="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
