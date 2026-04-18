'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Eye, Heart, MessageSquare, Clock,
  CheckCircle2, Archive, Pencil, Trash2, Gem,
} from 'lucide-react';
import { formatRelative, cn } from '@/lib/utils';
import {
  MODE_CONFIG, STATUS_CONFIG,
  type CollectionStatus, type CollectionItem,
} from '@/lib/collectionneurs-config';

interface ItemCardProps {
  item: CollectionItem;
  onStatusChange: (id: string, status: CollectionStatus) => void;
  onDelete: (id: string) => void;
}

export default function ItemCard({ item, onStatusChange, onDelete }: ItemCardProps) {
  const modeCfg   = MODE_CONFIG[item.mode]     || MODE_CONFIG.vente;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.actif;
  const ModeIcon  = modeCfg.icon;

  const coverPhoto = item.photos?.find(p => p.is_cover) || item.photos?.[0];

  return (
    <div
      className={cn(
        'bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-all group',
        statusCfg.closed ? 'border-gray-100 opacity-75' : 'border-gray-100 hover:border-blue-200',
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <Link
          href={`/collectionneurs/${item.id}`}
          className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100"
        >
          {coverPhoto ? (
            <Image
              src={coverPhoto.url || coverPhoto.preview || ''}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Gem className="w-8 h-8" />
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Link
              href={`/collectionneurs/${item.id}`}
              className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-blue-600 transition"
            >
              {item.title}
            </Link>
            <span className={cn('flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold', statusCfg.bg, statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', modeCfg.bg, modeCfg.color, modeCfg.border)}>
              <ModeIcon className="w-3 h-3" />
              {modeCfg.label}
            </span>
            {item.mode === 'vente' && item.price != null && (
              <span className="text-sm font-bold text-blue-700">{Number(item.price).toLocaleString('fr-FR')} €</span>
            )}
            {item.rarity_level && item.rarity_level !== 'commun' && (
              <span className="text-xs">{['rare', 'tres_rare', 'unique'].includes(item.rarity_level) ? '💎' : '✨'}</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {item.views_count ?? 0}</span>
            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {item.favorites_count ?? 0}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {item.messages_count ?? 0}</span>
            <span className="ml-auto">{formatRelative(item.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {!statusCfg.closed && (
        <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
          <Link
            href={`/collectionneurs/${item.id}/modifier`}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
          >
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </Link>

          {item.status === 'actif' && (
            <button
              onClick={() => onStatusChange(item.id, 'reserve')}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition"
            >
              <Clock className="w-3.5 h-3.5" /> Réserver
            </button>
          )}
          {item.status === 'reserve' && (
            <button
              onClick={() => onStatusChange(item.id, 'actif')}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Remettre actif
            </button>
          )}

          {item.status !== 'archive' && (
            <button
              onClick={() => onStatusChange(
                item.id,
                item.mode === 'vente'   ? 'vendu'   :
                item.mode === 'echange' ? 'echange' :
                item.mode === 'don'     ? 'donne'   : 'trouve',
              )}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition ml-auto"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {item.mode === 'vente'   ? 'Marquer vendu' :
               item.mode === 'echange' ? 'Échangé ✓'     :
               item.mode === 'don'     ? 'Donné ✓'       : 'Trouvé ✓'}
            </button>
          )}

          <button
            onClick={() => onDelete(item.id)}
            aria-label="Supprimer cette annonce"
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {statusCfg.closed && (
        <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
          <button
            onClick={() => onStatusChange(item.id, 'archive')}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition"
          >
            <Archive className="w-3.5 h-3.5" /> Archiver
          </button>
          <Link
            href={`/collectionneurs/${item.id}`}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition ml-auto"
          >
            <Eye className="w-3.5 h-3.5" /> Voir
          </Link>
        </div>
      )}
    </div>
  );
}
