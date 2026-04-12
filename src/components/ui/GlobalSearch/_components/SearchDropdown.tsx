'use client';

import SearchResults from './SearchResults';
import SearchSuggestions from './SearchSuggestions';
import type { QuickResult } from '../_types';

interface SearchDropdownProps {
  visible: boolean;
  hasQuery: boolean;
  query: string;
  results: QuickResult[];
  loading: boolean;
  error: boolean;
  recent: string[];
  selectedIdx: number;
  onNavigateTo: (href: string) => void;
  onSubmit: () => void;
  onSearchTerm: (term: string) => void;
  onClearRecent: () => void;
}

/**
 * Overlay panel below the search input.
 * Delegates content to SearchResults (active query) or SearchSuggestions (idle).
 */
export default function SearchDropdown({
  visible,
  hasQuery,
  query,
  results,
  loading,
  error,
  recent,
  selectedIdx,
  onNavigateTo,
  onSubmit,
  onSearchTerm,
  onClearRecent,
}: SearchDropdownProps) {
  if (!visible) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-[540px] overflow-y-auto">
      {hasQuery ? (
        <SearchResults
          query={query}
          results={results}
          loading={loading}
          error={error}
          selectedIdx={selectedIdx}
          onNavigateTo={onNavigateTo}
          onSubmit={onSubmit}
        />
      ) : (
        <SearchSuggestions
          recent={recent}
          selectedIdx={selectedIdx}
          onSearchTerm={onSearchTerm}
          onClearRecent={onClearRecent}
          onNavigateTo={onNavigateTo}
        />
      )}
    </div>
  );
}
