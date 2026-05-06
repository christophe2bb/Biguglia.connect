'use client';

import { useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UniversItem } from './univers';

interface Props {
  univers: UniversItem;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  isActive: boolean;
}

/**
 * Bouton desktop + dropdown panel pour un univers (Services / Vie pratique / Vie locale).
 * Accessibilité :
 *  - aria-expanded / aria-haspopup sur le bouton déclencheur
 *  - aria-controls pointe vers le panel (id unique)
 *  - Escape ferme le menu et rend le focus au bouton
 *  - Les icônes décoratives sont aria-hidden
 */
export default function UniversDropdown({ univers, isOpen, onToggle, onClose, isActive }: Props) {
  const Icon = univers.icon;
  const ref      = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);
  const panelId  = useId();

  // Escape ferme le panel et restitue le focus au bouton déclencheur
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={panelId}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors duration-200',
          isActive ? univers.activeBg : `text-gray-600 ${univers.hoverBg}`
        )}
      >
        <Icon className={cn('w-4 h-4', isActive ? '' : univers.color)} aria-hidden="true" />
        {univers.label}
        <ChevronDown className={cn(
          'w-3.5 h-3.5 transition-transform duration-200',
          isOpen ? 'rotate-180' : '',
          isActive ? 'opacity-70' : 'text-gray-400'
        )} aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          {/* Overlay fermeture — masqué aux AT */}
          <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />

          {/* Panel */}
          <div
            id={panelId}
            role="region"
            aria-label={`Menu ${univers.label}`}
            className="absolute left-0 mt-2.5 w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden animate-fade-in-down"
          >
            {/* Header univers */}
            <div className={cn('px-5 py-4 border-b', univers.headerBg)} aria-hidden="true">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-sm',
                  univers.gradFrom, univers.gradTo
                )}>
                  <Icon className="w-4 h-4 text-white" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Espace</p>
                  <p className="text-sm font-black text-gray-900">{univers.label}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="p-2">
              {univers.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={onClose}
                    // prefetch=false sur les pages auth-gated (redirect côté client)
                    // évite les erreurs RSC prefetch ?_rsc= sur /artisans/demande
                    prefetch={item.href === '/artisans/demande' ? false : undefined}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-150 group"
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                      item.iconBg
                    )} aria-hidden="true">
                      <ItemIcon className={cn('w-4 h-4', item.iconColor)} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500 truncate">{item.desc}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-colors flex-shrink-0" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
