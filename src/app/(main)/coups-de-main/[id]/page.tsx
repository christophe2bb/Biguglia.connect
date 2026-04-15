'use client';

import Link from 'next/link';
import {
  ArrowLeft, Bookmark, BookmarkCheck, Share2,
  Star, ChevronRight, Loader2, AlertCircle,
  Check, HandHeart, Pencil,
} from 'lucide-react';
import { toPhotoItems } from '@/components/ui/PhotoViewer';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import ContactButton from '@/components/ui/ContactButton';
import { useAuthStore } from '@/lib/auth-store';
import { CATEGORIES } from '../_constants';
import { useHelpRequestDetail } from './useHelpRequestDetail';
import HelpHeader from './_components/HelpHeader';
import HelpPracticalInfo from './_components/HelpPracticalInfo';
import HelpSidebar from './_components/HelpSidebar';
import HelpStatus from './_components/HelpStatus';
import { HelpersList, Discussion } from './_components/HelpHistory';

function getDisplayName(author: { full_name: string } | null | undefined, mode: string): string {
  if (!author?.full_name) return 'Membre';
  const parts = author.full_name.trim().split(' ');
  if (mode === 'prenom') return parts[0];
  if (mode === 'prenom_initiale') return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  return author.full_name;
}

export default function HelpRequestDetailPage() {
  const { profile } = useAuthStore();
  const d = useHelpRequestDetail();

  if (d.loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
    </div>
  );

  if (d.notFound || !d.item) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white gap-4">
      <AlertCircle className="w-12 h-12 text-gray-300" />
      <p className="text-gray-600 font-bold text-lg">Annonce introuvable</p>
      <p className="text-gray-400 text-sm">Elle a peut-être été supprimée ou n&apos;existe pas.</p>
      <Link href="/coups-de-main" className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all">
        <ArrowLeft className="w-4 h-4" /> Retour aux annonces
      </Link>
    </div>
  );

  const item = d.item;
  const catConf   = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[CATEGORIES.length - 1];
  const allPhotos = toPhotoItems(item.photos ?? []);
  const displayName = getDisplayName(item.author, item.display_name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">

      {/* ── Navigation sticky ── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <Link href="/coups-de-main"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour aux annonces</span>
            <span className="sm:hidden">Retour</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Favori */}
            <button type="button" onClick={d.toggleSave}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-amber-50 transition-all">
              {d.isSaved
                ? <BookmarkCheck className="w-4 h-4 text-amber-500" />
                : <Bookmark className="w-4 h-4 text-gray-500" />}
            </button>

            {/* Partager */}
            <div ref={d.shareRef} className="relative">
              <button type="button" onClick={() => d.setOpenShare(!d.openShare)}
                className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all">
                <Share2 className="w-4 h-4 text-gray-500" />
              </button>
              {d.openShare && (
                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-40 overflow-hidden">
                  {[
                    { label: '💬 Par SMS',  onClick: () => window.open(`sms:?body=${d.shareText}`, '_self') },
                    { label: '📧 Par Email', onClick: () => window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${d.shareText}`, '_self') },
                    { label: '🔗 Copier lien', onClick: () => navigator.clipboard?.writeText(d.shareUrl) },
                  ].map(({ label, onClick }) => (
                    <button key={label} type="button"
                      onClick={() => { onClick(); d.setOpenShare(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50 first:border-t-0">
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
              <Link href="/coups-de-main"
                className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 transition-all">
                <Pencil className="w-4 h-4 text-blue-500" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="flex-1 min-w-0 space-y-6">
            <HelpHeader
              item={item}
              displayName={displayName}
              onOpenPhoto={(idx) => { d.setLightboxIdx(idx); d.setLightboxOpen(true); }}
            />

            <HelpPracticalInfo item={item} />

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

            <HelpStatus item={item} />

            {d.isResolved && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" /> Avis sur cette aide
                </h2>
                <RatingWidget targetType="help_request" targetId={item.id} authorId={item.author_id} userId={profile?.id} compact={false} showPoll />
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-3">Voir d&apos;autres annonces dans la même catégorie</p>
              <Link href={`/coups-de-main?cat=${item.category}`}
                className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-all">
                {catConf.emoji} Toutes les annonces &quot;{catConf.label}&quot; <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* ── SIDEBAR ── */}
          <HelpSidebar
            item={item}
            isAuthor={d.isAuthor}
            isActive={d.isActive}
            userId={profile?.id}
            helping={d.helping}
            alreadyHelping={d.alreadyHelping}
            onCanHelp={d.handleCanHelp}
            onStatusChange={d.handleStatusChange}
          />
        </div>
      </div>

      {/* ── Barre mobile ── */}
      {!d.isAuthor && d.isActive && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg lg:hidden">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <ContactButton
              sourceType="help_request" sourceId={item.id} sourceTitle={item.title}
              ownerId={item.author_id} userId={profile?.id} size="sm" className="flex-1 justify-center"
            />
            <button type="button" onClick={d.handleCanHelp} disabled={d.helping || d.alreadyHelping}
              className={`flex-1 flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl text-sm transition-all ${
                item.help_type !== 'offre'
                  ? d.alreadyHelping ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : d.alreadyHelping ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default' : 'bg-blue-500 text-white hover:bg-blue-600'
              } disabled:opacity-60`}>
              {d.helping
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : item.help_type !== 'offre' ? <Check className="w-4 h-4" /> : <HandHeart className="w-4 h-4" />}
              {d.alreadyHelping
                ? (item.help_type !== 'offre' ? 'Proposé ✓' : 'Envoyé ✓')
                : (item.help_type !== 'offre' ? 'Je peux aider' : 'Intéressé(e)')}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {d.lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={d.lightboxIdx} onClose={() => d.setLightboxOpen(false)} title={item.title} />
      )}
    </div>
  );
}
