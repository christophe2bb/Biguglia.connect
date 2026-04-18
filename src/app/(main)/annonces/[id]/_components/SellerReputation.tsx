import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ExtListing } from '../_types';

// TrustScore (492L) — chargé en différé : composant secondaire below-the-fold
const TrustScoreFull = dynamic(
  () => import('@/components/ui/TrustScore').then(m => ({ default: m.TrustScoreFull })),
  { ssr: false, loading: () => <div className="h-24 bg-gray-50 rounded-xl animate-pulse" /> }
);

type Props = { listing: ExtListing };

export function SellerReputation({ listing }: Props) {
  if (!listing.user) return null;

  const author = listing.user as {
    full_name?: string;
    avatar_url?: string | null;
    created_at?: string;
    role?: string;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          ⭐ Réputation du vendeur
        </h3>
      </div>
      <div className="p-4">
        <TrustScoreFull
          profile={{
            id: listing.user_id || '',
            created_at: author.created_at ?? new Date().toISOString(),
            role: author.role ?? 'resident',
            avatar_url: author.avatar_url ?? null,
            phone: null,
            full_name: author.full_name ?? null,
          }}
        />
        <Link
          href={`/profil/${listing.user_id}`}
          className="mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors"
        >
          Voir le profil complet →
        </Link>
      </div>
    </div>
  );
}
