'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Listing, ListingCategory } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────

export const ITEMS_PER_PAGE = 12;

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
 * The component receives a clean object and only handles rendering.
 */
export function useListingsPage(savedIds: Set<string>): UseListingsPageReturn {
  const [listings, setListings]     = useState<Listing[]>([]);
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [sectorCounts, setSectorCounts]     = useState<Record<string, number>>({});

  // Single filter state object with individual setters for ergonomics in JSX
  const [filters, setFilters] = useState<ListingsFilters>(DEFAULT_FILTERS);

  const setSearch              = useCallback((v: string) => setFilters(f => ({ ...f, search: v })), []);
  const setSelectedCategory    = useCallback((v: string) => setFilters(f => ({ ...f, selectedCategory: v })), []);
  const setSelectedType        = useCallback((v: string) => setFilters(f => ({ ...f, selectedType: v })), []);
  const setSelectedStatus      = useCallback((v: string) => setFilters(f => ({ ...f, selectedStatus: v })), []);
  const setSortBy              = useCallback((v: string) => setFilters(f => ({ ...f, sortBy: v })), []);
  const setFilterSector        = useCallback((v: string | null) => setFilters(f => ({ ...f, filterSector: v })), []);
  const setShowFavoritesOnly   = useCallback((v: (prev: boolean) => boolean) => setFilters(f => ({ ...f, showFavoritesOnly: v(f.showFavoritesOnly) })), []);
  const setShowUrgentOnly      = useCallback((v: (prev: boolean) => boolean) => setFilters(f => ({ ...f, showUrgentOnly: v(f.showUrgentOnly) })), []);
  const setShowFreeOnly        = useCallback((v: (prev: boolean) => boolean) => setFilters(f => ({ ...f, showFreeOnly: v(f.showFreeOnly) })), []);
  const setShowAdvancedFilters = useCallback((v: (prev: boolean) => boolean) => setFilters(f => ({ ...f, showAdvancedFilters: v(f.showAdvancedFilters) })), []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  // ── Data fetch ─────────────────────────────────────────────────────────────

  // Destructure only the server-side filter fields so useCallback deps stay explicit.
  const { selectedCategory, selectedType, selectedStatus, sortBy, filterSector } = filters;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: cats } = await supabase
      .from('listing_categories')
      .select('*')
      .order('display_order');
    setCategories(cats || []);

    let query = supabase
      .from('listings')
      .select('*, category:listing_categories(*), photos:listing_photos(*)');

    if (selectedStatus === 'active')   query = query.eq('status', 'active');
    else if (selectedStatus === 'reserved') query = query.eq('status', 'reserved');
    else if (selectedStatus === 'sold')    query = query.in('status', ['sold', 'given', 'exchanged']);
    else if (selectedStatus === 'expired') query = query.eq('status', 'expired');
    else if (selectedStatus === 'archived') query = query.eq('status', 'archived');
    else query = query.neq('status', 'archived');

    if (selectedCategory) {
      const cat = cats?.find(c => c.slug === selectedCategory);
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (selectedType)   query = query.eq('listing_type', selectedType);
    if (filterSector)   query = query.eq('sector_id', filterSector);

    if (sortBy === 'price_asc')  query = query.order('price', { ascending: true,  nullsFirst: false });
    else if (sortBy === 'price_desc') query = query.order('price', { ascending: false, nullsFirst: false });
    else query = query.order('created_at', { ascending: false });

    const { data } = await query;
    const raw = (data as Listing[]) || [];
    setListings(raw);

    // Category counts
    const catCounts: Record<string, number> = {};
    for (const l of raw) {
      const catId = (l as Listing & { category_id?: string }).category_id;
      if (catId) catCounts[catId] = (catCounts[catId] || 0) + 1;
    }
    setCategoryCounts(catCounts);

    // Sector counts
    const secCounts: Record<string, number> = {};
    for (const l of raw) {
      const sId = (l as Listing & { sector_id?: string }).sector_id;
      if (sId) secCounts[sId] = (secCounts[sId] || 0) + 1;
    }
    setSectorCounts(secCounts);

    setLoading(false);
  }, [selectedCategory, selectedType, selectedStatus, sortBy, filterSector]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.search, filters.selectedCategory, filters.selectedType,
    filters.selectedStatus, filters.sortBy, filters.filterSector,
    filters.showFavoritesOnly, filters.showUrgentOnly, filters.showFreeOnly,
  ]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const filtered = listings.filter(l => {
    if (filters.showFavoritesOnly && !savedIds.has(l.id)) return false;
    const lExt = l as Listing & { is_urgent?: boolean };
    if (filters.showUrgentOnly && !lExt.is_urgent) return false;
    if (filters.showFreeOnly && l.listing_type !== 'free' && l.price !== 0) return false;
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    const catName    = l.category?.name?.toLowerCase() ?? '';
    const sectorId   = (l as Listing & { sector_id?: string }).sector_id ?? '';
    return (
      l.title?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q) ||
      catName.includes(q) ||
      sectorId.includes(q)
    );
  });

  const activeFiltersCount = [
    filters.selectedType, filters.selectedCategory,
    filters.showFavoritesOnly, filters.showUrgentOnly, filters.showFreeOnly,
    filters.filterSector,
    filters.selectedStatus !== 'active',
  ].filter(Boolean).length;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = {
    total:    listings.length,
    sale:     listings.filter(l => l.listing_type === 'sale').length,
    free:     listings.filter(l => l.listing_type === 'free').length,
    urgent:   listings.filter(l => (l as Listing & { is_urgent?: boolean }).is_urgent).length,
    exchange: listings.filter(l => (l as Listing & { listing_type: string }).listing_type === 'exchange').length,
  };

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
