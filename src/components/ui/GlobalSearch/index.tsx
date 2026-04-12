'use client';

import { cn } from '@/lib/utils';
import { useGlobalSearch } from './_hooks/useGlobalSearch';
import { useSearchKeyboard } from './_hooks/useSearchKeyboard';
import SearchInput from './_components/SearchInput';
import SearchDropdown from './_components/SearchDropdown';
import type { GlobalSearchProps } from './_types';

// ─── Re-exports for consumers that import named exports ───────────────────────
export { THEME_CONFIG, type ThemeKey } from './_config';

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalSearch({
  size = 'md',
  placeholder = 'Rechercher artisans, annonces, événements…',
  className,
  onSearch,
  overlay = true,
  initialValue = '',
  autoFocus = false,
}: GlobalSearchProps) {
  const {
    inputRef,
    containerRef,
    query,
    setQuery,
    isFocused,
    setIsFocused,
    loading,
    results,
    recent,
    selectedIdx,
    setSelectedIdx,
    error,
    hasQuery,
    handleFocus,
    handleBlur,
    navigateTo,
    handleSubmit,
    handleSearchTerm,
    clearQuery,
    clearRecentAndRefresh,
  } = useGlobalSearch({ initialValue, onSearch });

  const { handleKeyDown } = useSearchKeyboard({
    isFocused,
    hasQuery,
    results,
    recent,
    selectedIdx,
    setSelectedIdx,
    setIsFocused,
    inputRef,
    onSubmit: handleSubmit,
    onNavigateTo: navigateTo,
    onSearchTerm: handleSearchTerm,
  });

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <SearchInput
        inputRef={inputRef}
        query={query}
        loading={loading}
        size={size}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(v) => { setQuery(v); setSelectedIdx(-1); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClear={clearQuery}
        onSubmit={handleSubmit}
      />

      <SearchDropdown
        visible={isFocused && overlay}
        hasQuery={hasQuery}
        query={query}
        results={results}
        loading={loading}
        error={error}
        recent={recent}
        selectedIdx={selectedIdx}
        onNavigateTo={navigateTo}
        onSubmit={handleSubmit}
        onSearchTerm={handleSearchTerm}
        onClearRecent={clearRecentAndRefresh}
      />
    </div>
  );
}
