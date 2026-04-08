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
  // Timestamp du montage du hook — ignore tout event realtime antérieur (événements rejoués)
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

  // ── Recalcul complet depuis la BDD ──────────────────────────────────────────
  const fetchCounts = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    // Sécurité : si fetchCounts ne se termine pas en 15s, débloquer le verrou
    const lockTimeout = setTimeout(() => { fetchingRef.current = false; }, 15000);
    try {
      // 1. Participations
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, joined_at')
        .eq('user_id', userId);

      if (!myConvs || myConvs.length === 0) {
        readMapRef.current = {};
        unreadMapRef.current = {};
        if (mountedRef.current) setCounts({ messages: 0, notifications: 0, total: 0 });
        return;
      }

      // Mettre à jour readMap
      myConvs.forEach(c => {
        const ref = c.last_read_at || c.joined_at || '1970-01-01T00:00:00Z';
        readMapRef.current[c.conversation_id] = new Date(ref).getTime();
      });

      // 2. Messages non lus
      const convIds = myConvs.map(c => c.conversation_id);
      const oldestTs = Math.min(...myConvs.map(c => {
        const ref = c.last_read_at || c.joined_at;
        return ref ? new Date(ref).getTime() : 0;
      }));
      const oldestISO = new Date(Math.max(oldestTs, 0)).toISOString();

      const { data: candidateMsgs } = await supabase
        .from('messages')
        .select('id, conversation_id, created_at, content')
        .in('conversation_id', convIds)
        .neq('sender_id', userId)
        .gt('created_at', oldestISO)
        .limit(500);

      // Reconstruire unreadMap
      const newUnreadMap: Record<string, Set<string>> = {};
      convIds.forEach(cid => { newUnreadMap[cid] = new Set(); });

      if (candidateMsgs) {
        for (const m of candidateMsgs) {
          const readAt = readMapRef.current[m.conversation_id] ?? 0;
          const msgAt  = new Date(m.created_at).getTime();
          const sys    = isSystem(m.content || '');
          const counted = msgAt > readAt && !sys;
          // ── DIAGNOSTIC badge ──────────────────────────────────────────────
          console.debug(
            `[badge:fetchCounts] conv=${m.conversation_id.slice(0,8)} ` +
            `msgId=${m.id.slice(0,8)} created_at=${m.created_at} ` +
            `readAt=${new Date(readAt).toISOString()} ` +
            `isSystem=${sys} counted=${counted}`
          );
          if (counted) {
            if (!newUnreadMap[m.conversation_id]) newUnreadMap[m.conversation_id] = new Set();
            newUnreadMap[m.conversation_id].add(m.id);
          }
        }
      }
      unreadMapRef.current = newUnreadMap;

      // 3. Notifications
      const { count: unreadNotifs } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      const msgCount = totalUnreadMsgs();
      // ── DIAGNOSTIC badge ──────────────────────────────────────────────────
      console.info(`[badge:fetchCounts] RÉSULTAT messages=${msgCount} notifs=${unreadNotifs || 0} total=${msgCount + (unreadNotifs || 0)}`);
      if (mountedRef.current) {
        setCounts({
          messages: msgCount,
          notifications: unreadNotifs || 0,
          total: msgCount + (unreadNotifs || 0),
        });
      }
    } catch (err) {
      console.warn('[useUnreadCounts] fetchCounts error:', err);
    } finally {
      clearTimeout(lockTimeout);
      fetchingRef.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connexion Realtime ───────────────────────────────────────────────────────
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
        // ── DIAGNOSTIC badge ──────────────────────────────────────────────
        const _rtConvKnown = msg.conversation_id in readMapRef.current;
        const _rtSys       = isSystem(msg.content || '');
        const _rtMsgAt     = new Date(msg.created_at).getTime();
        const _rtReplayed  = _rtMsgAt < hookStartRef.current;
        const _rtReadAt    = readMapRef.current[msg.conversation_id] ?? 0;
        const _rtAlreadyRead = _rtMsgAt <= _rtReadAt;
        console.info(
          `[badge:realtime:useUnread] conv=${msg.conversation_id.slice(0,8)} ` +
          `msgId=${msg.id.slice(0,8)} created_at=${msg.created_at} ` +
          `convKnown=${_rtConvKnown} isSystem=${_rtSys} ` +
          `replayed=${_rtReplayed}(hookStart=${new Date(hookStartRef.current).toISOString()}) ` +
          `alreadyRead=${_rtAlreadyRead}(readAt=${new Date(_rtReadAt).toISOString()}) ` +
          `→ COMPTÉ=${!_rtSys && !_rtReplayed && !_rtAlreadyRead && _rtConvKnown}`
        );
        // Vérifier que c'est une de nos conversations
        if (!_rtConvKnown) return;
        if (_rtSys) return;
        // Ignorer les événements rejoués (antérieurs au montage du hook)
        if (_rtReplayed) return;
        const msgAt  = _rtMsgAt;
        const readAt = _rtReadAt;
        if (_rtAlreadyRead) return; // message déjà lu (readAt mis à jour par markAsRead)

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
    // Reçoit { conversationId, readAt } depuis markAsRead().
    // 1. Met à jour le badge localement (instantané, sans BDD)
    // 2. Persiste last_read_at en BDD via CE hook (instance supabase authentifiée)
    const handleMessagesRead = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId?: string; readAt?: number }>).detail;
      const convId = detail?.conversationId;
      const readAt = detail?.readAt ?? Date.now();
      // ── DIAGNOSTIC badge ──────────────────────────────────────────────────
      console.info(
        `[badge:messages-read:useUnread] convId=${convId?.slice(0,8) ?? 'undefined'} ` +
        `readAt=${new Date(readAt).toISOString()} ` +
        `unreadAvant=${unreadMapRef.current[convId ?? '']?.size ?? 0}`
      );

      if (convId) {
        // 1. Mise à jour locale immédiate du readMap
        readMapRef.current[convId] = readAt;
        // 2. Vider le unreadMap de cette conv → badge tombe à 0 immédiatement
        unreadMapRef.current[convId] = new Set();

        // 3. Persister en BDD depuis ce hook (qui a une session supabase fiable)
        supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date(readAt).toISOString() })
          .eq('conversation_id', convId)
          .eq('user_id', userId)
          .then(({ error }) => {
            if (error) {
              console.warn('[useUnreadCounts] mark_read UPDATE failed:', error);
            }
          });
      }

      // Recalcul du badge sans requête BDD
      const msgCount = totalUnreadMsgs();
      if (mountedRef.current) {
        setCounts(prev => ({ messages: msgCount, notifications: prev.notifications, total: msgCount + prev.notifications }));
      }

      // Confirmation BDD après 3s pour détecter toute désynchronisation
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
