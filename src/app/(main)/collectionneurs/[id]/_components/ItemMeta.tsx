

import {
  ArrowLeftRight, CheckCircle2, Clock, Eye, Gem, MapPin,
  Search, Truck,
} from 'lucide-react';
import {
  MODE_CONFIG, STATUS_CONFIG, RARITY_CONFIG,
  type CollectionItem,
} from '@/lib/collectionneurs-config';
import { formatRelative, cn } from '@/lib/utils';

interface Props {
  item: CollectionItem;
}

export function ItemMeta({ item }: Props) {
  const modeCfg   = MODE_CONFIG[item.mode];
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.actif;
  const rarityCfg = item.rarity_level ? RARITY_CONFIG[item.rarity_level] : null;
  const ModeIcon  = modeCfg.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={cn(
          'inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full border',
          modeCfg.bg, modeCfg.color, modeCfg.border,
        )}>
          <ModeIcon className="w-4 h-4" /> {modeCfg.label}
        </span>
        <span className={cn('text-sm font-semibold px-3 py-1 rounded-full', statusCfg.bg, statusCfg.color)}>
          {statusCfg.label}
        </span>
        {item.is_featured && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white">
            ✨ À la une
          </span>
        )}
        {rarityCfg && item.rarity_level !== 'commun' && (
          <span className={cn('text-sm font-semibold flex items-center gap-1', rarityCfg.color)}>
            <Gem className="w-3.5 h-3.5" /> {rarityCfg.icon} {rarityCfg.label}
          </span>
        )}
      </div>

      <h1 className="text-2xl font-black text-gray-900 mb-3 leading-snug">{item.title}</h1>

      {/* Prix / mode */}
      <div className="mb-4">
        {item.mode === 'vente' && item.price != null ? (
          <div className="text-3xl font-black text-gray-900">
            {item.price === 0
              ? <span className="text-emerald-600">Gratuit</span>
              : `${item.price.toLocaleString('fr-FR')} €`
            }
          </div>
        ) : item.mode === 'don' ? (
          <div className="text-2xl font-black text-emerald-600">Don gratuit ❤️</div>
        ) : item.mode === 'echange' ? (
          <div>
            <div className="text-xl font-black text-amber-700 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" /> Échange
            </div>
            {item.exchange_expected && (
              <p className="text-sm text-gray-600 mt-1 italic">
                Recherche en échange : <strong>{item.exchange_expected}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="text-xl font-black text-purple-700 flex items-center gap-2">
            <Search className="w-5 h-5" /> Objet recherché
          </div>
        )}
      </div>

      {/* Localisation & livraison */}
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-5 flex-wrap">
        {item.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-gray-400" />
            {item.city}{item.postal_code ? ` (${item.postal_code})` : ''}
          </div>
        )}
        {item.shipping_available && (
          <div className="flex items-center gap-1.5 text-blue-600">
            <Truck className="w-4 h-4" /> Expédition possible
          </div>
        )}
        {item.local_meetup_available && (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" /> Remise en main propre
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-5">
        <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide mb-2">Description</h2>
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{item.description}</p>
      </div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.tags.map((tag, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats vues / favoris / date */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-4 border-t border-gray-50">
        {(item.views_count || 0) > 0 && (
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> {item.views_count} vues
          </span>
        )}
        {(item.favorites_count || 0) > 0 && (
          <span className="flex items-center gap-1">❤️ {item.favorites_count} favoris</span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {formatRelative(item.published_at || item.created_at)}
        </span>
      </div>
    </div>
  );
}
