'use client';

/**
 * Biguglia Connect — Page détail Perdu / Trouvé
 * /perdu-trouve/[id] — thin orchestrator
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, Package, ArrowLeft } from 'lucide-react';
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

export default function PerduTrouveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuthStore();

  const {
    item, comments, history, allPhotos,
    loading, notFound,
    lightboxOpen, lightboxIdx,
    showHistory, chatText, sending, transitioning,
    openLightbox, closeLightbox,
    setShowHistory, setChatText,
    handleStatusChange, handleDelete,
    handleSendComment, handleShare, handlePrint,
  } = useLFDetail(id);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">Annonce introuvable</p>
          <Link
            href="/perdu-trouve"
            className="mt-4 inline-flex items-center gap-2 text-orange-600 font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const isAuthor = profile?.id === item.author_id;
  const isAdmin  = profile?.role === 'admin' || profile?.role === 'moderator';
  const canEdit  = isAuthor || isAdmin;
  const isActive = ['perdu', 'trouve', 'identifie'].includes(item.status);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">

      {/* Navigation bar */}
      <LFNavBar item={item} onShare={handleShare} onPrint={handlePrint} />

      {/* Print-only header */}
      <PrintHeader item={item} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Gallery (cover + thumbnails + lightbox) */}
        <LFGallery
          item={item}
          photos={allPhotos}
          lightboxOpen={lightboxOpen}
          lightboxIdx={lightboxIdx}
          onOpen={openLightbox}
          onClose={closeLightbox}
        />

        {/* Main info panel (badges, title, location, description, details, contact) */}
        <ItemInfoPanel item={item} />

        {/* Actions panel (contact CTA, status transitions, share, print, edit, archive, report) */}
        <ActionsPanel
          item={item}
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
          item={item}
          comments={comments}
          chatText={chatText}
          sending={sending}
          isLoggedIn={!!profile}
          onTextChange={setChatText}
          onSend={() => handleSendComment(profile?.id)}
        />

        {/* Author trust block */}
        <AuthorPanel item={item} />

        {/* Status history (collapsible) */}
        <StatusHistoryPanel
          history={history}
          showHistory={showHistory}
          onToggle={() => setShowHistory(v => !v)}
        />

        {/* Security tips */}
        <SecurityTips proofRequired={item.proof_required} />

      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
