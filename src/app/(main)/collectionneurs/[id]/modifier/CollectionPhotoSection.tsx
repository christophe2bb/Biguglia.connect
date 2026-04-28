'use client';

/**
 * src/app/(main)/collectionneurs/[id]/modifier/CollectionPhotoSection.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Section "Photos" du formulaire d'édition d'annonce collectionneur.
 * Grille de miniatures avec upload, suppression et sélection de couverture.
 */

import Image from 'next/image';
import { Camera, Loader2, Plus, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhotoItem } from './use-collection-item-form';
import { MAX_PHOTOS } from './use-collection-item-form';

interface CollectionPhotoSectionProps {
  photos: PhotoItem[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFilesChange: (files: FileList | null) => void;
  onRemove: (idx: number) => void;
  onSetCover: (idx: number) => void;
}

export function CollectionPhotoSection({
  photos,
  fileInputRef,
  onFilesChange,
  onRemove,
  onSetCover,
}: CollectionPhotoSectionProps) {
  const activePhotos = photos.filter(p => !p.toDelete);

  return (
    <div className="p-4 pt-0">
      {/* Zone de dépôt / bouton principal */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={activePhotos.length >= MAX_PHOTOS}
        className={cn(
          'w-full border-2 border-dashed rounded-2xl p-6 text-center mb-4 transition',
          activePhotos.length >= MAX_PHOTOS
            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            : 'border-blue-300 bg-blue-50 hover:border-blue-400 cursor-pointer',
        )}
      >
        <Camera className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-blue-700">Ajouter des photos</p>
        <p className="text-xs text-gray-400 mt-0.5">{activePhotos.length}/{MAX_PHOTOS}</p>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        className="hidden"
        onChange={e => {
          onFilesChange(e.target.files);
          // Réinitialiser la valeur pour permettre de re-sélectionner les mêmes fichiers
          e.target.value = '';
        }}
      />

      {/* Grille de miniatures */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo, i) =>
            !photo.toDelete && (
              <div
                key={i}
                className={cn(
                  'relative group aspect-square rounded-xl overflow-hidden border-2',
                  photo.is_cover ? 'border-amber-400' : 'border-gray-200',
                  photo.error   ? 'border-red-400'   : '',
                )}
              >
                <Image
                  src={photo.preview}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width:640px) 50vw, 25vw"
                  className="object-cover"
                />

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  {!photo.is_cover && (
                    <button
                      onClick={() => onSetCover(i)}
                      className="p-1.5 bg-amber-400 rounded-full text-white"
                      aria-label="Définir comme couverture"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(i)}
                    className="p-1.5 bg-red-500 rounded-full text-white"
                    aria-label="Supprimer cette photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Badge couverture */}
                {photo.is_cover && (
                  <span className="absolute top-1 left-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    ⭐ Couv.
                  </span>
                )}

                {/* Spinner upload */}
                {photo.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
            ),
          )}

          {/* Cellule d'ajout rapide */}
          {activePhotos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-500 transition"
              aria-label="Ajouter une photo"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
