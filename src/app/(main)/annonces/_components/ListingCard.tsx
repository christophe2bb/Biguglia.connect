'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Listing } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';
import ReportButton from '@/components/ui/ReportButton';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { LISTING_TYPE_LABELS, LISTING_TYPE_COLORS, CONDITION_LABELS, formatPrice, formatRelative } from '@/lib/utils';

// ── Extended type labels/colors (includes CDC types) ─────────────────────────

const ALL_TYPE_LABELS: Record<string, string> = {
  ...LISTING_TYPE_LABELS,
  exchange: 'Échange',
  rental:   'Location',
};

const ALL_TYPE_COLORS: Record<string, string> = {
  ...LISTING_TYPE_COLORS,
  exchange: 'bg-amber-100 text-amber-700',
  rental:   'bg-cyan-100 text-cyan-700',
};

const ALL_TYPE_EMOJIS: Record<string, string> = {
  sale:     '🏷️',
  wanted:   '🔍',
  free:     '🎁',
  service:  '🛠️',
  exchange: '🔄',
  rental:   '🔑',
};

const CONDITION_EXTENDED: Record<string, string> = {
  neuf:       '✨ Neuf',
  tres_bon:   '👍 Très bon',
  bon:        '👌 Bon état',
  usage:      '🔧 Usagé',
  a_reparer:  '🔨 À réparer',
  lot:        '📦 Lot',
  excellent:  '⭐ Excellent',
  passable:   '⚠️ Passable',
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ListingCardProps {
  listing: Listing;
  currentUserId?: string;
  isSaved: boolean;
  onToggleSave: (id: string, e: React.MouseEvent) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ListingCard({ listing, currentUserId, isSaved, onToggleSave }: ListingCardProps) {
  const photos     = listing.photos as Array<{ url: string }> | undefined;
  const lExt       = listing as Listing & { is_urgent?: boolean; sector_id?: string; author_id?: string; user_id?: string };
  const typeColor  = ALL_TYPE_COLORS[listing.listing_type]  || 'bg-gray-100 text-gray-700';
  const typeLabel  = ALL_TYPE_LABELS[listing.listing_type]  || listing.listing_type;
  const typeEmoji  = ALL_TYPE_EMOJIS[listing.listing_type]  || '📦';
  const ownerId    = lExt.user_id || lExt.author_id;
  const priceLabel = listing.listing_type === 'free' ? '🎁 Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix libre';

  return (
    <Link href={`/annonces/${listing.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-colors duration-200">

        {/* ── Photo zone — aspect-[4/3] évite le CLS (hauteur calculée sans JS) ── */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {photos && photos.length > 0 ? (
            <Image
              src={photos[0].url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-5xl opacity-20">{listing.category?.icon || '📦'}</span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Type + status badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-full shadow ${typeColor}`}>
              {typeEmoji} {typeLabel}
            </span>
            {listing.status !== 'active' && (
              <StatusBadge status={listing.status} contentType="listing" size="xs" showIcon />
            )}
            {lExt.is_urgent && (
              <span className="inline-block px-2 py-0.5 text-[10px] font-black rounded-full shadow bg-red-500 text-white animate-pulse">
                ⚡ URGENT
              </span>
            )}
          </div>

          {/* Price badge top-right */}
          <div className="absolute top-3 right-3">
            <span className="text-xs font-black bg-white/90 text-gray-800 px-2.5 py-1 rounded-full shadow">
              {priceLabel}
            </span>
          </div>

          {/* Favourite button */}
          <button
            onClick={e => onToggleSave(listing.id, e)}
            className={`absolute bottom-3 right-3 w-7 h-7 rounded-full flex items-center justify-center shadow transition-colors ${
              isSaved ? 'bg-pink-500 text-white scale-110' : 'bg-white/80 text-gray-400 hover:text-pink-500 hover:bg-white'
            }`}
            title={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
          </button>

          {/* Title at bottom */}
          <div className="absolute bottom-3 left-3 right-12">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{listing.title}</p>
            {listing.category?.name && <p className="text-white/75 text-xs mt-0.5">{listing.category.name}</p>}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-blue-700">
              {listing.listing_type === 'free' ? '🎁 Gratuit' : listing.price ? formatPrice(listing.price) : 'Prix à discuter'}
            </span>
            <span className="text-xs text-gray-400">{formatRelative(listing.created_at)}</span>
          </div>

          {listing.condition && (
            <p className="text-xs text-gray-400 mt-1">
              {CONDITION_EXTENDED[listing.condition] || CONDITION_LABELS[listing.condition] || listing.condition}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            {lExt.sector_id ? (
              <SectorBadge sectorId={lExt.sector_id} size="xs" />
            ) : <span />}
            {currentUserId && currentUserId !== ownerId && (
              <ReportButton targetType="listing" targetId={listing.id} targetTitle={listing.title} variant="icon" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
