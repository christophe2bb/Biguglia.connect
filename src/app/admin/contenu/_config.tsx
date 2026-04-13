'use client';

import React from 'react';
import {
  Star, Package, FileText, ShoppingBag,
  AlertTriangle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import type { TabId } from './_types';

// ─── Onglets ─────────────────────────────────────────────────────────────────

export const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'listings',  label: 'Annonces',    icon: ShoppingBag },
  { id: 'forum',     label: 'Forum',       icon: FileText    },
  { id: 'equipment', label: 'Équipements', icon: Package     },
  { id: 'reviews',   label: 'Avis',        icon: Star        },
];

// ─── Cartes de statistiques ───────────────────────────────────────────────────

export const STAT_CARDS: {
  tab: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}[] = [
  { tab: 'listings',  label: 'Annonces',    icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
  { tab: 'forum',     label: 'Posts forum', icon: FileText,    color: 'text-teal-600',   bg: 'bg-teal-50'   },
  { tab: 'equipment', label: 'Équipements', icon: Package,     color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { tab: 'reviews',   label: 'Avis clients',icon: Star,        color: 'text-amber-600',  bg: 'bg-amber-50'  },
];

// ─── StarRating ───────────────────────────────────────────────────────────────

export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-gray-700">{rating}/5</span>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

export function ConfirmModal({
  open, title, message, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <h3 className="font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>Confirmer la suppression</Button>
        </div>
      </div>
    </div>
  );
}
