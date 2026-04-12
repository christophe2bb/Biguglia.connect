// ─── Utilitaires purs de GlobalSearch ────────────────────────────────────────
import { useState, useEffect } from 'react';
import type { QuickResult } from './_types';

// ── Hook debounce ─────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Gestion localStorage des recherches récentes ──────────────────────────────
const RECENT_KEY = 'bc_recent_searches';

export function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveRecent(q: string): void {
  if (typeof window === 'undefined') return;
  const prev = getRecent().filter((r) => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 5)));
}

export function clearRecent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_KEY);
}

// ── Recherche partielle par mots (ilike multi-colonnes) ───────────────────────

/**
 * Découpe le query en mots non-vides ≥ 2 caractères, retire les accents.
 * Retourne des patterns ilike individuels, ex: ['%plomb%', '%bigugli%'].
 */
export function buildWordPatterns(q: string): string[] {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => `%${w}%`);
}

/**
 * Construit un filtre OR Supabase sur plusieurs colonnes × plusieurs mots.
 * Ex: colonnes=['title','description'], mots=['%velo%','%sport%']
 * → "title.ilike.%velo%,title.ilike.%sport%,description.ilike.%velo%,..."
 */
export function buildOrFilter(columns: string[], wordPatterns: string[]): string {
  const parts: string[] = [];
  for (const col of columns) {
    for (const pat of wordPatterns) {
      parts.push(`${col}.ilike.${pat}`);
    }
  }
  return parts.join(',');
}

/**
 * Score de pertinence : compte combien de mots normalisés du query
 * apparaissent dans le texte normalisé (titre + subtitle).
 */
export function scoreResult(result: QuickResult, words: string[]): number {
  const haystack = `${result.title} ${result.subtitle ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return words.reduce((acc, w) => acc + (haystack.includes(w) ? 1 : 0), 0);
}

/**
 * Extrait les mots normalisés du query (≥ 2 car.) pour le scoring côté client.
 */
export function extractRawWords(q: string): string[] {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}
