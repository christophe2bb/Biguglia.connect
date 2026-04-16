'use client';

import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { formatRelative, cn } from '@/lib/utils';
import { ConvWithOther } from '../_types';
import { RELATED_CONFIG } from '../_config';
import { resolveDisplayName } from '../_utils';

// ─── Badge de type de contenu lié ─────────────────────────────────────────────
const TypeBadge = memo(function TypeBadge({ relatedType }: { relatedType?: string | null }) {
  if (!relatedType || !RELATED_CONFIG[relatedType]) return null;
  const cfg  = RELATED_CONFIG[relatedType];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md',
      cfg.color, cfg.bg
    )}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
});

// ─── Props ────────────────────────────────────────────────────────────────────
interface ConversationListItemProps {
  conv: ConvWithOther;
  isDeleting: boolean;
  isConfirm: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Élément individuel de la liste des conversations.
 *
 * Responsabilités :
 *   - Avatar avec indicateur non-lu (point rouge) ou icône de type
 *   - Nom de l'autre participant (via resolveDisplayName)
 *   - Prévisualisation du dernier message
 *   - Badge de type de conversation
 *   - Horodatage relatif
 *   - Badge de compteur non-lus
 *   - Popup de confirmation de suppression
 *   - Animation de sortie lors de la suppression
 *
 * Mémoïsé avec React.memo : évite de re-rendre toute la liste
 * à chaque frappe dans la barre de recherche.
 */
const ConversationListItem = memo(function ConversationListItem({
  conv,
  isDeleting,
  isConfirm,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onClick,
  onKeyDown,
}: ConversationListItemProps) {
  const hasUnread = (conv.unread_count || 0) > 0;
  const relCfg    = conv.related_type ? RELATED_CONFIG[conv.related_type] : null;
  const name      = resolveDisplayName(conv.other_user, conv.subject || 'Conversation');

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isDeleting && 'opacity-0 scale-y-0 max-h-0 overflow-hidden pointer-events-none'
      )}
    >
      {/* ── Popup confirmation suppression ──────────────────────────────────── */}
      {isConfirm && (
        <div data-conv-menu className="flex items-center gap-2 bg-red-50 border-b border-red-100 px-5 py-3 text-sm">
          <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="flex-1 text-gray-700 font-medium">Supprimer cette conversation ?</span>
          <button
            onClick={onConfirmDelete}
            className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            Supprimer
          </button>
          <button
            onClick={onCancelDelete}
            className="text-gray-400 hover:text-gray-600 font-medium text-xs px-2"
          >
            Annuler
          </button>
        </div>
      )}

      {/* ── Ligne principale ────────────────────────────────────────────────── */}
      <div className={cn(
        'group flex items-center gap-0 transition-colors',
        isConfirm ? 'bg-red-50/50' : hasUnread ? 'bg-brand-50/20' : 'hover:bg-gray-50/60'
      )}>
        {/* Bande non-lu */}
        <div className={cn(
          'w-1 self-stretch rounded-r flex-shrink-0',
          hasUnread ? 'bg-brand-500' : 'bg-transparent'
        )} />

        {/* Zone cliquable — div + router.push pour laisser React re-render avant navigation */}
        <div
          role="link"
          tabIndex={0}
          className="flex-1 flex items-center gap-3.5 px-4 py-4 min-w-0 cursor-pointer"
          onClick={onClick}
          onKeyDown={onKeyDown}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar
              src={conv.other_user?.avatar_url}
              name={name}
              size="md"
            />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            )}
            {!hasUnread && relCfg && (() => {
              const RIcon = relCfg.icon;
              return (
                <span className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border border-white flex items-center justify-center shadow-sm',
                  relCfg.bg
                )}>
                  <RIcon className={cn('w-2.5 h-2.5', relCfg.color)} />
                </span>
              );
            })()}
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {/* Ligne titre + horodatage */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className={cn(
                'truncate text-sm',
                hasUnread ? 'font-black text-gray-900' : 'font-semibold text-gray-800'
              )}>
                {name}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {conv.last_message_at ? formatRelative(conv.last_message_at) : ''}
                </span>
                {hasUnread && (
                  <span className="bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {(conv.unread_count ?? 0) > 99 ? '99+' : conv.unread_count}
                  </span>
                )}
              </div>
            </div>

            {/* Aperçu du dernier message */}
            <p className={cn(
              'text-sm truncate',
              hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500'
            )}>
              {conv.last_message_text || <span className="italic text-gray-400">Aucun message</span>}
            </p>

            {/* Badge type de contenu + sujet */}
            {conv.related_type && conv.related_type !== 'general' && (
              <div className="mt-1.5">
                <TypeBadge relatedType={conv.related_type} />
                {conv.subject && (
                  <span className="text-xs text-gray-400 ml-1.5 truncate">
                    · {conv.subject.slice(0, 40)}{conv.subject.length > 40 ? '…' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bouton supprimer */}
        <button
          data-conv-menu
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-xl mr-3 flex items-center justify-center transition-all',
            isConfirm
              ? 'bg-red-500 text-white'
              : 'text-gray-300 hover:text-red-500 hover:bg-red-50 active:text-red-600 active:bg-red-50'
          )}
          title="Supprimer la conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default ConversationListItem;
