'use client';
/**
 * useConversationPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralise TOUTE la logique de la page conversation :
 *   • chargement initial via l'API admin (bypass RLS récursive)
 *   • realtime Supabase + polling de secours
 *   • actions : sendMessage, deleteMessage, toggleFavorite, toggleBlock
 *   • marquage comme lu, défilement
 *
 * Retourne un objet stable utilisé par la page et ses composants.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Profile } from '@/types';
import toast from 'react-hot-toast';
import {
  ProfileWithEmail, ExchangeInfo, ExchangeStatus, MessageWithSender,
  ConversationApiResponse,
} from '../_types';
import { EXCHANGEABLE_TYPES, RECONNECT_DELAYS, FALLBACK_POLL_INTERVAL } from '../_config';

// ─── API helpers ─────────────────────────────────────────────────────────────

async function getToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const refreshResult = await supabase.auth.refreshSession();
    session = refreshResult.data.session;
  }
  return session?.access_token ?? null;
}

function apiHeaders(token: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConversationPage(conversationId: string) {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();

  // Stable supabase instance
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  // ── State ─────────────────────────────────────────────────────────────────
  const [messages, setMessages]       = useState<MessageWithSender[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [otherUser, setOtherUser]     = useState<ProfileWithEmail | null>(null);
  const [subject, setSubject]         = useState('');
  const [relatedType, setRelatedType] = useState<string | null>(null);
  const [relatedId, setRelatedId]     = useState<string | null>(null);
  const [realtimeOk, setRealtimeOk]     = useState(false);
  const [isFavorite, setIsFavorite]     = useState(false);
  const [isBlocked, setIsBlocked]       = useState(false);
  const [messagesFetchError, setMessagesFetchError] = useState<string | null>(null);
  const [exchange, setExchange]       = useState<ExchangeInfo>({
    status: null, confirmedBy: [], confirmedAt: null,
    relatedType: null, relatedId: null, otherUserId: null,
  });

  // ── Refs (non-reactive) ───────────────────────────────────────────────────
  const messagesEndRef    = useRef<HTMLDivElement>(null);
  const profileCacheRef   = useRef<Record<string, Profile>>({});
  const channelRef        = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdxRef   = useRef(0);
  const pollRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef        = useRef(true);
  const lastMsgIdRef      = useRef<string | null>(null);

  // ── Scroll ────────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior }), 50);
  }, []);

  // ── Profile cache lookup ──────────────────────────────────────────────────
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
  }, [supabase]);

  // ── Marquer comme lu ─────────────────────────────────────────────────────
  const markAsRead = useCallback(() => {
    if (!profile) return;
    window.dispatchEvent(new CustomEvent('messages-read', {
      detail: { conversationId, readAt: Date.now() },
    }));
  }, [conversationId, profile]);

  // ── Polling de secours ───────────────────────────────────────────────────
  const pollNewMessages = useCallback(async () => {
    if (!mountedRef.current || !profile) return;
    try {
      const token = await getToken(supabase);
      if (!token) return;

      const res = await fetch(`/api/messages/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (!res?.ok) return;

      const data = await res.json().catch(() => null) as ConversationApiResponse | null;
      if (!data?.messages) return;

      // Hydrate profile cache — display_name est déjà calculé serveur
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
      console.warn('[useConversationPage] poll error:', err);
    }
  }, [conversationId, profile, supabase, markAsRead, scrollToBottom]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profile || !conversationId) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    // Polling principal (bypass RLS récursive)
    if (!pollRef.current) {
      pollRef.current = setInterval(pollNewMessages, FALLBACK_POLL_INTERVAL);
    }

    const channel = supabase
      .channel(`conv-${conversationId}-${Date.now()}`, { config: { broadcast: { ack: false } } })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
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
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          setRealtimeOk(true);
          reconnectIdxRef.current = 0;
          // Realtime opérationnel — le polling devient redondant
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeOk(false);
          if (!pollRef.current) pollRef.current = setInterval(pollNewMessages, FALLBACK_POLL_INTERVAL);
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdxRef.current, RECONNECT_DELAYS.length - 1)];
          if (reconnectIdxRef.current < RECONNECT_DELAYS.length - 1) {
            reconnectIdxRef.current++;
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            reconnectRef.current = setTimeout(() => {
              if (mountedRef.current) connectRealtime();
            }, delay);
          }
        }
      });

    channelRef.current = channel;
  }, [conversationId, profile, supabase, getSenderProfile, markAsRead, scrollToBottom, pollNewMessages]);

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // ⚠️  Pas de redirection ici — le middleware protège /messages/**
    // Rediriger ici crée une fausse redirection pendant TOKEN_REFRESHED (~200ms)
    if (authLoading) return;
    if (!profile) return;

    markAsRead();

    // AbortController pour annuler le fetch si le composant se démonte ou si l'effet
    // se ré-exécute avant la fin du fetch précédent (race condition profile re-render).
    const controller = new AbortController();
    const { signal } = controller;

    const init = async () => {
      const token = await getToken(supabase);
      // Vérifier que l'effet n'a pas été annulé pendant getToken
      if (signal.aborted) return;
      if (!token) {
        router.push(`/connexion?next=${encodeURIComponent(`/messages/${conversationId}`)}`);
        return;
      }

      const res = await fetch(`/api/messages/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      }).catch((err: unknown) => {
        // AbortError : l'effet a été nettoyé — ne pas afficher d'erreur
        if (err instanceof Error && err.name === 'AbortError') return null;
        return null;
      });

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
      if (signal.aborted) return;
      if (!apiData) { toast.error('Erreur de données'); setLoading(false); return; }

      // Si le serveur a signalé un échec sur la table messages, prévenir l'utilisateur.
      // On continue quand même (les autres données sont valides) pour afficher le fil vide
      // avec un état d'erreur distinct plutôt que l'état trompeur "Démarrez la conversation".
      if (apiData.messages_fetch_error) {
        console.error('[useConversationPage] messages_fetch_error:', apiData.messages_fetch_error);
        setMessagesFetchError(apiData.messages_fetch_error);
      } else {
        setMessagesFetchError(null);
      }

      const { conversation: conv, profiles: profilesData, other_user_id, messages: msgs } = apiData;

      // Hydrate profile cache — les profils incluent désormais display_name calculé serveur
      (profilesData || []).forEach(p => {
        profileCacheRef.current[p.id] = p as unknown as Profile;
      });

      // Résolution de l'autre participant — other_user_id est calculé côté serveur.
      // La route garantit que son profil est dans profiles[] (fallback intégré).
      const otherUserId = other_user_id ?? null;

      if (otherUserId) {
        const otherProfile = profilesData.find(p => p.id === otherUserId);
        if (otherProfile && !signal.aborted) {
          setOtherUser(otherProfile as unknown as ProfileWithEmail);
        }
      }

      if (signal.aborted) return;

      // conv est désormais ConversationApi — les champs sont typés, pas de cast aveugle
      setSubject(conv?.subject || 'Conversation');
      setRelatedType(conv?.related_type ?? null);
      setRelatedId(conv?.related_id ?? null);

      const enriched: MessageWithSender[] = (msgs || []).map(msg => ({
        ...msg,
        sender: msg.sender_id ? profileCacheRef.current[msg.sender_id] : undefined,
      }));

      setMessages(enriched);
      if (enriched.length > 0) lastMsgIdRef.current = enriched[enriched.length - 1].id;

      if (conv?.related_type && EXCHANGEABLE_TYPES[conv.related_type]) {
        setExchange({
          // exchange_status est une string | null dans ConversationApi — cast vers ExchangeStatus
          status: (conv.exchange_status as ExchangeStatus) ?? null,
          confirmedBy: (conv.exchange_confirmed_by as string[]) || [],
          confirmedAt: conv.exchange_confirmed_at ?? null,
          relatedType: conv.related_type,
          relatedId: conv.related_id ?? null,
          // other_user_id résolu côté serveur — plus de candidateIds[0] fragile
          otherUserId,
        });
      }

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
    };

    init();
    connectRealtime();

    const handleVis = () => {
      if (document.visibilityState === 'visible') { markAsRead(); pollNewMessages(); }
    };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      // Annuler le fetch en cours (évite la race condition si profile change)
      controller.abort();
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', handleVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, conversationId, profile?.id, router]);

  // Scroll auto à chaque nouveau message
  useEffect(() => {
    if (!loading && messages.length > 0) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const inputRef = useRef<HTMLInputElement>(null);

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

  const deleteMessage = async (msgId: string): Promise<void> => {
    const token = await getToken(supabase);
    const res = await fetch(`/api/messages/conversation/${conversationId}?messageId=${msgId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => null);

    if (!res?.ok) {
      toast.error('Impossible de supprimer ce message');
    } else {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

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

  const toggleBlock = async (): Promise<void> => {
    if (!profile || !otherUser) return;
    if (isBlocked) {
      await supabase.from('user_blocks').delete()
        .eq('user_id', profile.id).eq('target_user_id', otherUser.id);
      setIsBlocked(false);
      toast.success(`${otherUser.full_name || 'Utilisateur'} débloqué`);
    } else {
      if (!confirm(`Bloquer ${otherUser.full_name || 'cet utilisateur'} ?`)) return;
      await supabase.from('user_blocks').insert({ user_id: profile.id, target_user_id: otherUser.id });
      setIsBlocked(true);
      toast.success(`${otherUser.full_name || 'Utilisateur'} bloqué`);
    }
  };

  return {
    // State
    messages, loading, sending,
    otherUser, subject, relatedType, relatedId,
    realtimeOk, isFavorite, isBlocked, exchange,
    messagesFetchError,
    // Setters exposed to ExchangePanel
    setExchange,
    // Refs for components
    messagesEndRef, inputRef,
    // Actions
    sendMessage, deleteMessage, toggleFavorite, toggleBlock,
    // Auth
    profile,
  };
}
