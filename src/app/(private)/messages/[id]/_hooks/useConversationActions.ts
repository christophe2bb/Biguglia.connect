'use client';
/**
 * useConversationActions
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité unique : mutations de la conversation.
 *
 *   • sendMessage   : envoi optimiste + confirmation serveur
 *   • deleteMessage : suppression via API + mise à jour locale
 *   • toggleFavorite: ajout / retrait favori Supabase
 *   • toggleBlock   : blocage / déblocage Supabase
 */

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import toast from 'react-hot-toast';
import { ProfileWithEmail, MessageWithSender } from '../_types';
import { getToken, apiHeaders } from './useConversationData';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ConversationActionsResult {
  sending: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  sendMessage: (text: string) => Promise<void>;
  deleteMessage: (msgId: string) => Promise<void>;
  toggleFavorite: () => Promise<void>;
  toggleBlock: () => Promise<void>;
}

export function useConversationActions(
  conversationId: string,
  supabase: ReturnType<typeof createClient>,
  profile: Profile | null,
  otherUser: ProfileWithEmail | null,
  isFavorite: boolean,
  isBlocked: boolean,
  setMessages: React.Dispatch<React.SetStateAction<MessageWithSender[]>>,
  setIsFavorite: React.Dispatch<React.SetStateAction<boolean>>,
  setIsBlocked: React.Dispatch<React.SetStateAction<boolean>>,
  lastMsgIdRef: React.MutableRefObject<string | null>,
  scrollToBottom: (behavior?: ScrollBehavior) => void,
): ConversationActionsResult {
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Envoi de message ──────────────────────────────────────────────────────
  const sendMessage = async (text: string): Promise<void> => {
    if (!text.trim() || !profile || sending) return;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      conversation_id: conversationId,
      sender_id: profile.id,
      content: text.trim(),
      created_at: new Date().toISOString(),
      sender: profile as unknown as Profile,
    }]);
    scrollToBottom();

    const token = await getToken(supabase);
    const res = await fetch(`/api/messages/conversation/${conversationId}`, {
      method: 'POST',
      headers: apiHeaders(token),
      body: JSON.stringify({ content: text.trim() }),
    }).catch(() => null);

    const savedMsg = res?.ok ? (await res.json().catch(() => null))?.message : null;

    if (!res?.ok) {
      toast.error("Erreur lors de l'envoi");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else if (savedMsg) {
      setMessages(prev =>
        prev.map(m => m.id === tempId ? { ...savedMsg, sender: profile as unknown as Profile } : m)
      );
      lastMsgIdRef.current = savedMsg.id;
    }

    setSending(false);
    inputRef.current?.focus();
  };

  // ── Suppression de message ────────────────────────────────────────────────
  const deleteMessage = async (msgId: string): Promise<void> => {
    const token = await getToken(supabase);
    const res = await fetch(
      `/api/messages/conversation/${conversationId}?messageId=${msgId}`,
      {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    ).catch(() => null);

    if (!res?.ok) {
      toast.error('Impossible de supprimer ce message');
    } else {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  // ── Favori ────────────────────────────────────────────────────────────────
  const toggleFavorite = async (): Promise<void> => {
    if (!profile || !otherUser) return;
    if (isFavorite) {
      await supabase.from('user_favorites').delete()
        .eq('user_id', profile.id).eq('target_user_id', otherUser.id);
      setIsFavorite(false);
      toast.success(`${otherUser.full_name || 'Utilisateur'} retiré des favoris`);
    } else {
      await supabase.from('user_favorites').insert({ user_id: profile.id, target_user_id: otherUser.id });
      setIsFavorite(true);
      toast.success(`${otherUser.full_name || 'Utilisateur'} ajouté aux favoris ⭐`);
    }
  };

  // ── Blocage ───────────────────────────────────────────────────────────────
  const toggleBlock = async (): Promise<void> => {
    if (!profile || !otherUser) return;
    if (isBlocked) {
      await supabase.from('user_blocks').delete()
        .eq('user_id', profile.id).eq('target_user_id', otherUser.id);
      setIsBlocked(false);
      toast.success(`${otherUser.full_name || 'Utilisateur'} débloqué`);
    } else {
      // ⚠️ Appelé APRÈS confirmation dans l'UI (pas de confirm() bloquant).
      await supabase.from('user_blocks').insert({ user_id: profile.id, target_user_id: otherUser.id });
      setIsBlocked(true);
      toast.success(`${otherUser.full_name || 'Utilisateur'} bloqué`);
    }
  };

  return { sending, inputRef, sendMessage, deleteMessage, toggleFavorite, toggleBlock };
}
