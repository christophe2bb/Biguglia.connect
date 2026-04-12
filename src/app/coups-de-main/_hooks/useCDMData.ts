'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { HelpRequest } from '../_types';

export type CDMDataReturn = {
  items: HelpRequest[];
  loading: boolean;
  dbReady: boolean;
  fetchItems: () => Promise<void>;
};

export function useCDMData(): CDMDataReturn {
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;

  const [items, setItems]     = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        author:profiles(full_name, avatar_url, created_at),
        photos:help_photos(url, display_order)
      `)
      .neq('status', 'draft')
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setDbReady(false);
      }
      setLoading(false);
      return;
    }

    setDbReady(true);

    // Enrich each item with comment & helper counts in parallel
    const enriched = await Promise.all(
      (data ?? []).map(async (item: HelpRequest) => {
        const [{ count: cCount }, { count: hCount }] = await Promise.all([
          supabase
            .from('help_comments')
            .select('id', { count: 'exact', head: true })
            .eq('help_id', item.id),
          supabase
            .from('help_request_participants')
            .select('id', { count: 'exact', head: true })
            .eq('help_request_id', item.id)
            .eq('role', 'helper'),
        ]);
        return { ...item, comment_count: cCount ?? 0, helper_count: hCount ?? 0 };
      }),
    );

    setItems(enriched as HelpRequest[]);
    setLoading(false);
  }, [supabase]);

  return { items, loading, dbReady, fetchItems };
}
