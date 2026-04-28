'use client';

/**
 * StepPhotos — Étape 4 : zone de dépôt, grille photos, conseils.
 */

import Image from 'next/image';
import { Camera, Star, X, Plus, Loader2, AlertCircle, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAX_PHOTOS, MAX_FILE_MB } from '../_config';
import type { PhotoItem } from '../_types';

interface Props {
  photos: PhotoItem[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFiles: (files: FileList | null) => Promise<void>;
  onRemove: (idx: number) => void;
  onSetCover: (idx: number) => void;
}

export default function StepPhotos({
  photos,
  fileInputRef,
  onFiles,
  onRemove,
  onSetCover,
}: Props) {
  const inputRef = fileInputRef;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Photos de l&apos;objet</h2>
      <p className="text-gray-500 text-sm mb-4">
        Ajoutez jusqu&apos;à {MAX_PHOTOS} photos HD. La première photo (⭐) sera la photo de couverture.
      </p>

      {/* Zone de dépôt */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={photos.length >= MAX_PHOTOS}
        className={cn(
          'w-full border-2 border-dashed rounded-2xl p-8 text-center transition mb-4',
          photos.length >= MAX_PHOTOS
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 cursor-pointer',
        )}
      >
        <Camera className="w-10 h-10 text-blue-400 mx-auto mb-3" />
        <p className="font-semibold text-blue-700">
          {photos.length >= MAX_PHOTOS ? 'Maximum atteint' : 'Cliquez ou glissez vos photos ici'}
        </p>
        <p className="text-xs text-blue-500 mt-1">JPG, PNG, WebP — max {MAX_FILE_MB} Mo chacune</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {photos.length}/{MAX_PHOTOS} photo{photos.length > 1 ? 's' : ''}
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          onFiles(e.target.files);
          // Réinitialiser la valeur pour permettre de re-sélectionner les mêmes fichiers
          e.target.value = '';
        }}
      />

      {/* Grille photos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              className={cn(
                'relative group aspect-square rounded-xl overflow-hidden border-2',
                photo.is_cover ? 'border-amber-400 shadow-md' : 'border-gray-200',
                photo.error    ? 'border-red-400'             : '',
              )}
            >
              <Image src={photo.preview} alt="" fill unoptimized sizes="(max-width:640px) 50vw, 25vw" className="object-cover" />

              {/* Overlay au survol */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {!photo.is_cover && (
                  <button
                    onClick={() => onSetCover(i)}
                    title="Définir comme couverture"
                    className="p-1.5 bg-amber-400 rounded-full text-white"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(i)}
                  title="Supprimer"
                  className="p-1.5 bg-red-500 rounded-full text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Badge couverture */}
              {photo.is_cover && (
                <span className="absolute top-1 left-1 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5" /> Couverture
                </span>
              )}

              {/* Overlay uploading */}
              {photo.uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              {/* Overlay erreur */}
              {photo.error && (
                <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-200" />
                </div>
              )}

              {/* Badge succès */}
              {photo.url && !photo.uploading && (
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Bouton ajouter */}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center text-gray-400 hover:text-blue-500 transition"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

      {/* Conseils */}
      <div className="mt-4 bg-blue-50 rounded-xl p-4 flex gap-3">
        <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Conseils pour de bonnes photos</p>
          <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
            <li>• Fond neutre (blanc, bois clair)</li>
            <li>• Lumière naturelle sans flash direct</li>
            <li>• Vue de face, de profil, des détails importants</li>
            <li>• Montrez les défauts avec honnêteté — les acheteurs apprécient</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
