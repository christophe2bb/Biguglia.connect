'use client';

/**
 * HelpRequestDetailClient — Partie interactive uniquement.
 * Reçoit l'item pré-chargé côté serveur.
 * Rendu sélectionné par `variant` pour s'insérer dans la page serveur.
 *
 * Variants :
 *  - topbar        : favoris + partage + signaler + éditer
 *  - photo-overlay : bouton transparent pour ouvrir la lightbox
 *  - main-content  : participants, discussion, statut, notation
 *  - sidebar       : sidebar (proposer aide, changer statut, contact)
 *  - mobile-bar    : barre sticky mobile
 *  - lightbox      : PhotoViewer lazy
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Bookmark, BookmarkCheck, Share2, Check, HandHeart,
  Loader2, Pencil, Star,
} from 'lucide-react';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import ContactButton from '@/components/ui/ContactButton';
import { useAuthStore } from '@/lib/auth-store';
import { CATEGORIES } from '../_constants';
import { useHelpRequestDetail } from './useHelpRequestDetail';
import HelpSidebar from './_components/HelpSidebar';
import HelpStatus from './_components/HelpStatus';
import { HelpersList, Discussion } from './_components/HelpHistory';
import type { HelpRequest } from './_types';

const PhotoViewer = dynamic(
  () => import('@/components/ui/PhotoViewer').then(m => m.PhotoViewer),
  { ssr: false },
);
import { toPhotoItems } from '@/components/ui/PhotoViewer';

type Variant = 'topbar' | 'photo-overlay' | 'main-content' | 'sidebar' | 'mobile-bar' | 'lightbox';

interface Props {
  item: HelpRequest;
  variant: Variant;
}

export default function HelpRequestDetailClient({ item, variant }: Props) {
  const { profile } = useAuthStore();
  const d = useHelpRequestDetail(item);

  const allPhotos = toPhotoItems(item.photos ?? []);
  const _catConf = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[CATEGORIES.length - 1];

  // ── topbar: favoris + partage + signaler + éditer ────────────────────────
  if (variant === 'topbar') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={d.toggleSave}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 transition-all"
        >
          {d.isSaved
            ? <BookmarkCheck className="w-4 h-4 text-amber-500" />
            : <Bookmark className="w-4 h-4 text-gray-500" />}
        </button>

        <div ref={d.shareRef} className="relative">
          <button
            type="button"
            onClick={() => d.setOpenShare(!d.openShare)}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
          >
            <Share2 className="w-4 h-4 text-gray-500" />
          </button>
          {d.openShare && (
            <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-40 overflow-hidden">
              {[
                { label: '💬 Par SMS', onClick: () => window.open(`sms:?body=${d.shareText}`, '_self') },
                { label: '📧 Par Email', onClick: () => window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${d.shareText}`, '_self') },
                { label: '🔗 Copier lien', onClick: () => navigator.clipboard?.writeText(d.shareUrl) },
              ].map(({ label, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { onClick(); d.setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50 first:border-t-0"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {profile && !d.isAuthor && (
          <ReportButton targetType="help_request" targetId={item.id} targetTitle={item.title} variant="mini" />
        )}
        {d.isAuthor && (
          <Link
            href={`/coups-de-main/${item.id}/modifier`}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 transition-all"
          >
            <Pencil className="w-4 h-4 text-blue-500" />
          </Link>
        )}
      </div>
    );
  }

  // ── photo-overlay: bouton transparent couvrant la photo pour ouvrir lightbox ─
  if (variant === 'photo-overlay') {
    if (allPhotos.length === 0) return null;
    return (
      <button
        type="button"
        onClick={() => { d.setLightboxIdx(0); d.setLightboxOpen(true); }}
        className="absolute inset-0 w-full h-full"
        aria-label="Agrandir la photo"
      />
    );
  }

  // ── main-content: participants, discussion, statut, notation ─────────────
  if (variant === 'main-content') {
    return (
      <>
        <HelpersList
          participants={d.participants}
          loadingPart={d.loadingPart}
          isAuthor={d.isAuthor}
          onAccept={d.handleAcceptParticipant}
          onDecline={d.handleDeclineParticipant}
        />

        <Discussion
          comments={d.comments}
          loadingComments={d.loadingComments}
          commentText={d.commentText}
          setCommentText={d.setCommentText}
          sendingComment={d.sendingComment}
          onSend={d.handleSendComment}
          profile={profile}
        />

        <HelpStatus item={d.item ?? item} />

        {d.isResolved && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" /> Avis sur cette aide
            </h2>
            <RatingWidget
              targetType="help_request"
              targetId={item.id}
              authorId={item.author_id}
              userId={profile?.id}
              compact={false}
              showPoll
            />
          </div>
        )}
      </>
    );
  }

  // ── sidebar ───────────────────────────────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      <HelpSidebar
        item={d.item ?? item}
        isAuthor={d.isAuthor}
        isActive={d.isActive}
        userId={profile?.id}
        helping={d.helping}
        alreadyHelping={d.alreadyHelping}
        onCanHelp={d.handleCanHelp}
        onStatusChange={d.handleStatusChange}
      />
    );
  }

  // ── mobile-bar ────────────────────────────────────────────────────────────
  if (variant === 'mobile-bar') {
    if (d.isAuthor || !d.isActive) return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg lg:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <ContactButton
            sourceType="help_request"
            sourceId={item.id}
            sourceTitle={item.title}
            ownerId={item.author_id}
            userId={profile?.id}
            size="sm"
            className="flex-1 justify-center"
          />
          <button
            type="button"
            onClick={d.handleCanHelp}
            disabled={d.helping || d.alreadyHelping}
            className={`flex-1 flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm transition-all ${
              item.help_type !== 'offre'
                ? d.alreadyHelping
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
                : d.alreadyHelping
                ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-60`}
          >
            {d.helping
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : item.help_type !== 'offre'
              ? <Check className="w-4 h-4" />
              : <HandHeart className="w-4 h-4" />}
            {d.alreadyHelping
              ? (item.help_type !== 'offre' ? 'Proposé ✓' : 'Envoyé ✓')
              : (item.help_type !== 'offre' ? 'Je peux aider' : 'Intéressé(e)')}
          </button>
        </div>
      </div>
    );
  }

  // ── lightbox ──────────────────────────────────────────────────────────────
  if (variant === 'lightbox') {
    if (!d.lightboxOpen || allPhotos.length === 0) return null;
    return (
      <PhotoViewer
        photos={allPhotos}
        initialIndex={d.lightboxIdx}
        onClose={() => d.setLightboxOpen(false)}
        title={item.title}
      />
    );
  }

  return null;
}
