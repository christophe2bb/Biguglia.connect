'use client';
/**
 * ConversationPage — orchestrateur fin
 * ─────────────────────────────────────────────────────────────────────────────
 * Cette page ne contient plus aucune logique métier. Elle :
 *   1. Extrait l'id de l'URL via useParams
 *   2. Délègue TOUTE la logique au hook useConversationPage
 *   3. Compose les composants de présentation
 *
 * Architecture :
 *   _types.ts                  — types partagés (ProfileWithEmail, ExchangeInfo…)
 *   _config.ts                 — CONTEXT_CONFIG, EXCHANGEABLE_TYPES, constantes
 *   _utils.ts                  — getDisplayName, getQuickReplies, groupByDay
 *   _hooks/useConversationPage — fetch, realtime, polling, actions
 *   _components/
 *     ConversationHeader       — barre supérieure (avatar, menu ⋮, badge contexte)
 *     ContextBanner            — bannière repliable de la ressource liée
 *     ExchangePanel            — confirmation bipartite + déverrouillage avis
 *     MessageList              — fil + DateSeparator + SystemMessage + bulles
 *     MessageComposer          — input + réponses rapides
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useConversationPage }  from './_hooks/useConversationPage';
import { ConversationHeader }   from './_components/ConversationHeader';
import { ContextBanner }        from './_components/ContextBanner';
import { ExchangePanel }        from './_components/ExchangePanel';
import { MessageList }          from './_components/MessageList';
import { MessageComposer }      from './_components/MessageComposer';
import { groupByDay }           from './_utils';
import { EXCHANGEABLE_TYPES }   from './_config';

export default function ConversationPage() {
  const { id } = useParams();
  const conversationId = id as string;

  const {
    // State
    messages, loading, sending,
    otherUser, subject, relatedType, relatedId,
    realtimeOk, isFavorite, isBlocked, exchange,
    messagesFetchError,
    // Setters
    setExchange,
    // Refs
    messagesEndRef, inputRef,
    // Actions
    sendMessage, deleteMessage, toggleFavorite, toggleBlock,
    // Auth
    profile,
  } = useConversationPage(conversationId);

  // Deletion animation state (local UI only)
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);

  const handleDeleteMessage = async (msgId: string) => {
    setDeletingMsgId(msgId);
    await new Promise(r => setTimeout(r, 280)); // animation de fade-out
    await deleteMessage(msgId);
    setDeletingMsgId(null);
  };

  const grouped = groupByDay(messages);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">

      <ConversationHeader
        loading={loading}
        otherUser={otherUser}
        subject={subject}
        relatedType={relatedType}
        relatedId={relatedId}
        realtimeOk={realtimeOk}
        isFavorite={isFavorite}
        isBlocked={isBlocked}
        onToggleFavorite={toggleFavorite}
        onToggleBlock={toggleBlock}
      />

      {!loading && (
        <ContextBanner
          relatedType={relatedType}
          relatedId={relatedId}
          subject={subject}
        />
      )}

      {!loading && profile && exchange.relatedType && EXCHANGEABLE_TYPES[exchange.relatedType] && (
        <ExchangePanel
          conversationId={conversationId}
          userId={profile.id}
          exchange={exchange}
          onExchangeUpdated={setExchange}
        />
      )}

      <MessageList
        grouped={grouped}
        loading={loading}
        relatedType={relatedType}
        subject={subject}
        currentUserId={profile?.id}
        deletingMsgId={deletingMsgId}
        onDeleteMessage={handleDeleteMessage}
        messagesEndRef={messagesEndRef}
        fetchError={messagesFetchError}
      />

      <MessageComposer
        relatedType={relatedType}
        sending={sending}
        inputRef={inputRef}
        onSend={sendMessage}
      />

    </div>
  );
}
