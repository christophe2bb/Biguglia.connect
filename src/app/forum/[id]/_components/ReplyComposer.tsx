'use client';

import { ForumReply } from '@/types';
import { Quote, Lock, Users } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';

interface Props {
  profile:       { id: string; full_name?: string | null } | null;
  isLocked:      boolean;
  isMod:         boolean;
  topicStatus:   string;
  newReply:      string;
  quotedReply:   ForumReply | null;
  submitting:    boolean;
  replyRef:      React.RefObject<HTMLTextAreaElement>;
  setNewReply:   (v: string) => void;
  cancelQuote:   () => void;
  onSubmit:      (e: React.FormEvent) => void;
  onUnlock:      () => void;
}

export function ReplyComposer({
  profile, isLocked, isMod, topicStatus,
  newReply, quotedReply, submitting,
  replyRef, setNewReply, cancelQuote, onSubmit, onUnlock,
}: Props) {

  // ── Sujet verrouillé / archivé ────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 text-center">
        <Lock className="w-5 h-5 text-amber-500 mx-auto mb-2" />
        <p className="text-amber-700 text-sm font-medium">
          {topicStatus === 'archive' ? 'Ce sujet est archivé.' : 'Ce sujet est verrouillé — aucune nouvelle réponse.'}
        </p>
        {isMod && topicStatus === 'verrouille' && (
          <button onClick={onUnlock} className="mt-2 text-xs text-amber-700 underline hover:no-underline">
            Déverrouiller ce sujet (modérateur)
          </button>
        )}
      </div>
    );
  }

  // ── Non connecté ─────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-3">Connectez-vous pour participer à ce sujet</p>
        <Link href="/connexion">
          <Button size="sm">Se connecter</Button>
        </Link>
      </div>
    );
  }

  // ── Formulaire actif ──────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-medium text-gray-800 mb-3">Votre réponse</h3>

      {/* Citation en cours */}
      {quotedReply && (
        <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm flex items-start gap-2">
          <Quote className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-gray-600 text-xs">
              {(quotedReply.author as { full_name?: string })?.full_name}
            </span>
            <p className="text-gray-500 line-clamp-2 text-xs mt-0.5">{quotedReply.content}</p>
          </div>
          <button onClick={cancelQuote} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <Textarea
          ref={replyRef}
          value={newReply}
          onChange={e => setNewReply(e.target.value)}
          placeholder="Rédigez votre réponse..."
          required
          className="min-h-[120px]"
        />
        <div className="flex gap-2">
          <Button type="submit" loading={submitting}>Publier la réponse</Button>
          {quotedReply && (
            <Button type="button" variant="outline" onClick={cancelQuote}>Annuler citation</Button>
          )}
        </div>
      </form>
    </div>
  );
}
