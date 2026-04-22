'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import {
  Heart, Camera, MapPin, Truck, Eye, ArrowLeftRight,
  Search, MessageSquare, Sparkles, Loader2,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import ContactButton from '@/components/ui/ContactButton';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import { toPhotoItems } from '@/components/ui/photo-utils';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { cn, formatRelative } from '@/lib/utils';
import {
  MODE_CONFIG, STATUS_CONFIG, RARITY_CONFIG, CONDITION_CONFIG,
  type CollectionMode, type CollectionItem,
} from '@/lib/collectionneurs-config';
import { getCatClasses } from '../_constants';

// ── Helper: get photo URL from any photo shape ────────────────────────────────
function getPhotoUrl(p: NonNullable<CollectionItem['photos']>[number]) {
  return p.url ?? p.image_url ?? p.preview ?? '';
}

// ── Price / mode label ────────────────────────────────────────────────────────
function PriceLabel({ item, layout }: { item: CollectionItem; layout: 'grid' | 'list' }) {
  const isGrid = layout === 'grid';
  if (item.mode === 'vente' && item.price != null) {
    return (
      <div className={isGrid ? 'text-xl font-black text-gray-900' : 'text-lg font-black text-gray-900'}>
        {item.price === 0
          ? <span className={isGrid ? 'text-emerald-600' : ''}>Gratuit</span>
          : `${item.price.toLocaleString('fr-FR')} €`}
      </div>
    );
  }
  if (item.mode === 'don') return <div className={`font-bold text-emerald-600 ${isGrid ? 'text-base' : 'text-sm'}`}>Don gratuit ❤️</div>;
  if (item.mode === 'echange') {
    return isGrid ? (
      <div className="text-sm font-bold text-amber-700 flex items-center gap-1">
        <ArrowLeftRight className="w-3.5 h-3.5" />
        {item.exchange_expected ? `Contre : ${item.exchange_expected}` : 'Échange à discuter'}
      </div>
    ) : <div className="text-sm font-bold text-amber-600">Échange</div>;
  }
  return isGrid
    ? <div className="text-sm font-bold text-purple-700 flex items-center gap-1"><Search className="w-3.5 h-3.5" /> Recherche</div>
    : <div className="text-sm font-bold text-purple-600">Recherche</div>;
}

// ─── ItemCard ─────────────────────────────────────────────────────────────────
interface Props {
  item: CollectionItem;
  currentUserId?: string;
  onFavoriteToggle: (itemId: string, isFav: boolean) => void;
  viewMode?: 'grid' | 'list';
}

export default function ItemCard({ item, currentUserId, onFavoriteToggle, viewMode = 'grid' }: Props) {
  const modeCfg   = MODE_CONFIG[item.mode || (item.item_type === 'troc' ? 'echange' : item.item_type as CollectionMode) || 'vente'];
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.actif;
  const rarityCfg = item.rarity_level ? RARITY_CONFIG[item.rarity_level] : null;
  const condCfg   = CONDITION_CONFIG[item.condition];
  const catClasses = item.category ? getCatClasses(item.category.color) : { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

  const coverPhoto = item.photos?.find(p => p.is_cover && getPhotoUrl(p)) ?? item.photos?.find(p => getPhotoUrl(p));
  const coverUrl   = coverPhoto ? getPhotoUrl(coverPhoto) : '';
  const photoCount = item.photos?.filter(p => getPhotoUrl(p)).length ?? 0;
  const allPhotos  = toPhotoItems(
    (item.photos ?? []).map((p, i) => ({ url: getPhotoUrl(p), display_order: p.sort_order ?? i })).filter(p => p.url)
  );

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx,  setLightboxIdx]  = useState(0);
  const [favLoading,   setFavLoading]   = useState(false);

  const isOwner  = currentUserId === item.author_id;
  const isClosed = statusCfg.closed;
  const ModeIcon = modeCfg.icon;
  const sectorId = (item as CollectionItem & { sector_id?: string }).sector_id;

  const handleFav = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!currentUserId) { toast.error('Connectez-vous pour ajouter aux favoris'); return; }
    setFavLoading(true);
    try { onFavoriteToggle(item.id, !!item.isFavorited); }
    finally { setFavLoading(false); }
  };

  // ── List view ─────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div className={cn(
        'bg-white rounded-2xl border border-gray-100 overflow-hidden',
        'hover:shadow-md hover:border-gray-200 transition-colors duration-200',
        isClosed && 'opacity-70'
      )}>
        <div className="flex gap-4 p-3">
          {/* Thumbnail */}
          <div
            className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
            role="button"
            tabIndex={coverPhoto ? 0 : undefined}
            onClick={() => { if (coverPhoto) { setLightboxIdx(0); setLightboxOpen(true); } }}
            onKeyDown={(e) => { if (coverPhoto && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setLightboxIdx(0); setLightboxOpen(true); } }}
          >
            {coverUrl
              ? <Image src={coverUrl} alt={item.title} fill sizes="96px" className="object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">{item.category?.icon ?? '📦'}</div>}
            {isClosed && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full bg-black/50">{statusCfg.label}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border', modeCfg.bg, modeCfg.color, modeCfg.border)}>
                    <ModeIcon className="w-3 h-3" />{modeCfg.label}
                  </span>
                  {item.is_featured && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white">
                      <Sparkles className="w-3 h-3" /> À la une
                    </span>
                  )}
                  {rarityCfg && item.rarity_level !== 'commun' && (
                    <span className={cn('text-xs font-semibold', rarityCfg.color)}>{rarityCfg.icon} {rarityCfg.label}</span>
                  )}
                </div>
                <Link href={`/collectionneurs/${item.id}`}>
                  <h3 className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 mb-0.5">{item.title}</h3>
                </Link>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className={condCfg.color}>{condCfg.label}</span>
                  {item.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.city}</span>}
                  {item.shipping_available && <span className="flex items-center gap-0.5 text-blue-500"><Truck className="w-3 h-3" />Expédition</span>}
                  {sectorId && <SectorBadge sectorId={sectorId} size="xs" />}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <PriceLabel item={item} layout="list" />
              </div>
            </div>
          </div>
        </div>

        {lightboxOpen && allPhotos.length > 0 && (
          <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
        )}
      </div>
    );
  }

  // ── Grid view ─────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-gray-100 overflow-hidden group',
      'hover:shadow-lg hover:shadow-gray-100/80 hover:border-gray-200 transition-colors duration-200',
      isClosed && 'opacity-75',
      item.is_featured && 'ring-2 ring-amber-300/50 shadow-amber-50'
    )}>
      {/* Photo */}
      <div
        className="relative aspect-square bg-gray-50 overflow-hidden cursor-pointer"
        role="button"
        tabIndex={coverPhoto ? 0 : undefined}
        onClick={() => { if (coverPhoto) { setLightboxIdx(0); setLightboxOpen(true); } }}
        onKeyDown={(e) => { if (coverPhoto && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setLightboxIdx(0); setLightboxOpen(true); } }}
      >
        {coverUrl ? (
          <>
            <Image src={coverUrl} alt={item.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
            {photoCount > 1 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                <Camera className="w-3 h-3" /> {photoCount}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300">
            <span className="text-4xl">{item.category?.icon ?? '📦'}</span>
            <span className="text-xs text-gray-400">Aucune photo</span>
          </div>
        )}

        {/* Featured badge */}
        {item.is_featured && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm">
              <Sparkles className="w-3 h-3" /> À la une
            </span>
          </div>
        )}

        {/* Closed overlay */}
        {isClosed && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="px-3 py-1.5 rounded-xl text-sm font-black text-white shadow-lg bg-black/70">{statusCfg.label}</div>
          </div>
        )}

        {/* Favorite button */}
        {!isOwner && (
          <button
            onClick={handleFav}
            disabled={favLoading}
            className={cn(
              'absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center',
              'transition-colors duration-200 shadow-sm',
              item.isFavorited
                ? 'bg-red-500 text-white scale-110'
                : 'bg-white/90 text-gray-400 hover:bg-white hover:text-red-500 hover:scale-110'
            )}
          >
            {favLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Heart className={cn('w-4 h-4', item.isFavorited && 'fill-current')} />}
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        {/* Mode + status badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border', modeCfg.bg, modeCfg.color, modeCfg.border)}>
            <ModeIcon className="w-3 h-3" />{modeCfg.label}
          </span>
          {!isClosed && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusCfg.bg, statusCfg.color)}>{statusCfg.label}</span>
          )}
          {rarityCfg && item.rarity_level !== 'commun' && (
            <span className={cn('text-xs font-semibold', rarityCfg.color)}>{rarityCfg.icon}</span>
          )}
        </div>

        {/* Title */}
        <Link href={`/collectionneurs/${item.id}`}>
          <h3 className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-1 leading-snug">{item.title}</h3>
        </Link>

        {/* Category pill */}
        {item.category && (
          <div className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-2', catClasses.bg, catClasses.text)}>
            {item.category.icon} {item.category.name}
          </div>
        )}

        {/* Price */}
        <div className="mb-2">
          <PriceLabel item={item} layout="grid" />
        </div>

        {/* Location + shipping + stats */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <div className="flex items-center gap-2">
            {item.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.city}</span>}
            {item.shipping_available && <span className="flex items-center gap-0.5 text-blue-500"><Truck className="w-3 h-3" />Envoi</span>}
          </div>
          <div className="flex items-center gap-2">
            {(item.views_count ?? 0) > 0 && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.views_count}</span>}
            {(item.favorites_count ?? 0) > 0 && <span className="flex items-center gap-0.5 text-red-400"><Heart className="w-3 h-3" />{item.favorites_count}</span>}
          </div>
        </div>

        {/* Published date */}
        <div className="flex justify-end">
          <span className="text-xs text-gray-400">{formatRelative(item.published_at ?? item.created_at)}</span>
        </div>

        {/* CTA */}
        {!isClosed && !isOwner && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
            <Link href={`/collectionneurs/${item.id}`}
              className={cn('flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors hover:opacity-80', modeCfg.bg, modeCfg.color)}>
              <MessageSquare className="w-3.5 h-3.5" />{modeCfg.cta}
            </Link>
            <ContactButton
              sourceType="collection_item"
              sourceId={item.id}
              sourceTitle={item.title}
              ownerId={item.author_id}
              userId={currentUserId}
              size="sm"
              ctaLabel="Contacter"
              prefillMsg={`👋 Bonjour, je suis intéressé(e) par votre annonce "${item.title}".`}
            />
          </div>
        )}
        {isOwner && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2">
            <Link href={`/collectionneurs/${item.id}/modifier`}
              className="flex-1 text-center text-xs text-gray-500 hover:text-gray-700 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              Modifier
            </Link>
            <Link href="/dashboard/collectionneurs"
              className="flex-1 text-center text-xs text-blue-600 hover:text-blue-700 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
              Dashboard
            </Link>
          </div>
        )}

        {/* Author mini-card */}
        <div className="mt-2 pt-2 border-t border-gray-50">
          <Link href={`/profil/${item.author_id}`}
            className="flex items-center gap-2 group/author hover:bg-amber-50 rounded-xl px-2 py-1.5 transition-colors -mx-1">
            <Avatar src={item.author?.avatar_url} name={item.author?.full_name ?? '?'} size="xs" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 group-hover/author:text-amber-700 truncate transition-colors">
                {item.author?.full_name ?? 'Membre'}
              </p>
              <p className="text-xs text-gray-400 truncate">Voir le profil →</p>
            </div>
          </Link>
        </div>
      </div>

      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}
