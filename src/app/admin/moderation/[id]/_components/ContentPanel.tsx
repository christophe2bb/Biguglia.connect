'use client';

import Image from 'next/image';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { Section } from './Section';
import type { QueueDetail } from '../_types';

interface Props {
  item: QueueDetail;
  photoIndex: number;
  onPhotoSelect: (i: number) => void;
}

export function ContentPanel({ item, photoIndex, onPhotoSelect }: Props) {
  return (
    <>
      {/* Texte */}
      <Section title="Contenu de la publication" icon={FileText}>
        <h2 className="text-lg font-bold text-gray-900 mb-2">
          {item.content_title || '(Sans titre)'}
        </h2>
        {item.content_excerpt ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {item.content_excerpt}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Extrait non disponible — voir la publication originale.
          </p>
        )}
      </Section>

      {/* Photos */}
      {item.content_photos && item.content_photos.length > 0 && (
        <Section title={`Photos (${item.content_photos.length})`} icon={ImageIcon}>
          <div className="space-y-3">
            {/* Aperçu principal */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={item.content_photos[photoIndex]}
                alt={`Photo ${photoIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 700px"
                priority
              />
            </div>

            {/* Miniatures */}
            {item.content_photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {item.content_photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => onPhotoSelect(i)}
                    className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === photoIndex ? 'border-brand-500' : 'border-transparent'
                    }`}
                  >
                    <Image src={url} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}
    </>
  );
}
