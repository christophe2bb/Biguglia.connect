'use client';

/**
 * ArtisanExpandedPanel — panneau dépliable du dossier artisan dans ArtisanCard.
 * Chargé dynamiquement (lazy) : n'est téléchargé que quand l'admin clique "Voir le dossier".
 *
 * Contient :
 *  - Description
 *  - Informations légales (SIRET, assurance)
 *  - Documents justificatifs
 *  - Actions (approbation / refus) pour artisan en attente
 *  - Révocation pour artisan vérifié
 */

import { useState } from 'react';
import { CheckCircle, XCircle, Shield, FileText, AlertCircle } from 'lucide-react';
import DocLink from './DocLink';
import toast from 'react-hot-toast';

interface ArtisanExpandedPanelProps {
  artisan: {
    user_id: string;
    description: string;
    siret?: string;
    insurance?: string;
    doc_kbis_url?: string;
    doc_insurance_url?: string;
    doc_id_url?: string;
    profile?: { role?: string };
  };
  onApprove: (userId: string) => Promise<boolean>;
  onReject: (userId: string, reason: string) => Promise<boolean>;
}

const REJECT_SUGGESTIONS = [
  "Documents manquants : veuillez joindre votre attestation d'assurance en cours de validité.",
  "Documents manquants : veuillez joindre votre Kbis ou justificatif d'immatriculation.",
  "Documents manquants : veuillez joindre une pièce d'identité en cours de validité.",
  'Les documents fournis sont illisibles ou incomplets. Veuillez les renvoyer.',
  "Votre assurance est expirée. Veuillez fournir une attestation en cours de validité.",
  'Activité non éligible à la plateforme Biguglia Connect.',
];

export default function ArtisanExpandedPanel({ artisan, onApprove, onReject }: ArtisanExpandedPanelProps) {
  const [rejecting, setRejecting]         = useState(false);
  const [reason, setReason]               = useState('');
  const [confirmedLocal, setConfirmedLocal] = useState(false);
  const [decisionPending, setDecisionPending] = useState(false);

  const confirmApprove = async () => {
    if (decisionPending || !confirmedLocal) return;
    setDecisionPending(true);
    try { await onApprove(artisan.user_id); }
    finally { setDecisionPending(false); }
  };

  const confirmReject = async () => {
    if (decisionPending) return;
    if (reason.trim().length < 10) {
      toast.error('Le motif doit contenir au moins 10 caractères.');
      return;
    }
    setDecisionPending(true);
    try {
      if (await onReject(artisan.user_id, reason.trim())) {
        setRejecting(false);
        setReason('');
      }
    } finally {
      setDecisionPending(false);
    }
  };

  const isPending  = artisan.profile?.role === 'artisan_pending';
  const isVerified = artisan.profile?.role === 'artisan_verified';
  const docCount   = [artisan.doc_kbis_url, artisan.doc_insurance_url, artisan.doc_id_url].filter(Boolean).length;

  return (
    <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">

      {/* Description */}
      {artisan.description && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Présentation</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{artisan.description}</p>
        </div>
      )}

      {/* Informations légales */}
      {(artisan.siret || artisan.insurance) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Informations légales</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {artisan.siret && (
              <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <FileText className="w-3 h-3" /> SIRET déclaré
                </span>
                <div className="font-mono font-medium text-gray-900">{artisan.siret}</div>
              </div>
            )}
            {artisan.insurance && (
              <div className="bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <span className="text-gray-500 text-xs">Assurance déclarée</span>
                <div className="font-medium text-gray-900">{artisan.insurance}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> Documents justificatifs
        </h4>
        <div className="space-y-2">
          <DocLink storagePath={artisan.doc_insurance_url} label="Attestation d'assurance décennale / RC Pro" icon="🛡️" />
          <DocLink storagePath={artisan.doc_kbis_url}      label="Kbis / Justificatif d'immatriculation"     icon="📋" />
          <DocLink storagePath={artisan.doc_id_url}        label="Pièce d'identité"                          icon="🪪" />
        </div>
        {docCount === 0 && (
          <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Aucun document fourni. Vous pouvez valider si vous avez vérifié l&apos;artisan par un autre moyen,
              ou utiliser le bouton &ldquo;Envoyer un message&rdquo; pour lui demander ses documents.
            </p>
          </div>
        )}
      </div>

      {/* ── Actions : artisan en attente ── */}
      {isPending && (
        <div className="border-t border-gray-200 pt-4 space-y-4">
          <label aria-label="Vérifié" className="flex items-center gap-3 cursor-pointer bg-green-50 border border-green-200 rounded-xl p-3 hover:bg-green-100 transition-colors">
            <input
              type="checkbox"
              className="w-5 h-5 accent-green-600 flex-shrink-0"
              checked={confirmedLocal}
              onChange={e => setConfirmedLocal(e.target.checked)}
            />
            <div>
              <span className="text-sm font-semibold text-green-800">✅ Je confirme que cet artisan est bien de Biguglia</span>
              <p className="text-xs text-green-600 mt-0.5">Cochez cette case pour activer le bouton d&apos;approbation</p>
            </div>
          </label>

          {!rejecting ? (
            <div className="flex items-center gap-3">
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
                <CheckCircle className="w-4 h-4" /> {decisionPending ? 'Validation…' : '✅ Approuver le profil artisan'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motif du refus <span className="text-red-500">*</span>
                </p>
                <p className="text-xs text-gray-500 mb-2">Ce message sera envoyé à l&apos;artisan par notification.</p>
                <div className="space-y-2 mb-3">
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setRejecting(false); setReason(''); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void confirmReject()}
                  disabled={decisionPending || reason.trim().length < 10}
                  className="flex-1 disabled:opacity-50 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  {decisionPending ? 'Enregistrement…' : 'Confirmer le refus et notifier l’artisan'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions : artisan vérifié ── */}
      {isVerified && (
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Profil validé et visible sur la plateforme</span>
            </div>
            {!rejecting && (
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Révoquer
              </button>
            )}
          </div>
          {rejecting && (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <label htmlFor="artisan-revocation-reason" className="block text-xs font-semibold text-red-800">
                Motif de révocation (10 caractères minimum)
              </label>
              <textarea
                id="artisan-revocation-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Expliquez à l’artisan la raison de la révocation…"
                className="w-full h-24 rounded-lg border border-red-200 bg-white p-2 text-sm"
                maxLength={500}
              />
              <div className="flex gap-2">
                <button type="button" disabled={decisionPending}
                  onClick={() => { setRejecting(false); setReason(''); }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50">
                  Annuler
                </button>
                <button type="button" disabled={decisionPending || reason.trim().length < 10}
                  onClick={() => void confirmReject()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {decisionPending ? 'Enregistrement…' : 'Confirmer la révocation'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
