'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { adminFetch } from '@/lib/admin-fetch';
import type { AdminAllStats } from '@/app/api/admin/stats/route';

// Ré-export pour compatibilité avec les composants existants
export type { AdminAllStats as AllStats };

/**
 * useAdminStats — charge les statistiques via GET /api/admin/stats
 *
 * SÉCURITÉ :
 *   Avant ce correctif, ce hook appelait directement createClient() côté
 *   navigateur pour effectuer ~13 requêtes Supabase parallèles sur des tables
 *   sensibles (profiles, messages, notifications, reports…) avec la clé anon.
 *   Toute la protection reposait sur les policies RLS.
 *
 *   Correction : toutes les requêtes passent maintenant par l'API Route
 *   /api/admin/stats qui vérifie le rôle admin/modérateur côté serveur avant
 *   toute lecture (createAdminClient — service role, bypass RLS).
 *   Les données sensibles ne transitent plus directement depuis le client.
 *
 * NOTE : Les redirections router.push() ont été supprimées — elles s'exécutaient
 * avant que le store Zustand soit hydraté, polluant l'historique du navigateur.
 * La protection est assurée par ProtectedPage adminOnly dans la page parente.
 */
export function useAdminStats() {
  useAuthStore(); // keep store subscribed

  const [stats,       setStats]       = useState<AdminAllStats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAllStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/stats');
      if (!res.ok) {
        console.error('[useAdminStats] API error:', res.status);
        setLoading(false);
        return;
      }
      const data = await res.json() as { stats: AdminAllStats };
      setStats(data.stats);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('[useAdminStats] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, lastRefresh, fetchAllStats };
}
