/**
 * Types partagés — page Recherche
 */

import type { ThemeKey } from './_config';

/** Un résultat de recherche enrichi avec métadonnées de thème */
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  meta?: string;
  href: string;
  theme: string;
  themeLabel: string;
  themeColor: string;
  themeBg: string;
  themeIcon: React.ReactNode;
  image?: string;
  price?: number;
  isFree?: boolean;
  location?: string;
  date?: string;
  author?: { name: string; avatar?: string };
  status?: string;
  score?: number;
  badge?: string;
}

/** Un bloc de résultats regroupés par thème */
export interface ThemeBlock {
  key: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  results: SearchResult[];
}

/** État retourné par useSearchPage */
export interface SearchPageState {
  query: string;
  loading: boolean;
  blocks: ThemeBlock[];
  totalCount: number;
  view: 'grid' | 'list';
  setView: (v: 'grid' | 'list') => void;
  activeThemes: ThemeKey[];
  sortBy: string;
  filterFree: boolean;
  filterLocation: string;
  showFilters: boolean;
  contextSuggestions: { themes: ThemeKey[]; label: string } | null;
  toggleTheme: (key: ThemeKey) => void;
  setSortBy: (v: string) => void;
  setFilterFree: (v: boolean) => void;
  setFilterLocation: (v: string) => void;
  setActiveThemes: (v: ThemeKey[]) => void;
  setShowFilters: (v: boolean) => void;
  handleSearch: (q: string) => void;
}

export type { ThemeKey };
