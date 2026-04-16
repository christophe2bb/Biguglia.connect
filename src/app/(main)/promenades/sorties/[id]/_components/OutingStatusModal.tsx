'use client';

import { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { OUTING_STATUS_CONFIG } from '@/lib/outings';
import type { OutingStatus } from '@/lib/outings';

type Props = {
  show: boolean;
  pendingTo: OutingStatus | null;
  pendingLabel: string;
  pendingRequiresReason: boolean;
  transitionReason: string;
  setTransitionReason: (v: string) => void;
  applyingTransition: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function OutingStatusModal({
  show,
  pendingTo,
  pendingLabel,
  pendingRequiresReason,
  transitionReason,
  setTransitionReason,
  applyingTransition,
  onConfirm,
  onClose,
}: Props) {
  const dialogRef  = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  // Focus management + Escape
  useEffect(() => {
    if (!show) return;
    triggerRef.current = document.activeElement;
    const frame = requestAnimationFrame(() => { dialogRef.current?.focus(); });
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handler);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [show, onClose]);

  if (!show || !pendingTo) return null;

  const toCfg = OUTING_STATUS_CONFIG[pendingTo];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Changer le statut de la sortie"
        tabIndex={-1}
        className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl outline-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Changer le statut</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-1"
            aria-label="Fermer la fenêtre"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className={`p-3 rounded-xl mb-4 border ${toCfg.bg} ${toCfg.border}`}>
          <p className={`font-bold text-sm flex items-center gap-2 ${toCfg.color}`}>
            {toCfg.icon} {pendingLabel}
          </p>
          <p className="text-xs text-gray-600 mt-1">{toCfg.description}</p>
        </div>

        {pendingRequiresReason && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Raison <span className="text-red-500">*</span>
            </label>
            <textarea
              value={transitionReason}
              onChange={e => setTransitionReason(e.target.value)}
              placeholder="Ex : Météo défavorable, lieu indisponible…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={applyingTransition || (pendingRequiresReason && !transitionReason.trim())}
            className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 ${toCfg.bg} ${toCfg.color} border ${toCfg.border} hover:opacity-80`}
          >
            {applyingTransition
              ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : `Confirmer : ${pendingLabel}`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 font-semibold"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

