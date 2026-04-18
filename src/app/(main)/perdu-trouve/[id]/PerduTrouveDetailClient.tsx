'use client';

/**
 * PerduTrouveDetailClient — Partie interactive.
 * Reçoit initialItem pré-chargé côté serveur.
 * Gère : galerie, actions, discussion, historique, lightbox, partage, impression.
 */

import { useAuthStore } from '@/lib/auth-store';
import { useLFDetail }          from './_hooks/useLFDetail';
import { LFNavBar }             from './_components/LFNavBar';
import { PrintHeader }          from './_components/PrintHeader';
import { LFGallery }            from './_components/LFGallery';
import { ItemInfoPanel }        from './_components/ItemInfoPanel';
import { ActionsPanel }         from './_components/ActionsPanel';
import { DiscussionPanel }      from './_components/DiscussionPanel';
import { AuthorPanel }          from './_components/AuthorPanel';
import { StatusHistoryPanel }   from './_components/StatusHistoryPanel';
import { SecurityTips }         from './_components/SecurityTips';
import type { LFItem } from './_types';

interface Props {
  initialItem: LFItem;
}

export default function PerduTrouveDetailClient({ initialItem }: Props) {
  const { profile } = useAuthStore();

  const {
    item, comments, history, allPhotos,
    lightboxOpen, lightboxIdx,
    showHistory, chatText, sending, transitioning,
    openLightbox, closeLightbox,
    setShowHistory, setChatText,
    handleStatusChange, handleDelete,
    handleSendComment, handleShare, handlePrint,
  } = useLFDetail(initialItem.id, initialItem);

  // Use server-loaded item if client hook hasn't loaded yet
  const currentItem = item ?? initialItem;

  const isAuthor = profile?.id === currentItem.author_id;
  const isAdmin  = profile?.role === 'admin' || profile?.role === 'moderator';
  const canEdit  = isAuthor || isAdmin;
  const isActive = ['perdu', 'trouve', 'identifie'].includes(currentItem.status);

  return (
    <>
      {/* Navigation bar */}
      <LFNavBar item={currentItem} onShare={handleShare} onPrint={handlePrint} />

      {/* Print-only header */}
      <PrintHeader item={currentItem} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Gallery (cover + thumbnails + lightbox) */}
        <LFGallery
          item={currentItem}
          photos={allPhotos}
          lightboxOpen={lightboxOpen}
          lightboxIdx={lightboxIdx}
          onOpen={openLightbox}
          onClose={closeLightbox}
        />

        {/* Main info panel (badges, title, location, description, details, contact) */}
        <ItemInfoPanel item={currentItem} />

        {/* Actions panel (contact CTA, status transitions, share, print, edit, archive, report) */}
        <ActionsPanel
          item={currentItem}
          isAuthor={isAuthor}
          canEdit={canEdit}
          isActive={isActive}
          transitioning={transitioning}
          userId={profile?.id}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onShare={handleShare}
          onPrint={handlePrint}
        />

        {/* Community discussion */}
        <DiscussionPanel
          item={currentItem}
          comments={comments}
          chatText={chatText}
          sending={sending}
          isLoggedIn={!!profile}
          onTextChange={setChatText}
          onSend={() => handleSendComment(profile?.id)}
        />

        {/* Author trust block */}
        <AuthorPanel item={currentItem} />

        {/* Status history (collapsible) */}
        <StatusHistoryPanel
          history={history}
          showHistory={showHistory}
          onToggle={() => setShowHistory(v => !v)}
        />

        {/* Security tips */}
        <SecurityTips proofRequired={currentItem.proof_required} />

      </div>
    </>
  );
}
