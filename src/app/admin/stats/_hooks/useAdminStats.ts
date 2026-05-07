'use client';

/**
 * useAdminStats v4.0 — SSE temps réel + fallback polling
 *
 * Priorité de connexion :
 *   1. SSE (Server-Sent Events) via /api/admin/stats/stream
 *      → push automatique serveur toutes les 30s, reconnexion automatique
 *   2. Fallback polling /api/admin/stats toutes les 60s
 *      → activé si SSE non supporté ou erreur persistante
 *
 * Indicateurs UI :
 *   • isLive   → true si SSE ou polling actif
 *   • liveMode → 'sse' | 'polling' | 'off'
 *   • countdown → secondes avant prochain refresh (polling uniquement)
 *   • latency  → temps de réponse dernière requête (ms)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { adminFetch } from '@/lib/admin-fetch';
import type { AllStats } from '@/app/admin/stats/_types';

export type { AllStats };
export type { AllStats as AdminAllStats };
export type LiveMode = 'sse' | 'polling' | 'off';

const SSE_URL           = '/api/admin/stats/stream';
const POLLING_URL       = '/api/admin/stats';
const POLLING_MS        = 60_000;
const SSE_RECONNECT_MS  = 3_000;   // délai avant reconnexion SSE
const SSE_MAX_RETRIES   = 5;       // nb max de tentatives SSE avant fallback

export function useAdminStats() {
  useAuthStore();

  const [stats,       setStats]       = useState<AllStats | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isLive,      setIsLive]      = useState(false);
  const [liveMode,    setLiveMode]    = useState<LiveMode>('off');
  const [countdown,   setCountdown]   = useState(POLLING_MS / 1000);
  const [latency,     setLatency]     = useState(0);
  const [sseRetries,  setSseRetries]  = useState(0);

  const esRef        = useRef<EventSource | null>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);
  const retriesRef   = useRef(0);

  // ── Helpers de nettoyage ──────────────────────────────────────────────────

  const clearSSE = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const clearPolling = useCallback(() => {
    if (timerRef.current)  { clearInterval(timerRef.current);  timerRef.current  = null; }
    if (countRef.current)  { clearInterval(countRef.current);  countRef.current  = null; }
  }, []);

  // ── Fetch polling (fallback) ──────────────────────────────────────────────

  const fetchStats = useCallback(async (silent = false) => {
    if (!mountedRef.current) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (!silent) setLoading(true);
    const t0 = Date.now();

    try {
      const res = await adminFetch(POLLING_URL, { signal: abortRef.current.signal } as RequestInit);
      if (!mountedRef.current) return;
      if (!res.ok) { if (!silent) setLoading(false); return; }

      const data = await res.json() as { stats: AllStats };
      if (!mountedRef.current) return;

      setStats(data.stats);
      setLastRefresh(new Date());
      setLatency(Date.now() - t0);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[useAdminStats] fetch error:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ── SSE connection ────────────────────────────────────────────────────────

  const connectSSE = useCallback(async () => {
    if (!mountedRef.current) return;
    clearSSE();

    // Récupère le token pour l'authentification SSE
    let token = '';
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token ?? '';
    } catch { /* SSE sans auth si erreur */ }

    // SSE ne supporte pas les headers → on passe le token en query param
    // (le serveur lit Authorization depuis le cookie ou query)
    const url = token
      ? `${SSE_URL}?token=${encodeURIComponent(token)}`
      : SSE_URL;

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('connected', () => {
      if (!mountedRef.current) return;
      retriesRef.current = 0;
      setSseRetries(0);
      setLiveMode('sse');
      setIsLive(true);
      setLoading(false);
    });

    es.addEventListener('stats', (e: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const payload = JSON.parse(e.data) as { stats: AllStats; timestamp: string };
        setStats(payload.stats);
        setLastRefresh(new Date(payload.timestamp));
        setLatency(0); // SSE = push direct, pas de latence mesurable
        setLoading(false);
      } catch (err) {
        console.error('[useAdminStats] SSE parse error:', err);
      }
    });

    es.addEventListener('reconnect', () => {
      // Le serveur signale une reconnexion (timeout Vercel)
      clearSSE();
      if (mountedRef.current) {
        reconnectRef.current = setTimeout(() => connectSSE(), 1_000);
      }
    });

    es.addEventListener('error', () => {
      if (!mountedRef.current) return;
      es.close();
      retriesRef.current++;
      setSseRetries(retriesRef.current);

      if (retriesRef.current >= SSE_MAX_RETRIES) {
        // Trop d'erreurs → bascule sur le polling
        console.warn('[useAdminStats] SSE failed after max retries → fallback to polling');
        clearSSE();
        startPolling();
      } else {
        // Reconnexion SSE avec back-off
        const delay = Math.min(SSE_RECONNECT_MS * retriesRef.current, 30_000);
        reconnectRef.current = setTimeout(() => connectSSE(), delay);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSSE]);

  // ── Polling (fallback) ────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    clearPolling();
    if (!mountedRef.current) return;

    setLiveMode('polling');
    setIsLive(true);
    setCountdown(POLLING_MS / 1000);

    // Compte à rebours visuel
    countRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? POLLING_MS / 1000 : prev - 1));
    }, 1000);

    // Fetch périodique
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        fetchStats(true);
      }
    }, POLLING_MS);

    // Premier fetch immédiat
    fetchStats(false);
  }, [clearPolling, fetchStats]);

  // ── Toggle live ───────────────────────────────────────────────────────────

  const stopLive = useCallback(() => {
    clearSSE();
    clearPolling();
    setIsLive(false);
    setLiveMode('off');
    setCountdown(POLLING_MS / 1000);
  }, [clearSSE, clearPolling]);

  const startLive = useCallback(() => {
    retriesRef.current = 0;
    setSseRetries(0);
    // Essaie SSE en premier
    if (typeof EventSource !== 'undefined') {
      connectSSE();
    } else {
      startPolling();
    }
  }, [connectSSE, startPolling]);

  const toggleLive = useCallback(() => {
    if (isLive) stopLive();
    else        startLive();
  }, [isLive, stopLive, startLive]);

  // ── Refresh manuel ────────────────────────────────────────────────────────

  const manualRefresh = useCallback(() => {
    setCountdown(POLLING_MS / 1000);
    fetchStats(false);
  }, [fetchStats]);

  // ── Visibilité de l'onglet ────────────────────────────────────────────────

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        if (liveMode === 'polling') fetchStats(true);
        // SSE reprend automatiquement via reconnect
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [liveMode, fetchStats]);

  // ── Montage initial ───────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Premier chargement + démarrage live
    fetchStats(false).then(() => {
      if (mountedRef.current) startLive();
    });

    return () => {
      mountedRef.current = false;
      clearSSE();
      clearPolling();
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stats,
    loading,
    lastRefresh,
    isLive,
    liveMode,
    countdown,
    latency,
    sseRetries,
    autoRefreshMs:   POLLING_MS,
    fetchAllStats:   manualRefresh,
    toggleLive,
    // Raccourcis utiles
    isSSE:     liveMode === 'sse',
    isPolling: liveMode === 'polling',
  };
}
