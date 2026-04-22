'use client';

import { type RefObject } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIZE_TOKENS } from '../_config';
import type { SizeKey } from '../_types';

interface SearchInputProps {
  inputRef: RefObject<HTMLInputElement>;
  query: string;
  loading: boolean;
  size: SizeKey;
  placeholder: string;
  autoFocus: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClear: () => void;
  onSubmit: () => void;
}

/**
 * The search bar itself: icon + input + clear/loader indicator + xl search button.
 * No data fetching, no dropdown — purely presentational.
 */
export default function SearchInput({
  inputRef,
  query,
  loading,
  size,
  placeholder,
  autoFocus,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  onClear,
  onSubmit,
}: SearchInputProps) {
  const tokens = SIZE_TOKENS[size];

  return (
    <div className="relative">
      {/* Search icon */}
      <Search
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none',
          tokens.icon,
        )}
      />

      {/* Text input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus} // eslint-disable-line jsx-a11y/no-autofocus
        className={cn(
          'w-full rounded-2xl border-2 border-white/60 bg-white shadow-xl',
          'placeholder:text-gray-400 text-gray-900 font-medium',
          'focus:outline-none focus:ring-4 focus:ring-brand-300/50 focus:border-brand-400',
          'transition-colors duration-200',
          tokens.input,
        )}
      />

      {/* Loader / clear button */}
      <div className={cn('absolute top-1/2 -translate-y-1/2', tokens.clearBtn)}>
        {loading ? (
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        ) : query ? (
          <button
            onClick={onClear}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            tabIndex={-1}
            aria-label="Effacer la recherche"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      {/* Search button — xl size only */}
      {size === 'xl' && (
        <button
          onClick={onSubmit}
          aria-label="Lancer la recherche"
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'flex items-center gap-2 px-5 py-3 rounded-xl',
            'bg-brand-600 hover:bg-brand-700 active:scale-95',
            'text-white font-black text-sm shadow-md transition-colors duration-150',
          )}
        >
          <Search className="w-4 h-4" />
          Rechercher
        </button>
      )}
    </div>
  );
}
