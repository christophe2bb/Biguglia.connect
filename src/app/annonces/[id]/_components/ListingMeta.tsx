import { MapPin, Calendar, Tag, Eye } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { formatDate } from '@/lib/utils';
import { ALL_TYPE_LABELS, ALL_TYPE_COLORS, ALL_TYPE_EMOJIS, CONDITION_LABELS } from '../_config';
import type { ExtListing } from '../_types';

type Props = { listing: ExtListing };

export function ListingMeta({ listing }: Props) {
  const typeLabel = ALL_TYPE_LABELS[listing.listing_type] || listing.listing_type;
  const typeColor = ALL_TYPE_COLORS[listing.listing_type] || 'bg-gray-100 text-gray-700';
  const typeEmoji = ALL_TYPE_EMOJIS[listing.listing_type] || '📦';

  return (
    <div>
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-full ${typeColor}`}>
          {typeEmoji} {typeLabel}
        </span>
        <StatusBadge
          status={listing.status}
          contentType="listing"
          size="md"
          showIcon
          showDot={listing.status === 'active'}
        />
        {listing.category && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {listing.category.icon} {listing.category.name}
          </span>
        )}
        {listing.is_negotiable && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
            💬 Prix négociable
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>

      {/* Price */}
      {listing.price !== undefined && listing.price !== null && (
        <div className="text-3xl font-black text-blue-600 mb-3">
          {listing.price === 0 ? '🎁 Gratuit' : `${listing.price.toLocaleString('fr-FR')} €`}
          {listing.is_negotiable && (
            <span className="text-sm font-normal text-gray-400 ml-2">à discuter</span>
          )}
        </div>
      )}
      {listing.listing_type === 'free' && !listing.price && (
        <div className="text-3xl font-black text-green-600 mb-3">🎁 Gratuit</div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {listing.location}
        </div>
        {listing.sector_id && <SectorBadge sectorId={listing.sector_id} size="sm" />}
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {formatDate(listing.created_at)}
        </div>
        {listing.condition && (
          <div className="flex items-center gap-1">
            <Tag className="w-4 h-4" />
            {CONDITION_LABELS[listing.condition] || listing.condition}
          </div>
        )}
        {listing.views_count !== undefined && (
          <div className="flex items-center gap-1 sm:hidden">
            <Eye className="w-4 h-4" />
            {listing.views_count} vue{listing.views_count !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
