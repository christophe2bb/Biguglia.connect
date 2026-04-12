'use client';
/**
 * useConversationList — Shell orchestrateur
 * ─────────────────────────────────────────────────────────────────────────────
 * Compose les trois sous-hooks spécialisés et expose le contrat public
 * consommé par la page messages et ses composants.
 *
 *   useConversationFetch        → fetch API + mapping + fallback profils
 *   useConversationListRealtime → canal Supabase + reconnexion exponentielle
 *   useConversationMutations    → delete + navigation optimiste
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useConversationFetch } from './useConversationFetch';
import { useConversationListRealtime } from './useConversationListRealtime';
import { useConversationMutations } from './useConversationMutations';

interface UseConversationListOptions {
  profileId: string | null;
  authLoading: boolean;
}

export interface UseConversationListReturn {
  conversations: ReturnType<typeof useConversationFetch>['conversations'];
  loading: ReturnType<typeof useConversationFetch>['loading'];
  deletingConv: ReturnType<typeof useConversationMutations>['deletingConv'];
  confirmConv: ReturnType<typeof useConversationMutations>['confirmConv'];
  setConfirmConv: ReturnType<typeof useConversationMutations>['setConfirmConv'];
  fetchConversations: ReturnType<typeof useConversationFetch>['fetchConversations'];
  handleDeleteConversation: ReturnType<typeof useConversationMutations>['handleDeleteConversation'];
  handleConvClick: ReturnType<typeof useConversationMutations>['handleConvClick'];
  localReadMapRef: ReturnType<typeof useConversationFetch>['localReadMapRef'];
}

export function useConversationList({
  profileId,
  authLoading,
}: UseConversationListOptions): UseConversationListReturn {
  // Stable Supabase instance
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const mountedRef = useRef(true);

  // ── Sous-hook : fetch ─────────────────────────────────────────────────────
  const fetch = useConversationFetch(profileId, supabase);

  // ── Sous-hook : realtime ──────────────────────────────────────────────────
  const realtime = useConversationListRealtime(
    profileId, supabase, mountedRef,
    fetch.conversationsRef, fetch.setConversations, fetch.fetchConversations,
  );

  // ── Sous-hook : mutations ─────────────────────────────────────────────────
  const mutations = useConversationMutations(supabase, fetch.setConversations, fetch.localReadMapRef);

  // ── Effet principal : fetch + realtime + event listeners ──────────────────
  useEffect(() => {
    mountedRef.current = true;
    // ⚠️  Pas de redirection ici — le middleware protège /messages/** côté serveur.
    if (authLoading || !profileId) return;

    void fetch.fetchConversations();
    realtime.connect();

    // Retour sur onglet → rafraîchir
    const handleVis = () => {
      if (document.visibilityState === 'visible') void fetch.fetchConversations();
    };
    document.addEventListener('visibilitychange', handleVis);

    // 'messages-read' : badge mis à 0 immédiatement, rechargement BDD après 5 s
    const handleMessagesRead = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId?: string; readAt?: number }>).detail;
      const convId = detail?.conversationId;
      const readAt = detail?.readAt ?? Date.now();

      const prevUnread = fetch.conversationsRef.current.find(c => c.id === convId)?.unread_count ?? '?';
      console.info(
        `[badge:messages-read:page] convId=${convId?.slice(0, 8) ?? 'undefined'} ` +
        `readAt=${new Date(readAt).toISOString()} unread_count_avant=${prevUnread} → remise à 0`
      );

      if (convId) {
        const current = fetch.localReadMapRef.current[convId] ?? 0;
        fetch.localReadMapRef.current[convId] = Math.max(readAt, current);
        fetch.setConversations(prev => {
          const next = prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c);
          fetch.conversationsRef.current = next;
          return next;
        });
      }
      setTimeout(() => { if (mountedRef.current) void fetch.fetchConversations(); }, 5000);
    };
    window.addEventListener('messages-read', handleMessagesRead);

    return () => {
      mountedRef.current = false;
      realtime.cleanup();
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('messages-read', handleMessagesRead);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profileId]);

  return {
    conversations:           fetch.conversations,
    loading:                 fetch.loading,
    localReadMapRef:         fetch.localReadMapRef,
    fetchConversations:      fetch.fetchConversations,
    deletingConv:            mutations.deletingConv,
    confirmConv:             mutations.confirmConv,
    setConfirmConv:          mutations.setConfirmConv,
    handleDeleteConversation: mutations.handleDeleteConversation,
    handleConvClick:         mutations.handleConvClick,
  };
}
