'use client';

/**
 * src/components/ui/photo/PhotoGalleryComponent.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Galerie avec grille + miniatures + badge "+N photos" + clic → Lightbox.
 *
 * Props :
 *  - photos       : tableau de PhotoItem (trié par display_order)
 *  - title        : texte alt + titre lightbox
 *  - compact      : mode carte (1 photo + badge "+N") vs mode page détail
 *  - mainHeight   : classe Tailwind hauteur photo principale (défaut 'h-72')
 */

import { useState } from 'react';
import Image from 'next/image';
import { ZoomIn, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhotoItem } from '../photo-utils';
import { PhotoLightbox } from './PhotoLightbox';

interface PhotoGalleryProps {
  photos: PhotoItem[];
  title?: string;
  className?: string;
  compact?: boolean;
  mainHeight?: string;
}

export function PhotoGalleryComponent({
  photos, title, className, compact = false, mainHeight = 'h-72',
}: PhotoGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx,  setViewerIdx]  = useState(0);

  if (!photos || photos.length === 0) return null;

  const sorted  = [...photos].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const primary = sorted[0];
  const others  = sorted.slice(1);
  const extra   = others.length;

  const openAt = (i: number) => { setViewerIdx(i); setViewerOpen(true); };

  // ── Mode compact (cartes en liste) ──
  if (compact) {
    return (
      <>
        <div
          className={cn('relative overflow-hidden rounded-xl cursor-pointer group', className)}
          role="button" tabIndex={0}
          onClick={() => openAt(0)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(0); } }}
        >
          <Image
            src={primary.url} alt={title || 'Photo'} fill
            sizes="(max-width:640px) 100vw, 50vw"
            unoptimized={primary.url.startsWith('blob:')}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {extra > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
              +{extra} photo{extra > 1 ? 's' : ''}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Crown className="w-2.5 h-2.5" /> Principale
          </div>
        </div>
        {viewerOpen && (
          <PhotoLightbox photos={sorted} initialIndex={viewerIdx} onClose={() => setViewerOpen(false)} title={title} />
        )}
      </>
    );
  }

  // ── Mode complet (pages détail) ──
  return (
    <>
      <div className={cn('space-y-2', className)}>
        {/* Photo principale */}
        <div
          className={cn('relative rounded-2xl overflow-hidden bg-gray-100 cursor-pointer group', mainHeight)}
          role="button" tabIndex={0}
          onClick={() => openAt(0)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(0); } }}
        >
          <Image
            src={primary.url} alt={title || 'Photo principale'} fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 75vw, 60vw"
            unoptimized={primary.url.startsWith('blob:')}
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-sm font-bold px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
              <ZoomIn className="w-4 h-4" /> Voir en grand
            </div>
          </div>
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Crown className="w-3 h-3" /> Photo principale
          </div>
          {extra > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              1 / {photos.length}
            </div>
          )}
        </div>

        {/* Grille photos secondaires */}
        {others.length > 0 && (
          <div className={cn(
            'grid gap-2',
            others.length === 1 ? 'grid-cols-1' : others.length === 2 ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4',
          )}>
            {others.slice(0, 7).map((p, i) => {
              const isLast    = i === 6 && others.length > 7;
              const remaining = others.length - 7;
              return (
                <div
                  key={i}
                  className="relative h-20 sm:h-24 rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                  role="button" tabIndex={0}
                  onClick={() => openAt(i + 1)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAt(i + 1); } }}
                >
                  <Image src={p.url} alt="" fill sizes="(max-width:640px) 96px, 128px" unoptimized={p.url.startsWith('blob:')} className="object-cover group-hover:scale-105 transition-transform duration-200" />
                  {isLast && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-black text-lg">+{remaining + 1}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              );
            })}
          </div>
        )}

        {photos.length > 1 && (
          <button
            onClick={() => openAt(0)}
            aria-label={`Voir les ${photos.length} photos en plein écran`}
            className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            Voir les {photos.length} photos
          </button>
        )}
      </div>

      {viewerOpen && (
        <PhotoLightbox photos={sorted} initialIndex={viewerIdx} onClose={() => setViewerOpen(false)} title={title} />
      )}
    </>
  );
}
