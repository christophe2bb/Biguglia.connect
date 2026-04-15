'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Handshake, MessageSquare, Send, Loader2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import type { HelpComment, HelpParticipant } from '../_types';

// ── Helpers list ─────────────────────────────────────────────────────────────

type HelpersProps = {
  participants: HelpParticipant[];
  loadingPart: boolean;
  isAuthor: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
};

export function HelpersList({ participants, loadingPart, isAuthor, onAccept, onDecline }: HelpersProps) {
  const helpers = participants.filter(p => p.role === 'helper');

  if (!isAuthor && helpers.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
        <Handshake className="w-5 h-5 text-emerald-500" />
        Personnes disponibles pour aider ({helpers.length})
      </h2>

      {loadingPart ? (
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      ) : helpers.length === 0 ? (
        <p className="text-sm text-gray-400 italic">Aucune personne n&apos;a encore proposé son aide.</p>
      ) : (
        <div className="space-y-3">
          {helpers.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {p.user?.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{p.user?.full_name ?? 'Membre'}</p>
                {p.message && <p className="text-xs text-gray-600 mt-0.5">{p.message}</p>}
                <p className="text-xs text-gray-400">{formatRelative(p.created_at)}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                p.state === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                p.state === 'declined' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {p.state === 'accepted' ? '✓ Accepté' : p.state === 'declined' ? '✗ Refusé' : 'En attente'}
              </span>
              {isAuthor && p.state === 'pending' && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => onAccept(p.id)}
                    className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600 transition-all">✓</button>
                  <button type="button" onClick={() => onDecline(p.id)}
                    className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-400 transition-all">✗</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Discussion ───────────────────────────────────────────────────────────────

type DiscussionProps = {
  comments: HelpComment[];
  loadingComments: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  sendingComment: boolean;
  onSend: () => void;
  profile: { full_name?: string | null } | null;
};

export function Discussion({
  comments, loadingComments, commentText, setCommentText,
  sendingComment, onSend, profile,
}: DiscussionProps) {
  const commentRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-violet-500" />
        Discussion ({comments.length})
      </h2>

      {loadingComments ? (
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">Aucun message — soyez le premier à répondre !</p>
      ) : (
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
                {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-800">{c.author?.full_name ?? 'Anonyme'}</span>
                  <span className="text-xs text-gray-400">{formatRelative(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Champ commentaire */}
      {profile ? (
        <div className="flex items-end gap-2 pt-4 border-t border-gray-100">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
            style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
            {profile.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1">
            <textarea ref={commentRef} value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="Écrire un message… (Entrée pour envoyer)" rows={2}
              className="w-full text-sm rounded-xl border border-gray-200 px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-gray-700 placeholder-gray-400" />
          </div>
          <button type="button" onClick={onSend} disabled={!commentText.trim() || sendingComment}
            className="p-3 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-40 transition-all flex-shrink-0">
            {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="pt-4 border-t border-gray-100 text-center">
          <Link href="/connexion" className="text-sm text-orange-600 font-bold hover:underline">
            Connectez-vous pour participer à la discussion →
          </Link>
        </div>
      )}
    </div>
  );
}
