import Image from 'next/image';
import Link from 'next/link';
import { Listing } from '@/types';

type Props = {
  similar: Listing[];
  categoryName?: string;
};

export function SimilarListings({ similar, categoryName }: Props) {
  if (similar.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="font-bold text-gray-900 mb-4">
        📌 Annonces similaires{categoryName ? ` (${categoryName})` : ''}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {similar.map(sim => {
          const simPhotos = sim.photos as Array<{ url: string }> | undefined;
          return (
            <Link key={sim.id} href={`/annonces/${sim.id}`} className="group block">
              <div className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm hover:border-gray-200 transition-all">
                <div className="relative h-28 overflow-hidden bg-gray-100">
                  {simPhotos && simPhotos.length > 0 ? (
                    <Image
                      src={simPhotos[0].url}
                      alt={sim.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-3xl opacity-20">{sim.category?.icon || '📦'}</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{sim.title}</p>
                  <p className="text-xs text-blue-600 font-bold mt-1">
                    {sim.listing_type === 'free' ? '🎁 Gratuit' : sim.price ? `${sim.price} €` : '—'}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
