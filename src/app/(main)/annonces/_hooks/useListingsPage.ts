'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Listing, ListingCategory } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────

export const ITEMS_PER_PAGE = 12;

/** Debounce delay for the search input (ms). */
const SEARCH_DEBOUNCE_MS = 400;

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
  allSectorCounts: Record<string, number>;
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
//
// ARCHITECTURE : pagination côté serveur
// ─────────────────────────────────────
// Au lieu de charger 200 annonces d'un coup et de paginer côté client, on
// envoie directement à Supabase le range (from, to) correspondant à la page
// courante.  Seules les 12 annonces affichées transitent sur le réseau.
//
// Cas particuliers gérés côté client (car ils nécessitent des données locales) :
//   - showFavoritesOnly : les IDs sauvegardés sont dans le localStorage
//   - showUrgentOnly / showFreeOnly : colonnes booléennes → filtrées côté serveur
//   - search (debounced) : ilike Supabase sur title + fallback client
//
// Stats (total, sale, free, exchange) : requête COUNT séparée, légère.
//
export function useListingsPage(savedIds: Set<string>): UseListingsPageReturn {
  const [listings, setListings]         = useState<Listing[]>([]);
  const [categories, setCategories]     = useState<ListingCategory[]>([]);
  const categoriesRef                   = useRef<ListingCategory[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalCount, setTotalCount]     = useState(0);   // total côté serveur
  const [allSectorCounts, setAllSectorCounts] = useState<Record<string, number>>({});
  const [stats, setStats]               = useState({ total: 0, sale: 0, free: 0, urgent: 0, exchange: 0 });

  const [filters, setFilters]           = useState<ListingsFilters>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Setters ───────────────────────────────────────────────────────────────
  const setSearch = useCallback((v: string) => {
    setFilters(f => ({ ...f, search: v }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(v), SEARCH_DEBOUNCE_MS);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const setSelectedCategory    = useCallback((v: string)      => setFilters(f => ({ ...f, selectedCategory: v })), []);
  const setSelectedType        = useCallback((v: string)      => setFilters(f => ({ ...f, selectedType: v })), []);
  const setSelectedStatus      = useCallback((v: string)      => setFilters(f => ({ ...f, selectedStatus: v })), []);
  const setSortBy              = useCallback((v: string)      => setFilters(f => ({ ...f, sortBy: v })), []);
  const setFilterSector        = useCallback((v: string|null) => setFilters(f => ({ ...f, filterSector: v })), []);
  const setShowFavoritesOnly   = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showFavoritesOnly: v(f.showFavoritesOnly) })), []);
  const setShowUrgentOnly      = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showUrgentOnly: v(f.showUrgentOnly) })), []);
  const setShowFreeOnly        = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showFreeOnly: v(f.showFreeOnly) })), []);
  const setShowAdvancedFilters = useCallback((v: (p: boolean) => boolean) => setFilters(f => ({ ...f, showAdvancedFilters: v(f.showAdvancedFilters) })), []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedSearch('');
    setCurrentPage(1);
  }, []);

  // ── Catégories (chargées une seule fois) ──────────────────────────────────
  useEffect(() => {
    createClient()
      .from('listing_categories')
      .select('*')
      .order('display_order')
      .then(({ data }: { data: ListingCategory[] | null }) => {
        const cats = data || [];
        categoriesRef.current = cats;
        setCategories(cats);
      });
  }, []);

  // ── Helpers : construire les filtres Supabase ─────────────────────────────
  const { selectedCategory, selectedType, selectedStatus, sortBy, filterSector, showUrgentOnly, showFreeOnly } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyBaseFilters = useCallback((q: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let r: any = q;
    if (selectedStatus === 'active')        r = r.eq('status', 'active');
    else if (selectedStatus === 'reserved') r = r.eq('status', 'reserved');
    else if (selectedStatus === 'sold')     r = r.in('status', ['sold', 'given', 'exchanged']);
    else if (selectedStatus === 'expired')  r = r.eq('status', 'expired');
    else if (selectedStatus === 'archived') r = r.eq('status', 'archived');
    else                                    r = r.neq('status', 'archived');

    if (selectedCategory) {
      const cat = categoriesRef.current.find(c => c.slug === selectedCategory);
      if (cat) r = r.eq('category_id', cat.id);
    }
    if (selectedType)   r = r.eq('listing_type', selectedType);
    if (filterSector)   r = r.eq('sector_id', filterSector);
    if (showUrgentOnly) r = r.eq('is_urgent', true);
    if (showFreeOnly)   r = r.or('listing_type.eq.free,price.eq.0');
    if (debouncedSearch) r = r.ilike('title', `%${debouncedSearch}%`);

    return r;
  }, [selectedCategory, selectedType, selectedStatus, filterSector, showUrgentOnly, showFreeOnly, debouncedSearch]);

  // ── Compteurs secteurs (sans filtre secteur actif) ────────────────────────
  const fetchAllSectorCounts = useCallback(async () => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from('listings').select('sector_id');
    if (selectedStatus === 'active')        q = q.eq('status', 'active');
    else if (selectedStatus === 'reserved') q = q.eq('status', 'reserved');
    else if (selectedStatus === 'sold')     q = q.in('status', ['sold', 'given', 'exchanged']);
    else if (selectedStatus === 'expired')  q = q.eq('status', 'expired');
    else if (selectedStatus === 'archived') q = q.eq('status', 'archived');
    else                                    q = q.neq('status', 'archived');
    if (selectedType) q = q.eq('listing_type', selectedType);
    if (selectedCategory) {
      const cat = categoriesRef.current.find(c => c.slug === selectedCategory);
      if (cat) q = q.eq('category_id', cat.id);
    }
    // filterSector intentionnellement ignoré ici
    const { data } = await q.limit(1000);
    const counts: Record<string, number> = {};
    for (const row of (data || []) as Array<{ sector_id?: string }>) {
      if (row.sector_id) counts[row.sector_id] = (counts[row.sector_id] || 0) + 1;
    }
    setAllSectorCounts(counts);
  }, [selectedCategory, selectedType, selectedStatus]);

  useEffect(() => { fetchAllSectorCounts(); }, [fetchAllSectorCounts]);

  // ── Stats globales (COUNT léger) ──────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const supabase = createClient();
    const base = () => supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const [total, sale, free, urgent, exchange] = await Promise.all([
      base(),
      base().eq('listing_type', 'sale'),
      base().eq('listing_type', 'free'),
      base().eq('is_urgent', true),
      base().eq('listing_type', 'exchange'),
    ]);
    setStats({
      total:    total.count    ?? 0,
      sale:     sale.count     ?? 0,
      free:     free.count     ?? 0,
      urgent:   urgent.count   ?? 0,
      exchange: exchange.count ?? 0,
    });
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Pagination côté serveur ───────────────────────────────────────────────
  // Cas spécial : showFavoritesOnly — on ne peut pas filtrer sur savedIds côté
  // serveur. On bascule en mode client pour cet onglet uniquement (charge max
  // 200 annonces en mémoire, uniquement quand les favoris sont actifs).
  const isFavMode = filters.showFavoritesOnly;

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true);
    const supabase = createClient();
    const BASE_FIELDS = 'id, title, price, location, listing_type, status, created_at, is_urgent, sector_id, category_id, user_id, author_id';
    const CAT_JOIN    = 'category:listing_categories(id, name, slug, icon)';

    if (isFavMode) {
      // Mode favoris : charge tout côté client, filtre sur savedIds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = applyBaseFilters(
        supabase.from('listings').select(`${BASE_FIELDS}, cover_url, ${CAT_JOIN}`)
      );
      q = q.limit(500);
      let { data, error } = await q;
      if (error?.message?.includes('cover_url') || error?.message?.includes('column')) {
        ({ data, error } = await applyBaseFilters(
          supabase.from('listings').select(`${BASE_FIELDS}, photos:listing_photos(url, display_order), ${CAT_JOIN}`)
        ).limit(500));
        if (data) {
          data = (data as Record<string, unknown>[]).map(row => {
            const photos = (row.photos as Array<{ url: string; display_order?: number }> | undefined) || [];
            const sorted = [...photos].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
            return { ...row, cover_url: sorted[0]?.url ?? null };
          });
        }
      }
      setListings((data as unknown as Listing[]) || []);
      setTotalCount((data as unknown[])?.length ?? 0);
      setLoading(false);
      return;
    }

    // Mode normal : pagination serveur avec range()
    const from = (page - 1) * ITEMS_PER_PAGE;
    const to   = from + ITEMS_PER_PAGE - 1;

    // Appliquer tri
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applySort = (q: any) => {
      if (sortBy === 'price_asc')       return q.order('price', { ascending: true,  nullsFirst: false });
      if (sortBy === 'price_desc')      return q.order('price', { ascending: false, nullsFirst: false });
      return q.order('created_at', { ascending: false });
    };

    // Requête COUNT (total pour pagination)
    const { count } = await applyBaseFilters(
      supabase.from('listings').select('*', { count: 'exact', head: true })
    );
    setTotalCount(count ?? 0);

    // Requête DATA (seulement la page courante)
    let q = applySort(applyBaseFilters(
      supabase.from('listings').select(`${BASE_FIELDS}, cover_url, ${CAT_JOIN}`)
    )).range(from, to);

    let { data, error } = await q;

    // Fallback si cover_url absent
    if (error?.message?.includes('cover_url') || error?.message?.includes('column')) {
      q = applySort(applyBaseFilters(
        supabase.from('listings').select(`${BASE_FIELDS}, photos:listing_photos(url, display_order), ${CAT_JOIN}`)
      )).range(from, to);
      ({ data, error } = await q);
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
  }, [applyBaseFilters, sortBy, isFavMode]);

  // Quand les filtres changent → reset page 1 + rechargement
  const filtersKey = `${selectedCategory}|${selectedType}|${selectedStatus}|${sortBy}|${filterSector}|${showUrgentOnly}|${showFreeOnly}|${debouncedSearch}|${isFavMode}`;
  const prevFiltersKey = useRef(filtersKey);

  useEffect(() => {
    if (prevFiltersKey.current !== filtersKey) {
      prevFiltersKey.current = filtersKey;
      setCurrentPage(1);
      fetchPage(1);
    } else {
      fetchPage(currentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, currentPage]);

  // ── Données dérivées ──────────────────────────────────────────────────────

  // En mode favoris : filtre sur savedIds côté client
  const filtered = useMemo(() => {
    if (!isFavMode) return listings; // déjà filtrés par le serveur
    return listings.filter(l => savedIds.has(l.id));
  }, [listings, isFavMode, savedIds]);

  // En mode favoris : pagination client
  const totalPages = useMemo(() => {
    if (isFavMode) return Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    return Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  }, [isFavMode, filtered.length, totalCount]);

  const paginated = useMemo(() => {
    if (isFavMode) return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return listings; // déjà la bonne page (range serveur)
  }, [isFavMode, filtered, listings, currentPage]);

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

  const activeFiltersCount = useMemo(() => [
    filters.selectedType,
    filters.selectedCategory,
    filters.showFavoritesOnly,
    filters.showUrgentOnly,
    filters.showFreeOnly,
    filters.filterSector,
    filters.selectedStatus !== 'active',
  ].filter(Boolean).length, [filters]);

  // `filtered` exposé = listings (le serveur a déjà filtré), sauf mode favoris
  const filteredForCount = isFavMode ? filtered : { length: totalCount } as unknown as Listing[];

  return {
    listings,
    categories,
    loading,
    filtered: filteredForCount as Listing[],
    paginated,
    totalPages,
    currentPage,
    categoryCounts,
    sectorCounts,
    allSectorCounts,
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
