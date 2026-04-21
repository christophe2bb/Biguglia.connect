'use client';
/**
 * useConversationPage — Orchestrateur
 * ─────────────────────────────────────────────────────────────────────────────
 * Compose les trois sous-hooks spécialisés et expose le contrat public
 * consommé par la page et ses composants.
 *
 *   useConversationData      → chargement initial + state données
 *   useConversationRealtime  → canal Supabase + polling de secours
 *   useConversationActions   → sendMessage, deleteMessage, toggle*
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { useConversationData } from './useConversationData';
import { useConversationRealtime } from './useConversationRealtime';
import { useConversationActions } from './useConversationActions';

export function useConversationPage(conversationId: string) {
  const { profile, loading: authLoading } = useAuthStore();

  // ── Stable Supabase instance ───────────────────────────────────────────────
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  // ── Scroll + messagesEndRef ────────────────────────────────────────────────
  // Utilise requestAnimationFrame plutôt que setTimeout pour éviter les
  // "forced reflow" signalés dans les DevTools (layout thrashing ~65 ms).
  // rAF garantit que le DOM est prêt avant d'appeler scrollIntoView.
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const rafScrollRef    = useRef<number | null>(null);
  const scrollToBottom  = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (rafScrollRef.current !== null) cancelAnimationFrame(rafScrollRef.current);
    rafScrollRef.current = requestAnimationFrame(() => {
      rafScrollRef.current = null;
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  // ── Marquer comme lu ──────────────────────────────────────────────────────
  const markAsRead = useCallback(() => {
    if (!profile) return;
    window.dispatchEvent(new CustomEvent('messages-read', {
      detail: { conversationId, readAt: Date.now() },
    }));
  }, [conversationId, profile]);

  // ── Sous-hook : données ───────────────────────────────────────────────────
  const data = useConversationData(conversationId, supabase, scrollToBottom, markAsRead);

  // ── Sous-hook : realtime ──────────────────────────────────────────────────
  const realtime = useConversationRealtime(
    conversationId, supabase, profile,
    data.mountedRef, data.profileCacheRef, data.lastMsgIdRef,
    data.setMessages, markAsRead, scrollToBottom,
  );

  // ── Sous-hook : actions ───────────────────────────────────────────────────
  const actions = useConversationActions(
    conversationId, supabase, profile,
    data.otherUser, data.isFavorite, data.isBlocked,
    data.setMessages, data.setIsFavorite, data.setIsBlocked,
    data.lastMsgIdRef, scrollToBottom,
  );

  // ── Effet principal : chargement + realtime ────────────────────────────────
  useEffect(() => {
    data.mountedRef.current = true;
    if (authLoading || !profile) return;

    const controller = new AbortController();
    data.load(controller.signal);
    realtime.connect();

    const handleVis = () => {
      if (document.visibilityState === 'visible') { markAsRead(); }
    };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      controller.abort();
      data.mountedRef.current = false;
      realtime.cleanup();
      document.removeEventListener('visibilitychange', handleVis);
      // Annuler le scroll rAF en vol si le composant se démonte
      if (rafScrollRef.current !== null) {
        cancelAnimationFrame(rafScrollRef.current);
        rafScrollRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, conversationId, profile?.id, data.load, realtime.connect, realtime.cleanup, markAsRead]);

  // ── Scroll auto à chaque nouveau message ──────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!data.loading && data.messages.length > 0) scrollToBottom();
  }, [data.messages.length, data.loading, scrollToBottom]);

  // ── Contrat public (inchangé) ─────────────────────────────────────────────
  return {
    // State
    messages: data.messages,
    loading: data.loading,
    sending: actions.sending,
    otherUser: data.otherUser,
    subject: data.subject,
    relatedType: data.relatedType,
    relatedId: data.relatedId,
    realtimeOk: realtime.realtimeOk,
    isFavorite: data.isFavorite,
    isBlocked: data.isBlocked,
    exchange: data.exchange,
    messagesFetchError: data.messagesFetchError,
    // Setters exposés à ExchangePanel
    setExchange: data.setExchange,
    // Refs
    messagesEndRef,
    inputRef: actions.inputRef,
    // Actions
    sendMessage: actions.sendMessage,
    deleteMessage: actions.deleteMessage,
    toggleFavorite: actions.toggleFavorite,
    toggleBlock: actions.toggleBlock,
    // Auth
    profile,
  };
}
