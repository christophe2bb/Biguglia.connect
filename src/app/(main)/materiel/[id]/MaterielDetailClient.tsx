'use client';

/**
 * MaterielDetailClient — Partie interactive uniquement.
 * Reçoit initialItem pré-chargé côté serveur.
 *
 * Variants :
 *  - main-content : galerie complète, conditions, prêt actif, demandes, historique
 *  - sidebar       : OwnerCard + BorrowerActions
 */

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useMaterielDetail } from './useMaterielDetail';
import EquipmentGallery from './_components/EquipmentGallery';
import EquipmentContent from './_components/EquipmentContent';
import OwnerCard from './_components/OwnerCard';
import BorrowerActions from './_components/BorrowerActions';
import {
  ActiveLoanCard, PendingRequests, StatusHistory,
} from './_components/ActiveLoanPanel';
import type { EquipmentItemFull } from '@/lib/equipment';

type Variant = 'main-content' | 'sidebar';

interface Props {
  initialItem: EquipmentItemFull;
  variant: Variant;
}

export default function MaterielDetailClient({ initialItem, variant }: Props) {
  const router = useRouter();
  const { profile } = useAuthStore();
  const d = useMaterielDetail(initialItem);

  const item = d.item ?? initialItem;
  const isOwner = d.isOwner;

  if (variant === 'main-content') {
    return (
      <>
        {/* Galerie complète avec lightbox (client) */}
        <EquipmentGallery item={item} />

        {/* Description + conditions + règles + caution */}
        <EquipmentContent item={item} />

        {/* Prêt actif (propriétaire) */}
        {isOwner && d.activeLoan && (
          <ActiveLoanCard
            item={item}
            activeLoan={d.activeLoan}
            statusLoading={d.statusLoading}
            ownerNote={d.ownerNote}
            setOwnerNote={d.setOwnerNote}
            showOwnerNoteForm={d.showOwnerNoteForm}
            onMarkLoaned={d.handleMarkLoaned}
            onMarkReturned={d.handleMarkReturned}
            onSaveOwnerNote={d.handleSaveOwnerNote}
          />
        )}

        {/* Demandes en attente (propriétaire) */}
        {isOwner && (
          <PendingRequests
            requests={d.requests}
            onAccept={d.handleAcceptRequest}
            onRefuse={d.handleRefuseRequest}
          />
        )}

        {/* Historique statuts (propriétaire / admin) */}
        {(isOwner || profile?.role === 'admin') && (
          <StatusHistory
            history={d.history}
            showHistory={d.showHistory}
            onToggle={() => d.setShowHistory(!d.showHistory)}
          />
        )}
      </>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        {/* Carte propriétaire + actions + réputation + rassurance */}
        <OwnerCard
          item={item}
          isOwner={isOwner}
          userId={profile?.id}
          statusLoading={d.statusLoading}
          onStatusChange={d.handleStatusChange}
          onDelete={d.handleDelete}
        />

        {/* Actions emprunteur (demande + statut + note) */}
        {!isOwner && (
          <BorrowerActions
            item={item}
            requests={d.requests}
            activeLoan={d.activeLoan}
            userId={profile?.id}
            showRequestForm={d.showRequestForm}
            setShowRequestForm={d.setShowRequestForm}
            requestForm={d.requestForm}
            setRequestForm={d.setRequestForm}
            submitting={d.submitting}
            borrowerNote={d.borrowerNote}
            setBorrowerNote={d.setBorrowerNote}
            onSendRequest={d.handleSendRequest}
            onCancelRequest={d.handleCancelMyRequest}
            onSaveBorrowerNote={d.handleSaveBorrowerNote}
            onLoginRedirect={() => router.push('/connexion?redirect=/materiel/' + item.id)}
          />
        )}
      </>
    );
  }

  return null;
}
