'use client';

/**
 * Page détail événement — orchestrateur pur.
 * Toute la logique est dans useEventDetail.
 * Toute l'UI est dans les sous-composants _components/*.
 *
 * Sections :
 *   1. EventHero         — cover, titre, catégorie, badge statut, iCal/partage
 *   2. EventMetaStrip    — date, horaire, lieu, tarif
 *   3. EventActions      — CTA inscription + panneau organisateur
 *   4. EventTabs         — info / participants / discussion / historique
 *   5. TransitionModal   — changement de statut
 *   6. DeleteModal       — confirmation suppression
 *   7. Lightbox          — agrandissement photos
 */

import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useEventDetail } from './useEventDetail';

import EventHero      from './_components/EventHero';
import EventMetaStrip from './_components/EventMetaStrip';
import EventActions   from './_components/EventActions';
import EventTabs      from './_components/EventTabs';
import {
  TransitionModal,
  DeleteModal,
  Lightbox,
} from './_components/EventModals';

export default function EvenementDetailClient() {
  const { profile } = useAuthStore();
  const ctx = useEventDetail();

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (ctx.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }
  if (!ctx.event) return null;

  const { event } = ctx;
  const isAuthor = profile?.id === event.author_id;
  const isAdmin  = profile?.role === 'admin' || profile?.role === 'moderator';
  const allPhotos = event.photos ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. Hero */}
      <EventHero
        event={event}
        onDownloadIcal={ctx.handleDownloadIcal}
        onCopyLink={ctx.handleCopyLink}
        showShareMenu={ctx.showShareMenu}
        onToggleShare={() => ctx.setShowShareMenu(s => !s)}
        copied={ctx.copied}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 pb-20">
        {/* 2. Méta-données */}
        <EventMetaStrip event={event} />

        {/* 3. CTA + actions organisateur */}
        <EventActions
          event={event}
          profile={profile}
          joiningEvent={ctx.joiningEvent}
          onJoin={ctx.handleJoinWithWaitlist}
          onOpenTransition={t => {
            ctx.setPendingTransition(t);
            ctx.setShowTransitionModal(true);
          }}
          onOpenDelete={() => ctx.setShowDeleteConfirm(true)}
        />

        {/* 4. Onglets */}
        <EventTabs
          event={event}
          profile={profile}
          activeTab={ctx.activeTab}
          onTabChange={ctx.setActiveTab}
          participants={ctx.participants}
          comments={ctx.comments}
          statusHistory={ctx.statusHistory}
          commentText={ctx.commentText}
          commenting={ctx.commenting}
          onCommentChange={ctx.setCommentText}
          onCommentSubmit={ctx.handleComment}
          onDeleteComment={ctx.handleDeleteComment}
          onMarkAttendance={ctx.handleMarkAttendance}
          isAuthor={isAuthor}
          isAdmin={isAdmin}
        />
      </div>

      {/* 5. Modal changement de statut */}
      <TransitionModal
        open={ctx.showTransitionModal}
        pending={ctx.pendingTransition}
        reason={ctx.transitionReason}
        newDate={ctx.newDate}
        newTime={ctx.newTime}
        onReasonChange={ctx.setTransitionReason}
        onDateChange={ctx.setNewDate}
        onTimeChange={ctx.setNewTime}
        onConfirm={ctx.handleStatusTransition}
        onCancel={() => {
          ctx.setShowTransitionModal(false);
          ctx.setPendingTransition(null);
          ctx.setTransitionReason('');
        }}
      />

      {/* 6. Modal suppression */}
      <DeleteModal
        open={ctx.showDeleteConfirm}
        onConfirm={ctx.handleDelete}
        onCancel={() => ctx.setShowDeleteConfirm(false)}
      />

      {/* 7. Lightbox */}
      <Lightbox
        photos={allPhotos}
        idx={ctx.lightboxIdx}
        onClose={() => ctx.setLightboxIdx(null)}
      />
    </div>
  );
}
