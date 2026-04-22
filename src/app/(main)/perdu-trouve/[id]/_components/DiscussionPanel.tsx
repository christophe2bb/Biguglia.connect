'use client';

import Link from 'next/link';
import { MessageSquare, Loader2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import type { LFItem, LFComment } from '../_types';

type Props = {
  item: LFItem;
  comments: LFComment[];
  chatText: string;
  sending: boolean;
  isLoggedIn: boolean;
  onTextChange: (v: string) => void;
  onSend: () => void;
};

export function DiscussionPanel({
  item, comments, chatText, sending, isLoggedIn, onTextChange, onSend,
}: Props) {
  const gradientStyle = {
    background: item.type === 'perdu'
      ? 'linear-gradient(135deg,#f97316,#ef4444)'
      : 'linear-gradient(135deg,#10b981,#0ea5e9)',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-4 h-4 text-blue-500" />
        <p className="text-sm font-bold text-gray-800">Discussion</p>
        {comments.length > 0 && (
          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {comments.length}
          </span>
        )}
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-400 italic text-center py-4">
          Aucun message — soyez le premier à laisser une info !
        </p>
      ) : (
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                style={gradientStyle}
              >
                {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                <p className="text-xs font-bold text-gray-700">
                  {c.author?.full_name ?? 'Anonyme'}
                  <span className="font-normal text-gray-400 ml-2">{formatRelative(c.created_at)}</span>
                </p>
                <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {isLoggedIn ? (
        <div className="flex gap-2 mt-2">
          <textarea
            value={chatText}
            onChange={e => onTextChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
            }}
            placeholder="Votre message… (Entrée pour envoyer)"
            rows={2}
            className="flex-1 text-sm rounded-xl border border-blue-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
          <button
            onClick={onSend}
            disabled={!chatText.trim() || sending}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 disabled:opacity-40 transition-colors flex-shrink-0 flex items-center gap-1.5"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
          </button>
        </div>
      ) : (
        <Link
          href="/connexion"
          className="text-sm text-center text-blue-600 font-semibold py-2 hover:underline block"
        >
          Connectez-vous pour répondre →
        </Link>
      )}
    </div>
  );
}
