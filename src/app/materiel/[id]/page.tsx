'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
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

export default function MaterielDetailPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const d = useMaterielDetail();

  if (d.loading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-4">
      <div className="h-64 bg-gray-200 rounded-2xl" />
      <div className="h-8 bg-gray-200 rounded w-3/4" />
    </div>
  );
  if (!d.item) return null;

  const { item, isOwner } = d;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link href="/materiel"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour au matériel
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Galerie + titre + badges */}
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
        </div>

        {/* ── Sidebar droite ── */}
        <div className="space-y-4">

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
        </div>
      </div>
    </div>
  );
}
