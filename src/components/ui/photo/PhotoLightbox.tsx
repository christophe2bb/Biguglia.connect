'use client';

/**
 * src/components/ui/photo/PhotoLightbox.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightbox plein écran — visionneuse photo avec :
 *  - Navigation clavier (← →, +/-, Escape)
 *  - Swipe tactile (mobile)
 *  - Zoom + drag-to-pan souris
 *  - Focus trap WCAG 2.1 AA (Tab/Shift+Tab confinés dans la modale)
 *  - aria-modal + aria-labelledby
 */

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Crown } from 'lucide-react';
import type { PhotoItem } from '../photo-utils';
import { useFocusTrap } from './use-focus-trap';

export interface PhotoLightboxProps {
  photos: PhotoItem[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export function PhotoLightbox({ photos, initialIndex = 0, onClose, title }: PhotoLightboxProps) {
  const [idx, setIdx]   = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos]   = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const touchStartX     = useRef<number | null>(null);
  const imgRef          = useRef<HTMLDivElement>(null);
  const dialogLabelId   = useId();

  const { containerRef, initialFocusRef: closeButtonRef } = useFocusTrap(onClose);

  const total = photos.length;
  const photo = photos[idx];

  useEffect(() => { setZoom(1); setPos({ x: 0, y: 0 }); }, [idx]);

  const prev = useCallback(() => { setIdx(i => (i - 1 + total) % total); }, [total]);
  const next = useCallback(() => { setIdx(i => (i + 1) % total); }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')          prev();
      if (e.key === 'ArrowRight')         next();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-')                  setZoom(z => Math.max(z - 0.5, 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDrag({ startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    setPos({ x: drag.origX + e.clientX - drag.startX, y: drag.origY + e.clientY - drag.startY });
  };
  const onMouseUp = () => setDrag(null);

  if (!photo) return null;

  return (
    <div
      role="none"
      className="fixed inset-0 z-[9999]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? `Visionneuse — ${title}` : 'Visionneuse de photos'}
        aria-labelledby={dialogLabelId}
        tabIndex={-1}
        className="w-full h-full bg-black/95 flex flex-col"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            {title && <p id={dialogLabelId} className="text-white font-semibold text-sm truncate max-w-xs">{title}</p>}
            {(photo.isPrimary || idx === 0) ? (
              <span className="flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3" /> Photo principale
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm font-mono bg-white/10 px-2.5 py-1 rounded-full">
              {idx + 1} / {total}
            </span>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.5, 1))}
              disabled={zoom <= 1}
              aria-label="Zoom arrière"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <ZoomOut className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.5, 4))}
              disabled={zoom >= 4}
              aria-label="Zoom avant"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30"
            >
              <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </button>
            {zoom > 1 && (
              <button
                onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }); }}
                aria-label="Réinitialiser le zoom"
                className="text-xs text-white/60 hover:text-white px-2 py-1 rounded-full bg-white/10 transition-colors"
              >
                Reset
              </button>
            )}
            <button
              ref={closeButtonRef as React.RefObject<HTMLButtonElement>}
              onClick={onClose}
              aria-label="Fermer la visionneuse"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-red-500/60 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Image principale ── */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
          {total > 1 && (
            <button
              onClick={prev}
              aria-label="Photo précédente"
              className="absolute left-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-[colors,transform] hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </button>
          )}

          <div
            ref={imgRef}
            role="none"
            onMouseDown={onMouseDown}
            style={{
              transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
              transition: drag ? 'none' : 'transform 0.2s ease',
              cursor: zoom > 1 ? (drag ? 'grabbing' : 'grab') : 'default',
            }}
            className="relative flex w-full h-full items-center justify-center select-none"
          >
            <Image
              src={photo.url}
              alt={title ? `${title} — photo ${idx + 1}${total > 1 ? ` sur ${total}` : ''}` : `Photo ${idx + 1}${total > 1 ? ` sur ${total}` : ''}`}
              fill
              draggable={false}
              priority
              className="object-contain select-none"
              sizes="100vw"
              unoptimized={photo.url.startsWith('blob:')}
            />
          </div>

          {total > 1 && (
            <button
              onClick={next}
              aria-label="Photo suivante"
              className="absolute right-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-[colors,transform] hover:scale-110 active:scale-95"
            >
              <ChevronRight className="w-6 h-6" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ── Miniatures ── */}
        {total > 1 && (
          <div className="flex-shrink-0 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto justify-center pb-1 scrollbar-hide">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Voir la photo ${i + 1}${p.isPrimary || i === 0 ? ' (photo principale)' : ''}`}
                  aria-pressed={i === idx}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === idx ? 'border-white scale-110 shadow-lg' : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                  }`}
                >
                  <Image src={p.url} alt="" fill sizes="56px" unoptimized={p.url.startsWith('blob:')} className="object-cover" />
                  {(p.isPrimary || i === 0) && (
                    <div className="absolute top-0.5 left-0.5">
                      <Crown className="w-2.5 h-2.5 text-amber-400 drop-shadow" aria-hidden="true" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
