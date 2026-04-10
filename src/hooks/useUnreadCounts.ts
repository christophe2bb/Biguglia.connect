'use client';

/**
 * useUnreadCounts — Badge de messages non lus + notifications.
 *
 * Utilise l'API /api/messages/unread (admin client) pour contourner la
 * récursion infinie dans les politiques RLS de conversation_participants
 * et messages.
 *
 * Le realtime Supabase fonctionne toujours (simple compteur, pas de SELECT).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';

interface UnreadCounts {
  messages: number;
  notifications: number;
  total: number;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];
const SAFE_POLL_MS = 30000;

export function useUnreadCounts(): UnreadCounts {
  const { profile } = useAuthStore();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0, total: 0 });

  const channelRef       = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx     = useRef(0);
  const mountedRef       = useRef(true);
  const realtimePollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const safePollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchingRef      = useRef(false);
  const hookStartRef     = useRef<number>(Date.now());

  // readMap  : conv_id → last_read_at timestamp (ms)
  const readMapRef       = useRef<Record<string, number>>({});
  // unreadMap: conv_id → Set<msg_id> non lus dans cette conv
  const unreadMapRef     = useRef<Record<string, Set<string>>>({});

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isSystem = (c: string) => {
    const lower = c.toLowerCase();
    return c.startsWith('👋') || c.startsWith('✅') || c.startsWith('🤝') ||
      lower.includes('je vous contacte') || lower.includes('échange confirmé') ||
      lower.includes('echange confirme') || lower.includes('conversation créée') ||
      lower.includes('conversation creee') || lower.includes('via biguglia connect');
  };

  const totalUnreadMsgs = () =>
    Object.values(unreadMapRef.current).reduce((s, set) => s + set.size, 0);

  // ── Recalcul complet depuis l'API (admin client bypass RLS) ─────────────────
  const fetchCounts = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const lockTimeout = setTimeout(() => { fetchingRef.current = false; }, 15000);
    try {
      // Calculer le ISO le plus ancien dans readMap pour filtrer les messages
      const convIds2 = Object.keys(readMapRef.current);
      const oldestTs = convIds2.length > 0
        ? Math.min(...convIds2.map(cid => readMapRef.current[cid]))
        : 0;
      const oldestISO = new Date(Math.max(oldestTs, 0)).toISOString();

      // Récupérer le token pour l'auth Bearer
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Appel API unique (admin client côté serveur)
      const res = await fetch(`/api/messages/unread?since=${encodeURIComponent(oldestISO)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }).catch(() => null);

      if (!res || !res.ok) {
        // Si non-authent, on remet les compteurs à 0 sans crasher
        if (res?.status === 401) {
          if (mountedRef.current) setCounts({ messages: 0, notifications: 0, total: 0 });
        }
        return;
      }

      const data = await res.json().catch(() => null);
      if (!data) return;

      const { participations = [], messages: candidateMsgs = [], notifications: unreadNotifs = 0 } = data as {
        participations: Array<{ conversation_id: string; last_read_at: string | null; joined_at: string | null }>;
        messages: Array<{ id: string; conversation_id: string; created_at: string; content: string; sender_id: string }>;
        notifications: number;
      };

      // Mettre à jour readMap depuis la BDD
      participations.forEach(c => {
        const ref = c.last_read_at || c.joined_at || '1970-01-01T00:00:00Z';
        const tsFromDB = new Date(ref).getTime();
        const tsInMem  = readMapRef.current[c.conversation_id] ?? 0;
        readMapRef.current[c.conversation_id] = Math.max(tsFromDB, tsInMem);
      });

      const convIds = participations.map(c => c.conversation_id);

      // Reconstruire unreadMap
      const newUnreadMap: Record<string, Set<string>> = {};
      convIds.forEach(cid => { newUnreadMap[cid] = new Set(); });

      for (const m of candidateMsgs) {
        const readAt = readMapRef.current[m.conversation_id] ?? 0;
        const msgAt  = new Date(m.created_at).getTime();
        const sys    = isSystem(m.content || '');
        if (msgAt > readAt && !sys) {
          if (!newUnreadMap[m.conversation_id]) newUnreadMap[m.conversation_id] = new Set();
          newUnreadMap[m.conversation_id].add(m.id);
        }
      }
      unreadMapRef.current = newUnreadMap;

      const msgCount = totalUnreadMsgs();
      if (mountedRef.current) {
        setCounts({ messages: msgCount, notifications: unreadNotifs, total: msgCount + unreadNotifs });
      }
    } catch (err) {
      console.warn('[useUnreadCounts] fetchCounts error:', err);
    } finally {
      clearTimeout(lockTimeout);
      fetchingRef.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connexion Realtime ───────────────────────────────────────────────────────
  // Le realtime est utilisé seulement pour incrémenter le compteur en temps réel.
  // Le SELECT lourd est fait via l'API admin, pas via le client browser.
  const connectRealtime = useCallback((supabase: ReturnType<typeof createClient>, userId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`unread-counts-${userId}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { id: string; sender_id: string; conversation_id: string; content: string; created_at: string };
        if (msg.sender_id === userId) return;
        const _rtConvKnown = msg.conversation_id in readMapRef.current;
        const _rtSys       = isSystem(msg.content || '');
        const _rtMsgAt     = new Date(msg.created_at).getTime();
        const _rtReplayed  = _rtMsgAt < hookStartRef.current;
        const _rtReadAt    = readMapRef.current[msg.conversation_id] ?? 0;
        const _rtAlreadyRead = _rtMsgAt <= _rtReadAt;

        if (!_rtConvKnown) return;
        if (_rtSys) return;
        if (_rtReplayed) return;
        if (_rtAlreadyRead) return;

        if (!unreadMapRef.current[msg.conversation_id]) {
          unreadMapRef.current[msg.conversation_id] = new Set();
        }
        unreadMapRef.current[msg.conversation_id].add(msg.id);
        const n = totalUnreadMsgs();
        if (mountedRef.current) {
          setCounts(prev => ({ messages: n, notifications: prev.notifications, total: n + prev.notifications }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        setCounts(prev => ({ messages: prev.messages, notifications: prev.notifications + 1, total: prev.total + 1 }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        fetchingRef.current = false;
        fetchCounts(supabase, userId);
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          reconnectIdx.current = 0;
          if (realtimePollRef.current) { clearInterval(realtimePollRef.current); realtimePollRef.current = null; }
          fetchCounts(supabase, userId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          reconnectIdx.current = Math.min(reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => { if (mountedRef.current) connectRealtime(supabase, userId); }, delay);
          if (!realtimePollRef.current) {
            realtimePollRef.current = setInterval(() => { if (mountedRef.current) fetchCounts(supabase, userId); }, 10000);
          }
        }
      });

    channelRef.current = channel;
  }, [fetchCounts]);

  useEffect(() => {
    mountedRef.current = true;
    fetchingRef.current = false;
    hookStartRef.current = Date.now();
    readMapRef.current = {};
    unreadMapRef.current = {};

    if (!profile?.id) {
      setCounts({ messages: 0, notifications: 0, total: 0 });
      return;
    }

    const supabase = createClient();
    const userId = profile.id;

    fetchCounts(supabase, userId);
    connectRealtime(supabase, userId);

    safePollRef.current = setInterval(() => {
      if (mountedRef.current) {
        fetchingRef.current = false;
        fetchCounts(supabase, userId);
      }
    }, SAFE_POLL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchingRef.current = false;
        fetchCounts(supabase, userId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── 'messages-read' ──────────────────────────────────────────────────────
    // Reçoit { conversationId, readAt } depuis markAsRead() dans [id]/page.tsx.
    // 1. Met à jour le badge localement (instantané)
    // 2. Persiste last_read_at en BDD via l'API admin
    const handleMessagesRead = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId?: string; readAt?: number }>).detail;
      const convId = detail?.conversationId;
      const readAt = detail?.readAt ?? Date.now();

      if (convId) {
        const currentReadAt = readMapRef.current[convId] ?? 0;
        const effectiveReadAt = Math.max(readAt, currentReadAt);
        readMapRef.current[convId] = effectiveReadAt;
        unreadMapRef.current[convId] = new Set();

        // Persister via l'API admin (contourne RLS)
        const newISO = new Date(effectiveReadAt).toISOString();
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token;
          fetch('/api/messages/unread', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ conversationId: convId, lastReadAt: newISO }),
          }).catch(() => null);
        });
      }

      const msgCount = totalUnreadMsgs();
      if (mountedRef.current) {
        setCounts(prev => ({ messages: msgCount, notifications: prev.notifications, total: msgCount + prev.notifications }));
      }

      // Confirmation BDD après 3s
      setTimeout(() => {
        if (mountedRef.current) {
          fetchingRef.current = false;
          fetchCounts(supabase, userId);
        }
      }, 3000);
    };
    window.addEventListener('messages-read', handleMessagesRead);

    const handleNewNotif = () => {
      fetchingRef.current = false;
      fetchCounts(supabase, userId);
    };
    window.addEventListener('new-notification', handleNewNotif);

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (realtimePollRef.current) clearInterval(realtimePollRef.current);
      if (safePollRef.current) clearInterval(safePollRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('messages-read', handleMessagesRead);
      window.removeEventListener('new-notification', handleNewNotif);
    };
  }, [profile?.id, fetchCounts, connectRealtime]);

  return counts;
}
