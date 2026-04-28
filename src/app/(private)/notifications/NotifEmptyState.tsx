'use client';

/**
 * src/app/(private)/notifications/NotifEmptyState.tsx
 * ─────────────────────────────────────────────────────
 * État vide de la liste de notifications (onglet vide / recherche vide).
 */

import { Bell, CheckCheck } from 'lucide-react';
import type { TabId } from './notif-config';

interface NotifEmptyStateProps {
  activeTab: TabId;
  searchQuery: string;
  onClear: () => void;
}

export function NotifEmptyState({ activeTab, searchQuery, onClear }: NotifEmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
        {activeTab === 'unread'
          ? <CheckCheck className="w-9 h-9 text-emerald-400" />
          : <Bell className="w-9 h-9 text-gray-300" />}
      </div>

      {activeTab === 'unread' ? (
        <>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Vous êtes à jour ✨</h3>
          <p className="text-sm text-gray-500">Aucune notification non lue.</p>
        </>
      ) : searchQuery ? (
        <>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Aucun résultat</h3>
          <p className="text-sm text-gray-500 mb-4">
            Aucune notification ne correspond à &laquo;&nbsp;{searchQuery}&nbsp;&raquo;
          </p>
          <button onClick={onClear} className="text-brand-600 font-semibold text-sm hover:underline">
            Effacer
          </button>
        </>
      ) : (
        <>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Aucune notification</h3>
          <p className="text-sm text-gray-500">
            Vos notifications apparaîtront ici dès qu&apos;il se passe quelque chose.
          </p>
        </>
      )}
    </div>
  );
}
