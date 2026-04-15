'use client';

import Link from 'next/link';
import { History } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { type EquipmentLoan } from '@/lib/equipment';
import { formatDate } from '@/lib/utils';

interface Props {
  loanHistory: EquipmentLoan[];
}

export default function HistoriqueTab({ loanHistory }: Props) {
  if (loanHistory.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucun prêt terminé pour l&apos;instant</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loanHistory.map(loan => (
        <div key={loan.id} className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={(loan.borrower as { avatar_url?: string })?.avatar_url}
              name={(loan.borrower as { full_name?: string })?.full_name || '?'}
              size="sm"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900">{(loan.borrower as { full_name?: string })?.full_name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">🏁 Terminé</span>
              </div>
              <Link href={`/materiel/${loan.equipment_id}`} className="text-xs text-brand-600 hover:underline">
                {(loan.equipment as { title?: string })?.title || 'Voir le matériel'}
              </Link>
              <div className="text-xs text-gray-400 mt-0.5">
                Prêté le {formatDate(loan.loan_started_at || loan.reserved_at || '')}
                {loan.returned_at && ` • Rendu le ${formatDate(loan.returned_at)}`}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
