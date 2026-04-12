'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LFItem, LFStatus, LFType } from '../_types';
import {
  ACTIVE_STATUSES, HISTORY_STATUSES,
  ACTIVE_STATUSES_EN, HISTORY_STATUSES_EN,
  normalizeItemStatus, normalizeItemType,
} from '../_constants';

type Filters = {
  flux: 'actif' | 'historique';
  filterType: 'all' | LFType;
  filterCat: string;
  filterStatus: LFStatus | 'all';
  filterSector: string | null;
  search: string;
};

export type LFDataReturn = {
  items: LFItem[];
  loading: boolean;
  dbReady: boolean;
  fetchItems: () => Promise<void>;
  perdusCount: number;
  trouveCount: number;
  identifieCount: number;
  restitueCount: number;
};

export function useLFData(filters: Filters): LFDataReturn {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems]     = useState<LFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  const { flux, filterType, filterCat, filterStatus, filterSector, search } = filters;

  const fetchItems = useCallback(async () => {
    setLoading(true);

    const buildQuery = (selectStr: string) => {
      let q = supabase
        .from('lost_found_items')
        .select(selectStr)
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(100);
      if (flux === 'actif') q = q.in('status', [...ACTIVE_STATUSES, ...ACTIVE_STATUSES_EN]);
      else                  q = q.in('status', [...HISTORY_STATUSES, ...HISTORY_STATUSES_EN]);
      if (filterType !== 'all')   q = q.eq('type', filterType);
      if (filterCat  !== 'all')   q = q.eq('category', filterCat);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (filterSector) {
        try { q = q.eq('sector_id', filterSector); } catch { /* optionnel */ }
      }
      return q;
    };

    // Tentative 1 — FK explicite
    let { data, error } = await buildQuery(
      '*, author:profiles!lost_found_items_author_id_fkey(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover)'
    );
    // Tentative 2 — sans FK nommée
    if (error?.message?.includes('fkey') || error?.message?.includes('foreign') || error?.code === 'PGRST200') {
      ({ data, error } = await buildQuery(
        '*, author:profiles(full_name, avatar_url, created_at, role, phone), photos:lf_photos(url, display_order, is_cover)'
      ));
    }
    // Tentative 3 — sans jointures
    if (error?.message?.includes('fkey') || error?.message?.includes('foreign') || error?.code === 'PGRST200') {
      ({ data, error } = await buildQuery('*'));
    }

    if (error) {
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('column')) {
        setDbReady(false);
      }
      setLoading(false);
      return;
    }
    setDbReady(true);

    const rawData = (data || []) as unknown as (LFItem & { photos?: { url: string; display_order?: number; is_cover?: boolean }[] })[];
    const enriched = rawData.map(it => ({
      ...it,
      status: normalizeItemStatus(it.status),
      type:   normalizeItemType(it.type),
      photos: (it.photos || []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    }));

    const filtered = search.trim()
      ? enriched.filter(it =>
          it.title.toLowerCase().includes(search.toLowerCase()) ||
          it.description.toLowerCase().includes(search.toLowerCase()) ||
          it.location_area.toLowerCase().includes(search.toLowerCase()) ||
          (it.brand && it.brand.toLowerCase().includes(search.toLowerCase())) ||
          (it.color && it.color.toLowerCase().includes(search.toLowerCase()))
        )
      : enriched;

    setItems(filtered as LFItem[]);
    setLoading(false);
  }, [flux, filterType, filterCat, filterStatus, filterSector, search, supabase]);

  const perdusCount    = items.filter(i => i.status === 'perdu').length;
  const trouveCount    = items.filter(i => i.status === 'trouve').length;
  const identifieCount = items.filter(i => i.status === 'identifie').length;
  const restitueCount  = items.filter(i => i.status === 'restitue').length;

  return {
    items, loading, dbReady, fetchItems,
    perdusCount, trouveCount, identifieCount, restitueCount,
  };
}
