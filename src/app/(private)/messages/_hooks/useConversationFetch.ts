'use client';
/**
 * useConversationFetch
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilité unique : récupérer et mapper la liste de conversations depuis
 * /api/messages/conversations (client admin, contourne la récursion RLS).
 *
 * Inclut :
 *  - Refresh automatique du token Supabase
 *  - Mapping participation → ConvWithOther (tri, unread_count, last_message)
 *  - Fallback batch pour les profils manquants
 *  - Cache local de lecture (singleton module-level _localReadMap)
 */

import { useState, useRef, useCallback, MutableRefObject } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { ConvWithOther } from '../_types';
import { isSystemMsg } from '../_utils';

// ─── Cache module-level : survit au démontage du composant ────────────────────
// convId → timestamp (ms) de la dernière lecture locale.
const _localReadMap: Record<string, number> = {};

// ─── Types internes du mapping ────────────────────────────────────────────────
type RawParticipant = { user_id: string; profile?: Profile | null };
type RawLastMsg     = { content: string; created_at: string; sender_id: string };
type RawConv = ConvWithOther & {
  participants?: RawParticipant[];
  last_msg?: RawLastMsg[];
  related_type?: string | null;
  related_id?: string | null;
};
type ConvWithTemp = ConvWithOther & { _other_participant_id?: string | null };

/** Shape brute d'une participation retournée par /api/messages/conversations */
type RawParticipation = {
  conversation_id: string;
  last_read_at?: string | null;
  joined_at?: string | null;
  conversation: RawConv | RawConv[];
};

// ─── Helper pur : mapping d'une participation API → ConvWithTemp ──────────────
function mapParticipation(
  p: RawParticipation,
  profileId: string,
  localReadMap: Record<string, number>,
  missingProfileIds: Set<string>,
): ConvWithTemp | null {
  const rawConv = p.conversation;
  const conv = (Array.isArray(rawConv) ? rawConv[0] : rawConv) as RawConv;
  if (!conv) return null;

  const otherParticipant = conv.participants?.find(pp => pp.user_id !== profileId);
  const other = otherParticipant?.profile ?? null;
  if (otherParticipant && !other) missingProfileIds.add(otherParticipant.user_id);

  const msgs = (conv.last_msg || []).slice();
  msgs.sort((a: RawLastMsg, b: RawLastMsg) => b.created_at.localeCompare(a.created_at));
  const lastRealMsg = msgs.find((m: RawLastMsg) => !isSystemMsg(m.content)) ?? msgs[0];

  const dbSinceTs    = new Date(p.last_read_at || p.joined_at || '1970-01-01T00:00:00Z').getTime();
  const localSinceTs = localReadMap[p.conversation_id] ?? 0;
  const sinceTs      = Math.max(dbSinceTs, localSinceTs);

  const unread = msgs.filter((m: RawLastMsg) =>
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
    _other_participant_id: otherParticipant?.user_id ?? null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ConversationFetchResult {
  conversations: ConvWithOther[];
  loading: boolean;
  setConversations: React.Dispatch<React.SetStateAction<ConvWithOther[]>>;
  conversationsRef: MutableRefObject<ConvWithOther[]>;
  localReadMapRef: MutableRefObject<Record<string, number>>;
  fetchConversations: () => Promise<void>;
}

export function useConversationFetch(
  profileId: string | null,
  supabase: ReturnType<typeof createClient>,
): ConversationFetchResult {
  const [conversations, setConversations] = useState<ConvWithOther[]>([]);
  const [loading, setLoading]             = useState(true);

  const conversationsRef = useRef<ConvWithOther[]>([]);
  const localReadMapRef  = useRef<Record<string, number>>(_localReadMap);

  const fetchConversations = useCallback(async () => {
    if (!profileId) return;

    // Refresh token si la session est expirée
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      const refreshResult = await supabase.auth.refreshSession();
      session = refreshResult.data.session;
    }
    const token = session?.access_token;
    if (!token) { setLoading(false); return; }

    const res = await fetch('/api/messages/conversations', {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (!res || !res.ok) { setLoading(false); return; }

    const json = await res.json().catch(() => null);
    const participations = json?.participations;
    if (!participations) { setLoading(false); return; }

    const missingProfileIds = new Set<string>();
    const convs = (participations as RawParticipation[]).map(p =>
      mapParticipation(p, profileId, localReadMapRef.current, missingProfileIds)
    );

    let valid = convs.filter(Boolean) as ConvWithTemp[];
    valid.sort((a, b) => {
      const aDate = a.last_message_at || a.updated_at || '';
      const bDate = b.last_message_at || b.updated_at || '';
      return bDate.localeCompare(aDate);
    });

    // Récupération batch des profils manquants
    if (missingProfileIds.size > 0) {
      try {
        const { data: fallbackProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', Array.from(missingProfileIds));
        if (fallbackProfiles?.length) {
          const fbMap = new Map(fallbackProfiles.map(fp => [fp.id, fp as Profile]));
          valid = valid.map(c =>
            !c.other_user && c._other_participant_id && fbMap.has(c._other_participant_id)
              ? { ...c, other_user: fbMap.get(c._other_participant_id)! }
              : c
          );
        }
      } catch { /* ignore — profils resteront null */ }
    }

    // Nettoyer la clé temporaire avant de stocker
    const cleanValid = valid.map(({ _other_participant_id, ...rest }) => rest as ConvWithOther);

    conversationsRef.current = cleanValid;
    setConversations(cleanValid);
    setLoading(false);
  }, [profileId, supabase]);

  return {
    conversations, loading, setConversations,
    conversationsRef, localReadMapRef, fetchConversations,
  };
}
