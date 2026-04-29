/**
 * useAdminCounts — Compteurs des onglets /admin/contenu
 *
 * Stratégie :
 *  1. Appel principal → /api/admin/dashboard (un seul round-trip, counts exacts
 *     via service-role, bypass RLS). On mappe les champs du dashboard sur les
 *     onglets Contenu : listings, forum, equipment.
 *  2. Pour les reviews (pas dans le dashboard) on appelle
 *     /api/admin/contenu/reviews?limit=1 et on lit le champ `total` retourné
 *     par l'API (COUNT exact sans limit).
 *
 * Fix : avant ce correctif, le hook utilisait createClient() (client anon, RLS)
 * → les counts étaient bloqués ou faux. Désormais tout passe par des routes
 * API sécurisées (service-role côté serveur).
 */

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import type { TabId } from '../_types';
import type { AdminDashboardStats } from '@/app/api/admin/dashboard/route';

export type CountsMap = Record<TabId, number>;

const DEFAULT_COUNTS: CountsMap = { listings: 0, forum: 0, equipment: 0, reviews: 0 };

export function useAdminCounts(enabled: boolean) {
  const [counts, setCounts] = useState<CountsMap>(DEFAULT_COUNTS);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      try {
        // ── 1. Dashboard : listings + forum + equipment ─────────────────────
        const [dashRes, reviewsRes] = await Promise.all([
          adminFetch('/api/admin/dashboard'),
          adminFetch('/api/admin/contenu/reviews?limit=1'),
        ]);

        if (cancelled) return;

        let listings = 0, forum = 0, equipment = 0, reviews = 0;

        if (dashRes.ok) {
          const json = await dashRes.json() as { stats: AdminDashboardStats };
          listings  = json.stats?.total_listings    ?? 0;
          forum     = json.stats?.total_forum_posts  ?? 0;
          equipment = json.stats?.total_equipment    ?? 0;
        }

        if (reviewsRes.ok) {
          const json = await reviewsRes.json() as { total?: number; items?: unknown[] };
          // L'API retourne maintenant { items, total } — total est le COUNT exact
          reviews = typeof json.total === 'number' ? json.total : (json.items?.length ?? 0);
        }

        if (!cancelled) {
          setCounts({ listings, forum, equipment, reviews });
        }
      } catch {
        // Silencieux : les compteurs restent à 0, pas de crash UI
      }
    }

    load();
    return () => { cancelled = true; };
  }, [enabled]);

  return counts;
}
