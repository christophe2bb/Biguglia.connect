'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'biguglia_saved_events';

export function useSavedEvents() {
  const [savedEvents, setSavedEvents]     = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedEvents(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const toggleSaved = (eventId: string) => {
    setSavedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
        toast('Événement retiré des favoris');
      } else {
        next.add(eventId);
        toast.success('⭐ Ajouté aux favoris !');
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch { /* ignore */ }
      return next;
    });
  };

  return {
    savedEvents,
    showSavedOnly,
    setShowSavedOnly,
    toggleSaved,
  };
}
