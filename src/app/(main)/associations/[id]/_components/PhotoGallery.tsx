'use client';

import Image from 'next/image';
import { Camera } from 'lucide-react';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { toPhotoItems } from '@/components/ui/photo-utils';

type PhotoItem = ReturnType<typeof toPhotoItems>[number];

type Props = {
  photos: PhotoItem[];
  assoName: string;
  lightboxOpen: boolean;
  lightboxIdx: number;
  onOpen: (idx: number) => void;
  onClose: () => void;
};

export function PhotoGallery({ photos, assoName, lightboxOpen, lightboxIdx, onOpen, onClose }: Props) {
  if (photos.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h2 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
        <Camera className="w-4 h-4 text-violet-500" /> Photos
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo, idx) => (
          <button
            key={photo.id ?? idx}
            onClick={() => onOpen(idx)}
            className="relative aspect-video rounded-xl overflow-hidden group hover:opacity-90 transition-opacity"
          >
            <Image src={photo.url} alt={assoName} fill className="object-cover" />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <PhotoViewer
          photos={photos}
          initialIndex={lightboxIdx}
          onClose={onClose}
        />
      )}
    </div>
  );
}
