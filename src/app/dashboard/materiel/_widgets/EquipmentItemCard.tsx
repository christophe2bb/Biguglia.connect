'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Copy, EyeOff, Eye, RotateCcw } from 'lucide-react';
import {
  EQUIPMENT_STATUS_CONFIG,
  getAllowedTransitions,
  getTransitionLabel,
  type EquipmentStatus,
  type EquipmentItemFull,
  type EquipmentLoan,
} from '@/lib/equipment';

export interface EquipmentWithRequests extends EquipmentItemFull {
  pending_count?: number;
  active_loan?: EquipmentLoan | null;
}

interface Props {
  item: EquipmentWithRequests;
  onStatusChange: (id: string, s: EquipmentStatus) => void;
  onDelete: (item: EquipmentWithRequests) => void;
  onDuplicate: (item: EquipmentWithRequests) => void;
  loading: boolean;
}

export default function EquipmentItemCard({
  item, onStatusChange, onDelete, onDuplicate, loading,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const status = (item.status as EquipmentStatus) || 'disponible';
  const cfg = EQUIPMENT_STATUS_CONFIG[status];
  const transitions = getAllowedTransitions(status);
  const photos = item.photos as Array<{ url: string }> | undefined;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${item.pending_count && item.pending_count > 0 ? 'border-orange-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-4 p-4">
        {/* Photo miniature */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
          {photos && photos.length > 0 ? (
            <Image src={photos[0].url} alt={item.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl">{(item.category as { icon?: string })?.icon || '🔧'}</span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link href={`/materiel/${item.id}`} className="font-semibold text-gray-900 hover:text-brand-700 transition truncate">
              {item.title}
            </Link>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              {cfg.icon} {cfg.label}
            </span>
            {item.pending_count && item.pending_count > 0 ? (
              <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                {item.pending_count} demande{item.pending_count > 1 ? 's' : ''}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-gray-400">{(item.category as { name?: string })?.name} • {item.is_free ? 'Gratuit' : `${item.daily_rate}€/j`}</div>
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/materiel/${item.id}/modifier`}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
          <Link href={`/materiel/${item.id}`}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button onClick={() => setExpanded(v => !v)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition">
            {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Actions expandées */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-3">
          <div className="text-xs font-medium text-gray-500 mb-2">Changer le statut :</div>
          <div className="flex flex-wrap gap-2">
            {transitions.map(t => {
              const tCfg = EQUIPMENT_STATUS_CONFIG[t];
              return (
                <button key={t} onClick={() => onStatusChange(item.id, t)} disabled={loading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition hover:opacity-80 disabled:opacity-50 ${tCfg.bg} ${tCfg.color} ${tCfg.border}`}>
                  {tCfg.icon} {getTransitionLabel(status, t)}
                </button>
              );
            })}
            {status === 'rendu' && (
              <button onClick={() => onStatusChange(item.id, 'disponible')} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:opacity-80">
                <RotateCcw className="w-3 h-3" /> Remettre disponible
              </button>
            )}
            <button onClick={() => onDuplicate(item)} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition disabled:opacity-50">
              <Copy className="w-3 h-3" /> Dupliquer
            </button>
            <button onClick={() => onDelete(item)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition">
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
