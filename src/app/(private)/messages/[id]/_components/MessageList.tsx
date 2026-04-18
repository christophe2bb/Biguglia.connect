'use client';
/**
 * MessageList
 * ─────────────────────────────────────────────────────────────────────────────
 * Fil de messages : squelette de chargement, état vide, bulles, séparateurs de
 * date, messages système, suppression par long-press/clic droit.
 *
 * Sous-composants internes (non exportés) :
 *   DateSeparator   — séparateur de date entre groupes
 *   SystemMessage   — bulle message bot/système
 *   MessageBubble   — bulle utilisateur avec menu de suppression
 *
 * Pagination : les MSG_INITIAL derniers messages sont affichés ; un bouton
 * « Voir les anciens messages » charge MSG_PAGE de plus vers le haut.
 */

import { useState, useRef, useCallback } from 'react';
import { MessageSquare, CheckCheck, Trash2, Bot, AlertCircle, ChevronUp } from 'lucide-react';

/** Nombre de messages affichés au chargement initial */
const MSG_INITIAL = 30;
/** Nombre de messages supplémentaires chargés à chaque "Voir plus" */
const MSG_PAGE = 20;
import Avatar from '@/components/ui/Avatar';
import { cn, formatRelative } from '@/lib/utils';
import { ProfileWithEmail, GroupedMessage } from '../_types';
import { getDisplayName } from '../_utils';
import { CONTEXT_CONFIG } from '../_config';

// ─── DateSeparator ────────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (d.toDateString() === todayStr) {
    label = "Aujourd'hui";
  } else if (d.toDateString() === yesterday.toDateString()) {
    label = 'Hier';
  } else {
    label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    label = label.charAt(0).toUpperCase() + label.slice(1);
  }

  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap bg-white px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── SystemMessage ────────────────────────────────────────────────────────────

function SystemMessage({ content }: { content: string }) {
  const isPositive = content.startsWith('✅') || content.startsWith('🤝');
  return (
    <div className="flex justify-center my-2">
      <div className={cn(
        'flex items-start gap-2 max-w-[80%] px-3.5 py-2 rounded-2xl text-xs',
        isPositive
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          : 'bg-gray-50 border border-gray-200 text-gray-600',
      )}>
        <Bot className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', isPositive ? 'text-emerald-500' : 'text-gray-400')} />
        <span className="leading-relaxed">{content}</span>
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: GroupedMessage['msg'];
  isMe: boolean;
  isTemp: boolean;
  showAvatar: boolean;
  isLastFromSender: boolean;
  isDeleting: boolean;
  onDelete: (msgId: string) => void;
  currentUserId: string;
}

function MessageBubble({
  msg, isMe, isTemp, showAvatar, isLastFromSender, isDeleting, onDelete, currentUserId,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = () => {
    if (!isMe || isTemp) return;
    pressTimer.current = setTimeout(() => {
      setMenuOpen(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 600);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  void currentUserId; // used by parent for isMe derivation

  return (
    <div
      className={cn('transition-all duration-300', isDeleting && 'opacity-0 scale-95 pointer-events-none')}
      data-msg-menu={menuOpen ? 'open' : undefined}
    >
      {/* Ligne principale */}
      <div className={cn('flex items-end gap-1.5', isMe ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar interlocuteur */}
        {!isMe && (
          <div className={cn('flex-shrink-0 w-8', !showAvatar && 'invisible')}>
            <Avatar
              src={(msg.sender as ProfileWithEmail | undefined)?.avatar_url}
              name={getDisplayName(msg.sender as ProfileWithEmail | null, '?')}
              size="sm"
            />
          </div>
        )}

        {/* Bulle */}
        <div
          className={cn(
            'max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words cursor-default select-text',
            isMe ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm',
            isTemp && 'opacity-60',
            menuOpen && isMe && 'ring-2 ring-red-400',
          )}
          onContextMenu={isMe && !isTemp ? (e) => { e.preventDefault(); setMenuOpen(v => !v); } : undefined}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchMove={handlePressEnd}
        >
          {msg.content ?? <span className="italic text-gray-400 text-xs">[message supprimé]</span>}
        </div>

        {/* Bouton suppression */}
        {isMe && !isTemp && (
          <button
            data-msg-menu="trigger"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(v => !v); }}
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors',
              'opacity-0 group-hover:opacity-100',
              menuOpen
                ? 'bg-red-500 text-white opacity-100'
                : 'bg-red-100 text-red-400 hover:bg-red-200 hover:text-red-600',
            )}
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Heure + statut */}
      <div className={cn(
        'text-xs text-gray-400 mt-0.5 px-1 flex items-center gap-1',
        isMe ? 'justify-end pr-10' : 'justify-start pl-10',
      )}>
        <span>{formatRelative(msg.created_at)}</span>
        {isTemp && <span className="text-gray-300">· envoi…</span>}
        {isMe && !isTemp && isLastFromSender && <CheckCheck className="w-3 h-3 text-brand-400" />}
      </div>

      {/* Popup confirmation suppression */}
      {menuOpen && isMe && (
        <div
          data-msg-menu="popup"
          className="flex justify-end pr-10 mt-1"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 bg-white border border-red-200 shadow-lg rounded-2xl px-3 py-2 text-xs">
            <Trash2 className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-gray-700 font-medium">Supprimer ce message ?</span>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(msg.id); }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-lg"
            >
              Oui
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
              className="text-gray-400 hover:text-gray-600 font-medium"
            >
              Non
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MessageList ──────────────────────────────────────────────────────────────

interface MessageListProps {
  grouped: GroupedMessage[];
  loading: boolean;
  relatedType: string | null;
  subject: string;
  currentUserId: string | undefined;
  deletingMsgId: string | null;
  onDeleteMessage: (msgId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  /** Signalé par le serveur quand la table messages n'a pas pu être interrogée */
  fetchError?: string | null;
}

export function MessageList({
  grouped, loading, relatedType, subject,
  currentUserId, deletingMsgId, onDeleteMessage, messagesEndRef, fetchError,
}: MessageListProps) {
  const conf = relatedType ? CONTEXT_CONFIG[relatedType] : null;

  // ── Pagination : on affiche les N derniers messages ───────────────────────
  const [visibleCount, setVisibleCount] = useState(MSG_INITIAL);
  const totalMessages = grouped.length;
  // Toujours afficher les messages les plus récents (fin du tableau)
  const startIdx = Math.max(0, totalMessages - visibleCount);
  const visibleGrouped = grouped.slice(startIdx);
  const hasOlder = startIdx > 0;

  const loadOlder = useCallback(() => {
    setVisibleCount(c => c + MSG_PAGE);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pb-4 px-1">
      {/* Skeleton */}
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse space-y-3 w-full px-4">
            <div className="h-10 bg-gray-100 rounded-2xl w-2/3" />
            <div className="h-10 bg-gray-100 rounded-2xl w-1/2 ml-auto" />
            <div className="h-10 bg-gray-100 rounded-2xl w-3/4" />
            <div className="h-10 bg-gray-100 rounded-2xl w-2/5 ml-auto" />
          </div>
        </div>
      ) : fetchError ? (
        /* État erreur — la table messages n'a pas pu être interrogée */
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Impossible de charger les messages</p>
          <p className="text-gray-400 text-sm">Une erreur est survenue. Rechargez la page pour réessayer.</p>
        </div>
      ) : grouped.length === 0 ? (
        /* État vide — conversation vraiment sans messages */
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-brand-400" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Démarrez la conversation !</p>
          <p className="text-gray-400 text-sm">Écrivez votre premier message ci-dessous</p>
          {relatedType && relatedType !== 'general' && conf && (
            <div className={cn('mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium', conf.bg, conf.color)}>
              <conf.icon className="w-3.5 h-3.5" />
              <span>À propos de : {subject || conf.label}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Bouton charger les messages plus anciens */}
          {hasOlder && (
            <div className="flex justify-center py-3">
              <button
                onClick={loadOlder}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                Voir les {Math.min(MSG_PAGE, startIdx)} messages précédents
              </button>
            </div>
          )}

          {visibleGrouped.map(({ msg, showSep }, i) => {
            // Indices relatifs dans le sous-tableau visible
            const globalI = startIdx + i;
            const isMe = msg.sender_id === currentUserId;
            const isTemp = msg.id.startsWith('temp-');
            const isSystem =
              msg.is_system ||
              msg.content?.startsWith('👋') ||
              msg.content?.startsWith('✅') ||
              msg.content?.startsWith('🤝') ||
              msg.content?.includes('Échange confirmé') ||
              msg.content?.includes('Conversation créée') ||
              msg.content?.includes('je vous contacte') ||
              msg.content?.includes('via biguglia connect');

            const showAvatar =
              !isMe && !isSystem &&
              (globalI === 0 || grouped[globalI - 1]?.msg.sender_id !== msg.sender_id);

            const isLastFromSender =
              isMe && !isSystem &&
              (globalI === grouped.length - 1 || grouped[globalI + 1]?.msg.sender_id !== currentUserId);

            return (
              <div key={msg.id}>
                {showSep && <DateSeparator date={msg.created_at} />}
                {isSystem ? (
                  <SystemMessage content={msg.content ?? ''} />
                ) : (
                  <MessageBubble
                    msg={msg}
                    isMe={isMe}
                    isTemp={isTemp}
                    showAvatar={showAvatar}
                    isLastFromSender={isLastFromSender}
                    isDeleting={deletingMsgId === msg.id}
                    onDelete={onDeleteMessage}
                    currentUserId={currentUserId ?? ''}
                  />
                )}
              </div>
            );
          })}
        </>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
