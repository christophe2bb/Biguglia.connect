// ─── unreadRealtime — canal Supabase + reconnexion exponentielle ──────────────
//
// Souscrit aux INSERT sur `messages` et `notifications` pour incrémenter le
// compteur instantanément sans refaire de SELECT lourd.
// En cas d'erreur de canal, une reconnexion exponentielle est tentée, et un
// polling de secours (10 s) est activé en attendant.

import { createClient } from '@/lib/supabase/client';
import { isSystem, totalUnreadMsgs } from './unreadHelpers';
import { fetchCounts, type UnreadRefs } from './unreadFetch';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

type SetCounts = (
  updater: { messages: number; notifications: number; total: number } |
           ((prev: { messages: number; notifications: number; total: number }) =>
             { messages: number; notifications: number; total: number }),
) => void;

export type RealtimeRefs = UnreadRefs & {
  channelRef:      React.MutableRefObject<ReturnType<ReturnType<typeof createClient>['channel']> | null>;
  reconnectRef:    React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  reconnectIdx:    React.MutableRefObject<number>;
  realtimePollRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  hookStartRef:    React.MutableRefObject<number>;
};

/**
 * Crée (ou recrée) le canal Supabase Realtime.
 * - INSERT messages  → incrément local immédiat (sans DB round-trip)
 * - INSERT notifications → incrément notifications
 * - UPDATE notifications → refetch complet
 * - CHANNEL_ERROR / TIMED_OUT / CLOSED → reconnexion exponentielle + polling fallback
 */
export function connectRealtime(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refs: RealtimeRefs,
  setCounts: SetCounts,
): void {
  // Nettoyage du canal précédent
  if (refs.channelRef.current) {
    supabase.removeChannel(refs.channelRef.current);
    refs.channelRef.current = null;
  }

  const channel = supabase
    .channel(`unread-counts-${userId}-${Date.now()}`)

    // ── Nouveau message ──────────────────────────────────────────────────────
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new as {
        id: string; sender_id: string; conversation_id: string;
        content: string; created_at: string;
      };
      if (msg.sender_id === userId) return;

      const msgAt       = new Date(msg.created_at).getTime();
      const readAt      = refs.readMapRef.current[msg.conversation_id] ?? 0;
      const convKnown   = msg.conversation_id in refs.readMapRef.current;
      const replayed    = msgAt < refs.hookStartRef.current;
      const alreadyRead = msgAt <= readAt;

      if (!convKnown || isSystem(msg.content || '') || replayed || alreadyRead) return;

      if (!refs.unreadMapRef.current[msg.conversation_id]) {
        refs.unreadMapRef.current[msg.conversation_id] = new Set();
      }
      refs.unreadMapRef.current[msg.conversation_id].add(msg.id);

      const n = totalUnreadMsgs(refs.unreadMapRef.current);
      if (refs.mountedRef.current) {
        setCounts(prev => ({ messages: n, notifications: prev.notifications, total: n + prev.notifications }));
      }
    })

    // ── Nouvelle notification ────────────────────────────────────────────────
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, () => {
      setCounts(prev => ({ ...prev, notifications: prev.notifications + 1, total: prev.total + 1 }));
    })

    // ── Notification mise à jour (ex. lu) → refetch ──────────────────────────
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, () => {
      refs.fetchingRef.current = false;
      fetchCounts(supabase, userId, refs, setCounts as Parameters<typeof fetchCounts>[3]);
    })

    // ── Statut du canal ──────────────────────────────────────────────────────
    .subscribe(status => {
      if (!refs.mountedRef.current) return;

      if (status === 'SUBSCRIBED') {
        refs.reconnectIdx.current = 0;
        if (refs.realtimePollRef.current) {
          clearInterval(refs.realtimePollRef.current);
          refs.realtimePollRef.current = null;
        }
        fetchCounts(supabase, userId, refs, setCounts as Parameters<typeof fetchCounts>[3]);

      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // Reconnexion exponentielle
        const delay = RECONNECT_DELAYS[Math.min(refs.reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
        refs.reconnectIdx.current = Math.min(refs.reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
        if (refs.reconnectRef.current) clearTimeout(refs.reconnectRef.current);
        refs.reconnectRef.current = setTimeout(() => {
          if (refs.mountedRef.current) connectRealtime(supabase, userId, refs, setCounts);
        }, delay);
        // Polling de secours pendant la reconnexion
        if (!refs.realtimePollRef.current) {
          refs.realtimePollRef.current = setInterval(() => {
            if (refs.mountedRef.current) {
              fetchCounts(supabase, userId, refs, setCounts as Parameters<typeof fetchCounts>[3]);
            }
          }, 10000);
        }
      }
    });

  refs.channelRef.current = channel;
}
