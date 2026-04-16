'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Bell, BellOff, Check, CheckCircle2, Copy, XCircle } from 'lucide-react';
import ReportButton from '@/components/ui/ReportButton';
import ContactButton from '@/components/ui/ContactButton';
import { ReactionPanel } from './ReactionPanel';
import { TopicExtended, TopicPhoto } from '../_types';

// ─── Photo grid ───────────────────────────────────────────────────────────────
function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: TopicPhoto[];
  onOpen: (i: number) => void;
}) {
  if (photos.length === 0) return null;
  if (photos.length === 1) {
    return (
      <button onClick={() => onOpen(0)} className="block w-full rounded-xl overflow-hidden border border-gray-100 mb-5">
        <Image src={photos[0].url} alt="Photo" fill className="w-full max- object-cover hover:opacity-95 transition-opacity" />
      </button>
    );
  }
  const cols = photos.length === 2 ? 'grid-cols-2' : photos.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
  return (
    <div className={`grid gap-2 mb-5 ${cols}`}>
      {photos.slice(0, Math.min(photos.length, 4)).map((photo, i) => (
        <button key={i} onClick={() => onOpen(i)}
          className={`relative overflow-hidden rounded-xl border border-gray-100 ${i === 0 && photos.length >= 3 ? 'col-span-2 row-span-1' : ''}`}>
          <Image src={photo.url} alt="" fill className="w-full object-cover hover:opacity-90 transition-opacity" />
          {i === 3 && photos.length > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
              +{photos.length - 4}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: TopicPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number | ((prev: number | null) => number | null)) => void;
}) {
  const dialogRef  = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => { dialogRef.current?.focus(); });
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft')  onNavigate(i => i !== null ? (i - 1 + photos.length) % photos.length : 0);
      if (e.key === 'ArrowRight') onNavigate(i => i !== null ? (i + 1) % photos.length : 0);
    };
    window.addEventListener('keydown', handler);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handler);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [onClose, onNavigate, photos.length]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Photo ${index + 1} sur ${photos.length}`}
        tabIndex={-1}
        className="relative max-w-4xl w-full outline-none"
        onClick={e => e.stopPropagation()}
      >
        <Image src={photos[index].url} alt={`Photo ${index + 1}`} fill className="max-h-[80vh] w-full object-contain rounded-xl" />
        <div className="absolute top-3 right-3 flex gap-2">
          {photos.length > 1 && (
            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full" aria-live="polite">{index + 1} / {photos.length}</span>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer la visionneuse"
            className="bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >✕</button>
        </div>
        {photos.length > 1 && (
          <>
            <button
              onClick={() => onNavigate(i => i !== null ? (i - 1 + photos.length) % photos.length : 0)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">‹</button>
            <button
              onClick={() => onNavigate(i => i !== null ? (i + 1) % photos.length : 0)}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">›</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  topic:          TopicExtended;
  photos:         TopicPhoto[];
  lightboxIndex:  number | null;
  isFollowing:    boolean;
  copied:         boolean;
  canResolve:     boolean;
  currentUserId?: string;
  onLightbox:     (i: number | null | ((prev: number | null) => number | null)) => void;
  onToggleFollow: () => void;
  onCopyLink:     () => void;
  onToggleResolved: () => void;
}

// ─── TopicBody ────────────────────────────────────────────────────────────────
export function TopicBody({
  topic, photos, lightboxIndex, isFollowing, copied,
  canResolve, currentUserId, onLightbox, onToggleFollow, onCopyLink, onToggleResolved,
}: Props) {
  return (
    <>
      {/* Texte */}
      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-5">{topic.content}</div>

      {/* Photos */}
      <PhotoGrid photos={photos} onOpen={i => onLightbox(i)} />

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <Lightbox photos={photos} index={lightboxIndex} onClose={() => onLightbox(null)} onNavigate={onLightbox} />
      )}

      {/* Réactions + actions */}
      <div className="flex items-center gap-3 flex-wrap pt-3 border-t border-gray-50">
        <ReactionPanel targetId={topic.id} targetType="topic" currentUserId={currentUserId} />

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Suivre */}
          <button onClick={onToggleFollow}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors ${
              isFollowing ? 'bg-brand-50 text-brand-700 border-brand-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}>
            {isFollowing ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            {isFollowing ? 'Suivi' : 'Suivre'}
          </button>

          {/* Partager */}
          <button onClick={onCopyLink}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copié !' : 'Partager'}
          </button>

          {/* Résolu */}
          {canResolve && (
            <button onClick={onToggleResolved}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-colors font-semibold ${
                topic.is_resolved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
              }`}>
              {topic.is_resolved ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {topic.is_resolved ? 'Non résolu' : 'Marquer résolu'}
            </button>
          )}

          {/* Contact + signalement */}
          {currentUserId && currentUserId !== topic.author_id && (
            <>
              <ContactButton
                sourceType="general"
                sourceId={topic.id}
                sourceTitle={topic.title}
                ownerId={topic.author_id}
                userId={currentUserId}
                ctaLabel="Message privé"
                prefillMsg={`Bonjour, je vous contacte suite à votre sujet « ${topic.title} ».`}
                size="sm"
                variant="ghost"
              />
              <ReportButton targetType="post" targetId={topic.id} targetTitle={topic.title} variant="icon" />
            </>
          )}
        </div>
      </div>
    </>
  );
}
