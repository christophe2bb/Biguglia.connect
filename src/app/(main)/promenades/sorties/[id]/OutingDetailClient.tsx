'use client';

import { Calendar, Loader2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { useOutingDetail } from './useOutingDetail';
import OutingHero         from './_components/OutingHero';
import OutingStats        from './_components/OutingStats';
import OutingActions      from './_components/OutingActions';
import OutingTabs         from './_components/OutingTabs';
import OutingStatusModal  from './_components/OutingStatusModal';

export default function OutingDetailClient() {
  const { profile } = useAuthStore();
  const d = useOutingDetail();

  // ── Loading ───────────────────────────────────────────────────────────────
  if (d.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }
  if (!d.outing) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white">

      {/* ── Hero ── */}
      <OutingHero
        outing={d.outing}
        coverPhoto={d.coverPhoto}
        frenchStatus={d.frenchStatus}
        canManage={d.canManage}
        onDelete={d.handleDeleteOuting}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Stats ── */}
        <OutingStats
          outing={d.outing}
          activeCount={d.activeParticipants.length}
          fillPct={d.fillPct}
          dateLabel={d.dateLabel}
        />

        {/* ── Actions ── */}
        <OutingActions
          outing={d.outing}
          profile={profile}
          canManage={d.canManage}
          frenchStatus={d.frenchStatus}
          userParticipation={d.userParticipation}
          availableTransitions={d.availableTransitions}
          registering={d.registering}
          onRegister={d.handleRegister}
          onOpenTransition={d.openTransitionModal}
        />

        {/* ── Tabs ── */}
        <OutingTabs
          outing={d.outing}
          activeTab={d.activeTab}
          setActiveTab={d.setActiveTab}
          activeParticipants={d.activeParticipants}
          comments={d.comments}
          statusHistory={d.statusHistory}
          canManage={d.canManage}
          frenchStatus={d.frenchStatus}
          profile={profile}
          commentText={d.commentText}
          setCommentText={d.setCommentText}
          sendingComment={d.sendingComment}
          onSendComment={d.handleSendComment}
        />

        {/* ── Footer ── */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            <Calendar className="w-3 h-3 inline mr-1" />
            Sortie créée {formatRelative(d.outing.created_at)}
          </p>
        </div>
      </div>

      {/* ── Status transition modal ── */}
      <OutingStatusModal
        show={d.showModal}
        pendingTo={d.pendingTo}
        pendingLabel={d.pendingLabel}
        pendingRequiresReason={d.pendingRequiresReason}
        transitionReason={d.transitionReason}
        setTransitionReason={d.setTransitionReason}
        applyingTransition={d.applyingTransition}
        onConfirm={d.applyTransition}
        onClose={d.closeModal}
      />
    </div>
  );
}
