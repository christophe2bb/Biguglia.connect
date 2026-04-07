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
// Polling de sécurité toutes les 8s (filet de rattrapage)
const SAFE_POLL_MS = 8000;

export function useUnreadCounts(): UnreadCounts {
  const { profile } = useAuthStore();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0, total: 0 });

  const channelRef        = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const myConvIdsRef      = useRef<string[]>([]);
  const reconnectRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx      = useRef(0);
  const mountedRef        = useRef(true);
  const realtimePollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const safePollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabaseRef       = useRef<ReturnType<typeof createClient> | null>(null);
  const userIdRef         = useRef<string | null>(null);
  const fetchingRef       = useRef(false);

  // ── Recalcul complet depuis la BDD (2 requêtes seulement) ───────────────────
  const fetchCounts = useCallback(async (supabase: ReturnType<typeof createClient>, userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      // Petit délai pour laisser le temps à la BDD d'être commitée
      await new Promise(r => setTimeout(r, 150));
      // Requête 1 : toutes mes participations avec last_read_at et joined_at
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, joined_at')
        .eq('user_id', userId);

      myConvIdsRef.current = (myConvs ?? []).map(c => c.conversation_id);

      // Requête 2 : tous les messages non lus en une seule requête RPC-like
      // On récupère les messages des conversations où je participe,
      // envoyés par quelqu'un d'autre, et créés après mon last_read_at.
      // On passe les données côté client pour le filtrage par last_read_at.
      let unreadMessages = 0;
      if (myConvs && myConvs.length > 0) {
        // Trouver la date la plus ancienne de last_read_at pour limiter la requête côté serveur
        const oldestReadAt = myConvs.reduce((oldest, c) => {
          const ts = c.last_read_at ? new Date(c.last_read_at).getTime() : 0;
          return ts < oldest ? ts : oldest;
        }, Date.now());
        const oldestISO = new Date(oldestReadAt).toISOString();
        // Une seule requête : tous les messages non lus de toutes mes conversations
        // Filtre serveur: created_at > oldest_read_at (élimine l'essentiel côté serveur)
        const convIds = myConvs.map(c => c.conversation_id);
        const { data: allUnread } = await supabase
          .from('messages')
          .select('id, conversation_id, created_at, content')
          .in('conversation_id', convIds)
          .neq('sender_id', userId)
          .gt('created_at', oldestISO)
          .limit(500);

        if (allUnread) {
          // Filtrage côté client par last_read_at + exclusion messages système
          const readMap: Record<string, string> = {};
          myConvs.forEach(c => {
            // Si last_read_at est NULL, utiliser joined_at comme référence
            // (les messages avant joined_at ne peuvent pas être "non lus")
            // Si les deux sont NULL, utiliser 1970 (fallback ultime)
            const raw = c.last_read_at || c.joined_at || '1970-01-01T00:00:00Z';
            readMap[c.conversation_id] = raw;
          });
          unreadMessages = allUnread.filter(m => {
            // Comparaison robuste via timestamps
            const readAt = new Date(readMap[m.conversation_id] || '1970-01-01T00:00:00Z').getTime();
            const msgAt = new Date(m.created_at).getTime();
            if (msgAt <= readAt) return false;
            // Exclure messages système/intro automatiques
            const c = m.content || '';
            if (c.startsWith('👋') || c.startsWith('✅') || c.startsWith('🤝')) return false;
            if (c.includes('Je vous contacte') || c.includes('Échange confirmé') || c.includes('Conversation créée')) return false;
            return true;
          }).length;
        }
      }

      // Requête 3 : notifications non lues
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
    } finally {
      fetchingRef.current = false;
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
      // Nouveau message reçu → refetch (le plus fiable)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { sender_id: string; conversation_id: string };
        if (msg.sender_id === userId) return;
        if (!myConvIdsRef.current.includes(msg.conversation_id)) return;
        // +1 optimiste immédiat
        setCounts(prev => ({ messages: prev.messages + 1, notifications: prev.notifications, total: prev.total + 1 }));
        // Puis refetch pour confirmer
        setTimeout(() => fetchCounts(supabase, userId), 500);
      })
      // Nouvelle notification → +1 optimiste
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        setCounts(prev => ({ messages: prev.messages, notifications: prev.notifications + 1, total: prev.total + 1 }));
      })
      // Notification mise à jour (lue) → recalcul forcé
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

    if (!profile?.id) {
      setCounts({ messages: 0, notifications: 0, total: 0 });
      return;
    }

    const supabase = createClient();
    const userId = profile.id;
    supabaseRef.current = supabase;
    userIdRef.current = userId;

    // Fetch initial
    fetchCounts(supabase, userId);
    connectRealtime(supabase, userId);

    // ── Polling de sécurité (filet si realtime KO ou lag BDD) ────────────────
    safePollRef.current = setInterval(() => {
      if (mountedRef.current) fetchCounts(supabase, userId);
    }, SAFE_POLL_MS);

    // Retour sur l'onglet navigateur
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCounts(supabase, userId);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── 'messages-read' : une conversation vient d'être lue ─────────────────
    // On re-fetch immédiatement depuis la BDD.
    // markAsRead() fait d'abord le UPDATE last_read_at (await), PUIS dispatch.
    // Donc quand on arrive ici, last_read_at est déjà écrit en BDD.
    const handleMessagesRead = () => {
      // Forcer le recalcul : annuler tout debounce en cours
      fetchingRef.current = false;
      // Double fetch: immédiat + après 800ms pour s'assurer que la BDD est à jour
      fetchCounts(supabase, userId);
      setTimeout(() => {
        if (mountedRef.current) {
          fetchingRef.current = false;
          fetchCounts(supabase, userId);
        }
      }, 800);
    };
    window.addEventListener('messages-read', handleMessagesRead);

    // ── 'new-notification' : une notification a changé d'état ────────────────
    // L'UPDATE is_read est déjà fait en BDD avant le dispatch → fetchCounts
    // lira la valeur correcte. On annule fetchingRef pour forcer le refetch.
    const handleNewNotif = () => {
      fetchingRef.current = false;
      fetchCounts(supabase, userId);
      setTimeout(() => {
        if (mountedRef.current) {
          fetchingRef.current = false;
          fetchCounts(supabase, userId);
        }
      }, 500);
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
