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
  onApprove: (userId: string) => Promise<boolean>;
  onReject:  (userId: string, reason: string) => Promise<boolean>;
  onClose:   () => void;
}

export default function ArtisanDecisionFooter({
  userId, isPending, isVerified, onApprove, onReject, onClose,
}: ArtisanDecisionFooterProps) {
  const [confirmedLocal, setConfirmedLocal] = useState(false);
  const [rejecting,      setRejecting]      = useState(false);
  const [reason,         setReason]         = useState('');
  const [decisionPending, setDecisionPending] = useState(false);

  const confirmApprove = async () => {
    if (!confirmedLocal || decisionPending) return;
    setDecisionPending(true);
    try {
      if (await onApprove(userId)) onClose();
    } finally {
      setDecisionPending(false);
    }
  };

  const confirmReject = async () => {
    if (reason.trim().length < 10 || decisionPending) {
      if (reason.trim().length < 10) toast.error('Le motif doit contenir au moins 10 caractères.');
      return;
    }
    setDecisionPending(true);
    try {
      if (await onReject(userId, reason.trim())) onClose();
    } finally {
      setDecisionPending(false);
    }
  };

  if (!isPending && !isVerified) return null;

  return (
    <div className="border-t border-gray-100 p-5 bg-gray-50/50 space-y-4">

      {/* ── En attente : approbation ── */}
      {isPending && !rejecting && (
        <>
          <label aria-label="Artisan de confiance" className="flex items-center gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl p-3 hover:bg-green-100 transition-colors">
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
              onClick={() => void confirmApprove()}
              disabled={!confirmedLocal || decisionPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" /> {decisionPending ? 'Validation…' : '✅ Approuver le profil'}
            </button>
          </div>
        </>
      )}

      {/* ── En attente : formulaire de refus ── */}
      {(isPending || isVerified) && rejecting && (
        <div className="space-y-3">
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1.5">
              Motif du refus <span className="text-red-500">*</span>
            </p>
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
              onClick={() => void confirmReject()}
              disabled={decisionPending || reason.trim().length < 10}
              className="flex-1 disabled:opacity-50 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              {decisionPending ? 'Enregistrement…' : isVerified ? 'Confirmer la révocation' : 'Confirmer le refus'}
            </button>
          </div>
        </div>
      )}

      {/* ── Vérifié : révocation ── */}
      {isVerified && !rejecting && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Profil validé
          </div>
          <button
            onClick={() => setRejecting(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Révoquer
          </button>
        </div>
      )}
    </div>
  );
}
