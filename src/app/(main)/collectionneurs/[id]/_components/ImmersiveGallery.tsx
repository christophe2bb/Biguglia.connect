'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { toPhotoItems } from '@/components/ui/photo-utils';
import { cn } from '@/lib/utils';
import type { SortedPhoto } from '../_types';

interface Props {
  photos: SortedPhoto[];
  title: string;
}

export function ImmersiveGallery({ photos, title }: Props) {
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const photoItems = toPhotoItems(
    photos.map((p, i) => ({ url: p.url, display_order: i })),
  );

  if (photos.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune photo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Image principale */}
      <div
        className="relative aspect-[4/3] bg-gray-50 rounded-3xl overflow-hidden cursor-zoom-in group"
        role="button"
        tabIndex={0}
        onClick={() => setLightboxOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxOpen(true); } }}
      >
        <Image
          src={photos[activeIdx]?.url}
          alt={`${title} - photo ${activeIdx + 1}`}
          fill
          className="object-contain group-hover:scale-[1.02] transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 600px"
          priority={activeIdx === 0}
        />

        {/* Flèches de navigation */}
        {photos.length > 1 && (
          <>
            <button
              onClick={e => {
                e.stopPropagation();
                setActiveIdx(i => (i - 1 + photos.length) % photos.length);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-[colors,opacity] opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setActiveIdx(i => (i + 1) % photos.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-[colors,opacity] opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Compteur */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full font-medium">
            {activeIdx + 1} / {photos.length}
          </div>
        )}

        {/* Hint zoom */}
        <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          🔍 Cliquer pour agrandir
        </div>
      </div>

      {/* Miniatures */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors',
                i === activeIdx
                  ? 'border-orange-400 shadow-md'
                  : 'border-transparent hover:border-gray-300',
              )}
            >
              <Image src={photo.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && photoItems.length > 0 && (
        <PhotoViewer
          photos={photoItems}
          initialIndex={activeIdx}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
