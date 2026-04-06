'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';

interface UnreadCounts {
  messages: number;
  notifications: number;
  total: number;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

export function useUnreadCounts(): UnreadCounts {
  const { profile } = useAuthStore();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0, total: 0 });

  const channelRef      = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const myConvIdsRef    = useRef<string[]>([]);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx    = useRef(0);
  const mountedRef      = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Recalcul complet depuis la BDD — TOUJOURS appelé, jamais bloqué ─────────
  const fetchCounts = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string) => {
    try {
      // 1. Mes participations avec last_read_at
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId);

      myConvIdsRef.current = (myConvs ?? []).map(c => c.conversation_id);

      // 2. Compter messages non lus conversation par conversation
      let unreadMessages = 0;
      if (myConvs && myConvs.length > 0) {
        const results = await Promise.all(
          myConvs.map(async (conv) => {
            const since = conv.last_read_at || '1970-01-01T00:00:00Z';
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.conversation_id)
              .neq('sender_id', userId)
              .gt('created_at', since);
            return count || 0;
          })
        );
        unreadMessages = results.reduce((a, b) => a + b, 0);
      }

      // 3. Notifications non lues
      const { count: unreadNotifs } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (mountedRef.current) {
        setCounts({
          messages: unreadMessages,
          notifications: unreadNotifs || 0,
          total: unreadMessages + (unreadNotifs || 0),
        });
      }
    } catch (err) {
      console.warn('[useUnreadCounts] fetchCounts error:', err);
    }
  }, []);

  // ── Connexion Realtime ───────────────────────────────────────────────────────
  const connectRealtime = useCallback((supabase: ReturnType<typeof createClient>, userId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`unread-counts-${userId}-${Date.now()}`)
      // Nouveau message reçu → +1 optimiste
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { sender_id: string; conversation_id: string };
        if (msg.sender_id === userId) return;
        if (!myConvIdsRef.current.includes(msg.conversation_id)) return;
        setCounts(prev => ({ messages: prev.messages + 1, notifications: prev.notifications, total: prev.total + 1 }));
      })
      // Nouvelle notification → +1 optimiste
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        setCounts(prev => ({ messages: prev.messages, notifications: prev.notifications + 1, total: prev.total + 1 }));
      })
      // Notification mise à jour (lue) → recalcul
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        fetchCounts(supabase, userId);
      })
      // conversation_participants mis à jour (last_read_at changé) → recalcul
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, () => {
        fetchCounts(supabase, userId);
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          reconnectIdx.current = 0;
          if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
          fetchCounts(supabase, userId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          reconnectIdx.current = Math.min(reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => { if (mountedRef.current) connectRealtime(supabase, userId); }, delay);
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(() => { if (mountedRef.current) fetchCounts(supabase, userId); }, 10000);
          }
        }
      });

    channelRef.current = channel;
  }, [fetchCounts]);

  useEffect(() => {
    mountedRef.current = true;

    if (!profile?.id) {
      setCounts({ messages: 0, notifications: 0, total: 0 });
      return;
    }

    const supabase = createClient();
    const userId = profile.id;

    // Fetch initial
    fetchCounts(supabase, userId);
    connectRealtime(supabase, userId);

    // Retour sur l'onglet navigateur
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCounts(supabase, userId);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── 'messages-read' : une conversation vient d'être lue ──────────────────
    // markAsRead() dans messages/[id] a déjà fait le UPDATE last_read_at en BDD
    // → on recalcule immédiatement
    const handleMessagesRead = () => fetchCounts(supabase, userId);
    window.addEventListener('messages-read', handleMessagesRead);

    // ── 'new-notification' : une notification a changé d'état ────────────────
    const handleNewNotif = () => fetchCounts(supabase, userId);
    window.addEventListener('new-notification', handleNewNotif);

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('messages-read', handleMessagesRead);
      window.removeEventListener('new-notification', handleNewNotif);
    };
  }, [profile?.id, fetchCounts, connectRealtime]);

  return counts;
}
