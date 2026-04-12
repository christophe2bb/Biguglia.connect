'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { ConvWithOther } from '../_types';
import { RECONNECT_DELAYS } from '../_config';
import { isSystemMsg } from '../_utils';

// ─── Cache module-level : survit au démontage du composant ────────────────────
// Stocke convId → timestamp (ms) de la dernière lecture locale.
// Permet à fetchConversations de ne pas recompter un message comme non lu
// si le PATCH BDD n'est pas encore persisté au moment du remontage.
const _localReadMap: Record<string, number> = {};

// ─── Types internes du hook ───────────────────────────────────────────────────
interface UseConversationListOptions {
  profileId: string | null;
  authLoading: boolean;
}

export interface UseConversationListReturn {
  conversations: ConvWithOther[];
  loading: boolean;
  deletingConv: string | null;
  confirmConv: string | null;
  setConfirmConv: (id: string | null) => void;
  fetchConversations: () => Promise<void>;
  handleDeleteConversation: (convId: string) => Promise<void>;
  handleConvClick: (conv: ConvWithOther) => void;
  localReadMapRef: React.MutableRefObject<Record<string, number>>;
}

/**
 * Gère l'état complet de la liste de conversations :
 * - Chargement via l'API admin (contourne la récursion RLS)
 * - Résolution des profils manquants en fallback batch
 * - Abonnement Realtime avec reconnexion exponentielle
 * - Listeners `visibilitychange` et `messages-read`
 * - Cache local de lecture (survit aux navigations)
 * - Suppression et navigation optimiste
 */
export function useConversationList({
  profileId,
  authLoading,
}: UseConversationListOptions): UseConversationListReturn {
  const router = useRouter();
  const supabase = createClient();

  const [conversations, setConversations]   = useState<ConvWithOther[]>([]);
  const [loading, setLoading]               = useState(true);
  const [deletingConv, setDeletingConv]     = useState<string | null>(null);
  const [confirmConv, setConfirmConv]       = useState<string | null>(null);

  const channelRef       = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx     = useRef(0);
  const mountedRef       = useRef(true);
  // Timestamp de montage — rejette les événements realtime rejoués (antérieurs)
  const pageStartRef     = useRef<number>(Date.now());
  // Ref stable vers conversations (évite stale-closure dans les listeners d'events)
  const conversationsRef = useRef<ConvWithOther[]>([]);
  // Cache local de last_read_at — pointe vers le singleton module-level _localReadMap.
  // Survit au démontage/remontage du composant (navigation vers [id] puis retour).
  const localReadMapRef  = useRef<Record<string, number>>(_localReadMap);

  // ── Chargement des conversations ──────────────────────────────────────────
  // Passe par l'API /api/messages/conversations (admin client) pour contourner
  // la récursion infinie dans les politiques RLS de conversation_participants.
  const fetchConversations = useCallback(async () => {
    if (!profileId) return;

    // Récupérer le token avec refresh automatique si la session est expirée
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const refreshResult = await supabase.auth.refreshSession();
      session = refreshResult.data.session;
    }
    const token = session?.access_token;
    if (!token) { setLoading(false); return; } // Session définitivement invalide

    const res = await fetch('/api/messages/conversations', {
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => null);

    if (!res || !res.ok) { setLoading(false); return; }

    const json = await res.json().catch(() => null);
    const participations = json?.participations;
    if (!participations) { setLoading(false); return; }

    // IDs des utilisateurs dont le profil est manquant → récupération directe
    const missingProfileIds = new Set<string>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const convs = (participations as Array<any>).map((p) => {
      const rawConv = p.conversation;
      const conv = (Array.isArray(rawConv) ? rawConv[0] : rawConv) as ConvWithOther & {
        participants?: Array<{ user_id: string; profile?: Profile | null }>;
        last_msg?: Array<{ content: string; created_at: string; sender_id: string }>;
        related_type?: string | null;
        related_id?: string | null;
      };
      if (!conv) return null;

      // Chercher l'autre utilisateur parmi les participants
      const otherParticipant = conv.participants?.find(pp => pp.user_id !== profileId);
      const other = otherParticipant?.profile ?? null;

      // Si le profil est manquant pour l'autre participant, noter l'ID pour une récupération groupée
      if (otherParticipant && !other) {
        missingProfileIds.add(otherParticipant.user_id);
      }

      const msgs = (conv.last_msg || []).slice();
      msgs.sort((a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at));

      // Préférer le dernier message NON-système (vrai échange), sinon le dernier tout court
      const lastRealMsg = msgs.find((m: { content: string }) => !isSystemMsg(m.content)) ?? msgs[0];

      // Si last_read_at est NULL, utiliser joined_at (messages avant l'entrée dans la conv = lus)
      // Utiliser le max entre la valeur BDD et le cache local (le PATCH BDD peut avoir du retard)
      const dbSinceTs    = new Date(p.last_read_at || p.joined_at || '1970-01-01T00:00:00Z').getTime();
      const localSinceTs = localReadMapRef.current[p.conversation_id] ?? 0;
      const sinceTs      = Math.max(dbSinceTs, localSinceTs);

      // Exclure les messages système du compteur non-lus
      const unread = msgs.filter((m: { sender_id: string; created_at: string; content: string }) =>
        m.sender_id !== profileId &&
        new Date(m.created_at).getTime() > sinceTs &&
        !isSystemMsg(m.content)
      ).length;

      return {
        ...conv,
        other_user: other ?? undefined,
        last_message_text: lastRealMsg?.content,
        last_message_at: msgs[0]?.created_at || conv.updated_at,
        unread_count: unread,
        related_type: conv.related_type ?? null,
        related_id: conv.related_id ?? null,
        // Clé temporaire pour le fallback de profil
        _other_participant_id: otherParticipant?.user_id ?? null,
      } as ConvWithOther & { _other_participant_id?: string | null };
    });

    let valid = convs.filter(Boolean) as (ConvWithOther & { _other_participant_id?: string | null })[];
    valid.sort((a, b) => {
      const aDate = a.last_message_at || a.updated_at || '';
      const bDate = b.last_message_at || b.updated_at || '';
      return bDate.localeCompare(aDate);
    });

    // Récupération groupée des profils manquants (fallback direct depuis Supabase)
    if (missingProfileIds.size > 0) {
      try {
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', Array.from(missingProfileIds));
        if (fallbackProfiles && fallbackProfiles.length > 0) {
          const fbMap = new Map(fallbackProfiles.map(fp => [fp.id, fp as Profile]));
          valid = valid.map(c => {
            if (!c.other_user && c._other_participant_id && fbMap.has(c._other_participant_id)) {
              return { ...c, other_user: fbMap.get(c._other_participant_id)! };
            }
            return c;
          });
        }
      } catch { /* ignore — profils resteront null */ }
    }

    // Nettoyer la clé temporaire avant de stocker
    const cleanValid = valid.map(c => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _other_participant_id, ...rest } = c as ConvWithOther & { _other_participant_id?: string | null };
      return rest as ConvWithOther;
    });

    conversationsRef.current = cleanValid;
    setConversations(cleanValid);
    setLoading(false);
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime ──────────────────────────────────────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profileId) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const channel = supabase
      .channel(`messages-list-${profileId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          if (!mountedRef.current) return;
          const msg = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };

          setConversations(prev => {
            const idx = prev.findIndex(c => c.id === msg.conversation_id);
            if (idx === -1) { fetchConversations(); return prev; }

            const updated = [...prev];
            const conv    = { ...updated[idx] };
            conv.last_message_text = msg.content;
            conv.last_message_at   = msg.created_at;

            // Ignorer les événements rejoués (antérieurs au montage de la page)
            const msgAt    = new Date(msg.created_at).getTime();
            const replayed = msgAt < pageStartRef.current;
            const isSys    = isSystemMsg(msg.content);
            const isOther  = msg.sender_id !== profileId;
            const willCount = isOther && !isSys && !replayed;

            console.info(
              `[badge:realtime:page] conv=${msg.conversation_id.slice(0, 8)} ` +
              `msgId=${msg.id.slice(0, 8)} created_at=${msg.created_at} ` +
              `replayed=${replayed}(pageStart=${new Date(pageStartRef.current).toISOString()}) ` +
              `isOther=${isOther} isSystem=${isSys} → COMPTÉ=${willCount}`
            );

            if (replayed) return prev;
            if (willCount) conv.unread_count = (conv.unread_count || 0) + 1;
            updated.splice(idx, 1);
            updated.unshift(conv);
            conversationsRef.current = updated;
            return updated;
          });
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          reconnectIdx.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          reconnectIdx.current = Math.min(reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => { if (mountedRef.current) connectRealtime(); }, delay);
        }
      });

    channelRef.current = channel;
  }, [profileId, fetchConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effet principal : fetch + realtime + listeners ─────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    // ⚠️  On n'effectue PLUS de redirection côté client ici :
    //   • Le middleware src/middleware.ts protège déjà /messages/** côté serveur.
    //   • Rediriger ici créait une fausse redirection lors du TOKEN_REFRESHED
    //     (profile = null pendant ~200ms entre authLoading=false et TOKEN_REFRESHED).
    if (authLoading) return;
    if (!profileId) return; // Attendre TOKEN_REFRESHED — le middleware gère la vraie garde

    fetchConversations();
    connectRealtime();

    // Retour sur onglet navigateur → rafraîchir
    const handleVis = () => {
      if (document.visibilityState === 'visible') fetchConversations();
    };
    document.addEventListener('visibilitychange', handleVis);

    // ── 'messages-read' : une conversation vient d'être lue depuis [id]/page ──
    // On met à 0 le badge IMMÉDIATEMENT (sans requête BDD) puis on recharge après 5s.
    const handleMessagesRead = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId?: string; readAt?: number }>).detail;
      const convId = detail?.conversationId;
      const readAt = detail?.readAt ?? Date.now();

      const prevUnread = conversationsRef.current.find(c => c.id === convId)?.unread_count ?? '?';
      console.info(
        `[badge:messages-read:page] convId=${convId?.slice(0, 8) ?? 'undefined'} ` +
        `readAt=${new Date(readAt).toISOString()} unread_count_avant=${prevUnread} → remise à 0`
      );

      if (convId) {
        // 1. Mettre à jour le cache local (évite le recalcul erroné si BDD pas encore à jour)
        const current = localReadMapRef.current[convId] ?? 0;
        localReadMapRef.current[convId] = Math.max(readAt, current);
        // 2. Mise à zéro immédiate du badge dans la liste
        setConversations(prev => {
          const next = prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c);
          conversationsRef.current = next;
          return next;
        });
      }
      // Confirmation BDD après 5s (laisse le temps au PATCH de se propager)
      setTimeout(() => { if (mountedRef.current) fetchConversations(); }, 5000);
    };
    window.addEventListener('messages-read', handleMessagesRead);

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('messages-read', handleMessagesRead);
    };
  }, [authLoading, profileId, fetchConversations, connectRealtime]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supprimer une conversation ────────────────────────────────────────────
  const handleDeleteConversation = useCallback(async (convId: string) => {
    setConfirmConv(null);
    setDeletingConv(convId);
    await new Promise(r => setTimeout(r, 280));
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/messages/conversations?conversationId=${convId}`, {
      method: 'DELETE',
      headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {},
    }).catch(() => null);
    setConversations(prev => prev.filter(c => c.id !== convId));
    setDeletingConv(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation vers une conversation ──────────────────────────────────────
  const handleConvClick = useCallback((conv: ConvWithOther) => {
    // 1) Mise à zéro optimiste AVANT la navigation
    //    → React re-render la liste (badge disparaît) avant que router.push
    //      ne démonte le composant.
    if ((conv.unread_count || 0) > 0) {
      const readAt = Date.now();
      localReadMapRef.current[conv.id] = Math.max(readAt, localReadMapRef.current[conv.id] ?? 0);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      window.dispatchEvent(new CustomEvent('messages-read', {
        detail: { conversationId: conv.id, readAt },
      }));
    }
    // 2) Navigation différée d'un tick pour que React peigne le badge avant de naviguer
    requestAnimationFrame(() => router.push(`/messages/${conv.id}`));
  }, [router]);

  return {
    conversations,
    loading,
    deletingConv,
    confirmConv,
    setConfirmConv,
    fetchConversations,
    handleDeleteConversation,
    handleConvClick,
    localReadMapRef,
  };
}
