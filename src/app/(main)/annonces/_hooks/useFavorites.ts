'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'annonces_favorites';

function readStoredIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

export interface UseFavoritesReturn {
  savedIds: Set<string>;
  toggleSave: (id: string, e: React.MouseEvent) => void;
}

/**
 * Persists listing favourites in localStorage.
 * No network calls — reads/writes only the browser storage.
 */
export function useFavorites(): UseFavoritesReturn {
  const [savedIds, setSavedIds] = useState<Set<string>>(readStoredIds);

  const toggleSave = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast('Annonce retirée des favoris', { icon: '💔' });
      } else {
        next.add(id);
        toast.success('Annonce sauvegardée en favoris !');
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  return { savedIds, toggleSave };
}
