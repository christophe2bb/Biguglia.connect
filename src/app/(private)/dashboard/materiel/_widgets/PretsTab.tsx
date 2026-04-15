'use client';

import Link from 'next/link';
import { Package, CheckCircle, ArrowDownCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { type EquipmentLoan } from '@/lib/equipment';
import { formatDate } from '@/lib/utils';

interface ActivePretsProps {
  activeLoans: EquipmentLoan[];
  actionLoading: string | null;
  onMarkLoaned: (loan: EquipmentLoan) => void;
  onMarkReturned: (loan: EquipmentLoan) => void;
}

export function PretsActifsTab({ activeLoans, actionLoading, onMarkLoaned, onMarkReturned }: ActivePretsProps) {
  if (activeLoans.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucun prêt actif en ce moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeLoans.map(loan => {
        const isCours = loan.status === 'en_cours';
        return (
          <div key={loan.id} className={`bg-white rounded-2xl border p-5 ${isCours ? 'border-purple-200' : 'border-orange-200'}`}>
            <div className="flex items-start gap-4">
              <Avatar
                src={(loan.borrower as { avatar_url?: string })?.avatar_url}
                name={(loan.borrower as { full_name?: string })?.full_name || '?'}
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{(loan.borrower as { full_name?: string })?.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isCours ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                    {isCours ? '🔄 En cours' : '🔒 Réservé'}
                  </span>
                </div>
                <Link href={`/materiel/${loan.equipment_id}`} className="text-xs text-brand-600 hover:underline">
                  {(loan.equipment as { title?: string })?.title || 'Voir le matériel'} →
                </Link>
                <div className="text-xs text-gray-500 mt-1">
                  {isCours
                    ? `Prêté depuis ${formatDate(loan.loan_started_at || '')}`
                    : `Réservé le ${formatDate(loan.reserved_at || '')}`}
                </div>
              </div>
              <div className="flex-shrink-0">
                {loan.status === 'reserve' && (
                  <button onClick={() => onMarkLoaned(loan)} disabled={actionLoading === loan.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition disabled:opacity-50">
                    <CheckCircle className="w-3.5 h-3.5" /> Marquer prêté
                  </button>
                )}
                {loan.status === 'en_cours' && (
                  <button onClick={() => onMarkReturned(loan)} disabled={actionLoading === loan.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
                    <CheckCircle className="w-3.5 h-3.5" /> Retour confirmé
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RecusProps {
  borrowedLoans: EquipmentLoan[];
}

export function PretsRecusTab({ borrowedLoans }: RecusProps) {
  if (borrowedLoans.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <ArrowDownCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium mb-1">Aucun prêt reçu</p>
        <p className="text-sm">Les matériels que vous empruntez apparaîtront ici</p>
        <Link href="/materiel" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
          Parcourir le matériel disponible →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {borrowedLoans.map(loan => {
        const isCours = loan.status === 'en_cours';
        const isTermine = ['retourne', 'annule'].includes(loan.status);
        const statusLabel = isCours ? '🔄 En cours'
          : loan.status === 'reserve' ? '🔒 Réservé'
          : loan.status === 'retourne' ? '✅ Terminé'
          : '❌ Annulé';
        const borderClass = isCours ? 'border-purple-200'
          : loan.status === 'reserve' ? 'border-orange-200'
          : 'border-gray-100';

        return (
          <div key={loan.id} className={`bg-white rounded-2xl border p-5 ${borderClass}`}>
            <div className="flex items-start gap-4">
              <Avatar
                src={(loan.owner as { avatar_url?: string })?.avatar_url}
                name={(loan.owner as { full_name?: string })?.full_name || '?'}
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{(loan.owner as { full_name?: string })?.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isCours ? 'bg-purple-100 text-purple-700'
                    : loan.status === 'reserve' ? 'bg-orange-100 text-orange-700'
                    : loan.status === 'retourne' ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>{statusLabel}</span>
                </div>
                <Link href={`/materiel/${loan.equipment_id}`} className="text-xs text-brand-600 hover:underline">
                  {(loan.equipment as { title?: string })?.title || 'Voir le matériel'} →
                </Link>
                <div className="text-xs text-gray-500 mt-1">
                  {isCours ? `Prêté depuis ${formatDate(loan.loan_started_at || '')}`
                    : loan.status === 'reserve' ? `Réservé le ${formatDate(loan.reserved_at || '')}`
                    : loan.returned_at ? `Rendu le ${formatDate(loan.returned_at)}`
                    : `Mis à jour le ${formatDate(loan.reserved_at || '')}`}
                </div>
              </div>
              {!isTermine && (
                <Link href={`/materiel/${loan.equipment_id}`}
                  className="flex-shrink-0 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-100 transition">
                  Voir la fiche
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
