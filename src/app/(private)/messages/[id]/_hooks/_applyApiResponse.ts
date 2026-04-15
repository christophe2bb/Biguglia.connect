/**
 * _applyApiResponse
 * ─────────────────────────────────────────────────────────────────────────────
 * Helper pur (sans hook) : mappe la réponse GET /api/messages/conversation/[id]
 * vers les setters de state de useConversationData.
 *
 * Retourne l'otherUserId résolu (ou null), utilisé ensuite pour charger
 * isFavorite / isBlocked.
 */

import { MutableRefObject } from 'react';
import { Profile } from '@/types';
import {
  ProfileWithEmail, ExchangeInfo, ExchangeStatus,
  MessageWithSender, ConversationApiResponse,
} from '../_types';
import { EXCHANGEABLE_TYPES } from '../_config';

export interface ApplyApiResponseArgs {
  apiData: ConversationApiResponse;
  profileCacheRef: MutableRefObject<Record<string, Profile>>;
  lastMsgIdRef: MutableRefObject<string | null>;
  signal: AbortSignal;
  setMessagesFetchError: (v: string | null) => void;
  setOtherUser: (v: ProfileWithEmail | null) => void;
  setSubject: (v: string) => void;
  setRelatedType: (v: string | null) => void;
  setRelatedId: (v: string | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<MessageWithSender[]>>;
  setExchange: React.Dispatch<React.SetStateAction<ExchangeInfo>>;
}

export function applyApiResponse({
  apiData, profileCacheRef, lastMsgIdRef, signal,
  setMessagesFetchError, setOtherUser, setSubject, setRelatedType,
  setRelatedId, setMessages, setExchange,
}: ApplyApiResponseArgs): string | null {
  if (apiData.messages_fetch_error) {
    console.error('[useConversationData] messages_fetch_error:', apiData.messages_fetch_error);
    setMessagesFetchError(apiData.messages_fetch_error);
  } else {
    setMessagesFetchError(null);
  }

  const { conversation: conv, profiles: profilesData, other_user_id, messages: msgs } = apiData;
  (profilesData || []).forEach(p => { profileCacheRef.current[p.id] = p as unknown as Profile; });

  const otherUserId = other_user_id ?? null;
  if (otherUserId && !signal.aborted) {
    const otherProfile = profilesData.find(p => p.id === otherUserId);
    if (otherProfile) setOtherUser(otherProfile as unknown as ProfileWithEmail);
  }
  if (signal.aborted) return null;

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
      status: (conv.exchange_status as ExchangeStatus) ?? null,
      confirmedBy: (conv.exchange_confirmed_by as string[]) || [],
      confirmedAt: conv.exchange_confirmed_at ?? null,
      relatedType: conv.related_type,
      relatedId: conv.related_id ?? null,
      otherUserId,
    });
  }

  return otherUserId;
}
