'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Package, Eye, Calendar, CheckCircle, XCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import ContactButton from '@/components/ui/ContactButton';
import { STATUS_LABELS, URGENCY_LABELS, formatRelative } from '@/lib/utils';
import type { ServiceRequest } from '@/types';

interface RequestsPanelProps {
  requests: ServiceRequest[];
  loading: boolean;
  pendingCount: number;
  userId: string;
  onUpdateStatus: (id: string, status: ServiceRequest['status']) => Promise<void>;
}

export default function RequestsPanel({ requests, loading, pendingCount, onUpdateStatus, userId }: RequestsPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const changeStatus = async (id: string, status: ServiceRequest['status']) => {
    if (busyId) return;
    setBusyId(id);
    try { await onUpdateStatus(id, status); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" /> Demandes reçues
        </h2>
        {pendingCount > 0 && (
          <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
            {pendingCount} en attente
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-200">
          <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="font-medium text-gray-600">Aucune demande pour l&apos;instant</p>
          <p className="text-sm text-gray-400 mt-1">Les demandes des habitants apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  src={(req.resident as { avatar_url?: string })?.avatar_url}
                  name={(req.resident as { full_name?: string })?.full_name || 'Habitant'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{req.title}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    {(req.resident as { full_name?: string })?.full_name || 'Habitant'} · {formatRelative(req.created_at)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={req.urgency === 'tres_urgent' ? 'danger' : req.urgency === 'urgent' ? 'warning' : 'default'}
                      className="text-xs"
                    >
                      {URGENCY_LABELS[req.urgency]}
                    </Badge>
                    <Badge
                      variant={req.status === 'completed' ? 'success' : req.status === 'cancelled' ? 'danger' :
                        ['submitted', 'viewed'].includes(req.status) ? 'warning' : 'info'}
                      className="text-xs"
                    >
                      {STATUS_LABELS[req.status]}
                    </Badge>
                  </div>
                </div>
                <Link href={`/demandes/${req.id}`} className="text-xs font-semibold text-brand-600 hover:underline">
                  Voir
                </Link>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                <ContactButton
                  sourceType="service_request"
                  sourceId={req.id}
                  sourceTitle={req.title}
                  ownerId={req.resident_id}
                  userId={userId}
                  size="sm"
                  variant="ghost"
                  ctaLabel="Répondre"
                />
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  {req.status === 'submitted' && (
                    <button type="button" disabled={busyId !== null}
                      onClick={() => changeStatus(req.id, 'viewed')}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50">
                      <Eye className="w-3.5 h-3.5" /> Marquer vue
                    </button>
                  )}
                  {['viewed','replied'].includes(req.status) && (
                    <button type="button" disabled={busyId !== null}
                      onClick={() => changeStatus(req.id, 'scheduled')}
                      className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 disabled:opacity-50">
                      <Calendar className="w-3.5 h-3.5" /> Marquer planifiée
                    </button>
                  )}
                  {['viewed','replied','scheduled'].includes(req.status) && (
                    <button type="button" disabled={busyId !== null}
                      onClick={() => changeStatus(req.id, 'completed')}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 disabled:opacity-50">
                      <CheckCircle className="w-3.5 h-3.5" /> Terminer
                    </button>
                  )}
                  {['submitted','viewed','replied','scheduled'].includes(req.status) && (
                    <button type="button" disabled={busyId !== null}
                      onClick={() => changeStatus(req.id, 'cancelled')}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50">
                      <XCircle className="w-3.5 h-3.5" /> Refuser
                    </button>
                  )}
                  {req.status === 'completed' && (
                    <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> Terminée — avis débloqué
                    </span>
                  )}
                  {req.status === 'cancelled' && <span className="text-xs text-gray-500">Refusée ou annulée</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
