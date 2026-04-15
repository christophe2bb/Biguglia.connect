'use client';

import { ChevronLeft, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import EmptyState from '@/components/ui/EmptyState';

import { useTopicPage } from './useTopicPage';
import { TopicHeader }   from './_components/TopicHeader';
import { TopicBody }     from './_components/TopicBody';
import { ReplyCard }     from './_components/ReplyCard';
import { ReplyComposer } from './_components/ReplyComposer';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ForumTopicClient() {
  const { profile, isModerator, loading: authLoading } = useAuthStore();

  const {
    topic, replies, topicPhotos, loading,
    newReply, quotedReply, submitting,
    isFollowing, copied, lightboxIndex,
    setNewReply, setLightboxIndex,
    submitReply, deleteReply, deleteTopic,
    moderateAction, markSolution, quoteReply, cancelQuote,
    toggleFollow, copyLink, toggleResolved,
    replyRef,
  } = useTopicPage();

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
          onDelete={deleteTopic}
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
                onDelete={deleteReply}
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
