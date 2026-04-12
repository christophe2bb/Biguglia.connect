'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { QuickResult } from '../_types';

interface UseSearchKeyboardOptions {
  isFocused: boolean;
  hasQuery: boolean;
  results: QuickResult[];
  recent: string[];
  selectedIdx: number;
  setSelectedIdx: Dispatch<SetStateAction<number>>;
  setIsFocused: Dispatch<SetStateAction<boolean>>;
  inputRef: RefObject<HTMLInputElement>;
  onSubmit: () => void;
  onNavigateTo: (href: string) => void;
  onSearchTerm: (term: string) => void;
}

/**
 * Returns a `handleKeyDown` handler that manages ↑ ↓ Escape Enter
 * navigation over the dropdown items without touching any data state.
 */
export function useSearchKeyboard({
  isFocused,
  hasQuery,
  results,
  recent,
  selectedIdx,
  setSelectedIdx,
  setIsFocused,
  inputRef,
  onSubmit,
  onNavigateTo,
  onSearchTerm,
}: UseSearchKeyboardOptions) {
  // Total selectable items:
  //   • with query  → results + 1 "Voir tous" row
  //   • without     → recent items (or popular chips, which aren't keyboard-selectable)
  const totalItems = hasQuery
    ? results.length + 1
    : recent.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, totalItems - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, -1));
        break;

      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;

      case 'Enter': {
        e.preventDefault();
        if (hasQuery) {
          // Last virtual row → "Voir tous les résultats"
          if (selectedIdx === -1 || selectedIdx === results.length) {
            onSubmit();
          } else if (results[selectedIdx]) {
            onNavigateTo(results[selectedIdx].href);
          }
        } else {
          // Navigate to a recent search
          if (recent[selectedIdx]) {
            onSearchTerm(recent[selectedIdx]);
          } else {
            onSubmit();
          }
        }
        break;
      }
    }
  };

  return { handleKeyDown };
}
