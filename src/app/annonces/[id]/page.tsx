'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Zap } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useAnnonceDetail }   from './_hooks/useAnnonceDetail';
import { buildTimeline }      from './_config';
import { TopBar }             from './_components/TopBar';
import { ListingGallery }     from './_components/ListingGallery';
import { ListingMeta }        from './_components/ListingMeta';
import { PracticalInfo }      from './_components/PracticalInfo';
import { StatusTimeline }     from './_components/StatusTimeline';
import { SimilarListings }    from './_components/SimilarListings';
import { ListingSidebar }     from './_components/ListingSidebar';
import { MobileActionBar }    from './_components/MobileActionBar';

export default function AnnonceDetailPage() {
  const { id } = useParams();
  const { profile } = useAuthStore();

  const {
    listing, similar, photos,
    loading, notFound,
    deleting, currentStatus,
    isSaved, showSharePanel,
    toggleSave, setShowSharePanel,
    handleShare, handleDelete, handleStatusChange,
  } = useAnnonceDetail(id as string);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (notFound || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Annonce introuvable</h1>
        <p className="text-gray-500 mb-6">Cette annonce n&apos;existe pas ou a été supprimée.</p>
        <Link
          href="/annonces"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Retour aux annonces
        </Link>
      </div>
    );
  }

  const isOwner      = profile?.id === listing.user_id;
  const timelineSteps = buildTimeline(currentStatus);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Sticky top navigation bar */}
      <TopBar
        listing={listing}
        isOwner={isOwner}
        isSaved={isSaved}
        showSharePanel={showSharePanel}
        onToggleSave={toggleSave}
        onToggleSharePanel={() => setShowSharePanel(p => !p)}
        onShare={handleShare}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Urgent banner */}
        {listing.is_urgent && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-6">
            <Zap className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-red-700">Annonce urgente</p>
              <p className="text-xs text-red-600">Le vendeur souhaite conclure rapidement.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Main column ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <ListingGallery
              photos={photos}
              categoryIcon={listing.category?.icon}
              title={listing.title}
            />
            <ListingMeta listing={listing} />

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>

            <PracticalInfo listing={listing} />
            <StatusTimeline steps={timelineSteps} />
            <SimilarListings similar={similar} categoryName={listing.category?.name} />
          </div>

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <ListingSidebar
            listing={listing}
            isOwner={isOwner}
            currentStatus={currentStatus}
            deleting={deleting}
            userId={profile?.id}
            profileId={profile?.id}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        </div>

        {/* Sticky mobile action bar */}
        <MobileActionBar
          listing={listing}
          isSaved={isSaved}
          isOwner={isOwner}
          userId={profile?.id}
          isLoggedIn={!!profile}
          onToggleSave={toggleSave}
        />
      </div>
    </div>
  );
}
