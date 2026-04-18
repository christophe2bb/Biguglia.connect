'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useAssociationDetail } from './_hooks/useAssociationDetail';
import { buildNeedsPictos } from './_config';
import { AssocHero }        from './_components/AssocHero';
import { ActionBar }        from './_components/ActionBar';
import { PhotoGallery }     from './_components/PhotoGallery';
import { NeedsPanel }       from './_components/NeedsPanel';
import { ActivitiesPanel }  from './_components/ActivitiesPanel';
import { RelatedLinks }     from './_components/RelatedLinks';
import { ContactSidebar }   from './_components/ContactSidebar';
import { QuickInfoSidebar } from './_components/QuickInfoSidebar';
import type { Association } from './_types';

interface Props {
  initialItem?: Association;
}

export default function AssociationDetailClient({ initialItem }: Props) {
  const params    = useParams();
  const id        = params.id as string;
  const { profile } = useAuthStore();

  const {
    asso, allPhotos, coverPhoto,
    loading, error,
    saved, lightboxOpen, lightboxIdx,
    toggleSave, handleShare, openLightbox, closeLightbox,
  } = useAssociationDetail(id, initialItem);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
      </div>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────────────
  if (error || !asso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600 text-lg font-medium">{error ?? 'Association introuvable'}</p>
        <Link
          href="/associations"
          className="inline-flex items-center gap-2 bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-600 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux associations
        </Link>
      </div>
    );
  }

  const isAuthor    = profile?.id === asso.author_id;
  const isLoggedIn  = !!profile;
  const needsPictos = buildNeedsPictos(asso);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">

      {/* Hero gradient header */}
      <AssocHero
        asso={asso}
        coverPhoto={coverPhoto}
        saved={saved}
        onToggleSave={toggleSave}
        onShare={handleShare}
      />

      {/* Sticky action bar (visitors only) */}
      {!isAuthor && <ActionBar asso={asso} userId={profile?.id} />}

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Short description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <p className="text-gray-700 leading-relaxed text-base">{asso.description_short}</p>
            </div>

            <PhotoGallery
              photos={allPhotos}
              assoName={asso.name}
              lightboxOpen={lightboxOpen}
              lightboxIdx={lightboxIdx}
              onOpen={openLightbox}
              onClose={closeLightbox}
            />

            <NeedsPanel
              asso={asso}
              needsPictos={needsPictos}
              isAuthor={isAuthor}
              userId={profile?.id}
            />

            <ActivitiesPanel asso={asso} />

            <RelatedLinks asso={asso} />
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-5">
            <ContactSidebar
              asso={asso}
              isAuthor={isAuthor}
              userId={profile?.id}
              isLoggedIn={isLoggedIn}
            />
            <QuickInfoSidebar
              asso={asso}
              isAuthor={isAuthor}
              isLoggedIn={isLoggedIn}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
