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
  sendMessage: (text: string) => Promise<boolean>;
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
  const favoriteBusyRef = useRef(false);
  const blockBusyRef = useRef(false);

  // ── Envoi de message ──────────────────────────────────────────────────────
  // Le brouillon n'est effacé par MessageComposer qu'après accusé de réception.
  const sendMessage = async (text: string): Promise<boolean> => {
    const content = text.trim();
    if (!content || !profile || sending) return false;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    let delivered = false;

    try {
      const token = await getToken(supabase);
      if (!token) {
        toast.error('Session expirée : reconnectez-vous pour envoyer le message');
        return false;
      }

      setMessages(prev => [...prev, {
        id: tempId,
        conversation_id: conversationId,
        sender_id: profile.id,
        content,
        created_at: new Date().toISOString(),
        sender: profile as unknown as Profile,
      }]);
      scrollToBottom();

      const res = await fetch(`/api/messages/conversation/${conversationId}`, {
        method: 'POST',
        headers: apiHeaders(token),
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        toast.error(res.status === 401
          ? 'Session expirée : reconnectez-vous'
          : res.status === 403
            ? 'Vous ne pouvez pas écrire dans cette conversation'
            : 'Envoi impossible — votre texte a été conservé');
        return false;
      }

      const payload = await res.json().catch(() => null) as { message?: MessageWithSender } | null;
      const saved = payload?.message;
      if (!saved?.id) {
        toast.error('Accusé de réception manquant — vérifiez la conversation avant de réessayer');
        return false;
      }

      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...saved, sender: profile as unknown as Profile } : m
      ));
      lastMsgIdRef.current = saved.id;
      delivered = true;
      return true;
    } catch {
      toast.error('Erreur réseau — votre texte a été conservé');
      return false;
    } finally {
      if (!delivered) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
      setSending(false);
      inputRef.current?.focus();
    }
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

  // ── Favoris : ne changer l'icône qu'après confirmation SQL ──────────────
  const toggleFavorite = async (): Promise<void> => {
    if (!profile || !otherUser || favoriteBusyRef.current) return;
    favoriteBusyRef.current = true;
    try {
      const table = supabase.from('user_favorites');
      const { data: changed, error } = isFavorite
        ? await table.delete()
            .eq('user_id', profile.id).eq('target_user_id', otherUser.id).select('id')
        : await table.insert({ user_id: profile.id, target_user_id: otherUser.id }).select('id');
      if (error || !changed?.length) {
        toast.error('Favori non enregistré : vérifiez votre connexion.');
        return;
      }
      setIsFavorite(!isFavorite);
      toast.success(isFavorite
        ? `${otherUser.full_name || 'Utilisateur'} retiré des favoris`
        : `${otherUser.full_name || 'Utilisateur'} ajouté aux favoris ⭐`);
    } catch {
      toast.error('Erreur réseau : favori non confirmé.');
    } finally {
      favoriteBusyRef.current = false;
    }
  };

  // ── Blocage : aucune fausse confirmation si la base refuse ─────────────
  const toggleBlock = async (): Promise<void> => {
    if (!profile || !otherUser || blockBusyRef.current) return;
    blockBusyRef.current = true;
    try {
      const table = supabase.from('user_blocks');
      const { data: changed, error } = isBlocked
        ? await table.delete()
            .eq('user_id', profile.id).eq('target_user_id', otherUser.id).select('id')
        : await table.insert({ user_id: profile.id, target_user_id: otherUser.id }).select('id');
      if (error || !changed?.length) {
        toast.error('Blocage non enregistré : vérifiez votre connexion.');
        return;
      }
      setIsBlocked(!isBlocked);
      toast.success(isBlocked
        ? `${otherUser.full_name || 'Utilisateur'} débloqué`
        : `${otherUser.full_name || 'Utilisateur'} bloqué`);
    } catch {
      toast.error('Erreur réseau : blocage non confirmé.');
    } finally {
      blockBusyRef.current = false;
    }
  };

  return { sending, inputRef, sendMessage, deleteMessage, toggleFavorite, toggleBlock };
}
