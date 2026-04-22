'use client';

/**
 * EvenementDetailClient — Partie interactive uniquement.
 * Reçoit l'événement pré-chargé côté serveur (initialEvent).
 * Gère : inscription, partage, onglets (participants/discussion/historique),
 *        modaux (transition statut, suppression), lightbox photos.
 *
 * Le rendu statique (hero, meta-strip, description, organisateur) est fait
 * dans page.tsx côté serveur pour un LCP optimal.
 */

import { useAuthStore } from '@/lib/auth-store';
import { useEventDetail } from './useEventDetail';

import EventActions from './_components/EventActions';
import EventTabs    from './_components/EventTabs';
import {
  TransitionModal,
  DeleteModal,
  Lightbox,
} from './_components/EventModals';
import type { EventDetail } from './_types';

interface Props {
  initialEvent: EventDetail;
}

export default function EvenementDetailClient({ initialEvent }: Props) {
  const { profile } = useAuthStore();
  const ctx = useEventDetail(initialEvent);

  // event may be refreshed after actions (join, status change…)
  const event = ctx.event ?? initialEvent;
  const isAuthor = profile?.id === event.author_id;
  const isAdmin  = profile?.role === 'admin' || profile?.role === 'moderator';
  const allPhotos = event.photos ?? [];

  return (
    <>
      {/* CTA inscription + panneau organisateur */}
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

      {/* Onglets : info / participants / discussion / historique */}
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

      {/* Modal changement de statut */}
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

      {/* Modal suppression */}
      <DeleteModal
        open={ctx.showDeleteConfirm}
        onConfirm={ctx.handleDelete}
        onCancel={() => ctx.setShowDeleteConfirm(false)}
      />

      {/* Lightbox photos */}
      <Lightbox
        photos={allPhotos}
        idx={ctx.lightboxIdx}
        onClose={() => ctx.setLightboxIdx(null)}
        eventTitle={event.title}
      />
    </>
  );
}
