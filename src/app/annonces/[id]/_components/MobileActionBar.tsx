import Link from 'next/link';
import { Heart, Phone } from 'lucide-react';
import ContactButton from '@/components/ui/ContactButton';
import type { ExtListing } from '../_types';

type Props = {
  listing: ExtListing;
  isSaved: boolean;
  isOwner: boolean;
  userId: string | undefined;
  isLoggedIn: boolean;
  onToggleSave: () => void;
};

/**
 * Sticky bottom bar shown only on mobile to non-owner visitors
 * when the listing is active.
 */
export function MobileActionBar({
  listing, isSaved, isOwner, userId, isLoggedIn, onToggleSave,
}: Props) {
  if (isOwner || listing.status !== 'active') return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-lg">
      {/* Favourite */}
      <button
        onClick={onToggleSave}
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
          isSaved
            ? 'bg-pink-100 text-pink-600 border-pink-200'
            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
        }`}
      >
        <Heart className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
        {isSaved ? 'Favori' : 'Sauvegarder'}
      </button>

      {/* Contact / Login */}
      {isLoggedIn ? (
        <ContactButton
          sourceType="listing"
          sourceId={listing.id}
          sourceTitle={listing.title}
          ownerId={listing.user_id || ''}
          userId={userId}
          ctaLabel={listing.listing_type === 'wanted' ? '✉️ Proposer un article' : '💬 Contacter'}
          prefillMsg={`Bonjour, je suis intéressé(e) par votre annonce "${listing.title}".`}
          className="flex-1"
        />
      ) : (
        <Link
          href="/connexion"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Phone className="w-4 h-4" /> Contacter
        </Link>
      )}
    </div>
  );
}
