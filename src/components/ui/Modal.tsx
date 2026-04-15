'use client';

import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  // Unique IDs for aria-labelledby / aria-describedby
  const titleId = useId();

  // Focus management
  // dialogRef: receives focus on open so screen-readers announce the dialog immediately.
  // triggerRef: stores whatever element had focus before the modal opened so we can
  //             restore it when the modal closes (WCAG 2.1 – 3.2.2 On Input).
  const dialogRef  = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Remember who triggered the modal
      triggerRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      // Move focus into the dialog on next tick (after render)
      const frame = requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    } else {
      document.body.style.overflow = '';
      // Restore focus to the triggering element
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Body-scroll cleanup on unmount
  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — click closes; hidden from AT */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/*
        Dialog container
        - role="dialog" + aria-modal="true" confine screen-reader virtual cursor.
        - aria-labelledby points to the visible title (when present).
        - tabIndex={-1} lets us programmatically focus the container itself while
          keeping it out of the normal tab order.
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl w-full animate-slide-up outline-none',
          sizes[size],
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fermer la fenêtre"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
