'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  type CollectionMode, type CollectionStatus, type RarityLevel,
  type ConditionLevel, type CollectionCategory, type CollectionItem,
} from '@/lib/collectionneurs-config';
import { STATIC_CATEGORIES, PAGE_SIZE } from '../_constants';

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCollectionneurs(profileId?: string) {
  const supabase = useMemo(() => createClient(), []);
  const router   = useRouter();

  // ── Category list ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CollectionCategory[]>(STATIC_CATEGORIES);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('collection_categories')
          .select('*')
          .order('display_order');
        if (data && data.length > 0) setCategories(data as CollectionCategory[]);
      } catch { /* keep static fallback */ }
    };
    load();
  }, [supabase]);

  // ── Favorites ─────────────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from('collection_favorites')
          .select('item_id')
          .eq('user_id', profileId);
        setFavorites(new Set((data ?? []).map((f: { item_id: string }) => f.item_id)));
      } catch { /* table might not exist yet */ }
    };
    load();
  }, [profileId, supabase]);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,         setSearch]         = useState('');
  const [selectedCat,    setSelectedCat]    = useState('all');
  const [selectedMode,   setSelectedMode]   = useState<CollectionMode | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'actif' | 'reserve'>('actif');
  const [selectedCond,   setSelectedCond]   = useState<ConditionLevel | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<RarityLevel | 'all'>('all');
  const [shippingOnly,   setShippingOnly]   = useState(false);
  const [localOnly,      setLocalOnly]      = useState(false);
  const [priceMin,       setPriceMin]       = useState('');
  const [priceMax,       setPriceMax]       = useState('');
  const [sortBy,         setSortBy]         = useState<'recent' | 'price_asc' | 'price_desc' | 'views' | 'featured'>('featured');
  const [filterSector,   setFilterSector]   = useState<string | null>(null);
  const [showFilters,    setShowFilters]    = useState(false);
  const [page,           setPage]           = useState(0);
  const [viewMode,       setViewMode]       = useState<'grid' | 'list'>('grid');

  // ── Items ─────────────────────────────────────────────────────────────────
  const [items,   setItems]   = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);

  // ── Active filter count (for badge) ──────────────────────────────────────
  const activeFiltersCount = [
    selectedMode !== 'all', selectedCond !== 'all', selectedRarity !== 'all',
    shippingOnly, localOnly, priceMin !== '', priceMax !== '',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedMode('all'); setSelectedCond('all'); setSelectedRarity('all');
    setShippingOnly(false); setLocalOnly(false); setPriceMin(''); setPriceMax('');
    setSearch(''); setSelectedCat('all'); setSelectedStatus('actif'); setFilterSector(null);
  };

  // ── Fetch items ───────────────────────────────────────────────────────────
  const fetchItems = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('collection_items')
        .select(`
          id, title, description, category_id, mode, item_type, status, price,
          exchange_expected, condition, rarity_level, year_period, brand, series_name,
          authenticity_declared, shipping_available, local_meetup_available, city,
          tags, author_id, views_count, favorites_count, messages_count, is_featured,
          published_at, created_at, updated_at,
          author:profiles!collection_items_author_id_fkey(id, full_name, avatar_url, created_at),
          category:collection_categories(id, name, slug, icon, color),
          photos:collection_item_photos(url, is_cover, sort_order)
        `, { count: 'estimated' });

      // Status filter
      if (selectedStatus === 'actif') {
        query = query.eq('status', 'actif');
      } else if (selectedStatus === 'reserve') {
        query = query.in('status', ['actif', 'reserve']);
      } else {
        query = query.in('status', ['actif', 'reserve', 'vendu', 'echange', 'donne', 'trouve']);
      }

      if (selectedMode !== 'all')   query = query.eq('mode', selectedMode);
      if (selectedCat  !== 'all')   query = query.eq('category_id', selectedCat);
      if (selectedCond !== 'all')   query = query.eq('condition', selectedCond);
      if (selectedRarity !== 'all') query = query.eq('rarity_level', selectedRarity);

      if (filterSector) {
        try { query = query.eq('sector_id', filterSector); } catch { /* optional column */ }
      }

      if (shippingOnly) query = query.eq('shipping_available', true);
      if (localOnly)    query = query.eq('local_meetup_available', true);
      if (priceMin)     query = query.gte('price', parseFloat(priceMin));
      if (priceMax)     query = query.lte('price', parseFloat(priceMax));

      if (search.trim()) {
        query = query.or(
          `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,brand.ilike.%${search.trim()}%,series_name.ilike.%${search.trim()}%`
        );
      }

      switch (sortBy) {
        case 'recent':     query = query.order('published_at', { ascending: false }); break;
        case 'price_asc':  query = query.order('price', { ascending: true,  nullsFirst: false }); break;
        case 'price_desc': query = query.order('price', { ascending: false, nullsFirst: false }); break;
        case 'views':      query = query.order('views_count', { ascending: false }); break;
        case 'featured':
          query = query.order('is_featured', { ascending: false }).order('published_at', { ascending: false }); break;
      }

      const from = reset ? 0 : page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;

      if (error) {
        // Fallback — table without v2 columns
        let fbQuery = supabase
          .from('collection_items')
          .select(`
            id, title, description, category_id, item_type, condition, price, tags,
            author_id, views, created_at,
            author:profiles!collection_items_author_id_fkey(id, full_name, avatar_url),
            category:collection_categories(id, name, slug, icon, color),
            photos:collection_item_photos(url, is_cover, sort_order)
          `);

        if (selectedStatus === 'actif') fbQuery = fbQuery.in('status', ['active', 'actif']);
        if (selectedCat !== 'all')      fbQuery = fbQuery.eq('category_id', selectedCat);
        if (selectedMode !== 'all') {
          const ftypes = selectedMode === 'echange' ? ['troc', 'echange'] : [selectedMode];
          fbQuery = fbQuery.in('item_type', ftypes);
        }
        if (selectedCond !== 'all') fbQuery = fbQuery.eq('condition', selectedCond);
        if (search.trim()) {
          fbQuery = fbQuery.or(
            `title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`
          );
        }

        const { data: fallback } = await fbQuery
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE);

        const mapped: CollectionItem[] = (fallback ?? []).map((d: Record<string, unknown>) => ({
          ...(d as unknown as CollectionItem),
          mode:   ((d.item_type === 'troc' ? 'echange' : d.item_type) as CollectionMode) ?? 'vente',
          status: 'actif' as CollectionStatus,
          isFavorited: favorites.has(d.id as string),
        }));

        if (reset || page === 0) setItems(mapped);
        else setItems(prev => [...prev, ...mapped]);
        setTotal(mapped.length);
        return;
      }

      const mapped: CollectionItem[] = (data ?? []).map((d: Record<string, unknown>) => ({
        ...(d as unknown as CollectionItem),
        mode: ((d.mode ?? (d.item_type === 'troc' ? 'echange' : d.item_type)) as CollectionMode) ?? 'vente',
        isFavorited: favorites.has(d.id as string),
      }));

      if (reset || page === 0) setItems(mapped);
      else setItems(prev => [...prev, ...mapped]);
      setTotal(count ?? mapped.length);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedMode, selectedCat, selectedCond, selectedRarity,
      shippingOnly, localOnly, priceMin, priceMax, search, sortBy, page,
      favorites, filterSector, supabase]);

  // Refetch on filter changes (except search — debounced below)
  useEffect(() => {
    setItems([]);
    setPage(0);
    fetchItems(true);
  }, [selectedStatus, selectedMode, selectedCat, selectedCond, selectedRarity,
      shippingOnly, localOnly, priceMin, priceMax, sortBy, filterSector, fetchItems]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setItems([]); setPage(0); fetchItems(true); }, 400);
    return () => clearTimeout(t);
  }, [search, fetchItems]);

  // Fetch next page when `page` increments
  useEffect(() => {
    if (page > 0) fetchItems(false);
  }, [page, fetchItems]);

  // ── Toggle favorite ───────────────────────────────────────────────────────
  const handleFavoriteToggle = async (itemId: string, isFav: boolean) => {
    if (!profileId) { router.push('/connexion?redirect=/collectionneurs'); return; }
    const newFavs = new Set(favorites);
    try {
      if (isFav) {
        await supabase.from('collection_favorites').delete().eq('user_id', profileId).eq('item_id', itemId);
        newFavs.delete(itemId);
        toast.success('Retiré des favoris');
      } else {
        await supabase.from('collection_favorites').insert({ user_id: profileId, item_id: itemId });
        newFavs.add(itemId);
        toast.success('Ajouté aux favoris ❤️');
      }
      setFavorites(newFavs);
      setItems(prev => prev.map(it =>
        it.id === itemId
          ? { ...it, isFavorited: !isFav, favorites_count: (it.favorites_count ?? 0) + (isFav ? -1 : 1) }
          : it
      ));
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // ── Enriched items (favorites applied) ───────────────────────────────────
  const enrichedItems = items.map(it => ({ ...it, isFavorited: favorites.has(it.id) }));

  return {
    // Categories
    categories,
    // Items
    items, enrichedItems, loading, total, fetchItems,
    // View
    viewMode, setViewMode,
    // Filters
    search, setSearch,
    selectedCat, setSelectedCat,
    selectedMode, setSelectedMode,
    selectedStatus, setSelectedStatus,
    selectedCond, setSelectedCond,
    selectedRarity, setSelectedRarity,
    shippingOnly, setShippingOnly,
    localOnly, setLocalOnly,
    priceMin, setPriceMin,
    priceMax, setPriceMax,
    sortBy, setSortBy,
    filterSector, setFilterSector,
    showFilters, setShowFilters,
    activeFiltersCount, resetFilters,
    // Pagination
    page, setPage,
    // Favorites
    handleFavoriteToggle,
  };
}
