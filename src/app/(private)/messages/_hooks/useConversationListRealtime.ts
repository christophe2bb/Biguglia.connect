'use client';
/**
 * useConversationListRealtime
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité unique : abonnement Realtime Supabase sur la table messages
 * pour la liste de conversations.
 *
 * Gère :
 *  - Canal postgres_changes INSERT
 *  - Mise à jour optimiste de la liste (tri + badge non-lu)
 *  - Rejet des événements rejoués (antérieurs au montage)
 *  - Reconnexion exponentielle via RECONNECT_DELAYS
 *
 * Fix BIGUGLIA-CONNECT-NEXTJS-6 v2 (AbortController) :
 *  - Chaque appel à connect() crée un AbortController local.
 *  - cleanup() avorte le signal → si le canal n'est pas encore souscrit,
 *    le callback subscribe() retire le canal orphelin sans lever d'erreur.
 *  - Élimine la race React Strict Mode qui causait
 *    « cannot add postgres_changes listener after subscribe() ».
 */

import { useRef, useCallback, MutableRefObject } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ConvWithOther } from '../_types';
import { RECONNECT_DELAYS } from '../_config';
import { isSystemMsg } from '../_utils';

// ─── Types internes ───────────────────────────────────────────────────────────
type RealtimeMsg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ConversationListRealtimeResult {
  /** Lance l'abonnement Supabase. Appelé par l'orchestrateur dans useEffect. */
  connect: () => void;
  /** Nettoie le canal et les timers. Appelé au démontage. */
  cleanup: () => void;
}

export function useConversationListRealtime(
  profileId: string | null,
  supabase: ReturnType<typeof createClient>,
  mountedRef: MutableRefObject<boolean>,
  conversationsRef: MutableRefObject<ConvWithOther[]>,
  setConversations: React.Dispatch<React.SetStateAction<ConvWithOther[]>>,
  fetchConversations: () => Promise<void>,
): ConversationListRealtimeResult {
  const channelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx    = useRef(0);
  // Timestamp de montage — rejette les événements realtime rejoués (antérieurs)
  const pageStartRef    = useRef<number>(Date.now());
  // AbortController courant — annule la souscription en cours si cleanup() est
  // appelé avant que le statut SUBSCRIBED ne soit reçu (React Strict Mode).
  const abortRef        = useRef<AbortController | null>(null);

  // ── Handler message INSERT ─────────────────────────────────────────────────
  const handleInsert = useCallback((msg: RealtimeMsg) => {
    if (!mountedRef.current) return;

    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === msg.conversation_id);
      if (idx === -1) { void fetchConversations(); return prev; }

      const updated = [...prev];
      const conv    = { ...updated[idx] };
      conv.last_message_text = msg.content;
      conv.last_message_at   = msg.created_at;

      const msgAt    = new Date(msg.created_at).getTime();
      const replayed = msgAt < pageStartRef.current;
      const isSys    = isSystemMsg(msg.content);
      const isOther  = msg.sender_id !== profileId;
      const willCount = isOther && !isSys && !replayed;

      if (replayed) return prev;
      if (willCount) conv.unread_count = (conv.unread_count || 0) + 1;
      updated.splice(idx, 1);
      updated.unshift(conv);
      conversationsRef.current = updated;
      return updated;
    });
  }, [profileId, mountedRef, conversationsRef, setConversations, fetchConversations]);

  // ── Connexion Realtime ─────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!profileId) return;

    // Créer un nouveau AbortController pour cette invocation.
    // Si un AbortController précédent existe encore (connect() rappelé rapidement),
    // on l'avorte d'abord pour que son canal orphelin se retire lui-même.
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const abortController = new AbortController();
    abortRef.current = abortController;
    const { signal } = abortController;

    // Si le signal est déjà déclenché (double abort synchrone improbable), sortir.
    if (signal.aborted) return;

    // Nettoyage du canal précédent (null immédiatement pour éviter double-remove)
    if (channelRef.current) {
      const old = channelRef.current;
      channelRef.current = null;
      supabase.removeChannel(old).catch(() => null);
    }

    // Réinitialiser pageStart à chaque (re)connexion
    pageStartRef.current = Date.now();

    const channel = supabase
      .channel(`messages-list-${profileId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: import('@supabase/realtime-js').RealtimePostgresChangesPayload<Record<string, unknown>>) => handleInsert(payload.new as RealtimeMsg),
      )
      .subscribe((status: string) => {
        // Si le signal a été déclenché (cleanup avant SUBSCRIBED), retirer le
        // canal orphelin et ne rien faire d'autre.
        if (signal.aborted) {
          supabase.removeChannel(channel).catch(() => null);
          return;
        }
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          reconnectIdx.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          reconnectIdx.current = Math.min(reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => { if (mountedRef.current) connect(); }, delay);
        }
      });

    channelRef.current = channel;
  }, [profileId, supabase, mountedRef, handleInsert]);

  // ── Nettoyage ─────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    // Avorter le signal courant → si le canal est encore en souscription,
    // son callback subscribe() retirera le canal lui-même.
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Retirer le canal actif si la souscription était déjà établie
    if (channelRef.current) {
      const ch = channelRef.current;
      channelRef.current = null;
      supabase.removeChannel(ch).catch(() => null);
    }
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
  }, [supabase]);

  return { connect, cleanup };
}
