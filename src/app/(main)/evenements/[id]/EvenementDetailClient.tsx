'use client';

/**
 * EvenementDetailClient — Partie interactive uniquement.
 * Reçoit l'événement pré-chargé côté serveur (initialEvent).
 *
 * Rendu :
 *  • Sur mobile  : EventActions en haut, EventTabs en dessous (colonne unique)
 *  • Sur desktop : EventTabs à gauche (colonne principale), EventActions à droite (sidebar sticky)
 *
 * Le hero, la barre de navigation et le meta-strip sont rendus côté serveur (page.tsx).
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

  const actionsPanel = (
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
  );

  const tabsPanel = (
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
  );

  return (
    <>
      {/* ── Layout deux colonnes ──────────────────────────────────────────── */}
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">

        {/* Colonne principale : onglets (info / participants / discussion / historique) */}
        <div>
          {/* Sur mobile : CTA d'inscription en haut */}
          <div className="lg:hidden mb-4">{actionsPanel}</div>

          {tabsPanel}
        </div>

        {/* Sidebar desktop : CTA inscription + actions organisateur */}
        <div className="hidden lg:block sticky top-16 space-y-0">
          {actionsPanel}
        </div>

      </div>

      {/* ── Modaux ───────────────────────────────────────────────────────── */}
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
