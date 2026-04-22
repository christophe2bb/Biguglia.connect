'use client';

/**
 * EventModals — Modal changement de statut, modal suppression, lightbox photos.
 *
 * Accessibility compliance (WCAG 2.1 AA):
 *  - role="dialog" + aria-modal="true" on every dialog panel
 *  - aria-labelledby pointing to the visible heading (unique id per dialog)
 *  - Focus trap natif (Tab/Shift+Tab confinés dans la modale)
 *  - Focus moves into the dialog on open (first interactive element)
 *  - Focus is restored to the triggering element on close
 *  - Escape key closes every dialog (géré par useFocusTrap)
 *  - Backdrop role="presentation" : click ferme la modale pour souris/touch,
 *    ignoré par les assistants vocaux
 *  - stopPropagation sur un wrapper neutre (sans role) autour du panneau dialog,
 *    pas sur le dialog lui-même (évite jsx-a11y/no-noninteractive-element-interactions)
 *  - All icon-only buttons carry aria-label; decorative icons are aria-hidden
 */

import { useEffect, useRef, useId } from 'react';
import Image from 'next/image';
import { AlertCircle, X } from 'lucide-react';
import type { EventDetail, PendingTransition } from '../_types';
import { EVENT_TRANSITION_DESCRIPTIONS } from '../_config';
import type { EventStatus } from '@/lib/events';

// ─── Helpers focus trap ───────────────────────────────────────────────────────

/** Retourne tous les éléments focusables dans un conteneur. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

// ─── Shared hook: focus trap complet (Tab/Shift+Tab + Escape + focus save/restore) ──
/**
 * useFocusTrap
 *  - Capture `document.activeElement` à l'ouverture, le restaure à la fermeture.
 *  - Donne le focus à `initialFocusRef` via rAF (après peinture DOM).
 *  - Piège Tab et Shift+Tab dans le conteneur `containerRef`.
 *  - Escape appelle `onClose` (lu via ref stable, sans re-registration).
 *
 * Dépendances intentionnellement limitées à [] (mount/unmount uniquement).
 * onClose est lu via une ref stable pour éviter de re-enregistrer les listeners.
 */
function useFocusTrap(onClose: () => void) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLElement>(null);
  const triggerRef      = useRef<Element | null>(null);
  // Ref stable vers onClose — évite de re-enregistrer les listeners à chaque render
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    // Sauvegarder l'élément actif avant l'ouverture de la modale
    triggerRef.current = document.activeElement;

    // Donner le focus à l'élément initial après peinture DOM
    const frame = requestAnimationFrame(() => {
      initialFocusRef.current?.focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      // Escape → fermer
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      // Tab / Shift+Tab → cycler dans le conteneur
      if (e.key === 'Tab' && containerRef.current) {
        const focusable = getFocusableElements(containerRef.current);
        if (focusable.length === 0) { e.preventDefault(); return; }

        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      // Restaurer le focus sur l'élément déclencheur à la fermeture
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
      triggerRef.current = null;
    };
  }, []); // mount/unmount uniquement — onClose lu via onCloseRef stable

  return { containerRef, initialFocusRef };
}

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
  const titleId = useId();
  const { containerRef, initialFocusRef } = useFocusTrap(onCancel);

  if (!open || !pending) return null;

  const description = EVENT_TRANSITION_DESCRIPTIONS[pending.to as EventStatus] ?? '';
  const confirmCls =
    pending.to === 'annule'  ? 'bg-red-500 hover:bg-red-600'       :
    pending.to === 'reporte' ? 'bg-violet-500 hover:bg-violet-600' :
    'bg-purple-600 hover:bg-purple-700';

  return (
    /*
     * Backdrop role="presentation" : les assistants vocaux l'ignorent.
     * Le click sur le backdrop ferme la modale (utilisateurs souris/touch).
     * onKeyDown ici est redondant avec useFocusTrap mais satisfait jsx-a11y
     * sur role="presentation" avec onClick.
     */
    <div
      role="presentation"
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
    >
      {/*
        Wrapper neutre (sans role) autour du dialog panel pour stopPropagation.
        jsx-a11y n'émet pas d'erreur sur une div sans role avec onClick/onKeyDown.
        Le role="dialog" est sur l'élément interne qui contient le contenu.
      */}
      <div
        role="none"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4"
        >
          <h3 id={titleId} className="font-black text-gray-900 text-lg">
            {pending.label}
          </h3>
          {description && <p className="text-gray-500 text-sm">{description}</p>}

          {/* Raison */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Raison {pending.requiresReason ? '*' : '(optionnel)'}
            </label>
            <textarea
              ref={initialFocusRef as React.RefObject<HTMLTextAreaElement>}
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
                <label htmlFor="modal-new-date" className="block text-sm font-semibold text-gray-700 mb-1.5">Nouvelle date</label>
                <input id="modal-new-date" type="date" value={newDate} onChange={e => onDateChange(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
              <div>
                <label htmlFor="modal-new-time" className="block text-sm font-semibold text-gray-700 mb-1.5">Nouvelle heure</label>
                <input id="modal-new-time" type="time" value={newTime} onChange={e => onTimeChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 font-bold py-2.5 rounded-xl text-sm text-white transition-colors ${confirmCls}`}
            >
              Confirmer
            </button>
          </div>
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
  const titleId = useId();
  const descId  = useId();
  const { containerRef, initialFocusRef } = useFocusTrap(onCancel);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
    >
      <div
        role="none"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4"
        >
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" aria-hidden="true" />
          <h3 id={titleId} className="font-black text-gray-900 text-center">
            Supprimer l&apos;événement ?
          </h3>
          <p id={descId} className="text-gray-500 text-sm text-center">
            Cette action est irréversible.
          </p>
          <div className="flex gap-3">
            <button
              ref={initialFocusRef as React.RefObject<HTMLButtonElement>}
              onClick={onCancel}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm"
            >
              Supprimer
            </button>
          </div>
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
  /** Titre de l'événement — utilisé pour l'alt des images (accessibilité + SEO) */
  eventTitle?: string;
}

export function Lightbox({ photos, idx, onClose, eventTitle }: LightboxProps) {
  const labelId = useId();
  const { containerRef, initialFocusRef } = useFocusTrap(onClose);

  if (idx === null || photos.length === 0) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        role="none"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          tabIndex={-1}
          className="relative flex flex-col items-center gap-3 max-w-full max-h-full"
        >
          {/* Titre accessible pour les lecteurs d'écran */}
          <span id={labelId} className="sr-only">
            Photo {idx + 1} sur {photos.length}
          </span>

          {/* Bouton fermer — reçoit le focus initial */}
          <button
            ref={initialFocusRef as React.RefObject<HTMLButtonElement>}
            onClick={onClose}
            aria-label="Fermer la visionneuse"
            className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="relative w-full max-w-4xl" style={{ aspectRatio: '16/9' }}>
            <Image
              src={photos[idx].url}
              alt={eventTitle ? `${eventTitle} — photo ${idx + 1} sur ${photos.length}` : `Photo ${idx + 1} sur ${photos.length}`}
              fill
              priority
              className="object-contain rounded-xl"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
