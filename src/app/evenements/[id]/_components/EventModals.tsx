'use client';

/**
 * EventModals — Modal changement de statut, modal suppression, lightbox photos.
 */

import { AlertCircle } from 'lucide-react';
import type { EventDetail, PendingTransition } from '../_types';
import { EVENT_TRANSITION_DESCRIPTIONS } from '../_config';
import type { EventStatus } from '@/lib/events';

// ─── Modal transition de statut ───────────────────────────────────────────────
interface TransitionModalProps {
  open: boolean;
  pending: PendingTransition | null;
  reason: string;
  newDate: string;
  newTime: string;
  onReasonChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function TransitionModal({
  open, pending, reason, newDate, newTime,
  onReasonChange, onDateChange, onTimeChange,
  onConfirm, onCancel,
}: TransitionModalProps) {
  if (!open || !pending) return null;

  const description = EVENT_TRANSITION_DESCRIPTIONS[pending.to as EventStatus] ?? '';
  const confirmCls =
    pending.to === 'annule'  ? 'bg-red-500 hover:bg-red-600'     :
    pending.to === 'reporte' ? 'bg-violet-500 hover:bg-violet-600' :
    'bg-purple-600 hover:bg-purple-700';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-black text-gray-900 text-lg">{pending.label}</h3>
        {description && <p className="text-gray-500 text-sm">{description}</p>}

        {/* Raison */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Raison {pending.requiresReason ? '*' : '(optionnel)'}
          </label>
          <textarea
            value={reason}
            onChange={e => onReasonChange(e.target.value)}
            placeholder={
              pending.to === 'annule'  ? 'Ex : Annulé en raison des conditions météo...' :
              pending.to === 'reporte' ? 'Ex : Reporté suite à...'                        :
              'Commentaire...'
            }
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
          />
        </div>

        {/* Nouvelle date (report) */}
        {pending.to === 'reporte' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouvelle date</label>
              <input type="date" value={newDate} onChange={e => onDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouvelle heure</label>
              <input type="time" value={newTime} onChange={e => onTimeChange(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={onConfirm}
            className={`flex-1 font-bold py-2.5 rounded-xl text-sm text-white transition-all ${confirmCls}`}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal suppression ────────────────────────────────────────────────────────
interface DeleteModalProps {
  open: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteModal({ open, onConfirm, onCancel }: DeleteModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="font-black text-gray-900 text-center">Supprimer l&apos;événement ?</h3>
        <p className="text-gray-500 text-sm text-center">Cette action est irréversible.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
interface LightboxProps {
  photos: NonNullable<EventDetail['photos']>;
  idx: number | null;
  onClose: () => void;
}

export function Lightbox({ photos, idx, onClose }: LightboxProps) {
  if (idx === null || photos.length === 0) return null;
  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[idx].url}
        alt=""
        className="max-w-full max-h-full object-contain rounded-xl"
      />
    </div>
  );
}
