import Image from 'next/image';
import { Package } from 'lucide-react';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { toPhotoItems } from '@/components/ui/photo-utils';
import type { LFItem } from '../_types';

type Props = {
  item: LFItem;
  photos: ReturnType<typeof toPhotoItems>;
  lightboxOpen: boolean;
  lightboxIdx: number;
  onOpen: (idx: number) => void;
  onClose: () => void;
};

export function LFGallery({ item, photos, lightboxOpen, lightboxIdx, onOpen, onClose }: Props) {
  if (photos.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm h-48 flex items-center justify-center ${
        item.type === 'perdu' ? 'bg-orange-50' : 'bg-emerald-50'
      }`}>
        <Package className="w-16 h-16 text-gray-200" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm print:shadow-none">
      {/* Cover photo */}
      <div
        className="relative h-72 sm:h-96 cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(0)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(0); } }}
      >
        <Image src={photos[0].url} alt={item.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-sm font-bold px-3 py-1 rounded-full">
            +{photos.length - 1} photos
          </div>
        )}
      </div>

      {/* Thumbnails strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {photos.slice(1).map((p, i) => (
            <button
              key={i}
              onClick={() => onOpen(i + 1)}
              className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-gray-100 hover:border-orange-300 transition-colors"
            >
              <Image src={p.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <PhotoViewer
          photos={photos}
          initialIndex={lightboxIdx}
          onClose={onClose}
          title={item.title}
        />
      )}
    </div>
  );
}
