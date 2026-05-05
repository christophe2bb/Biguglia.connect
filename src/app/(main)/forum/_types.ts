// ─── Forum page – shared types ────────────────────────────────────────────────
import { ForumSector, ForumCategory, ForumTopic } from '@/types';

export type SortMode = 'recent' | 'hot' | 'replies' | 'views';

/** All filter/sort state managed by useForumPage */
export interface ForumFiltersState {
  selectedSector:   string | null;
  selectedCategory: string | null;
  selectedType:     string | null;
  sortMode:         SortMode;
  searchQuery:      string;
  searchInput:      string;
  viewMode:         'list' | 'grid';
  showFilters:      boolean;
  statusFilter:     'all' | 'ouvert' | 'resolu';
  urgencyFilter:    'all' | 'haute';
}

/** Data fetched from Supabase */
export interface ForumPageData {
  sectors:          ForumSector[];
  categories:       ForumCategory[];
  topics:           ForumTopic[];
  hotTopics:        ForumTopic[];
  recentlyResolved: ForumTopic[];
  stats:            { topics: number; replies: number; members: number; resolved: number };
  loading:          boolean;
}

/** Full return type of useForumPage */
export interface UseForumPageReturn extends ForumFiltersState, ForumPageData {
  activeFiltersCount: number;
  setSelectedSector:   (v: string | null) => void;
  setSelectedCategory: (v: string | null) => void;
  setSelectedType:     (v: string | null) => void;
  setSortMode:         (v: SortMode) => void;
  setSearchInput:      (v: string) => void;
  setViewMode:         (v: 'list' | 'grid') => void;
  setShowFilters:      (v: boolean | ((prev: boolean) => boolean)) => void;
  setStatusFilter:     (v: 'all' | 'ouvert' | 'resolu') => void;
  setUrgencyFilter:    (v: 'all' | 'haute') => void;
  handleSearch:        (e: React.FormEvent) => void;
  clearFilters:        () => void;
  fetchData:           () => Promise<void>;
}
