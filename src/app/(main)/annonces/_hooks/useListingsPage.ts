'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Listing, ListingCategory } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────

export const ITEMS_PER_PAGE = 12;

/** Debounce delay for the search input (ms). */
const SEARCH_DEBOUNCE_MS = 300;

// ── Filter state ─────────────────────────────────────────────────────────────

export interface ListingsFilters {
  search: string;
  selectedCategory: string;
  selectedType: string;
  selectedStatus: string;
  sortBy: string;
  filterSector: string | null;
  showFavoritesOnly: boolean;
  showUrgentOnly: boolean;
  showFreeOnly: boolean;
  showAdvancedFilters: boolean;
}

export const DEFAULT_FILTERS: ListingsFilters = {
  search: '',
  selectedCategory: '',
  selectedType: '',
  selectedStatus: 'active',
  sortBy: 'recent',
  filterSector: null,
  showFavoritesOnly: false,
  showUrgentOnly: false,
  showFreeOnly: false,
  showAdvancedFilters: false,
};

// ── Return type ───────────────────────────────────────────────────────────────

export interface UseListingsPageReturn {
  // Data
  listings: Listing[];
  categories: ListingCategory[];
  loading: boolean;
  // Derived
  filtered: Listing[];
  paginated: Listing[];
  totalPages: number;
  currentPage: number;
  categoryCounts: Record<string, number>;
  sectorCounts: Record<string, number>;
  activeFiltersCount: number;
  stats: { total: number; sale: number; free: number; urgent: number; exchange: number };
  // Filters
  filters: ListingsFilters;
  setSearch: (v: string) => void;
  setSelectedCategory: (v: string) => void;
  setSelectedType: (v: string) => void;
  setSelectedStatus: (v: string) => void;
  setSortBy: (v: string) => void;
  setFilterSector: (v: string | null) => void;
  setShowFavoritesOnly: (v: (prev: boolean) => boolean) => void;
  setShowUrgentOnly: (v: (prev: boolean) => boolean) => void;
  setShowFreeOnly: (v: (prev: boolean) => boolean) => void;
  setShowAdvancedFilters: (v: (prev: boolean) => boolean) => void;
  setCurrentPage: (v: number | ((prev: number) => number)) => void;
  resetFilters: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Centralises all filter state, data fetching from Supabase, and derived
 * computations for the /annonces listing page.
 *
 * Performance fixes applied:
 *
 *  #1  (2026-04-27) Photos join limited to 1 row per listing — was fetching ALL
 *      photos for every listing (potentially 500 × N rows over the wire).
 *
 *  #1b (2026-04-28) JOIN listing_photos éliminé complètement : on lit désormais
 *      `cover_url` directement sur `listings` (colonne dénormalisée maintenue par
 *      le trigger `trg_listing_photos_cover`, migration 20260428_listings_cover_url).
 *      Économie : 0 ligne listing_photos transférée en liste (vs N × 200 avant).
 *
 *  #2  Categories fetched ONCE at mount (empty deps []) — was re-fetched on
 *      every server-filter change because it shared the same fetchData callback.
 *
 *  #3  currentPage reset folded into fetchData — eliminated the second
 *      useEffect whose deps overlapped with fetchData’s, causing double renders
 *      and a stale-closure risk on every server-filter change.
 *
 *  #4  filtered / paginated / stats / counts wrapped in useMemo — previously
 *      recalculated on every render even when listings and filters hadn’t changed.
 *
 *  #5  Search input debounced (300 ms) — was re-filtering 500 listings on
 *      every keystroke without any delay.
 */
export function useListingsPage(savedIds: Set<string>): UseListingsPageReturn {
  const [listings, setListings]   = useState<Listing[]>([]);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  // Ref mirror so fetchData can read the latest categories without being
  // listed as a dependency (categories don't change after the initial fetch).
  const categoriesRef = useRef<ListingCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Single filter state object with individual setters for ergonomics in JSX
  const [filters, setFilters] = useState<ListingsFilters>(DEFAULT_FILTERS);

  // ── Debounced search term ──────────────────────────────────────────────────
  // `filters.search` is the raw input value (updates every keystroke for UI).
  // `debouncedSearch` is the value actually used for filtering (delayed).
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearch = useCallback((v: string) => {
    setFilters(f => ({ ...f, search: v }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), SEARCH_DEBOUNCE_MS);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Stable setters ─────────────────────────────────────────────────────────
  const setSelectedCategory    = useCallback((v: string)       => setFilters(f => ({ ...f, selectedCategory: v })), []);
  const setSelectedType        = useCallback((v: string)       => setFilters(f => ({ ...f, selectedType: v })), []);
  const setSelectedStatus      = useCallback((v: string)       => setFilters(f => ({ ...f, selectedStatus: v })), []);
  const setSortBy              = useCallback((v: string)       => setFilters(f => ({ ...f, sortBy: v })), []);
  const setFilterSector        = useCallback((v: string|null)  => setFilters(f => ({ ...f, filterSector: v })), []);
  const setShowFavoritesOnly   = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showFavoritesOnly: v(f.showFavoritesOnly) })), []);
  const setShowUrgentOnly      = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showUrgentOnly: v(f.showUrgentOnly) })), []);
  const setShowFreeOnly        = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showFreeOnly: v(f.showFreeOnly) })), []);
  const setShowAdvancedFilters = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showAdvancedFilters: v(f.showAdvancedFilters) })), []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedSearch('');
    setCurrentPage(1);
  }, []);

  // ── FIX #2 — categories fetched ONCE at mount ──────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('listing_categories')
      .select('*')
      .order('display_order')
      .then(({ data }) => {
        const cats = data || [];
        categoriesRef.current = cats; // keep ref in sync for fetchData
        setCategories(cats);
      });
  }, []);

  // ── FIX #1 + #3 — fetchData: photos limited + page reset folded in ─────────
  // Destructure only the server-side filter fields so useCallback deps stay minimal.
  const { selectedCategory, selectedType, selectedStatus, sortBy, filterSector } = filters;

  const fetchData = useCallback(async () => {
    setLoading(true);
    // FIX #3: reset page to 1 here — eliminates the second useEffect that
    // previously caused double renders on every server-filter change.
    setCurrentPage(1);

    const supabase = createClient();

    // FIX #1b (2026-04-28) : cover_url est une colonne dénormalisée sur `listings`
    // (migration 20260428_listings_cover_url — trigger trg_listing_photos_cover).
    // Si la migration n'est pas encore appliquée, fallback vers listing_photos.
    const BASE_FIELDS = 'id, title, price, location, listing_type, status, created_at, is_urgent, sector_id, category_id, user_id, author_id';
    const CAT_JOIN   = 'category:listing_categories(id, name, slug, icon)';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyFiltersAndSort = (q: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let r: any = q;
      if (selectedStatus === 'active')        r = r.eq('status', 'active');
      else if (selectedStatus === 'reserved') r = r.eq('status', 'reserved');
      else if (selectedStatus === 'sold')     r = r.in('status', ['sold', 'given', 'exchanged']);
      else if (selectedStatus === 'expired')  r = r.eq('status', 'expired');
      else if (selectedStatus === 'archived') r = r.eq('status', 'archived');
      else r = r.neq('status', 'archived');
      if (selectedCategory) {
        // Read from ref — avoids adding `categories` as a fetchData dependency
        const cat = categoriesRef.current.find(c => c.slug === selectedCategory);
        if (cat) r = r.eq('category_id', cat.id);
      }
      if (selectedType)  r = r.eq('listing_type', selectedType);
      if (filterSector)  r = r.eq('sector_id', filterSector);
      if (sortBy === 'price_asc')       r = r.order('price', { ascending: true,  nullsFirst: false });
      else if (sortBy === 'price_desc') r = r.order('price', { ascending: false, nullsFirst: false });
      else                              r = r.order('created_at', { ascending: false });
      return r.limit(200);
    };

    // Tentative 1 — cover_url dénormalisée (migration appliquée)
    let { data, error } = await applyFiltersAndSort(
      supabase.from('listings').select(`${BASE_FIELDS}, cover_url, ${CAT_JOIN}`)
    );

    // Tentative 2 — fallback listing_photos si cover_url absent (migration non appliquée)
    if (error?.message?.includes('cover_url') || error?.message?.includes('column')) {
      ({ data, error } = await applyFiltersAndSort(
        supabase.from('listings').select(`${BASE_FIELDS}, photos:listing_photos(url, display_order), ${CAT_JOIN}`)
      ));
      if (data) {
        data = (data as Record<string, unknown>[]).map(row => {
          const photos = (row.photos as Array<{ url: string; display_order?: number }> | undefined) || [];
          const sorted = [...photos].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
          return { ...row, cover_url: sorted[0]?.url ?? null };
        });
      }
    }

    setListings((data as unknown as Listing[]) || []);
    setLoading(false);
  }, [selectedCategory, selectedType, selectedStatus, sortBy, filterSector]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── FIX #4 — memoised derived values ──────────────────────────────────────
  // Previously recalculated on EVERY render (including those triggered by
  // unrelated state changes like savedIds reference updates).

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of listings) {
      const id = (l as Listing & { category_id?: string }).category_id;
      if (id) counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  }, [listings]);

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of listings) {
      const id = (l as Listing & { sector_id?: string }).sector_id;
      if (id) counts[id] = (counts[id] || 0) + 1;
    }
    return counts;
  }, [listings]);

  const stats = useMemo(() => ({
    total:    listings.length,
    sale:     listings.filter(l => l.listing_type === 'sale').length,
    free:     listings.filter(l => l.listing_type === 'free').length,
    urgent:   listings.filter(l => (l as Listing & { is_urgent?: boolean }).is_urgent).length,
    exchange: listings.filter(l => l.listing_type === 'exchange').length,
  }), [listings]);

  // FIX #5: filter uses debouncedSearch instead of filters.search
  const filtered = useMemo(() => listings.filter(l => {
    if (filters.showFavoritesOnly && !savedIds.has(l.id)) return false;
    if (filters.showUrgentOnly    && !(l as Listing & { is_urgent?: boolean }).is_urgent) return false;
    if (filters.showFreeOnly      && l.listing_type !== 'free' && l.price !== 0) return false;
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const catName  = l.category?.name?.toLowerCase() ?? '';
    const sectorId = (l as Listing & { sector_id?: string }).sector_id ?? '';
    return (
      l.title?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q) ||
      catName.includes(q) ||
      sectorId.includes(q)
    );
  }), [listings, debouncedSearch, filters.showFavoritesOnly, filters.showUrgentOnly, filters.showFreeOnly, savedIds]);

  const totalPages = useMemo(() => Math.ceil(filtered.length / ITEMS_PER_PAGE), [filtered.length]);
  const paginated  = useMemo(
    () => filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filtered, currentPage],
  );

  const activeFiltersCount = useMemo(() => [
    filters.selectedType,
    filters.selectedCategory,
    filters.showFavoritesOnly,
    filters.showUrgentOnly,
    filters.showFreeOnly,
    filters.filterSector,
    filters.selectedStatus !== 'active',
  ].filter(Boolean).length, [filters]);

  return {
    listings,
    categories,
    loading,
    filtered,
    paginated,
    totalPages,
    currentPage,
    categoryCounts,
    sectorCounts,
    activeFiltersCount,
    stats,
    filters,
    setSearch,
    setSelectedCategory,
    setSelectedType,
    setSelectedStatus,
    setSortBy,
    setFilterSector,
    setShowFavoritesOnly,
    setShowUrgentOnly,
    setShowFreeOnly,
    setShowAdvancedFilters,
    setCurrentPage,
    resetFilters,
  };
}
