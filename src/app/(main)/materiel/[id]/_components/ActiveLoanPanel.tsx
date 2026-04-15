'use client';

import { Package, AlertCircle, History, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { EQUIPMENT_STATUS_CONFIG } from '@/lib/equipment';
import { formatDate } from '@/lib/utils';
import type { EquipmentItemFull, EquipmentRequest, EquipmentLoan, EquipmentStatusHistory, EquipmentStatus } from '@/lib/equipment';

// ── Prêt actif ───────────────────────────────────────────────────────────────

type ActiveLoanProps = {
  item: EquipmentItemFull;
  activeLoan: EquipmentLoan;
  statusLoading: boolean;
  ownerNote: string;
  setOwnerNote: (v: string) => void;
  showOwnerNoteForm: boolean;
  onMarkLoaned: () => void;
  onMarkReturned: () => void;
  onSaveOwnerNote: () => void;
};

export function ActiveLoanCard({
  activeLoan, statusLoading, ownerNote, setOwnerNote,
  showOwnerNoteForm, onMarkLoaned, onMarkReturned, onSaveOwnerNote,
}: ActiveLoanProps) {
  const borrower = activeLoan.borrower as { full_name?: string; avatar_url?: string } | null;

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
      <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" />
        {activeLoan.status === 'reserve' ? '🔒 Réservé pour' : '🔄 Actuellement prêté à'}
      </h3>
      <div className="flex items-center gap-3 mb-4">
        <Avatar src={borrower?.avatar_url} name={borrower?.full_name || '?'} size="sm" />
        <div>
          <div className="font-medium text-gray-900">{borrower?.full_name}</div>
          <div className="text-xs text-gray-500">
            {activeLoan.status === 'reserve'
              ? `Réservé le ${formatDate(activeLoan.reserved_at || '')}`
              : `Prêté depuis ${formatDate(activeLoan.loan_started_at || '')}`}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {activeLoan.status === 'reserve' && (
          <Button onClick={onMarkLoaned} loading={statusLoading} className="flex-1 bg-purple-600 hover:bg-purple-700">
            <CheckCircle className="w-4 h-4" /> Marquer comme prêté
          </Button>
        )}
        {activeLoan.status === 'en_cours' && (
          <Button onClick={onMarkReturned} loading={statusLoading} className="flex-1 bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="w-4 h-4" /> Confirmer le retour
          </Button>
        )}
      </div>

      {showOwnerNoteForm && (
        <div className="mt-4 pt-4 border-t border-purple-100">
          <label className="block text-xs font-semibold text-purple-800 mb-1">Note sur ce prêt (optionnel)</label>
          <textarea value={ownerNote} onChange={e => setOwnerNote(e.target.value)}
            placeholder="État à la restitution, remarques..."
            className="w-full text-sm px-3 py-2 border border-purple-200 rounded-xl resize-none h-16 focus:outline-none focus:ring-2 focus:ring-purple-300" />
          <button onClick={onSaveOwnerNote}
            className="mt-2 w-full py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
            Enregistrer la note
          </button>
        </div>
      )}
    </div>
  );
}

// ── Demandes en attente ───────────────────────────────────────────────────────

type PendingRequestsProps = {
  requests: EquipmentRequest[];
  onAccept: (req: EquipmentRequest) => void;
  onRefuse: (req: EquipmentRequest) => void;
};

export function PendingRequests({ requests, onAccept, onRefuse }: PendingRequestsProps) {
  const pending = requests.filter(r => r.status === 'en_attente');
  if (pending.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-orange-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-orange-500" />
        {pending.length} demande{pending.length > 1 ? 's' : ''} en attente
      </h3>
      <div className="space-y-3">
        {pending.map(req => {
          const requester = req.requester as { full_name?: string; avatar_url?: string } | null;
          return (
            <div key={req.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Avatar src={requester?.avatar_url} name={requester?.full_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{requester?.full_name}</div>
                {req.requested_start_date && (
                  <div className="text-xs text-gray-500">{req.requested_start_date} → {req.requested_end_date}</div>
                )}
                {req.message && <p className="text-xs text-gray-600 truncate mt-0.5">{req.message}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => onAccept(req)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition">
                  <CheckCircle className="w-3.5 h-3.5" /> Accepter
                </button>
                <button onClick={() => onRefuse(req)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-xl hover:bg-red-200 transition">
                  <XCircle className="w-3.5 h-3.5" /> Refuser
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Historique statuts ────────────────────────────────────────────────────────

type StatusHistoryProps = {
  history: EquipmentStatusHistory[];
  showHistory: boolean;
  onToggle: () => void;
};

export function StatusHistory({ history, showHistory, onToggle }: StatusHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <History className="w-4 h-4" /> Historique des statuts
        </h3>
        {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {showHistory && (
        <div className="px-5 pb-4 space-y-2">
          {history.map(h => {
            const oldCfg = h.old_status ? EQUIPMENT_STATUS_CONFIG[h.old_status as EquipmentStatus] : null;
            const newCfg = EQUIPMENT_STATUS_CONFIG[h.new_status as EquipmentStatus];
            return (
              <div key={h.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="text-xs text-gray-400 w-28 flex-shrink-0">{formatDate(h.created_at)}</div>
                <div className="flex items-center gap-1.5">
                  {oldCfg && <span className={`text-xs px-2 py-0.5 rounded-full ${oldCfg.bg} ${oldCfg.color}`}>{oldCfg.label}</span>}
                  {oldCfg && <span className="text-gray-400">→</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${newCfg?.bg} ${newCfg?.color}`}>{newCfg?.label || h.new_status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
