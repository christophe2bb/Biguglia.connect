'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  useDebounce,
  getRecent,
  saveRecent,
  clearRecent,
  buildWordPatterns,
  buildOrFilter,
  scoreResult,
  extractRawWords,
} from '../_lib';
import { THEME_CONFIG } from '../_config';
import type { QuickResult } from '../_types';

// ─── Hook principal ───────────────────────────────────────────────────────────

export interface UseGlobalSearchOptions {
  initialValue?: string;
  onSearch?: (q: string) => void;
}

export function useGlobalSearch({ initialValue = '', onSearch }: UseGlobalSearchOptions) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuickResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [error, setError] = useState(false);

  const debouncedQuery = useDebounce(query.trim(), 250);

  // ── Focus / blur ──────────────────────────────────────────────────────────
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setRecent(getRecent());
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsFocused(false), 200);
  }, []);

  // ── Click outside ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch results on debounced query ──────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setLoading(true);
      setError(false);

      const rawWords = extractRawWords(debouncedQuery);
      const wordPatterns = buildWordPatterns(debouncedQuery);
      if (wordPatterns.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const today = new Date().toISOString().split('T')[0];

        const [
          { data: artisans },
          { data: listings },
          { data: equipment },
          { data: helps },
          { data: outings },
          { data: events },
          { data: forumTopics },
          { data: associations },
          { data: lostFound },
          { data: jobOffers },
          { data: jobDemands },
        ] = await Promise.all([
          supabase
            .from('artisan_profiles')
            .select('id, business_name, service_area, trade_category:trade_categories(name)')
            .or(buildOrFilter(['business_name', 'description'], wordPatterns))
            .limit(4),

          supabase
            .from('listings')
            .select('id, title, listing_type, price, location')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .in('status', ['active', 'reserved'])
            .limit(4),

          supabase
            .from('equipment_items')
            .select('id, title, description, is_free, pickup_location')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .eq('is_available', true)
            .limit(4),

          supabase
            .from('help_requests')
            .select('id, title, description')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .neq('status', 'draft')
            .neq('status', 'resolved')
            .neq('status', 'archived')
            .limit(4),

          supabase
            .from('group_outings')
            .select('id, title, description, meeting_point, outing_date')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .gte('outing_date', today)
            .limit(3),

          supabase
            .from('events')
            .select('id, title, description, location, event_date')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .gte('event_date', today)
            .not('status', 'eq', 'annule')
            .not('status', 'eq', 'draft')
            .limit(4),

          supabase
            .from('forum_topics')
            .select('id, title, content')
            .or(buildOrFilter(['title', 'content'], wordPatterns))
            .neq('status', 'masque')
            .neq('status', 'archive')
            .limit(4),

          supabase
            .from('associations')
            .select('id, name, location, category, description')
            .or(buildOrFilter(['name', 'description'], wordPatterns))
            .eq('status', 'active')
            .limit(3),

          supabase
            .from('lost_found_items')
            .select('id, title, description, type, location_area')
            .or(buildOrFilter(['title', 'description'], wordPatterns))
            .neq('status', 'resolved')
            .neq('status', 'returned')
            .limit(4),

          supabase
            .from('job_offers')
            .select('id, title, short_description, job_category, location_label, slug')
            .or(buildOrFilter(['title', 'short_description', 'job_category'], wordPatterns))
            .in('status', ['published', 'active'])
            .limit(3),

          supabase
            .from('job_demands')
            .select('id, title, short_description, location_label, slug')
            .or(buildOrFilter(['title', 'short_description'], wordPatterns))
            .in('status', ['published', 'active'])
            .limit(3),
        ]);

        if (cancelled) return;

        // ── Map raw rows → QuickResult ────────────────────────────────────
        const mapped: QuickResult[] = [
          ...(artisans ?? []).map((a: Record<string, unknown>) => ({
            id: `artisan-${a.id}`,
            title: a.business_name || 'Artisan',
            subtitle: (a.trade_category as { name?: string } | null)?.name ?? a.service_area,
            href: `/artisans/${a.id}`,
            theme: 'artisan',
            themeLabel: THEME_CONFIG.artisan.label,
            themeColor: THEME_CONFIG.artisan.color,
            themeBg: THEME_CONFIG.artisan.bg,
            icon: THEME_CONFIG.artisan.icon,
          })),
          ...(listings ?? []).map((l: Record<string, unknown>) => ({
            id: `listing-${l.id}`,
            title: l.title,
            subtitle: l.price ? `${l.price} €` : l.location,
            href: `/annonces/${l.id}`,
            theme: 'annonce',
            themeLabel: THEME_CONFIG.annonce.label,
            themeColor: THEME_CONFIG.annonce.color,
            themeBg: THEME_CONFIG.annonce.bg,
            icon: THEME_CONFIG.annonce.icon,
          })),
          ...(equipment ?? []).map((e: Record<string, unknown>) => ({
            id: `equip-${e.id}`,
            title: e.title,
            subtitle: e.is_free ? 'Gratuit' : e.pickup_location,
            href: `/materiel/${e.id}`,
            theme: 'materiel',
            themeLabel: THEME_CONFIG.materiel.label,
            themeColor: THEME_CONFIG.materiel.color,
            themeBg: THEME_CONFIG.materiel.bg,
            icon: THEME_CONFIG.materiel.icon,
          })),
          ...(helps ?? []).map((h: Record<string, unknown>) => ({
            id: `help-${h.id}`,
            title: h.title,
            subtitle: 'Coup de main',
            href: `/coups-de-main#${h.id}`,
            theme: 'aide',
            themeLabel: THEME_CONFIG.aide.label,
            themeColor: THEME_CONFIG.aide.color,
            themeBg: THEME_CONFIG.aide.bg,
            icon: THEME_CONFIG.aide.icon,
          })),
          ...(outings ?? []).map((o: Record<string, unknown>) => ({
            id: `outing-${o.id}`,
            title: o.title,
            subtitle: o.meeting_point,
            href: `/promenades/sorties/${o.id}`,
            theme: 'promenade',
            themeLabel: THEME_CONFIG.promenade.label,
            themeColor: THEME_CONFIG.promenade.color,
            themeBg: THEME_CONFIG.promenade.bg,
            icon: THEME_CONFIG.promenade.icon,
          })),
          ...(events ?? []).map((e: Record<string, unknown>) => ({
            id: `event-${e.id}`,
            title: e.title,
            subtitle: e.location,
            href: `/evenements/${e.id}`,
            theme: 'evenement',
            themeLabel: THEME_CONFIG.evenement.label,
            themeColor: THEME_CONFIG.evenement.color,
            themeBg: THEME_CONFIG.evenement.bg,
            icon: THEME_CONFIG.evenement.icon,
          })),
          ...(forumTopics ?? []).map((f: Record<string, unknown>) => ({
            id: `forum-${f.id}`,
            title: f.title,
            subtitle: 'Discussion',
            href: `/forum/${f.id}`,
            theme: 'forum',
            themeLabel: THEME_CONFIG.forum.label,
            themeColor: THEME_CONFIG.forum.color,
            themeBg: THEME_CONFIG.forum.bg,
            icon: THEME_CONFIG.forum.icon,
          })),
          ...(associations ?? []).map((a: Record<string, unknown>) => ({
            id: `asso-${a.id}`,
            title: a.name,
            subtitle: a.location,
            href: `/associations/${a.id}`,
            theme: 'association',
            themeLabel: THEME_CONFIG.association.label,
            themeColor: THEME_CONFIG.association.color,
            themeBg: THEME_CONFIG.association.bg,
            icon: THEME_CONFIG.association.icon,
          })),
          ...(lostFound ?? []).map((l: Record<string, unknown>) => ({
            id: `lf-${l.id}`,
            title: l.title,
            subtitle: l.type === 'lost' || l.type === 'perdu' ? '🔴 Perdu' : '🟢 Trouvé',
            href: `/perdu-trouve/${l.id}`,
            theme: 'perdu',
            themeLabel: THEME_CONFIG.perdu.label,
            themeColor: THEME_CONFIG.perdu.color,
            themeBg: THEME_CONFIG.perdu.bg,
            icon: THEME_CONFIG.perdu.icon,
          })),
          ...(jobOffers ?? []).map((j: Record<string, unknown>) => ({
            id: `joboffer-${j.id}`,
            title: j.title as string,
            subtitle: (j.location_label as string) || (j.job_category as string),
            href: `/emploi/offres/${j.slug}`,
            theme: 'emploi',
            themeLabel: THEME_CONFIG.emploi.label,
            themeColor: THEME_CONFIG.emploi.color,
            themeBg: THEME_CONFIG.emploi.bg,
            icon: THEME_CONFIG.emploi.icon,
          })),
          ...(jobDemands ?? []).map((j: Record<string, unknown>) => ({
            id: `jobdemand-${j.id}`,
            title: j.title as string,
            subtitle: j.location_label as string,
            href: `/emploi/demandes/${j.slug}`,
            theme: 'emploi',
            themeLabel: THEME_CONFIG.emploi.label,
            themeColor: THEME_CONFIG.emploi.color,
            themeBg: THEME_CONFIG.emploi.bg,
            icon: THEME_CONFIG.emploi.icon,
          })),
        ];

        // ── Score + tri + déduplication ───────────────────────────────────
        const scored = mapped
          .map((r) => ({ ...r, score: scoreResult(r, rawWords) }))
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        const seen = new Set<string>();
        const deduped = scored.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

        setResults(deduped.slice(0, 14));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // ── Navigation + actions ──────────────────────────────────────────────────
  const navigateTo = useCallback(
    (href: string) => {
      setIsFocused(false);
      router.push(href);
    },
    [router]
  );

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    saveRecent(q);
    setIsFocused(false);
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/recherche?q=${encodeURIComponent(q)}`);
    }
  }, [query, onSearch, router]);

  const handleSearchTerm = useCallback(
    (term: string) => {
      setQuery(term);
      saveRecent(term);
      setIsFocused(false);
      if (onSearch) {
        onSearch(term);
      } else {
        router.push(`/recherche?q=${encodeURIComponent(term)}`);
      }
    },
    [onSearch, router]
  );

  const clearQuery = useCallback(() => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }, []);

  const clearRecentAndRefresh = useCallback(() => {
    clearRecent();
    setRecent([]);
  }, []);

  return {
    // refs
    inputRef,
    containerRef,
    // state
    query,
    setQuery,
    isFocused,
    setIsFocused,
    loading,
    results,
    recent,
    selectedIdx,
    setSelectedIdx,
    error,
    // derived
    hasQuery: query.trim().length >= 2,
    // actions
    handleFocus,
    handleBlur,
    navigateTo,
    handleSubmit,
    handleSearchTerm,
    clearQuery,
    clearRecentAndRefresh,
  };
}
