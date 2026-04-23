'use client';

import { useState } from 'react';
import { ChevronLeft, MessageCircle, AlertTriangle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

import { useTopicPage } from './useTopicPage';
import { TopicHeader }   from './_components/TopicHeader';
import { TopicBody }     from './_components/TopicBody';
import { ReplyCard }     from './_components/ReplyCard';
import { ReplyComposer } from './_components/ReplyComposer';
import type { InitialTopicData } from './_types';

interface Props {
  initialData?: InitialTopicData;
}

// ── Dialog de confirmation suppression ───────────────────────────────────────
function DeleteConfirmDialog({
  isOpen, title, description, onConfirm, onCancel,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Supprimer
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ForumTopicClient({ initialData }: Props) {
  const { profile, isModerator, loading: authLoading } = useAuthStore();

  // ── Dialog state (remplace window.confirm() bloquant) ─────────────────────
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState(false);
  const [pendingDeleteReplyId, setPendingDeleteReplyId] = useState<string | null>(null);

  const {
    topic, replies, topicPhotos, loading,
    newReply, quotedReply, submitting,
    isFollowing, copied, lightboxIndex,
    setNewReply, setLightboxIndex,
    submitReply, deleteReply, deleteTopic,
    moderateAction, markSolution, quoteReply, cancelQuote,
    toggleFollow, copyLink, toggleResolved,
    replyRef,
  } = useTopicPage(initialData);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-100 rounded mb-2" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    );
  }

  if (!topic) return null;

  // ── Derived flags ──────────────────────────────────────────────────────────
  const canDelete  = !authLoading && !!profile && (profile.id === topic.author_id || isModerator());
  const canEdit    = !authLoading && !!profile && profile.id === topic.author_id;
  const isMod      = !authLoading && isModerator();
  const isLocked   = topic.status === 'verrouille' || topic.status === 'archive';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ── Dialog suppression du sujet ────────────────────────────────────── */}
      <DeleteConfirmDialog
        isOpen={confirmDeleteTopic}
        title="Supprimer ce sujet ?"
        description="Cette action est irréversible. Le sujet et toutes ses réponses seront définitivement supprimés."
        onConfirm={() => { setConfirmDeleteTopic(false); deleteTopic(); }}
        onCancel={() => setConfirmDeleteTopic(false)}
      />

      {/* ── Dialog suppression d'une réponse ───────────────────────────────── */}
      <DeleteConfirmDialog
        isOpen={!!pendingDeleteReplyId}
        title="Supprimer cette réponse ?"
        description="Cette action est irréversible."
        onConfirm={() => {
          if (pendingDeleteReplyId) deleteReply(pendingDeleteReplyId);
          setPendingDeleteReplyId(null);
        }}
        onCancel={() => setPendingDeleteReplyId(null)}
      />

      {/* Retour forum */}
      <Link href="/forum"
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Forum
      </Link>

      {/* ══════════════════════════════════════════════
          SUJET PRINCIPAL
      ══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <TopicHeader
          topic={topic}
          topicId={topic.id}
          replyCount={replies.length}
          canEdit={canEdit}
          canDelete={canDelete}
          isMod={isMod}
          onDelete={() => setConfirmDeleteTopic(true)}
          onModerate={moderateAction}
        />
        <TopicBody
          topic={topic}
          photos={topicPhotos}
          lightboxIndex={lightboxIndex}
          isFollowing={isFollowing}
          copied={copied}
          canResolve={canEdit || isMod}
          currentUserId={profile?.id}
          onLightbox={setLightboxIndex}
          onToggleFollow={toggleFollow}
          onCopyLink={copyLink}
          onToggleResolved={toggleResolved}
        />
      </div>

      {/* ══════════════════════════════════════════════
          RÉPONSES
      ══════════════════════════════════════════════ */}
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-400" />
          {replies.length} réponse{replies.length !== 1 ? 's' : ''}
        </h2>

        {replies.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Pas encore de réponse"
            description="Soyez le premier à contribuer à ce sujet !"
          />
        ) : (
          <div className="space-y-3">
            {replies.map(reply => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                topicAuthorId={topic.author_id}
                currentUserId={profile?.id}
                isMod={isMod}
                onDelete={(id) => setPendingDeleteReplyId(id)}
                onQuote={quoteReply}
                onMarkSolution={markSolution}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          COMPOSER
      ══════════════════════════════════════════════ */}
      <ReplyComposer
        profile={profile}
        isLocked={isLocked}
        isMod={isMod}
        topicStatus={topic.status}
        newReply={newReply}
        quotedReply={quotedReply}
        submitting={submitting}
        replyRef={replyRef}
        setNewReply={setNewReply}
        cancelQuote={cancelQuote}
        onSubmit={submitReply}
        onUnlock={() => moderateAction('deverrouiller')}
      />
    </div>
  );
}
