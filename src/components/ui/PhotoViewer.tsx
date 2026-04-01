'use client';

/**
 * PhotoViewer — Visionneuse photo universelle Biguglia Connect
 *
 * Composants exportés :
 *  - <PhotoViewer>        : Lightbox plein écran (flèches, compteur, zoom, swipe)
 *  - <PhotoGallery>       : Grille principale + miniatures + badge "+N photos" + clic → Lightbox
 *  - <PhotoUploaderField> : Zone d'upload avec photo principale + photos secondaires réordonnables
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Star, GripVertical, Trash2, ImagePlus, Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PhotoItem {
  id?: string;
  url: string;
  display_order?: number;
  isPrimary?: boolean;    // ← photo principale (index 0 ou marquée)
}

// ─── 1. LIGHTBOX PLEIN ÉCRAN ─────────────────────────────────────────────────
interface PhotoViewerProps {
  photos: PhotoItem[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export function PhotoViewer({ photos, initialIndex = 0, onClose, title }: PhotoViewerProps) {
  const [idx, setIdx]     = useState(initialIndex);
  const [zoom, setZoom]   = useState(1);
  const [pos, setPos]     = useState({ x: 0, y: 0 });
  const [drag, setDrag]   = useState<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const touchStartX       = useRef<number | null>(null);
  const imgRef            = useRef<HTMLDivElement>(null);

  const total = photos.length;
  const photo = photos[idx];

  // Reset zoom/pos when changing photo
  useEffect(() => { setZoom(1); setPos({ x: 0, y: 0 }); }, [idx]);

  const prev = useCallback(() => { setIdx(i => (i - 1 + total) % total); }, [total]);
  const next = useCallback(() => { setIdx(i => (i + 1) % total); }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 4));
      if (e.key === '-') setZoom(z => Math.max(z - 0.5, 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  // Mouse drag (for zoomed image)
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
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {title && <p className="text-white font-semibold text-sm truncate max-w-xs">{title}</p>}
          {photo.isPrimary || idx === 0 ? (
            <span className="flex items-center gap-1 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> Photo principale
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {/* Compteur */}
          <span className="text-white/60 text-sm font-mono bg-white/10 px-2.5 py-1 rounded-full">
            {idx + 1} / {total}
          </span>
          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(z - 0.5, 1))} disabled={zoom <= 1}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.min(z + 0.5, 4))} disabled={zoom >= 4}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-30">
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoom > 1 && (
            <button onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }); }}
              className="text-xs text-white/60 hover:text-white px-2 py-1 rounded-full bg-white/10 transition-colors">
              Reset
            </button>
          )}
          {/* Fermer */}
          <button onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-red-500/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Image principale ── */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
        {/* Flèche gauche */}
        {total > 1 && (
          <button onClick={prev}
            className="absolute left-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all hover:scale-110 active:scale-95">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <div ref={imgRef} className="w-full h-full flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={`Photo ${idx + 1}`}
            draggable={false}
            onMouseDown={onMouseDown}
            style={{
              transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
              transition: drag ? 'none' : 'transform 0.2s ease',
              cursor: zoom > 1 ? (drag ? 'grabbing' : 'grab') : 'default',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              WebkitUserDrag: 'none',
            } as React.CSSProperties}
          />
        </div>

        {/* Flèche droite */}
        {total > 1 && (
          <button onClick={next}
            className="absolute right-3 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all hover:scale-110 active:scale-95">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ── Miniatures en bas ── */}
      {total > 1 && (
        <div className="flex-shrink-0 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto justify-center pb-1 scrollbar-hide">
            {photos.map((p, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={cn(
                  'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all',
                  i === idx
                    ? 'border-white scale-110 shadow-lg'
                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/50'
                )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                {(p.isPrimary || i === 0) && (
                  <div className="absolute top-0.5 left-0.5">
                    <Crown className="w-2.5 h-2.5 text-amber-400 drop-shadow" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. GALERIE AVEC GRILLE + LIGHTBOX ───────────────────────────────────────
interface PhotoGalleryProps {
  photos: PhotoItem[];
  title?: string;
  className?: string;
  /** Mode compact (cartes) : affiche 1 photo + badge "+N" */
  compact?: boolean;
  /** Hauteur image principale */
  mainHeight?: string;
}

export function PhotoGallery({
  photos, title, className, compact = false, mainHeight = 'h-72',
}: PhotoGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx,  setViewerIdx]  = useState(0);

  if (!photos || photos.length === 0) return null;

  const sorted = [...photos].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const primary = sorted[0];
  const others  = sorted.slice(1);
  const extra   = others.length;

  const openAt = (i: number) => { setViewerIdx(i); setViewerOpen(true); };

  // ── Mode compact (pour les cartes en liste) ──
  if (compact) {
    return (
      <>
        <div className={cn('relative overflow-hidden rounded-xl cursor-pointer group', className)}
          onClick={() => openAt(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={primary.url} alt={title || 'Photo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {extra > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
              +{extra} photo{extra > 1 ? 's' : ''}
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          {/* Badge photo principale */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            <Crown className="w-2.5 h-2.5" /> Principale
          </div>
        </div>
        {viewerOpen && (
          <PhotoViewer photos={sorted} initialIndex={viewerIdx} onClose={() => setViewerOpen(false)} title={title} />
        )}
      </>
    );
  }

  // ── Mode complet (pages détail) ──
  return (
    <>
      <div className={cn('space-y-2', className)}>
        {/* Photo principale */}
        <div className={cn('relative rounded-2xl overflow-hidden bg-gray-100 cursor-pointer group', mainHeight)}
          onClick={() => openAt(0)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={primary.url} alt={title || 'Photo principale'} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />

          {/* Overlay hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-sm font-bold px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
              <ZoomIn className="w-4 h-4" /> Voir en grand
            </div>
          </div>

          {/* Badge photo principale */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Crown className="w-3 h-3" /> Photo principale
          </div>

          {/* Compteur total */}
          {extra > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              1 / {photos.length}
            </div>
          )}
        </div>

        {/* Grille photos secondaires */}
        {others.length > 0 && (
          <div className={cn('grid gap-2', others.length === 1 ? 'grid-cols-1' : others.length === 2 ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4')}>
            {others.slice(0, 7).map((p, i) => {
              const isLast = i === 6 && others.length > 7;
              const remaining = others.length - 7;
              return (
                <div key={i} className="relative h-20 sm:h-24 rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                  onClick={() => openAt(i + 1)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
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

        {/* Bouton voir toutes */}
        {photos.length > 1 && (
          <button onClick={() => openAt(0)}
            className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5" />
            Voir les {photos.length} photos
          </button>
        )}
      </div>

      {viewerOpen && (
        <PhotoViewer photos={sorted} initialIndex={viewerIdx} onClose={() => setViewerOpen(false)} title={title} />
      )}
    </>
  );
}

// ─── 3. COMPOSANT D'UPLOAD AVEC PHOTO PRINCIPALE ─────────────────────────────
export interface UploadedPhoto {
  id: string;       // temp id (Date.now() + random)
  file?: File;      // si nouvelle
  url: string;      // preview URL ou URL Supabase
  isPrimary: boolean;
  display_order: number;
}

interface PhotoUploaderFieldProps {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function PhotoUploaderField({
  photos, onChange, maxPhotos = 8, disabled = false, className, label,
}: PhotoUploaderFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragOver = useRef<number | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) return;
    const newPhotos: UploadedPhoto[] = Array.from(files).slice(0, remaining).map((file, i) => ({
      id: `${Date.now()}-${i}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      isPrimary: photos.length === 0 && i === 0,
      display_order: photos.length + i,
    }));
    const updated = [...photos, ...newPhotos].map((p, i) => ({ ...p, display_order: i, isPrimary: i === 0 }));
    onChange(updated);
  };

  const setPrimary = (id: string) => {
    const idx = photos.findIndex(p => p.id === id);
    if (idx < 0) return;
    // Move to front, recalculate orders and isPrimary
    const reordered = [
      photos[idx],
      ...photos.slice(0, idx),
      ...photos.slice(idx + 1),
    ].map((p, i) => ({ ...p, display_order: i, isPrimary: i === 0 }));
    onChange(reordered);
  };

  const remove = (id: string) => {
    const updated = photos.filter(p => p.id !== id)
      .map((p, i) => ({ ...p, display_order: i, isPrimary: i === 0 }));
    onChange(updated);
  };

  // Drag-and-drop reorder
  const [dragId, setDragId] = useState<string | null>(null);

  const onDragStart = (id: string) => setDragId(id);
  const onDragEnter = (id: string) => { dragOver.current = photos.findIndex(p => p.id === id); };
  const onDragEnd = () => {
    if (!dragId || dragOver.current === null) { setDragId(null); return; }
    const fromIdx = photos.findIndex(p => p.id === dragId);
    const toIdx   = dragOver.current;
    if (fromIdx === toIdx) { setDragId(null); return; }
    const reordered = [...photos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    onChange(reordered.map((p, i) => ({ ...p, display_order: i, isPrimary: i === 0 })));
    setDragId(null);
    dragOver.current = null;
  };

  const canAdd = photos.length < maxPhotos && !disabled;

  return (
    <div className={cn('space-y-3', className)}>
      {label && <p className="text-sm font-semibold text-gray-700">{label}</p>}

      {/* Zone d'upload */}
      {canAdd && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-5 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors group"
        >
          <ImagePlus className="w-8 h-8 text-gray-400 group-hover:text-brand-500 mx-auto mb-2 transition-colors" />
          <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-600 transition-colors">
            Ajouter des photos
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {photos.length}/{maxPhotos} — La <strong>1ère photo</strong> sera la photo principale
          </p>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)}
            disabled={disabled}
          />
        </div>
      )}

      {/* Grille photos avec drag */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => onDragStart(photo.id)}
              onDragEnter={() => onDragEnter(photo.id)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              className={cn(
                'relative rounded-xl overflow-hidden border-2 transition-all group',
                photo.isPrimary
                  ? 'border-amber-400 shadow-lg shadow-amber-100'
                  : 'border-gray-200 hover:border-gray-300',
                dragId === photo.id && 'opacity-50 scale-95',
              )}
            >
              {/* Image */}
              <div className="aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex flex-col justify-between p-1.5">
                {/* Badge principale */}
                <div className="flex justify-between items-start">
                  {photo.isPrimary ? (
                    <span className="flex items-center gap-0.5 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                      <Crown className="w-2.5 h-2.5" /> Principale
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      {i + 1}
                    </span>
                  )}
                  {/* Drag handle */}
                  <GripVertical className="w-4 h-4 text-white/0 group-hover:text-white/80 transition-colors cursor-grab" />
                </div>

                {/* Actions bas */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!photo.isPrimary && (
                    <button onClick={() => setPrimary(photo.id)}
                      className="flex-1 flex items-center justify-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold py-1 rounded-lg hover:bg-amber-500 transition-colors">
                      <Star className="w-2.5 h-2.5" /> Principale
                    </button>
                  )}
                  <button onClick={() => remove(photo.id)}
                    className="p-1.5 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Slot ajout supplémentaire */}
          {canAdd && photos.length > 0 && (
            <div onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/20 transition-colors">
              <ImagePlus className="w-6 h-6 text-gray-300" />
              <span className="text-xs text-gray-400 mt-1">Ajouter</span>
            </div>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <GripVertical className="w-3 h-3" />
          Glissez-déposez pour réorganiser · La 1ère photo est toujours la photo principale
        </p>
      )}
    </div>
  );
}

// ─── Helper : convertir photos DB → PhotoItem ─────────────────────────────────
export function toPhotoItems(
  photos: Array<{ url: string; display_order?: number; id?: string }> | null | undefined
): PhotoItem[] {
  if (!photos?.length) return [];
  return [...photos]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((p, i) => ({ ...p, isPrimary: i === 0 }));
}
