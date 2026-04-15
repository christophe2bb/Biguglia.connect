'use client';

import { AlertCircle, MessageSquare } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { EQUIPMENT_STATUS_CONFIG, LOAN_REQUEST_STATUS_CONFIG, isRequestable } from '@/lib/equipment';
import type { EquipmentItemFull, EquipmentRequest, EquipmentLoan, EquipmentStatus } from '@/lib/equipment';

type Props = {
  item: EquipmentItemFull;
  requests: EquipmentRequest[];
  activeLoan: EquipmentLoan | null;
  userId?: string;
  showRequestForm: boolean;
  setShowRequestForm: (v: boolean) => void;
  requestForm: { start_date: string; end_date: string; message: string };
  setRequestForm: React.Dispatch<React.SetStateAction<{ start_date: string; end_date: string; message: string }>>;
  submitting: boolean;
  borrowerNote: string;
  setBorrowerNote: (v: string) => void;
  onSendRequest: () => void;
  onCancelRequest: (id: string) => void;
  onSaveBorrowerNote: () => void;
  onLoginRedirect: () => void;
};

export default function BorrowerActions({
  item, requests, activeLoan, userId,
  showRequestForm, setShowRequestForm,
  requestForm, setRequestForm,
  submitting, borrowerNote, setBorrowerNote,
  onSendRequest, onCancelRequest, onSaveBorrowerNote, onLoginRedirect,
}: Props) {
  const status = (item.status as EquipmentStatus) || 'disponible';
  const cfg = EQUIPMENT_STATUS_CONFIG[status];
  const myRequest = userId ? requests.find(r => r.requester_id === userId && r.status === 'en_attente') : null;
  const allMyRequests = userId ? requests.filter(r => r.requester_id === userId) : [];
  const latest = allMyRequests[0];
  const myLoan = activeLoan?.borrower_id === userId ? activeLoan : null;

  return (
    <div className="space-y-4">
      {/* Formulaire de demande d'emprunt */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Demander à emprunter</h3>

        {!isRequestable(status) ? (
          <div className={`text-center py-3 rounded-xl ${cfg.bg} ${cfg.color} text-sm font-medium border ${cfg.border}`}>
            {cfg.icon} {cfg.description}
          </div>
        ) : myRequest ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">Demande en attente de réponse</span>
            </div>
            <button onClick={() => onCancelRequest(myRequest.id)}
              className="w-full text-xs text-gray-400 hover:text-red-500 transition py-1">
              Annuler ma demande
            </button>
          </div>
        ) : !showRequestForm ? (
          <Button onClick={() => { if (!userId) { onLoginRedirect(); return; } setShowRequestForm(true); }} className="w-full">
            <MessageSquare className="w-4 h-4" /> Faire une demande
          </Button>
        ) : (
          <div className="space-y-3">
            <Input label="Date de début *" type="date" value={requestForm.start_date}
              onChange={e => setRequestForm(f => ({ ...f, start_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]} />
            <Input label="Date de fin *" type="date" value={requestForm.end_date}
              onChange={e => setRequestForm(f => ({ ...f, end_date: e.target.value }))}
              min={requestForm.start_date || new Date().toISOString().split('T')[0]} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message (optionnel)</label>
              <textarea value={requestForm.message}
                onChange={e => setRequestForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Décrivez votre usage, vos précautions..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowRequestForm(false)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                Annuler
              </button>
              <Button onClick={onSendRequest} loading={submitting} className="flex-1">Envoyer</Button>
            </div>
          </div>
        )}
      </div>

      {/* Statut de la dernière demande */}
      {allMyRequests.length > 0 && latest && (
        <div className={`rounded-xl border p-4 ${LOAN_REQUEST_STATUS_CONFIG[latest.status]?.bg}`}>
          <div className={`text-sm font-medium ${LOAN_REQUEST_STATUS_CONFIG[latest.status]?.color} flex items-center gap-2`}>
            {LOAN_REQUEST_STATUS_CONFIG[latest.status]?.icon} {LOAN_REQUEST_STATUS_CONFIG[latest.status]?.label}
          </div>
          <p className="text-xs text-gray-500 mt-1">Votre dernière demande</p>
        </div>
      )}

      {/* Note emprunteur après retour */}
      {myLoan?.status === 'retourne' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h4 className="text-xs font-semibold text-blue-800 mb-2">📝 Votre note sur le prêt</h4>
          <textarea value={borrowerNote} onChange={e => setBorrowerNote(e.target.value)}
            placeholder="Comment s'est passé ce prêt ? État du matériel..."
            className="w-full text-sm px-3 py-2 border border-blue-200 rounded-xl resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white" />
          <button onClick={onSaveBorrowerNote}
            className="mt-2 w-full py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
            Enregistrer ma note
          </button>
        </div>
      )}
    </div>
  );
}
