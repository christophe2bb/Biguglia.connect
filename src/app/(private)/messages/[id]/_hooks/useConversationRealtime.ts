'use client';
/**
 * useConversationRealtime
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité unique : maintenir la connexion Realtime Supabase et le
 * polling de secours.
 *
 *   • S'abonne aux INSERT sur messages pour la conversation courante
 *   • Bascule automatiquement sur un polling HTTP si le canal est en erreur
 *   • Gère la reconnexion exponentielle (RECONNECT_DELAYS)
 *   • Retourne realtimeOk + connect/cleanup pour l'orchestrateur
 */

import { useState, useRef, useCallback, MutableRefObject } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { MessageWithSender, ConversationApiResponse } from '../_types';
import { RECONNECT_DELAYS, FALLBACK_POLL_INTERVAL, POLL_INIT_DELAY } from '../_config';
import { getToken } from './useConversationData';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ConversationRealtimeResult {
  realtimeOk: boolean;
  /** Lance le canal Supabase + polling. À appeler depuis l'orchestrateur. */
  connect: () => void;
  /** Nettoie le canal et les timers. À appeler au démontage. */
  cleanup: () => void;
}

export function useConversationRealtime(
  conversationId: string,
  supabase: ReturnType<typeof createClient>,
  profile: { id: string } | null,
  mountedRef: MutableRefObject<boolean>,
  profileCacheRef: MutableRefObject<Record<string, Profile>>,
  lastMsgIdRef: MutableRefObject<string | null>,
  setMessages: React.Dispatch<React.SetStateAction<MessageWithSender[]>>,
  markAsRead: () => void,
  scrollToBottom: (behavior?: ScrollBehavior) => void,
): ConversationRealtimeResult {
  const [realtimeOk, setRealtimeOk] = useState(false);

  const channelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdxRef = useRef(0);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Timer d'initialisation : attend POLL_INIT_DELAY avant de démarrer le polling initial. */
  const pollInitRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lookup profil avec cache ───────────────────────────────────────────────
  const getSenderProfile = useCallback(async (senderId: string): Promise<Profile | undefined> => {
    if (profileCacheRef.current[senderId]) return profileCacheRef.current[senderId];
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', senderId)
      .single();
    if (data) {
      profileCacheRef.current[senderId] = data as Profile;
      return data as Profile;
    }
  }, [supabase, profileCacheRef]);

  // ── Back-off 429 pour le polling de secours ──────────────────────────────
  const pollRateLimitUntilRef  = useRef<number>(0);
  const pollRateLimitCountRef  = useRef<number>(0);
  const POLL_RATE_LIMIT_DELAYS = [5_000, 10_000, 20_000, 40_000, 60_000] as const;

  // ── Polling de secours ────────────────────────────────────────────────────
  const pollNewMessages = useCallback(async () => {
    if (!mountedRef.current || !profile) return;

    // Vérification du back-off 429
    if (pollRateLimitUntilRef.current > Date.now()) return;

    try {
      const token = await getToken(supabase);
      if (!token) return;

      const res = await fetch(`/api/messages/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      if (!res) return;

      // Gestion 429 — back-off exponentiel
      if (res.status === 429) {
        const serverDelay = parseInt(res.headers.get('Retry-After') ?? '0', 10) * 1_000;
        const expDelay    = POLL_RATE_LIMIT_DELAYS[Math.min(pollRateLimitCountRef.current, POLL_RATE_LIMIT_DELAYS.length - 1)];
        const delay       = Math.max(serverDelay, expDelay);
        pollRateLimitUntilRef.current = Date.now() + delay;
        pollRateLimitCountRef.current = Math.min(pollRateLimitCountRef.current + 1, POLL_RATE_LIMIT_DELAYS.length - 1);
        console.warn(`[useConversationRealtime] 429 — poll suspendu ${delay / 1000}s`);
        return;
      }

      if (!res.ok) return;

      // Succès — réinitialiser le back-off
      pollRateLimitUntilRef.current = 0;
      pollRateLimitCountRef.current = 0;

      const data = await res.json().catch(() => null) as ConversationApiResponse | null;
      if (!data?.messages) return;

      if (data.profiles) {
        data.profiles.forEach(p => { profileCacheRef.current[p.id] = p as unknown as Profile; });
      }

      const enriched = data.messages.map(msg => ({
        ...msg,
        sender: msg.sender_id ? profileCacheRef.current[msg.sender_id] : undefined,
      }));

      if (!mountedRef.current) return;
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const toAdd = enriched.filter(m => !existingIds.has(m.id));
        if (toAdd.length === 0) return prev;
        const updated = [...prev, ...toAdd];
        lastMsgIdRef.current = updated[updated.length - 1].id;
        return updated;
      });
      if (enriched.some(m => m.sender_id !== profile.id)) { markAsRead(); scrollToBottom(); }
    } catch (err) {
      console.warn('[useConversationRealtime] poll error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, profile, supabase, profileCacheRef, lastMsgIdRef, setMessages, markAsRead, scrollToBottom]);

  // ── Connexion Realtime ────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!profile || !conversationId) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    // Polling de secours — démarré après POLL_INIT_DELAY pour laisser le temps
    // au canal Realtime de s'établir sans effectuer une requête inutile.
    if (!pollRef.current && !pollInitRef.current) {
      pollInitRef.current = setTimeout(() => {
        pollInitRef.current = null;
        // Vérifier que le realtime n'est pas déjà établi
        if (!pollRef.current && mountedRef.current) {
          pollRef.current = setInterval(pollNewMessages, FALLBACK_POLL_INTERVAL);
        }
      }, POLL_INIT_DELAY);
    }

    const channel = supabase
      .channel(`conv-${conversationId}-${Date.now()}`, { config: { broadcast: { ack: false } } })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload: import('@supabase/realtime-js').RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (!mountedRef.current) return;
        const newMsg = payload.new as MessageWithSender;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          const updated = [...prev, newMsg];
          lastMsgIdRef.current = newMsg.id;
          return updated;
        });
        if (newMsg.sender_id) {
          getSenderProfile(newMsg.sender_id).then(sender =>
            setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, sender } : m))
          );
        }
        if (newMsg.sender_id !== profile.id) await markAsRead();
        scrollToBottom();
      })
      .subscribe((status: string) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          setRealtimeOk(true);
          reconnectIdxRef.current = 0;
          // Realtime opérationnel — annuler le polling (init timer + intervalle)
          if (pollInitRef.current) { clearTimeout(pollInitRef.current); pollInitRef.current = null; }
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeOk(false);
          if (!pollRef.current) pollRef.current = setInterval(pollNewMessages, FALLBACK_POLL_INTERVAL);
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdxRef.current, RECONNECT_DELAYS.length - 1)];
          if (reconnectIdxRef.current < RECONNECT_DELAYS.length - 1) {
            reconnectIdxRef.current++;
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            reconnectRef.current = setTimeout(() => {
              if (mountedRef.current) connect();
            }, delay);
          }
        }
      });

    channelRef.current = channel;
  }, [conversationId, profile, supabase, mountedRef, getSenderProfile, markAsRead, scrollToBottom, pollNewMessages, setMessages, lastMsgIdRef]);

  // ── Nettoyage ─────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (pollInitRef.current) clearTimeout(pollInitRef.current);
  }, [supabase]);

  return { realtimeOk, connect, cleanup };
}
