'use client';
/**
 * useSearchPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité unique : état + logique de la page recherche.
 *
 *   • Synchronisation URL ↔ query via useSearchParams
 *   • Requêtes Supabase parallèles (12 tables)
 *   • Mapping brut → SearchResult[] via _mappers
 *   • Grouping par thème + tri + filtres actifs
 *   • Suggestions contextuelles (CONTEXT_MAP)
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeKey, CONTEXT_MAP } from './_config';
import { ThemeBlock, SearchPageState } from './_types';
import {
  mapArtisans, mapListings, mapEquipment, mapHelps, mapOutings,
  mapEvents, mapForum, mapAssociations, mapCollections,
  mapJobOffers, mapJobDemands, mapLostFound, buildBlocks,
} from './_mappers';

export function useSearchPage(): SearchPageState {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [query, setQuery]                     = useState(searchParams.get('q') || '');
  const [loading, setLoading]                 = useState(false);
  const [blocks, setBlocks]                   = useState<ThemeBlock[]>([]);
  const [totalCount, setTotalCount]           = useState(0);
  const [view, setView]                       = useState<'grid' | 'list'>('list');
  const [activeThemes, setActiveThemes]       = useState<ThemeKey[]>([]);
  const [sortBy, setSortBy]                   = useState('pertinence');
  const [filterFree, setFilterFree]           = useState(false);
  const [filterLocation, setFilterLocation]   = useState('');
  const [showFilters, setShowFilters]         = useState(false);
  const [contextSuggestions, setContextSuggestions] = useState<{ themes: ThemeKey[]; label: string } | null>(null);

  // Suggestions contextuelles
  useEffect(() => {
    const q = query.toLowerCase();
    const found = Object.entries(CONTEXT_MAP).find(([key]) => q.includes(key));
    setContextSuggestions(found ? found[1] : null);
  }, [query]);

  // ── Requêtes Supabase ─────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setBlocks([]); setTotalCount(0); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const pattern = `%${q.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}%`;
      const today   = new Date().toISOString().split('T')[0];

      const [
        { data: artisans },   { data: listings }, { data: equipment },
        { data: helps },      { data: outings },  { data: events },
        { data: forum },      { data: associations },
        { data: collections },{ data: lostFound },
        { data: jobOffers },  { data: jobDemands },
      ] = await Promise.all([
        supabase.from('artisan_profiles')
          .select('id, business_name, service_area, description, trade_category:trade_categories(name)')
          .or(`business_name.ilike.${pattern},description.ilike.${pattern},service_area.ilike.${pattern}`)
          .limit(20),
        supabase.from('listings')
          .select('id, title, description, listing_type, price, location, status, created_at, photos:listing_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
          .in('status', ['active', 'reserved']).limit(20),
        supabase.from('equipment_items')
          .select('id, title, description, is_free, daily_rate, pickup_location, photos:equipment_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern}`)
          .eq('is_available', true).limit(20),
        supabase.from('help_requests')
          .select('id, title, description, location_city, help_type, urgency')
          .or(`title.ilike.${pattern},description.ilike.${pattern},location_city.ilike.${pattern}`)
          .eq('status', 'active').limit(20),
        supabase.from('group_outings')
          .select('id, title, description, meeting_point, location_city, outing_date, difficulty, photos:outing_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern},meeting_point.ilike.${pattern},location_city.ilike.${pattern}`)
          .gte('outing_date', today).limit(20),
        supabase.from('events')
          .select('id, title, description, location, event_date, is_free, price, photos:event_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern},location.ilike.${pattern}`)
          .gte('event_date', today).limit(20),
        supabase.from('forum_posts')
          .select('id, title, content, created_at, category:forum_categories(name), author:profiles(full_name, avatar_url)')
          .or(`title.ilike.${pattern},content.ilike.${pattern}`).limit(20),
        supabase.from('associations')
          .select('id, name, description_short, location, category')
          .or(`name.ilike.${pattern},description_short.ilike.${pattern},location.ilike.${pattern},category.ilike.${pattern}`)
          .eq('status', 'active').limit(20),
        supabase.from('collection_items')
          .select('id, title, description, price, location, status, category, photos:collection_item_photos(url)')
          .or(`title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},location.ilike.${pattern}`)
          .eq('status', 'active').limit(20),
        supabase.from('lost_found_items')
          .select('id, title, description, location_area, type, status, category, created_at')
          .or(`title.ilike.${pattern},description.ilike.${pattern},location_area.ilike.${pattern},category.ilike.${pattern}`)
          .neq('status', 'draft').neq('status', 'resolved').limit(20),
        supabase.from('job_offers')
          .select('id, title, short_description, job_category, location_label, slug, status')
          .or(`title.ilike.${pattern},short_description.ilike.${pattern},job_category.ilike.${pattern}`)
          .in('status', ['published', 'active']).limit(20),
        supabase.from('job_demands')
          .select('id, title, short_description, location_label, slug, status')
          .or(`title.ilike.${pattern},short_description.ilike.${pattern},location_label.ilike.${pattern}`)
          .in('status', ['published', 'active']).limit(20),
      ]);

      const { blocks: newBlocks, total } = buildBlocks({
        artisan:        mapArtisans(artisans || []),
        annonce:        mapListings(listings || [], filterFree, filterLocation),
        materiel:       mapEquipment(equipment || [], filterFree),
        aide:           mapHelps(helps || []),
        promenade:      mapOutings(outings || []),
        evenement:      mapEvents(events || []),
        forum:          mapForum(forum || []),
        association:    mapAssociations(associations || []),
        collectionneur: mapCollections(collections || []),
        perdu_trouve:   mapLostFound(lostFound || []),
        emploi:         [...mapJobOffers(jobOffers || []), ...mapJobDemands(jobDemands || [])],
      }, activeThemes, sortBy);

      setBlocks(newBlocks);
      setTotalCount(total);
    } catch (err) {
      console.error('[useSearchPage]', err);
    } finally {
      setLoading(false);
    }
  }, [activeThemes, sortBy, filterFree, filterLocation]);

  // Sync URL → query + lancement
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q) void runSearch(q);
  }, [searchParams, runSearch]);

  // Relance si filtres changent
  useEffect(() => {
    if (query) void runSearch(query);
  }, [activeThemes, sortBy, filterFree, filterLocation, query, runSearch]);

  const handleSearch = useCallback((q: string) => {
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
  }, [router]);

  const toggleTheme = useCallback((key: ThemeKey) => {
    setActiveThemes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]);
  }, []);

  return {
    query, loading, blocks, totalCount, view, setView,
    activeThemes, setActiveThemes, sortBy, setSortBy,
    filterFree, setFilterFree, filterLocation, setFilterLocation,
    showFilters, setShowFilters, contextSuggestions,
    toggleTheme, handleSearch,
  };
}
