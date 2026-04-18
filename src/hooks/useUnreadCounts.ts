'use client';

/**
 * useUnreadCounts — Badge de messages non lus + notifications.
 *
 * Utilise l'API /api/messages/unread (admin client) pour contourner la
 * récursion infinie dans les politiques RLS de conversation_participants
 * et messages. Le realtime Supabase fonctionne en parallèle (incrément
 * immédiat sans SELECT lourd).
 *
 * Modules extraits :
 *   unreadHelpers.ts  — isSystem(), totalUnreadMsgs()
 *   unreadFetch.ts    — fetchCounts() via API admin + cache token Bearer
 *   unreadRealtime.ts — connectRealtime() + reconnexion exponentielle
 *
 * ── Optimisations v2 ──────────────────────────────────────────────────────────
 *   1. SAFE_POLL_MS : 30 s → 60 s (le realtime couvre les mises à jour temps réel ;
 *      le polling est uniquement un filet de sécurité).
 *   2. Debounce 500 ms sur fetchCounts déclenché par événements (visibilitychange,
 *      messages-read, new-notification) pour absorber les rafales d'événements
 *      sans empiler les requêtes HTTP.
 *   3. invalidateBearerCache() appelé à l'unmount pour forcer un refresh du token
 *      à la prochaine connexion (changement d'utilisateur).
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { fetchCounts, invalidateBearerCache } from './unreadFetch';
import { connectRealtime }                     from './unreadRealtime';
import { totalUnreadMsgs }                     from './unreadHelpers';

interface UnreadCounts {
  messages:      number;
  notifications: number;
  total:         number;
}

/** Intervalle du polling de sécurité (filet de sécurité — le realtime est prioritaire). */
const SAFE_POLL_MS = 60_000;

/** Délai de debounce pour les refetch déclenchés par événements (ms). */
const DEBOUNCE_MS = 500;

const ZERO: UnreadCounts = { messages: 0, notifications: 0, total: 0 };

export function useUnreadCounts(): UnreadCounts {
  const { profile } = useAuthStore();
  const profileId = profile?.id ?? null;
  const [counts, setCounts] = useState<UnreadCounts>(ZERO);

  // ── Refs partagées entre fetch, realtime et l'effet ──────────────────────
  const mountedRef       = useRef(true);
  const fetchingRef      = useRef(false);
  const hookStartRef     = useRef(Date.now());
  const readMapRef       = useRef<Record<string, number>>({});
  const unreadMapRef     = useRef<Record<string, Set<string>>>({});
  const channelRef       = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx     = useRef(0);
  const realtimePollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const safePollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Debounce : évite d'empiler les appels déclenchés par rafales d'événements. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleFetch = (supabase: ReturnType<typeof createClient>, userId: string, refs: Parameters<typeof fetchCounts>[2]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      fetchingRef.current = false;
      fetchCounts(supabase, userId, refs, setCounts);
    }, DEBOUNCE_MS);
  };

  useEffect(() => {
    mountedRef.current    = true;
    fetchingRef.current   = false;
    hookStartRef.current  = Date.now();
    readMapRef.current    = {};
    unreadMapRef.current  = {};

    if (!profileId) { setCounts(ZERO); return; }

    const supabase = createClient();
    const userId   = profileId;
    const refs     = {
      fetchingRef, mountedRef, readMapRef, unreadMapRef,
      channelRef, reconnectRef, reconnectIdx, realtimePollRef, hookStartRef,
    };

    // Chargement initial + realtime
    fetchCounts(supabase, userId, refs, setCounts);
    connectRealtime(supabase, userId, refs, setCounts);

    // Polling de sécurité toutes les 60 s (filet de sécurité uniquement)
    safePollRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      fetchingRef.current = false;
      fetchCounts(supabase, userId, refs, setCounts);
    }, SAFE_POLL_MS);

    // Refetch au retour sur l'onglet (debounced pour éviter les rafales)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleFetch(supabase, userId, refs);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── Événement 'messages-read' (depuis markAsRead dans [id]/page.tsx) ────
    const handleMessagesRead = (e: Event) => {
      const { conversationId: convId, readAt = Date.now() } =
        (e as CustomEvent<{ conversationId?: string; readAt?: number }>).detail ?? {};
      if (convId) {
        const effective = Math.max(readAt, readMapRef.current[convId] ?? 0);
        readMapRef.current[convId]   = effective;
        unreadMapRef.current[convId] = new Set();
        // Persister via l'API admin (bypass RLS) — fire & forget
        supabase.auth.getSession().then(({ data: { session } }) => {
          fetch('/api/messages/unread', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ conversationId: convId, lastReadAt: new Date(effective).toISOString() }),
          }).catch(() => null);
        });
      }
      const n = totalUnreadMsgs(unreadMapRef.current);
      if (mountedRef.current) {
        setCounts(prev => ({ messages: n, notifications: prev.notifications, total: n + prev.notifications }));
      }
      // Confirmation BDD après 5 s (debounced — absorbe les lectures rapides)
      scheduleFetch(supabase, userId, refs);
    };
    window.addEventListener('messages-read', handleMessagesRead);

    // ── Événement 'new-notification' ─────────────────────────────────────────
    const handleNewNotif = () => {
      scheduleFetch(supabase, userId, refs);
    };
    window.addEventListener('new-notification', handleNewNotif);

    return () => {
      mountedRef.current = false;
      if (channelRef.current)      supabase.removeChannel(channelRef.current);
      if (reconnectRef.current)    clearTimeout(reconnectRef.current);
      if (realtimePollRef.current) clearInterval(realtimePollRef.current);
      if (safePollRef.current)     clearInterval(safePollRef.current);
      if (debounceRef.current)     clearTimeout(debounceRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('messages-read',    handleMessagesRead);
      window.removeEventListener('new-notification', handleNewNotif);
      // Invalide le cache token pour le prochain utilisateur
      invalidateBearerCache();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  return counts;
}
