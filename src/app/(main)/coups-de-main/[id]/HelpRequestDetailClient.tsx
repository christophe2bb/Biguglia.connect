'use client';

/**
 * HelpRequestDetailClient — Partie interactive uniquement.
 * Reçoit l'item pré-chargé côté serveur.
 * Rendu sélectionné par `variant` pour s'insérer dans la page serveur.
 *
 * Variants :
 *  - topbar        : favoris + partage + signaler + éditer
 *  - photo-overlay : bouton transparent pour ouvrir la lightbox
 *  - author-actions: boutons auteur (Modifier, statut, Supprimer) — visible tous écrans
 *  - main-content  : participants, discussion, statut, notation
 *  - sidebar       : sidebar (proposer aide, changer statut, contact)
 *  - mobile-bar    : barre sticky mobile
 *  - lightbox      : PhotoViewer lazy
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Bookmark, BookmarkCheck, Share2, Check, HandHeart,
  Loader2, Pencil, Star, Trash2, AlertTriangle,
} from 'lucide-react';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import ContactButton from '@/components/ui/ContactButton';
import Modal from '@/components/ui/Modal';
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
import { toPhotoItems } from '@/components/ui/photo-utils';

type Variant = 'topbar' | 'photo-overlay' | 'author-actions' | 'main-content' | 'sidebar' | 'mobile-bar' | 'lightbox';

interface Props {
  item: HelpRequest;
  variant: Variant;
}

// ── Dialog de confirmation suppression ────────────────────────────────────────
interface DeleteConfirmProps {
  isOpen: boolean;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmDialog({ isOpen, title, deleting, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">
          Supprimer cette annonce ?
        </h3>
        <p className="text-sm text-gray-500 mb-1 font-medium truncate px-2">
          « {title} »
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Cette action est irréversible. L&apos;annonce et toutes ses réponses seront définitivement supprimées.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Suppression…</>
              : <><Trash2 className="w-4 h-4" /> Supprimer</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HelpRequestDetailClient({ item, variant }: Props) {
  const { profile } = useAuthStore();
  const d = useHelpRequestDetail(item);

  // État dialog suppression (géré ici, pas dans le hook — évite confirm() bloquant)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const allPhotos = toPhotoItems(item.photos ?? []);
  const _catConf = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[CATEGORIES.length - 1];

  // Déclenche la suppression après confirmation dans le dialog
  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    await d.handleDelete();
    setDeleting(false);
    setConfirmDeleteOpen(false);
  };

  // ── topbar: favoris + partage + signaler + éditer ────────────────────────
  if (variant === 'topbar') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={d.toggleSave}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 transition-colors"
        >
          {d.isSaved
            ? <BookmarkCheck className="w-4 h-4 text-amber-500" />
            : <Bookmark className="w-4 h-4 text-gray-500" />}
        </button>

        <div ref={d.shareRef} className="relative">
          <button
            type="button"
            onClick={() => d.setOpenShare(!d.openShare)}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
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
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 transition-colors"
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

  // ── author-actions: boutons auteur visible sur tous les écrans ───────────
  if (variant === 'author-actions') {
    if (!d.isAuthor) return null;
    const currentItem = d.item ?? item;
    const st = currentItem.status;
    return (
      <>
        <DeleteConfirmDialog
          isOpen={confirmDeleteOpen}
          title={item.title}
          deleting={deleting}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
          <h3 className="text-sm font-black text-gray-800 mb-3">Gérer mon annonce</h3>
          <div className="flex flex-wrap gap-2">
            {/* Modifier */}
            <a
              href={`/coups-de-main/${item.id}/modifier`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Modifier
            </a>
            {/* Changer statut */}
            {st === 'active' && (
              <>
                <button type="button" onClick={() => d.handleStatusChange('in_progress')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors">
                  ⚡ En cours
                </button>
                <button type="button" onClick={() => d.handleStatusChange('paused')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                  ⏸ Mettre en pause
                </button>
                <button type="button" onClick={() => d.handleStatusChange('resolved')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  ✅ Marquer résolue
                </button>
              </>
            )}
            {(st === 'paused' || st === 'closed') && (
              <button type="button" onClick={() => d.handleStatusChange('active')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">
                ▶️ Réactiver
              </button>
            )}
            {st === 'resolved' && (
              <button type="button" onClick={() => d.handleStatusChange('archived')}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors">
                📦 Archiver
              </button>
            )}
            {/* Supprimer — ouvre le dialog React (pas confirm() natif) */}
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Supprimer
            </button>
          </div>
        </div>
      </>
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
        onDelete={d.handleDelete}
      />
    );
  }

  // ── mobile-bar ────────────────────────────────────────────────────────────
  if (variant === 'mobile-bar') {
    if (d.isAuthor) {
      return (
        <>
          <DeleteConfirmDialog
            isOpen={confirmDeleteOpen}
            title={item.title}
            deleting={deleting}
            onConfirm={handleDeleteConfirmed}
            onCancel={() => setConfirmDeleteOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg lg:hidden">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Supprimer
              </button>
            </div>
          </div>
        </>
      );
    }
    if (!d.isActive) return null;
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
            className={`flex-1 flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors ${
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
