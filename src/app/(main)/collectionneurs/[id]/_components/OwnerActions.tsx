'use client';

import Link from 'next/link';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { STATUS_CONFIG, type CollectionItem, type CollectionStatus } from '@/lib/collectionneurs-config';
import { TRANSITION_LABELS } from '../_config';
import { cn } from '@/lib/utils';

interface Props {
  item: CollectionItem;
  allowedTransitions: CollectionStatus[];
  changingStatus: boolean;
  onStatusChange: (status: CollectionStatus) => void;
  onDelete: () => void;
}

export function OwnerActions({
  item,
  allowedTransitions,
  changingStatus,
  onStatusChange,
  onDelete,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-sm font-black text-gray-700 mb-3">Gérer mon annonce</h3>

      <div className="text-xs text-center font-semibold py-2 px-3 bg-blue-50 text-blue-700 rounded-xl mb-3">
        ✏️ C&apos;est votre annonce
      </div>

      {/* Changement de statut */}
      {allowedTransitions.length > 0 && (
        <div className="space-y-1.5 mb-3">
          <p className="text-xs text-gray-500 font-semibold mb-1">Changer le statut :</p>
          {allowedTransitions.map(st => (
            <button
              key={st}
              onClick={() => onStatusChange(st)}
              disabled={changingStatus}
              className={cn(
                'w-full px-3 py-2 rounded-xl text-sm font-semibold transition-colors border text-left',
                STATUS_CONFIG[st]?.bg,
                STATUS_CONFIG[st]?.color,
                'hover:opacity-80 border-current/20',
              )}
            >
              {changingStatus && (
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
              )}
              {TRANSITION_LABELS[st] || st}
            </button>
          ))}
        </div>
      )}

      {/* Actions modification / stats / suppression */}
      <div className="space-y-2 mt-3">
        <Link
          href={`/collectionneurs/${item.id}/modifier`}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors"
        >
          <Pencil className="w-4 h-4" /> Modifier l&apos;annonce
        </Link>
        <Link
          href="/dashboard/collectionneurs"
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          📊 Mes statistiques
        </Link>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-red-400 hover:text-red-600 text-sm transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
      </div>
    </div>
  );
}
