'use client';

/**
 * src/components/ui/photo/PhotoUploaderField.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Zone d'upload avec photo principale + photos secondaires réordonnables.
 * Drag-and-drop natif HTML5 pour réorganiser l'ordre.
 * La première photo est toujours la photo principale (isPrimary=true).
 */

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Star, GripVertical, Trash2, ImagePlus, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedPhoto {
  id: string;          // temp id (Date.now() + random)
  file?: File;         // si nouvelle
  url: string;         // preview URL ou URL Supabase
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
  const [dragId, setDragId] = useState<string | null>(null);

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

      {canAdd && (
        <div
          role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-5 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors group"
        >
          <ImagePlus className="w-8 h-8 text-gray-400 group-hover:text-brand-500 mx-auto mb-2 transition-colors" />
          <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-600 transition-colors">
            Ajouter des photos
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {photos.length}/{maxPhotos} — La <strong>1ère photo</strong> sera la photo principale
          </p>
          <input
            ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
            disabled={disabled}
          />
        </div>
      )}

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
                'relative rounded-xl overflow-hidden border-2 transition-colors group',
                photo.isPrimary
                  ? 'border-amber-400 shadow-lg shadow-amber-100'
                  : 'border-gray-200 hover:border-gray-300',
                dragId === photo.id && 'opacity-50 scale-95',
              )}
            >
              <div className="relative aspect-square">
                <Image
                  src={photo.url} alt="" fill
                  sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                  unoptimized={photo.url.startsWith('blob:')}
                  className="object-cover"
                />
              </div>

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex flex-col justify-between p-1.5">
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
                  <GripVertical className="w-4 h-4 text-white/0 group-hover:text-white/80 transition-colors cursor-grab" />
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!photo.isPrimary && (
                    <button
                      onClick={() => setPrimary(photo.id)}
                      aria-label="Définir comme photo principale"
                      className="flex-1 flex items-center justify-center gap-1 bg-amber-500/90 text-white text-[10px] font-bold py-1 rounded-lg hover:bg-amber-500 transition-colors"
                    >
                      <Star className="w-2.5 h-2.5" aria-hidden="true" /> Principale
                    </button>
                  )}
                  <button
                    onClick={() => remove(photo.id)}
                    aria-label="Supprimer cette photo"
                    className="p-1.5 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {canAdd && photos.length > 0 && (
            <div
              role="button" tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/20 transition-colors"
            >
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
