'use client';
/**
 * useConversationMutations
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité unique : mutations sur la liste de conversations.
 *
 *   • handleDeleteConversation : suppression optimiste + appel API DELETE
 *   • handleConvClick          : mise à zéro badge + navigation différée
 */

import { useState, useCallback, MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ConvWithOther } from '../_types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ConversationMutationsResult {
  deletingConv: string | null;
  confirmConv: string | null;
  setConfirmConv: (id: string | null) => void;
  handleDeleteConversation: (convId: string) => Promise<void>;
  handleConvClick: (conv: ConvWithOther) => void;
}

export function useConversationMutations(
  supabase: ReturnType<typeof createClient>,
  setConversations: React.Dispatch<React.SetStateAction<ConvWithOther[]>>,
  localReadMapRef: MutableRefObject<Record<string, number>>,
): ConversationMutationsResult {
  const router = useRouter();

  const [deletingConv, setDeletingConv] = useState<string | null>(null);
  const [confirmConv, setConfirmConv]   = useState<string | null>(null);

  // ── Suppression ───────────────────────────────────────────────────────────
  const handleDeleteConversation = useCallback(async (convId: string) => {
    setConfirmConv(null);
    setDeletingConv(convId);
    // Délai court pour laisser l'animation CSS de sortie se jouer
    await new Promise(r => setTimeout(r, 280));
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/messages/conversations?conversationId=${convId}`, {
      method: 'DELETE',
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    }).catch(() => null);
    setConversations(prev => prev.filter(c => c.id !== convId));
    setDeletingConv(null);
  }, [supabase, setConversations]);

  // ── Navigation avec badge optimiste ──────────────────────────────────────
  const handleConvClick = useCallback((conv: ConvWithOther) => {
    // 1) Mise à zéro AVANT la navigation → badge disparaît avant le démontage
    if ((conv.unread_count || 0) > 0) {
      const readAt = Date.now();
      localReadMapRef.current[conv.id] = Math.max(readAt, localReadMapRef.current[conv.id] ?? 0);
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
      );
      window.dispatchEvent(new CustomEvent('messages-read', {
        detail: { conversationId: conv.id, readAt },
      }));
    }
    // 2) Navigation différée d'un tick pour laisser React peindre le badge
    requestAnimationFrame(() => router.push(`/messages/${conv.id}`));
  }, [router, setConversations, localReadMapRef]);

  return { deletingConv, confirmConv, setConfirmConv, handleDeleteConversation, handleConvClick };
}
