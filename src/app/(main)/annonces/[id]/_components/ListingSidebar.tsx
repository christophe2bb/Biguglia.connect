'use client';

import { Clock } from 'lucide-react';
import ReportButton from '@/components/ui/ReportButton';
import { formatDate } from '@/lib/utils';
import { SellerCard }       from './SellerCard';
import { SellerReputation } from './SellerReputation';
import type { ExtListing } from '../_types';

type Props = {
  listing: ExtListing;
  isOwner: boolean;
  currentStatus: string;
  deleting: boolean;
  userId: string | undefined;
  profileId: string | undefined;
  onStatusChange: (s: string) => Promise<void>;
  onDelete: () => void | Promise<void>;
};

export function ListingSidebar({
  listing, isOwner, currentStatus, deleting,
  userId, profileId, onStatusChange, onDelete,
}: Props) {
  const isExpired = listing.expires_at
    ? new Date(listing.expires_at) < new Date()
    : false;


  return (
    <div className="space-y-4">

      {/* ── Seller card (avatar + CTA + owner management) ─────────────────── */}
      <SellerCard
        listing={listing}
        isOwner={isOwner}
        currentStatus={currentStatus}
        deleting={deleting}
        userId={userId}
        onStatusChange={onStatusChange}
        onDelete={onDelete}
      />

      {/* ── Seller reputation (TrustScore) ────────────────────────────────── */}
      <SellerReputation listing={listing} />

      {/* ── Expiry notice ─────────────────────────────────────────────────── */}
      {listing.expires_at && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
          isExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'
        }`}>
          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-bold text-amber-800">
              {isExpired ? '⏱ Annonce expirée' : '⏱ Expire le'}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">{formatDate(listing.expires_at)}</p>
          </div>
        </div>
      )}

      {/* ── Safety tips ───────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <h4 className="text-sm font-bold text-blue-800 mb-2">🔒 Conseils de sécurité</h4>
        <ul className="text-xs text-blue-700 space-y-1.5">
          <li>• Rencontrez-vous dans un lieu public</li>
          <li>• Vérifiez le produit avant de payer</li>
          <li>• N&apos;envoyez pas d&apos;argent à l&apos;avance</li>
          <li>• Utilisez la messagerie de la plateforme</li>
          <li>• Méfiez-vous des offres trop alléchantes</li>
        </ul>
      </div>

      {/* ── Report button (visitors only) ─────────────────────────────────── */}
      {!isOwner && profileId && (
        <div className="flex justify-center">
          <ReportButton targetType="listing" targetId={listing.id}
            targetTitle={listing.title} variant="text" />
        </div>
      )}
    </div>
  );
}
