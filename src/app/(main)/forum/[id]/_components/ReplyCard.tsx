'use client';

import { useState } from 'react';
import { ForumReply } from '@/types';
import { Quote, MoreHorizontal, Trash2, CheckCircle2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { formatRelative } from '@/lib/utils';
import ReportButton from '@/components/ui/ReportButton';
import { ReactionPanel } from './ReactionPanel';

interface Props {
  reply:         ForumReply;
  topicAuthorId: string;
  currentUserId?: string;
  isMod:         boolean;
  onDelete:      (id: string) => void;
  onQuote:       (reply: ForumReply) => void;
  onMarkSolution:(id: string, val: boolean) => void;
}

export function ReplyCard({
  reply, topicAuthorId, currentUserId, isMod, onDelete, onQuote, onMarkSolution,
}: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const isAuthor      = currentUserId === reply.author_id;
  const isTopicAuthor = currentUserId === topicAuthorId;

  return (
    <div id={`reply-${reply.id}`}
      className={`bg-white rounded-2xl border p-5 transition-colors ${
        reply.is_solution ? 'border-green-300 bg-green-50' : 'border-gray-100'
      }`}>

      {/* Solution indicator */}
      {reply.is_solution && (
        <div className="flex items-center gap-1.5 text-green-700 text-xs font-semibold mb-3">
          <CheckCircle2 className="w-4 h-4" /> Solution retenue
        </div>
      )}

      {/* Citation */}
      {reply.quoted_reply && (
        <div className="bg-gray-50 border-l-4 border-gray-300 rounded-lg p-3 mb-3 text-sm">
          <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Quote className="w-3 h-3" />
            <span className="font-medium">{(reply.quoted_reply.author as { full_name?: string })?.full_name}</span>
          </div>
          <p className="text-gray-600 line-clamp-3">{reply.quoted_reply.content}</p>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          src={(reply.author as { avatar_url?: string })?.avatar_url}
          name={(reply.author as { full_name?: string })?.full_name || '?'}
          size="sm"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-800 text-sm">{(reply.author as { full_name?: string })?.full_name}</span>
            {(reply.author as { role?: string })?.role === 'artisan_verified' && <Badge variant="success">Artisan</Badge>}
            {(reply.author as { role?: string })?.role === 'admin' && <Badge variant="warning">Admin</Badge>}
            {(reply.author as { role?: string })?.role === 'moderator' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">Mod</span>
            )}
          </div>
          <div className="text-xs text-gray-400">{formatRelative(reply.created_at)}</div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1 w-44">
              <button onClick={() => { onQuote(reply); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <Quote className="w-3.5 h-3.5" /> Citer
              </button>
              {isTopicAuthor && !reply.is_solution && (
                <button onClick={() => { onMarkSolution(reply.id, true); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Marquer solution
                </button>
              )}
              {isTopicAuthor && reply.is_solution && (
                <button onClick={() => { onMarkSolution(reply.id, false); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Retirer solution
                </button>
              )}
              {currentUserId && currentUserId !== reply.author_id && (
                <ReportButton targetType="post" targetId={reply.id} targetTitle="Réponse" variant="icon" />
              )}
              {(isAuthor || isMod) && (
                <button onClick={() => { onDelete(reply.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed mb-3">{reply.content}</p>

      {/* Actions bas */}
      <div className="flex items-center gap-3 flex-wrap">
        <ReactionPanel targetId={reply.id} targetType="reply" currentUserId={currentUserId} />
        <button onClick={() => onQuote(reply)}
          className="text-xs text-gray-400 hover:text-brand-600 transition-colors flex items-center gap-1 ml-auto">
          <Quote className="w-3 h-3" /> Citer
        </button>
      </div>
    </div>
  );
}
