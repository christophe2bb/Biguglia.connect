'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Package, Eye, MessageSquare, Calendar, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { STATUS_LABELS, URGENCY_LABELS, formatRelative } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ServiceRequest } from '@/types';

interface RequestsPanelProps {
  requests: ServiceRequest[];
  loading: boolean;
  pendingCount: number;
  onUpdateStatus: (id: string, status: ServiceRequest['status']) => void;
  onDelete?: (id: string) => void;
}

export default function RequestsPanel({ requests, loading, pendingCount, onUpdateStatus, onDelete }: RequestsPanelProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('service_requests').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Demande supprimée');
      onDelete?.(id);
    }
    setConfirmDeleteId(null);
    setDeleting(false);
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
              {/* Confirmation suppression */}
              {confirmDeleteId === req.id ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 flex-1 font-medium">Supprimer cette demande ?</p>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={deleting}
                    className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {deleting ? '...' : 'Supprimer'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <>
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
                          variant={
                            req.status === 'completed' ? 'success' :
                            req.status === 'cancelled' ? 'danger' :
                            ['submitted', 'viewed'].includes(req.status) ? 'warning' : 'info'
                          }
                          className="text-xs"
                        >
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </div>
                    </div>
                    {/* Bouton supprimer */}
                    <button
                      onClick={() => setConfirmDeleteId(req.id)}
                      title="Supprimer cette demande"
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Link href="/messages" className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium">
                      <MessageSquare className="w-3.5 h-3.5" /> Répondre
                    </Link>

                    <div className="ml-auto flex items-center gap-2">
                      {/* Vue → depuis submitted */}
                      {req.status === 'submitted' && (
                        <button
                          onClick={() => onUpdateStatus(req.id, 'viewed')}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> Marquer vue
                        </button>
                      )}
                      {/* Planifier → depuis viewed ou replied */}
                      {['viewed', 'replied'].includes(req.status) && (
                        <button
                          onClick={() => onUpdateStatus(req.id, 'scheduled')}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          <Calendar className="w-3.5 h-3.5" /> Planifier
                        </button>
                      )}
                      {/* Terminer → depuis replied, scheduled ou viewed */}
                      {['replied', 'scheduled', 'viewed'].includes(req.status) && (
                        <button
                          onClick={() => onUpdateStatus(req.id, 'completed')}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Terminer
                        </button>
                      )}
                      {/* Statut final */}
                      {req.status === 'completed' && (
                        <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Terminée — avis débloqué
                        </span>
                      )}
                      {req.status === 'cancelled' && (
                        <span className="text-xs text-gray-400">Annulée</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
