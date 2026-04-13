'use client';

/**
 * Collectionneurs — Fiche détail objet
 * Route: /collectionneurs/[id]
 *
 * Orchestrateur mince — toute la logique est dans useCollectionItemDetail.
 */

import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import RatingWidget from '@/components/ui/RatingWidget';
import { useAuthStore } from '@/lib/auth-store';
import { useCollectionItemDetail } from './_hooks/useCollectionItemDetail';
import { ImmersiveGallery } from './_components/ImmersiveGallery';
import { ItemMeta }         from './_components/ItemMeta';
import { ItemDetails }      from './_components/ItemDetails';
import { SimilarItems }     from './_components/SimilarItems';
import { ItemSidebar }      from './_components/ItemSidebar';

export default function CollectionItemDetailPage() {
  const { profile } = useAuthStore();
  const {
    item, sortedPhotos, similar,
    loading, notFound,
    isFav, favLoading, changingStatus, isOwner, isClosed,
    allowedTransitions,
    handleFav, handleStatusChange, handleDelete, handleShare,
  } = useCollectionItemDetail();

  /* ── États de chargement / introuvable ───────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Annonce introuvable</h2>
          <Link href="/collectionneurs" className="text-blue-600 hover:underline text-sm">
            ← Retour aux annonces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href="/collectionneurs"
            className="flex items-center gap-1 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Collectionneurs
          </Link>
          {item.category && (
            <>
              <span>/</span>
              <span className="text-gray-700">{item.category.icon} {item.category.name}</span>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{item.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne gauche : galerie + méta + détails ─────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <ImmersiveGallery photos={sortedPhotos} title={item.title} />
            <ItemMeta    item={item} />
            <ItemDetails item={item} />

            <RatingWidget
              targetType="collection_item"
              targetId={item.id}
              authorId={item.author_id}
              userId={profile?.id}
              compact={false}
              showPoll
            />

            <SimilarItems similar={similar} />
          </div>

          {/* ── Sidebar droite ────────────────────────────────────────── */}
          <div>
            <ItemSidebar
              item={item}
              isOwner={isOwner}
              isClosed={isClosed}
              isFav={isFav}
              favLoading={favLoading}
              changingStatus={changingStatus}
              allowedTransitions={allowedTransitions}
              userId={profile?.id}
              onFav={handleFav}
              onShare={handleShare}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
