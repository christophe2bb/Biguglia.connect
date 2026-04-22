'use client';

import { Heart, Loader2, Share2, Shield } from 'lucide-react';
import ContactButton from '@/components/ui/ContactButton';
import ReportButton from '@/components/ui/ReportButton';
import {
  MODE_CONFIG, STATUS_CONFIG,
  type CollectionItem, type CollectionStatus,
} from '@/lib/collectionneurs-config';
import { cn } from '@/lib/utils';
import { SellerTrustBlock } from './SellerTrustBlock';
import { OwnerActions }     from './OwnerActions';

interface Props {
  item: CollectionItem;
  isOwner: boolean;
  isClosed: boolean;
  isFav: boolean;
  favLoading: boolean;
  changingStatus: boolean;
  allowedTransitions: CollectionStatus[];
  userId?: string;
  onFav: () => void;
  onShare: () => void;
  onStatusChange: (status: CollectionStatus) => void;
  onDelete: () => void;
}

export function ItemSidebar({
  item, isOwner, isClosed,
  isFav, favLoading, changingStatus, allowedTransitions,
  userId,
  onFav, onShare, onStatusChange, onDelete,
}: Props) {
  const modeCfg   = MODE_CONFIG[item.mode];
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.actif;

  return (
    <div className="space-y-4">

      {/* ── CTA principal (non-propriétaire, non clôturé) ─────────────── */}
      {!isClosed && !isOwner && (
        <div className={cn('rounded-2xl border p-5', modeCfg.bg, modeCfg.border)}>
          <h3 className={cn('font-black mb-3 text-base', modeCfg.color)}>
            {modeCfg.cta}
          </h3>
          <ContactButton
            sourceType="collection_item"
            sourceId={item.id}
            sourceTitle={item.title}
            ownerId={item.author_id}
            userId={userId}
            className="w-full mb-2"
          />
          <p className="text-xs text-gray-500 text-center mt-2">
            💬 La messagerie privée est sécurisée
          </p>
        </div>
      )}

      {/* ── Réservé ───────────────────────────────────────────────────── */}
      {item.status === 'reserve' && !isOwner && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm font-bold text-amber-800">Cet objet est réservé</p>
          <p className="text-xs text-amber-700 mt-1">Il peut se libérer — contactez le vendeur</p>
        </div>
      )}

      {/* ── Clôturé ───────────────────────────────────────────────────── */}
      {isClosed && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-sm font-bold text-gray-700">{statusCfg.label}</p>
          <p className="text-xs text-gray-500 mt-1">Cette annonce est clôturée</p>
        </div>
      )}

      {/* ── Actions propriétaire ─────────────────────────────────────── */}
      {isOwner && (
        <OwnerActions
          item={item}
          allowedTransitions={allowedTransitions}
          changingStatus={changingStatus}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      )}

      {/* ── Favoris & Partage ─────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={onFav}
          disabled={favLoading}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
            isFav
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
          )}
        >
          {favLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Heart className={cn('w-4 h-4', isFav && 'fill-current')} />
          }
          {isFav ? 'Favori ❤️' : 'Favoris'}
        </button>
        <button
          onClick={onShare}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Share2 className="w-4 h-4" /> Partager
        </button>
      </div>

      {/* ── Confiance vendeur ─────────────────────────────────────────── */}
      {item.author && (
        <SellerTrustBlock author={item.author} showContact />
      )}

      {/* ── Signalement ───────────────────────────────────────────────── */}
      {!isOwner && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <ReportButton
            targetType="collection_item"
            targetId={item.id}
            targetTitle={item.title}
            variant="mini"
          />
        </div>
      )}

      {/* ── Conseils sécurité ─────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4" /> Conseils de sécurité
        </h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Rencontrez-vous dans un lieu public</li>
          <li>• Vérifiez l&apos;objet avant de conclure</li>
          <li>• N&apos;envoyez pas d&apos;argent à l&apos;avance</li>
          <li>• Utilisez la messagerie de la plateforme</li>
          <li>• Méfiez-vous des offres trop alléchantes</li>
        </ul>
      </div>
    </div>
  );
}
