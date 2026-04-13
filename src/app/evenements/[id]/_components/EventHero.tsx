'use client';

/**
 * EventHero — Cover image, titre, catégorie, badge statut, boutons iCal / partage.
 */

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Download, Share2, Copy } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { EVENT_CATEGORY_CONFIG } from '@/lib/events';
import type { EventDetail } from '../_types';

interface Props {
  event: EventDetail;
  onDownloadIcal: () => void;
  onCopyLink: () => Promise<void>;
  showShareMenu: boolean;
  onToggleShare: () => void;
  copied: boolean;
}

export default function EventHero({
  event,
  onDownloadIcal,
  onCopyLink,
  showShareMenu,
  onToggleShare,
  copied,
}: Props) {
  const cat = EVENT_CATEGORY_CONFIG[event.category as keyof typeof EVENT_CATEGORY_CONFIG]
    ?? EVENT_CATEGORY_CONFIG.autres;

  const allPhotos = event.photos ?? [];
  const coverPhoto =
    allPhotos.find(p => p.is_cover)?.url ?? event.cover_photo_url ?? allPhotos[0]?.url;

  const isFull =
    !event.is_unlimited &&
    !!event.capacity &&
    (event.participants_count ?? 0) >= event.capacity;

  return (
    <div className="relative h-64 sm:h-80 bg-gradient-to-br from-purple-600 to-violet-700 overflow-hidden">
      {/* Cover */}
      {coverPhoto ? (
        <Image src={coverPhoto} alt={event.title} fill priority sizes="100vw" className="object-cover opacity-60" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl opacity-30">{cat.icon}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Back */}
      <Link
        href="/evenements"
        className="absolute top-4 left-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-white/30 transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      {/* Top-right actions */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* iCal */}
        <button
          onClick={onDownloadIcal}
          title="Ajouter au calendrier (.ics)"
          className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Share */}
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); onToggleShare(); }}
            title="Partager"
            className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {showShareMenu && (
            <div className="absolute right-0 top-10 bg-white shadow-xl rounded-2xl border border-gray-100 p-2 w-52 z-20 space-y-1">
              <button
                onClick={onCopyLink}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium"
              >
                <Copy className="w-4 h-4 text-gray-400" />
                {copied ? 'Lien copié ✓' : 'Copier le lien'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(event.title + ' — ' + window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium"
              >
                <span className="text-base">💬</span> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium"
              >
                <span className="text-base">📘</span> Facebook
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent('Rejoins-moi : ' + window.location.href)}`}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 font-medium"
              >
                <span className="text-base">📧</span> Email
              </a>
            </div>
          )}
        </div>

        <StatusBadge
          status={event.status}
          contentType="event"
          extra={{ eventDate: event.event_date, isFull }}
        />
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${cat.bg} ${cat.color} border ${cat.border}`}>
          <span>{cat.icon}</span> {cat.label}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{event.title}</h1>
        {event.subtitle && (
          <p className="text-white/80 text-sm mt-1">{event.subtitle}</p>
        )}
      </div>
    </div>
  );
}
