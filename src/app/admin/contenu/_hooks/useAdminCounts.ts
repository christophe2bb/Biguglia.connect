import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TabId } from '../_types';

export type CountsMap = Record<TabId, number>;

const DEFAULT_COUNTS: CountsMap = { listings: 0, forum: 0, equipment: 0, reviews: 0 };

export function useAdminCounts(enabled: boolean) {
  const [counts, setCounts] = useState<CountsMap>(DEFAULT_COUNTS);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('listings').select('*', { count: 'exact', head: true }),
      supabase.from('forum_posts').select('*', { count: 'exact', head: true }),
      supabase.from('equipment_items').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
    ]).then(([l, f, e, r]) => {
      setCounts({
        listings:  l.count ?? 0,
        forum:     f.count ?? 0,
        equipment: e.count ?? 0,
        reviews:   r.count ?? 0,
      });
    });
  }, [enabled]);

  return counts;
}
