import Link from 'next/link';
import { Share2, Pencil, Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ContactButton from '@/components/ui/ContactButton';
import StatusManager from '@/components/ui/StatusManager';
import { formatRelative } from '@/lib/utils';
import type { ExtListing } from '../_types';
import toast from 'react-hot-toast';

type Props = {
  listing: ExtListing;
  isOwner: boolean;
  currentStatus: string;
  deleting: boolean;
  userId: string | undefined;
  onStatusChange: (s: string) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function SellerCard({
  listing, isOwner, currentStatus, deleting,
  userId, onStatusChange, onDelete,
}: Props) {
  const author = listing.user as { full_name?: string; avatar_url?: string } | undefined;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Publié par</h3>

      {/* Author row */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar
          src={author?.avatar_url}
          name={author?.full_name || '?'}
          size="md"
        />
        <div>
          <div className="font-medium text-gray-900">{author?.full_name || 'Anonyme'}</div>
          <div className="text-xs text-gray-400">Publié {formatRelative(listing.created_at)}</div>
        </div>
      </div>

      {/* CTA / status notice */}
      {isOwner ? (
        <div className="mb-3 text-xs text-center text-gray-400 italic py-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          ✉️ Les autres membres vous contacteront via ce bouton
        </div>
      ) : listing.status === 'active' ? (
        <ContactButton
          sourceType="listing"
          sourceId={listing.id}
          sourceTitle={listing.title}
          ownerId={listing.user_id || ''}
          userId={userId}
          ctaLabel={listing.listing_type === 'wanted' ? '✉️ Proposer un article' : '💬 Discuter en privé'}
          prefillMsg={`Bonjour, je suis intéressé(e) par votre annonce "${listing.title}"${listing.price ? ` à ${listing.price} €` : ''} — est-elle toujours disponible ?`}
          className="mb-3 w-full"
        />
      ) : (
        <div className="mb-3 p-3 bg-gray-50 rounded-xl text-xs text-center text-gray-500 font-medium border border-dashed border-gray-200">
          {currentStatus === 'sold' || currentStatus === 'given' || currentStatus === 'exchanged'
            ? '🎉 Cette annonce est clôturée'
            : currentStatus === 'reserved'
            ? '🔒 Déjà réservé'
            : '⏸️ Annonce inactive'}
        </div>
      )}

      {/* Owner management panel */}
      {isOwner && (
        <div className="space-y-2">
          <div className="text-xs text-center text-blue-600 font-medium py-1.5 bg-blue-50 rounded-xl">
            ✅ C&apos;est votre annonce
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
            <StatusManager
              contentType="listing"
              currentStatus={currentStatus}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          </div>
          <Link
            href={`/annonces/${listing.id}/modifier`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Modifier l&apos;annonce
          </Link>
          <button
            onClick={() => {
              if (navigator.share) navigator.share({ title: listing.title, url: shareUrl });
              else { navigator.clipboard.writeText(shareUrl); toast.success('Lien copié !'); }
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Partager
          </button>
          {deleting && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
