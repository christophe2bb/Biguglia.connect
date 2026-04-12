'use client';

import Link from 'next/link';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { LOAN_REQUEST_STATUS_CONFIG, type EquipmentRequest } from '@/lib/equipment';
import { formatDate } from '@/lib/utils';

interface Props {
  requests: EquipmentRequest[];
  actionLoading: string | null;
  onAccept: (req: EquipmentRequest) => void;
  onRefuse: (req: EquipmentRequest) => void;
}

export default function DemandesTab({ requests, actionLoading, onAccept, onRefuse }: Props) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucune demande reçue</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map(req => {
        const rCfg = LOAN_REQUEST_STATUS_CONFIG[req.status];
        return (
          <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-start gap-3">
              <Avatar
                src={(req.requester as { avatar_url?: string })?.avatar_url}
                name={(req.requester as { full_name?: string })?.full_name || '?'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm text-gray-900">
                    {(req.requester as { full_name?: string })?.full_name}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${rCfg.bg} ${rCfg.color} font-medium`}>
                    {rCfg.icon} {rCfg.label}
                  </span>
                </div>
                <Link href={`/materiel/${req.equipment_id}`} className="text-xs text-brand-600 hover:underline">
                  {(req.equipment as { title?: string })?.title || 'Voir le matériel'} →
                </Link>
                {req.requested_start_date && (
                  <div className="text-xs text-gray-500 mt-1">
                    📅 {req.requested_start_date} → {req.requested_end_date}
                  </div>
                )}
                {req.message && <p className="text-xs text-gray-600 mt-1 italic">&quot;{req.message}&quot;</p>}
                <div className="text-xs text-gray-400 mt-1">{formatDate(req.created_at)}</div>
              </div>
              {req.status === 'en_attente' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => onAccept(req)} disabled={actionLoading === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition disabled:opacity-50">
                    <CheckCircle className="w-3.5 h-3.5" /> Accepter
                  </button>
                  <button onClick={() => onRefuse(req)} disabled={actionLoading === req.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition disabled:opacity-50">
                    <XCircle className="w-3.5 h-3.5" /> Refuser
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
