'use client';
/**
 * useConversationData
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité unique : chargement initial de la conversation via l'API admin
 * et maintien du state des données (messages, otherUser, exchange, flags…).
 *
 * Expose également getToken / apiHeaders utilisés par les autres sous-hooks.
 */

import { useState, useRef, useCallback, MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';
import toast from 'react-hot-toast';
import {
  ProfileWithEmail, ExchangeInfo, MessageWithSender,
  ConversationApiResponse,
} from '../_types';
import { applyApiResponse } from './_applyApiResponse';

// ─── Helpers API (ré-exportés pour les autres sous-hooks) ─────────────────────

export async function getToken(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const refreshResult = await supabase.auth.refreshSession();
    session = refreshResult.data.session;
  }
  return session?.access_token ?? null;
}

export function apiHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Types exposés ────────────────────────────────────────────────────────────

export interface ConversationDataResult {
  messages: MessageWithSender[];
  loading: boolean;
  otherUser: ProfileWithEmail | null;
  subject: string;
  relatedType: string | null;
  relatedId: string | null;
  isFavorite: boolean;
  isBlocked: boolean;
  exchange: ExchangeInfo;
  messagesFetchError: string | null;
  setMessages: React.Dispatch<React.SetStateAction<MessageWithSender[]>>;
  setIsFavorite: React.Dispatch<React.SetStateAction<boolean>>;
  setIsBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  setExchange: React.Dispatch<React.SetStateAction<ExchangeInfo>>;
  profileCacheRef: MutableRefObject<Record<string, Profile>>;
  lastMsgIdRef: MutableRefObject<string | null>;
  mountedRef: MutableRefObject<boolean>;
  load: (signal: AbortSignal) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConversationData(
  conversationId: string,
  supabase: ReturnType<typeof createClient>,
  scrollToBottom: (behavior?: ScrollBehavior) => void,
  markAsRead: () => void,
): ConversationDataResult {
  const router      = useRouter();
  const { profile } = useAuthStore();

  const [messages, setMessages]       = useState<MessageWithSender[]>([]);
  const [loading, setLoading]         = useState(true);
  const [otherUser, setOtherUser]     = useState<ProfileWithEmail | null>(null);
  const [subject, setSubject]         = useState('');
  const [relatedType, setRelatedType] = useState<string | null>(null);
  const [relatedId, setRelatedId]     = useState<string | null>(null);
  const [isFavorite, setIsFavorite]   = useState(false);
  const [isBlocked, setIsBlocked]     = useState(false);
  const [messagesFetchError, setMessagesFetchError] = useState<string | null>(null);
  const [exchange, setExchange]       = useState<ExchangeInfo>({
    status: null, confirmedBy: [], confirmedAt: null,
    relatedType: null, relatedId: null, otherUserId: null,
  });

  const profileCacheRef = useRef<Record<string, Profile>>({});
  const lastMsgIdRef    = useRef<string | null>(null);
  const mountedRef      = useRef(true);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!profile) return;
    markAsRead();

    const token = await getToken(supabase);
    if (signal.aborted) return;
    if (!token) { router.push(`/connexion?next=${encodeURIComponent(`/messages/${conversationId}`)}`); return; }

    const res = await fetch(`/api/messages/conversation/${conversationId}`, {
      headers: { Authorization: `Bearer ${token}` }, signal,
    }).catch((err: unknown) => (err instanceof Error && err.name === 'AbortError' ? null : null));

    if (signal.aborted) return;
    if (!res) { toast.error('Erreur réseau — vérifiez votre connexion'); setLoading(false); return; }
    if (res.status === 403) { toast.error("Accès refusé — vous n'avez pas accès à cette conversation"); router.push('/messages'); return; }
    if (res.status === 401) { router.push(`/connexion?next=${encodeURIComponent(`/messages/${conversationId}`)}`); return; }
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (signal.aborted) return;
      toast.error(`Erreur de chargement (${res.status})${body?.error ? ' : ' + body.error : ''}`);
      setLoading(false); return;
    }

    const apiData = await res.json().catch(() => null) as ConversationApiResponse | null;
    if (signal.aborted || !apiData) { if (!apiData) toast.error('Erreur de données'); setLoading(false); return; }

    const otherUserId = applyApiResponse({
      apiData, profileCacheRef, lastMsgIdRef, signal,
      setMessagesFetchError, setOtherUser, setSubject, setRelatedType,
      setRelatedId, setMessages, setExchange,
    });

    if (otherUserId) {
      Promise.all([
        supabase.from('user_favorites').select('id').eq('user_id', profile.id).eq('target_user_id', otherUserId).maybeSingle(),
        supabase.from('user_blocks').select('id').eq('user_id', profile.id).eq('target_user_id', otherUserId).maybeSingle(),
      ]).then(([favRes, blkRes]) => {
        if (signal.aborted) return;
        setIsFavorite(!!favRes.data);
        setIsBlocked(!!blkRes.data);
      });
    }

    setLoading(false);
    markAsRead();
    scrollToBottom('instant' as ScrollBehavior);
  }, [conversationId, profile, router, supabase, markAsRead, scrollToBottom]);

  return {
    messages, loading, otherUser, subject, relatedType, relatedId,
    isFavorite, isBlocked, exchange, messagesFetchError,
    setMessages, setIsFavorite, setIsBlocked, setExchange,
    profileCacheRef, lastMsgIdRef, mountedRef, load,
  };
}
