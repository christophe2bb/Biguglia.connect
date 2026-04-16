'use client';

import React, { memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, ShoppingBag, HandHeart, MapPin,
  CheckCheck, Clock, BookOpen, MailOpen,
} from 'lucide-react';
import { ConvWithOther } from '../_types';
import ConversationListItem from './ConversationListItem';

// ─── Skeleton de chargement ────────────────────────────────────────────────────
const ConvSkeleton = memo(function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-16" />
      </div>
    </div>
  );
});

// ─── État vide selon le contexte ──────────────────────────────────────────────
function EmptyConversations({
  activeTab,
  search,
  onClearSearch,
}: {
  activeTab: string;
  search: string;
  onClearSearch: () => void;
}) {
  const router = useRouter();

  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
        {activeTab === 'unread' ? (
          <CheckCheck className="w-9 h-9 text-emerald-400" />
        ) : activeTab === 'to_handle' ? (
          <Clock className="w-9 h-9 text-gray-400" />
        ) : (
          <MessageSquare className="w-9 h-9 text-gray-300" />
        )}
      </div>

      {activeTab === 'unread' ? (
        <>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Tout est à jour ✨</h3>
          <p className="text-sm text-gray-500">Vous n&apos;avez aucun message non lu.</p>
        </>
      ) : activeTab === 'to_handle' ? (
        <>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Rien à traiter</h3>
          <p className="text-sm text-gray-500">Toutes vos conversations contextuelles sont à jour.</p>
        </>
      ) : search ? (
        <>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Aucun résultat</h3>
          <p className="text-sm text-gray-500 mb-4">
            Aucune conversation ne correspond à &laquo;&nbsp;{search}&nbsp;&raquo;
          </p>
          <button
            onClick={onClearSearch}
            className="text-brand-600 font-semibold text-sm hover:underline"
          >
            Effacer la recherche
          </button>
        </>
      ) : (
        <>
          <h3 className="font-bold text-gray-800 text-lg mb-2">Aucune conversation pour le moment</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Retrouvez ici tous vos échanges avec les habitants, artisans et associations de Biguglia.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => router.push('/annonces')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> Annonces
            </button>
            <button
              onClick={() => router.push('/coups-de-main')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors"
            >
              <HandHeart className="w-4 h-4" /> Coups de main
            </button>
            <button
              onClick={() => router.push('/promenades')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors"
            >
              <MapPin className="w-4 h-4" /> Promenades
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ConversationListProps {
  /** Liste filtrée à afficher */
  conversations: ConvWithOther[];
  /** Liste complète (pour les stats de la barre de résumé) */
  allConversations: ConvWithOther[];
  loading: boolean;
  activeTab: string;
  search: string;
  typeFilter: string | null;
  totalUnread: number;
  toHandleCount: number;
  deletingConv: string | null;
  confirmConv: string | null;
  onConvClick: (conv: ConvWithOther) => void;
  onConfirmDelete: (convId: string) => void;
  onCancelDelete: () => void;
  onDelete: (convId: string) => void;
  onClearSearch: () => void;
}

/**
 * Affiche la liste des conversations avec :
 *   - Skeleton de chargement (5 lignes)
 *   - État vide contextuel (non-lus / à traiter / recherche / vide total)
 *   - Barre de résumé rapide (nb conv, non-lus, à traiter)
 *   - Lignes cliquables via ConversationListItem
 */
const ConversationList = memo(function ConversationList({
  conversations,
  allConversations,
  loading,
  activeTab,
  search,
  typeFilter,
  totalUnread,
  toHandleCount,
  deletingConv,
  confirmConv,
  onConvClick,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onClearSearch,
}: ConversationListProps) {
  // ── Chargement ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {[...Array(5)].map((_, i) => <ConvSkeleton key={i} />)}
      </div>
    );
  }

  // ── Liste vide ──────────────────────────────────────────────────────────────
  if (conversations.length === 0) {
    return (
      <EmptyConversations
        activeTab={activeTab}
        search={search}
        onClearSearch={onClearSearch}
      />
    );
  }

  // ── Liste remplie ───────────────────────────────────────────────────────────
  const showStats = activeTab === 'all' && !search && !typeFilter && allConversations.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-sm">
      {/* Barre de résumé rapide */}
      {showStats && (
        <div className="flex items-center gap-4 px-5 py-3 bg-gray-50/70 text-xs text-gray-500">
          <span className="flex items-center gap-1 font-semibold text-gray-700">
            <BookOpen className="w-3.5 h-3.5" />
            {allConversations.length} conversation{allConversations.length > 1 ? 's' : ''}
          </span>
          {totalUnread > 0 && (
            <span className="flex items-center gap-1 text-red-500 font-semibold">
              <MailOpen className="w-3.5 h-3.5" />
              {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
            </span>
          )}
          {toHandleCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {toHandleCount} à traiter
            </span>
          )}
        </div>
      )}

      {/* Lignes de conversation */}
      {conversations.map(conv => (
        <ConversationListItem
          key={conv.id}
          conv={conv}
          isDeleting={deletingConv === conv.id}
          isConfirm={confirmConv === conv.id}
          onConfirmDelete={() => onConfirmDelete(conv.id)}
          onCancelDelete={onCancelDelete}
          onDelete={() => onDelete(conv.id)}
          onClick={() => onConvClick(conv)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onConvClick(conv);
            }
          }}
        />
      ))}
    </div>
  );
});

export default ConversationList;
