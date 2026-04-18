'use client';

/**
 * ArtisanDecisionFooter — pied du drawer artisan avec les boutons de décision.
 * Extrait de ArtisanDrawer pour isolation et lisibilité.
 *
 * États couverts :
 *  - Artisan en attente (approbation + refus avec suggestions)
 *  - Artisan vérifié (révocation)
 */

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const REJECT_SUGGESTIONS = [
  "Documents manquants : veuillez joindre votre attestation d'assurance en cours de validité.",
  "Documents manquants : veuillez joindre votre Kbis ou justificatif d'immatriculation.",
  "Documents manquants : veuillez joindre une pièce d'identité en cours de validité.",
  'Les documents fournis sont illisibles ou incomplets. Veuillez les renvoyer.',
  "Votre assurance est expirée. Veuillez fournir une attestation en cours de validité.",
  'Activité non éligible à la plateforme Biguglia Connect.',
];

interface ArtisanDecisionFooterProps {
  userId:    string;
  isPending: boolean;
  isVerified: boolean;
  onApprove: (userId: string) => void;
  onReject:  (userId: string, reason: string) => void;
  onClose:   () => void;
}

export default function ArtisanDecisionFooter({
  userId, isPending, isVerified, onApprove, onReject, onClose,
}: ArtisanDecisionFooterProps) {
  const [confirmedLocal, setConfirmedLocal] = useState(false);
  const [rejecting,      setRejecting]      = useState(false);
  const [reason,         setReason]         = useState('');

  if (!isPending && !isVerified) return null;

  return (
    <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">

      {/* ── En attente : approbation ── */}
      {isPending && !rejecting && (
        <>
          <label className="flex items-center gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl p-3 hover:bg-green-100 transition-colors">
            <input
              type="checkbox"
              className="w-5 h-5 accent-green-600 flex-shrink-0"
              checked={confirmedLocal}
              onChange={e => setConfirmedLocal(e.target.checked)}
            />
            <div>
              <span className="text-sm font-semibold text-green-800">✅ Je confirme que cet artisan est de Biguglia</span>
              <p className="text-xs text-green-600 mt-0.5">Cochez pour activer le bouton d&apos;approbation</p>
            </div>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setRejecting(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-4 h-4" /> Refuser
            </button>
            <button
              onClick={() => {
                if (!confirmedLocal) { toast.error('Cochez d\'abord la case "Artisan de Biguglia"'); return; }
                onApprove(userId);
                onClose();
              }}
              disabled={!confirmedLocal}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" /> ✅ Approuver le profil
            </button>
          </div>
        </>
      )}

      {/* ── En attente : formulaire de refus ── */}
      {isPending && rejecting && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motif du refus <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
              {REJECT_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReason(s)}
                  className="w-full text-left text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ou saisissez un motif personnalisé..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setRejecting(false); setReason(''); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!reason.trim()) { toast.error('Indiquez un motif de refus'); return; }
                onReject(userId, reason);
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Confirmer le refus
            </button>
          </div>
        </div>
      )}

      {/* ── Vérifié : révocation ── */}
      {isVerified && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Profil validé
          </div>
          <button
            onClick={() => {
              const r = window.prompt('Motif de révocation (sera envoyé à l\'artisan) :');
              if (r !== null) { onReject(userId, r || 'Profil suspendu par l\'administrateur.'); onClose(); }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Révoquer
          </button>
        </div>
      )}
    </div>
  );
}
