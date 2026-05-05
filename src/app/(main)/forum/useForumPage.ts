'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ForumSector, ForumCategory, ForumTopic } from '@/types';
import {
  SECTORS_DEFAULT,
  DEFAULT_CATEGORIES,
} from './_config';
import { SortMode, UseForumPageReturn } from './_types';

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useForumPage(): UseForumPageReturn {
  const searchParams = useSearchParams();

  // ── filter state ────────────────────────────────────────────────────────────
  const [selectedSector,   setSelectedSector]   = useState<string | null>(searchParams.get('secteur'));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get('categorie'));
  const [selectedType,     setSelectedType]     = useState<string | null>(searchParams.get('type'));
  const [sortMode,         setSortMode]         = useState<SortMode>('recent');
  const [searchQuery,      setSearchQuery]      = useState(searchParams.get('q') || '');
  const [searchInput,      setSearchInput]      = useState(searchParams.get('q') || '');
  const [viewMode,         setViewMode]         = useState<'list' | 'grid'>('list');
  const [showFilters,      setShowFilters]      = useState(false);
  const [statusFilter,     setStatusFilter]     = useState<'all' | 'ouvert' | 'resolu'>('all');
  const [urgencyFilter,    setUrgencyFilter]    = useState<'all' | 'haute'>('all');

  // ── data state ──────────────────────────────────────────────────────────────
  const [sectors,          setSectors]          = useState<ForumSector[]>([]);
  const [categories,       setCategories]       = useState<ForumCategory[]>([]);
  const [topics,           setTopics]           = useState<ForumTopic[]>([]);
  const [hotTopics,        setHotTopics]        = useState<ForumTopic[]>([]);
  const [recentlyResolved, setRecentlyResolved] = useState<ForumTopic[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [stats, setStats] = useState({ topics: 0, replies: 0, members: 0, resolved: 0 });

  // ── fetch ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Secteurs
    const { data: sectorData } = await supabase.from('forum_sectors').select('*').order('display_order');
    const usedSectors: ForumSector[] = (sectorData && sectorData.length > 0)
      ? sectorData
      : SECTORS_DEFAULT.map(s => ({ ...s, topic_count: 0 }));
    setSectors(usedSectors);

    // Catégories
    const { data: catData } = await supabase.from('forum_categories').select('*').order('display_order');
    const catList = (catData && catData.length > 0 ? catData : DEFAULT_CATEGORIES) as ForumCategory[];
    setCategories(catList);

    // Statistiques — calculées après le chargement des topics (pas de requêtes HEAD
    // séparées qui échouent avec la RLS Supabase pour les visiteurs anonymes).
    // setStats() est appelé plus bas, après topicList.

    // Topics principaux
    let topicList: ForumTopic[] = [];
    try {
      let query = supabase
        .from('forum_topics')
        .select(`*, author:profiles!forum_topics_author_id_fkey(id, full_name, avatar_url, role), sector:forum_sectors(id, name, slug, icon, color), category:forum_categories(id, name, icon, slug), photos:forum_topic_photos(url, display_order)`)
        .not('status', 'eq', 'masque')
        .order('is_pinned', { ascending: false });

      if (selectedSector)           query = query.eq('sector_id', selectedSector);
      if (selectedCategory)         query = query.eq('category_id', selectedCategory);
      // post_type/is_resolved/urgency n'existent pas sur forum_topics
      // status 'closed' = résolu, 'open' = ouvert
      if (statusFilter === 'resolu') query = query.eq('status', 'closed');
      else if (statusFilter === 'ouvert') query = query.not('status', 'eq', 'closed');
      if (searchQuery.trim())        query = query.ilike('title', `%${searchQuery.trim()}%`);

      if (sortMode === 'views') query = query.order('views', { ascending: false });
      else if (sortMode === 'hot' || sortMode === 'replies') query = query.order('reply_count', { ascending: false });
      else query = query.order('created_at', { ascending: false });

      query = query.limit(40);
      const { data } = await query;
      if (data && data.length > 0) topicList = data as unknown as ForumTopic[];
    } catch { /* ignore */ }

    // Fallback vers forum_posts
    if (topicList.length === 0) {
      let q2 = supabase
        .from('forum_posts')
        .select(`*, author:profiles!forum_posts_author_id_fkey(id, full_name, avatar_url, role), category:forum_categories(id, name, icon, slug), photos:forum_topic_photos(url, display_order)`)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(40);
      if (selectedCategory) q2 = q2.eq('category_id', selectedCategory);
      if (searchQuery.trim()) q2 = q2.ilike('title', `%${searchQuery.trim()}%`);
      const { data: postsData } = await q2;
      topicList = (postsData || []).map((p: Record<string, unknown>) => ({
        ...p,
        status: p.is_closed ? 'verrouille' : 'ouvert',
        reply_count: 0, reaction_count: 0, last_reply_at: null,
        is_hot: false, sector_id: null, visibility: 'public', tags: [],
      } as unknown as ForumTopic));
    }

    setTopics(topicList);
    setHotTopics([...topicList].sort((a, b) => (b.reply_count ?? 0) - (a.reply_count ?? 0)).slice(0, 5));
    setRecentlyResolved(topicList.filter(t => (t as ForumTopic & { status?: string }).status === 'closed').slice(0, 3));

    // Statistiques calculées localement depuis topicList — évite les requêtes
    // HEAD COUNT qui échouent avec la RLS Supabase pour les visiteurs anonymes.
    const uniqueAuthors = new Set(topicList.map(t => (t as ForumTopic & { author_id?: string }).author_id).filter(Boolean));
    const resolvedCount = topicList.filter(t => (t as ForumTopic & { status?: string }).status === 'closed').length;
    const totalReplies  = topicList.reduce((acc, t) => acc + (t.reply_count ?? 0), 0);
    setStats({
      topics:   topicList.length,
      replies:  totalReplies,
      members:  uniqueAuthors.size,
      resolved: resolvedCount,
    });

    setLoading(false);
  }, [selectedSector, selectedCategory, sortMode, statusFilter, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── actions ──────────────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const clearFilters = () => {
    setSelectedSector(null);
    setSelectedCategory(null);
    setSelectedType(null);
    setStatusFilter('all');
    setUrgencyFilter('all');
    setSearchQuery('');
    setSearchInput('');
  };

  const activeFiltersCount = [
    selectedSector, selectedCategory, selectedType,
    statusFilter !== 'all', searchQuery, urgencyFilter !== 'all',
  ].filter(Boolean).length;

  return {
    // filter state
    selectedSector, selectedCategory, selectedType,
    sortMode, searchQuery, searchInput,
    viewMode, showFilters, statusFilter, urgencyFilter,
    // data
    sectors, categories, topics, hotTopics, recentlyResolved, stats, loading,
    // derived
    activeFiltersCount,
    // setters
    setSelectedSector, setSelectedCategory, setSelectedType,
    setSortMode, setSearchInput, setViewMode,
    setShowFilters, setStatusFilter, setUrgencyFilter,
    // actions
    handleSearch, clearFilters, fetchData,
  };
}
