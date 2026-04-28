'use client';

import Image from 'next/image';
import { ImageIcon, X } from 'lucide-react';
import type { EventForm } from '../_config';

interface Props {
  form: EventForm;
  photos: File[];
  photoPreviews: string[];
  photoInputRef: React.RefObject<HTMLInputElement>;
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: (i: number) => void;
}

export function StepPhotos({ form, photos, photoPreviews, photoInputRef, handlePhotoSelect, removePhoto }: Props) {
  return (
    <>
      <h2 className="font-black text-gray-900 text-lg">Photos</h2>
      <p className="text-gray-500 text-sm">
        Ajoutez jusqu&apos;à 8 photos. La première sera l&apos;image principale.
      </p>

      <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple className="hidden" onChange={handlePhotoSelect} />

      {/* Photo grid */}
      {photoPreviews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photoPreviews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group/img">
              <Image src={src} alt="" fill className="object-cover" />
              {i === 0 && (
                <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg">
                  Couverture
                </div>
              )}
              <button
                type="button" onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {photos.length < 8 && (
        <button
          type="button" onClick={() => photoInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-purple-200 text-purple-500 hover:border-purple-400 hover:bg-purple-50 rounded-xl py-6 text-sm font-semibold transition-colors"
        >
          <ImageIcon className="w-5 h-5" />
          {photos.length === 0 ? 'Ajouter des photos' : `Ajouter (${photos.length}/8)`}
        </button>
      )}

      {/* Summary before submit */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1.5">
        <p className="font-bold text-purple-800 text-sm">Récapitulatif</p>
        <p className="text-sm text-purple-700">📌 {form.title || 'Sans titre'}</p>
        <p className="text-sm text-purple-700">📅 {form.event_date || 'Date non définie'} à {form.start_time}</p>
        <p className="text-sm text-purple-700">📍 {form.location || 'Lieu non défini'}</p>
        <p className="text-sm text-purple-700">
          💳{' '}
          {form.price_type === 'gratuit' ? 'Gratuit'
            : form.price_type === 'libre' ? 'Prix libre'
            : `${form.price_amount || '?'} €`}
          {' · '}
          {form.is_unlimited ? 'Places illimitées' : form.capacity ? `${form.capacity} places` : 'Capacité non définie'}
        </p>
        <p className="text-sm text-purple-700">🖼️ {photos.length} photo{photos.length > 1 ? 's' : ''}</p>
      </div>
    </>
  );
}
