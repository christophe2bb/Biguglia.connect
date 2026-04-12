'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Association, AssoCategory, PubType } from '../_types';

export type AssoDataFilters = {
  filterCat:    AssoCategory | 'all';
  filterType:   PubType | 'all';
  filterSector: string | null;
  filterNeed:   string;
  filterPublic: string;
  search:       string;
};

export type AssoDataReturn = {
  assos:      Association[];
  loading:    boolean;
  dbReady:    boolean;
  fetchAssos: () => Promise<void>;
};

export function useAssoData(filters: AssoDataFilters): AssoDataReturn {
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;

  const [assos, setAssos]     = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  const { filterCat, filterType, filterSector, filterNeed, filterPublic, search } = filters;

  const fetchAssos = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('associations')
      .select('*, author:profiles!associations_author_id_fkey(full_name, avatar_url), photos:asso_photos(url, display_order)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60);

    if (filterCat  !== 'all') query = query.eq('category', filterCat);
    if (filterType !== 'all') query = query.eq('pub_type', filterType);
    if (filterSector) {
      try { query = query.eq('sector_id', filterSector); } catch { /* optionnel */ }
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation')) setDbReady(false);
      setLoading(false);
      return;
    }
    setDbReady(true);

    let enriched = (data || []).map(
      (a: Association & { photos?: { url: string; display_order: number }[] }) => ({
        ...a,
        photos: (a.photos || []).sort((x, y) => (x.display_order ?? 0) - (y.display_order ?? 0)),
      }),
    );

    // ── Filtrage in-memory ────────────────────────────────────────────────
    if (search.trim()) {
      const q = search.toLowerCase();
      enriched = enriched.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description_short.toLowerCase().includes(q) ||
        (a.description_full ?? '').toLowerCase().includes(q) ||
        a.tags.some((t: string) => t.toLowerCase().includes(q)) ||
        a.needs.some((n: string) => n.toLowerCase().includes(q)) ||
        a.activities.some((ac: string) => ac.toLowerCase().includes(q)) ||
        a.public_target.some((p: string) => p.toLowerCase().includes(q)) ||
        (a.contact_name ?? '').toLowerCase().includes(q),
      );
    }

    if (filterNeed) {
      enriched = enriched.filter(a =>
        a.needs.some((n: string) => n.toLowerCase().includes(filterNeed.toLowerCase())) ||
        (filterNeed === 'benevoles'   && (a.is_accepting_volunteers || a.pub_type === 'benevoles')) ||
        (filterNeed === 'dons'        && (a.is_accepting_donations  || a.pub_type === 'dons')) ||
        (filterNeed === 'adherents'   && (a.is_accepting_members    || a.pub_type === 'adherents')) ||
        (filterNeed === 'partenaires' && (a.is_accepting_partners   || a.pub_type === 'partenaires')),
      );
    }

    if (filterPublic) {
      enriched = enriched.filter(a => a.public_target.some((p: string) => p === filterPublic));
    }

    setAssos(enriched as Association[]);
    setLoading(false);
  }, [filterCat, filterType, filterSector, filterNeed, filterPublic, search, supabase]);

  return { assos, loading, dbReady, fetchAssos };
}
