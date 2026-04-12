'use client';

import { Search, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeBadge from './ThemeBadge';
import type { QuickResult } from '../_types';

interface SearchResultsProps {
  query: string;
  results: QuickResult[];
  loading: boolean;
  error: boolean;
  selectedIdx: number;
  onNavigateTo: (href: string) => void;
  onSubmit: () => void;
}

/**
 * Rendered when the user has typed at least 2 characters.
 * Shows: loading state | error state | empty state | results list + "see all" footer.
 */
export default function SearchResults({
  query,
  results,
  loading,
  error,
  selectedIdx,
  onNavigateTo,
  onSubmit,
}: SearchResultsProps) {
  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-500">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Erreur lors de la recherche. Réessayez.
      </div>
    );
  }

  // ── Loading (no results yet) ───────────────────────────────────────────────
  if (loading && results.length === 0) {
    return (
      <div className="flex items-center gap-3 p-5 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
        Recherche en cours…
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (results.length === 0 && !loading) {
    return (
      <div className="p-5">
        <p className="text-sm text-gray-500 mb-3">
          Aucun résultat rapide pour « {query.trim()} »
        </p>
        <button
          onClick={onSubmit}
          className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <Search className="w-4 h-4" />
          Recherche complète →
        </button>
      </div>
    );
  }

  // ── Results list ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="divide-y divide-gray-50">
        {results.map((r, idx) => (
          <button
            key={r.id}
            onClick={() => onNavigateTo(r.href)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
              selectedIdx === idx ? 'bg-gray-50' : 'hover:bg-gray-50',
            )}
          >
            <span
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                r.themeBg,
                r.themeColor,
              )}
            >
              {r.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
              {r.subtitle && (
                <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>
              )}
            </div>
            <ThemeBadge theme={r.theme} />
          </button>
        ))}
      </div>

      {/* "Voir tous les résultats" footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={onSubmit}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-xl',
            'text-sm font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors',
            selectedIdx === results.length && 'ring-2 ring-brand-300',
          )}
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Voir tous les résultats pour « {query.trim()} »
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
