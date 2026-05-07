'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { adminFetch } from '@/lib/admin-fetch';
import type { AllStats } from '@/app/admin/stats/_types';

// Ré-export pour compatibilité
export type { AllStats };
export type { AllStats as AdminAllStats };

/**
 * useAdminStats — auto-refresh toutes les 60s
 *
 * • Premier chargement immédiat
 * • Refresh automatique toutes les AUTO_REFRESH_MS millisecondes
 * • Pause si l'onglet est masqué (visibilitychange)
 * • Annulation propre au démontage du composant
 * • Toutes les requêtes passent par /api/admin/stats (sécurisé côté serveur)
 */

const AUTO_REFRESH_MS = 60_000; // 60 secondes

export function useAdminStats() {
  useAuthStore(); // keep store subscribed

  const [stats,        setStats]        = useState<AllStats | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [lastRefresh,  setLastRefresh]  = useState<Date>(new Date());
  const [isLive,       setIsLive]       = useState(false);     // indique si auto-refresh actif
  const [countdown,    setCountdown]    = useState(AUTO_REFRESH_MS / 1000);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const mountedRef   = useRef(true);

  // ── fetch core ─────────────────────────────────────────────────────────────

  const fetchAllStats = useCallback(async (silent = false) => {
    // Annule la requête précédente si encore en cours
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (!silent) setLoading(true);

    try {
      const res = await adminFetch('/api/admin/stats', {
        signal: abortRef.current.signal,
      } as RequestInit);

      if (!mountedRef.current) return;

      if (!res.ok) {
        console.error('[useAdminStats] API error:', res.status);
        if (!silent) setLoading(false);
        return;
      }

      const data = await res.json() as { stats: AllStats };

      if (!mountedRef.current) return;

      setStats(data.stats);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[useAdminStats] fetch error:', err);
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
      else if (mountedRef.current)       setLoading(false);
    }
  }, []);

  // ── démarrer / arrêter le timer auto-refresh ───────────────────────────────

  const startAutoRefresh = useCallback(() => {
    if (timerRef.current) return; // déjà actif

    setIsLive(true);
    setCountdown(AUTO_REFRESH_MS / 1000);

    // Compte à rebours visuel (1s)
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return AUTO_REFRESH_MS / 1000;
        return prev - 1;
      });
    }, 1000);

    // Refresh réel toutes les 60s
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAllStats(true); // silent = pas de spinner
      }
    }, AUTO_REFRESH_MS);
  }, [fetchAllStats]);

  const stopAutoRefresh = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (countRef.current)  { clearInterval(countRef.current);  countRef.current  = null; }
    setIsLive(false);
    setCountdown(AUTO_REFRESH_MS / 1000);
  }, []);

  const toggleLive = useCallback(() => {
    if (isLive) stopAutoRefresh();
    else        startAutoRefresh();
  }, [isLive, startAutoRefresh, stopAutoRefresh]);

  // ── Pause quand l'onglet est masqué ───────────────────────────────────────

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isLive) {
        fetchAllStats(true); // refresh immédiat au retour
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isLive, fetchAllStats]);

  // ── Premier chargement + auto-start du live ────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    fetchAllStats(false);
    startAutoRefresh();

    return () => {
      mountedRef.current = false;
      stopAutoRefresh();
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stats,
    loading,
    lastRefresh,
    fetchAllStats: () => fetchAllStats(false),
    isLive,
    toggleLive,
    countdown,
    autoRefreshMs: AUTO_REFRESH_MS,
  };
}
