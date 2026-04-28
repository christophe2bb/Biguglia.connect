'use client';

/**
 * src/components/ui/photo/use-focus-trap.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Focus trap natif (Tab / Shift+Tab) pour les modales/lightbox.
 *
 * API :
 *   const { containerRef, initialFocusRef } = useFocusTrap(onClose)
 *
 * Comportement :
 *  - Capture document.activeElement à l'ouverture, le restaure à la fermeture.
 *  - Donne le focus à l'élément `initialFocusRef` via rAF (après peinture DOM).
 *  - Piège Tab et Shift+Tab dans le conteneur `containerRef`.
 *  - Gère Escape → appel onClose.
 *
 * Dépendance intentionnellement limitée à [] (mount/unmount uniquement).
 * onClose est lu via une ref stable pour éviter de re-enregistrer les listeners
 * à chaque render (cf. pattern "event handler ref").
 */

import { useEffect, useRef } from 'react';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
}

export function useFocusTrap(onClose: () => void) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLElement>(null);
  const triggerRef      = useRef<Element | null>(null);
  // Ref stable vers onClose pour ne pas re-enregistrer les listeners
  const onCloseRef      = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    // Sauvegarder l'élément actif avant l'ouverture
    triggerRef.current = document.activeElement;

    // Déplacer le focus dans la modale après peinture
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
      // Restaurer le focus sur l'élément déclencheur
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
      triggerRef.current = null;
    };
  }, []); // mount/unmount uniquement — onClose lu via onCloseRef (stable)

  return { containerRef, initialFocusRef };
}
