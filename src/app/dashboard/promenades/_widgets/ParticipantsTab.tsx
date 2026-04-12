'use client';

import { RefreshCw, Users, CheckCircle2, XCircle } from 'lucide-react';
import { formatRelative } from '@/lib/utils';

export type Participant = {
  id: string;
  outing_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  notes?: string;
  profile?: { full_name: string; avatar_url?: string } | null;
  outing?: { title: string; outing_date: string } | null;
};

interface Props {
  participants: Participant[];
  onConfirm: (p: Participant) => void;
  onCancel: (p: Participant) => void;
  onRefresh: () => void;
}

export default function ParticipantsTab({ participants, onConfirm, onCancel, onRefresh }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">
          Inscrits en attente de confirmation ({participants.length})
        </h3>
        <button onClick={onRefresh}
          className="text-gray-400 hover:text-emerald-600 transition-colors p-1.5 rounded-lg hover:bg-emerald-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="font-medium text-gray-600">Aucun inscrit en attente</p>
          <p className="text-sm text-gray-400 mt-1">Les nouvelles inscriptions apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{p.profile?.full_name || 'Membre'}</p>
                <p className="text-xs text-gray-500 truncate">Sortie : {p.outing?.title || '—'}</p>
                <p className="text-xs text-gray-400">
                  Inscrit {formatRelative(p.joined_at)}
                  {p.outing?.outing_date && (
                    <span className="ml-2">
                      · {new Date(p.outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => onConfirm(p)}
                  className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-all"
                  title="Confirmer">
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button onClick={() => onCancel(p)}
                  className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-all"
                  title="Retirer">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
