'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Search, RefreshCw, SlidersHorizontal, X, ChevronDown, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { TabId } from './_types';
import { RELATED_CONFIG, MAIN_TABS } from './_config';
import { filterConversations, computeCounts } from './_utils';
import { useConversationList } from './_hooks/useConversationList';
import ConversationList from './_components/ConversationList';

// ── Pagination ────────────────────────────────────────────────────────────────
const CONV_PAGE_SIZE = 20;

export default function MessagesPage() {
  const { profile, loading: authLoading } = useAuthStore();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState('');
  const [activeTab, setActiveTab]       = useState<TabId>('all');
  const [typeFilter, setTypeFilter]     = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CONV_PAGE_SIZE);
  const typeMenuRef                     = useRef<HTMLDivElement>(null);

  // Fermer menus si clic dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-conv-menu]')) { /* ne pas fermer confirmConv ici */ }
      if (typeMenuRef.current && !typeMenuRef.current.contains(t)) setShowTypeMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Handlers de filtre — reset la pagination à chaque changement ─────────────
  const handleSetActiveTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setVisibleCount(CONV_PAGE_SIZE);
  }, []);
  const handleSetTypeFilter = useCallback((t: string | null) => {
    setTypeFilter(t);
    setVisibleCount(CONV_PAGE_SIZE);
  }, []);
  const handleSetSearch = useCallback((v: string) => {
    setSearch(v);
    setVisibleCount(CONV_PAGE_SIZE);
  }, []);

  // ── Données & actions (toute la logique métier dans le hook) ─────────────────
  const {
    conversations,
    loading,
    deletingConv,
    confirmConv,
    setConfirmConv,
    fetchConversations,
    handleDeleteConversation,
    handleConvClick,
  } = useConversationList({ profileId: profile?.id ?? null, authLoading });

  // ── Dérivations ──────────────────────────────────────────────────────────────
  const filtered     = filterConversations(conversations, { activeTab, typeFilter, search });
  const paginated    = filtered.slice(0, visibleCount);
  const hasMoreConvs = filtered.length > visibleCount;
  const { totalUnread, unreadCount, toHandleCount, presentTypes } = computeCounts(conversations);

  const nameMissing = profile && !profile.full_name?.trim();

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Alerte nom manquant */}
      {nameMissing && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">Votre nom n&apos;est pas renseigné</p>
            <p className="text-amber-700 text-sm mt-0.5">
              Vos interlocuteurs vous voient sous votre adresse e‑mail au lieu de votre nom.{' '}
              <Link href="/profil" className="underline font-semibold hover:text-amber-900">
                Renseigner mon nom →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-brand-600" />
            </div>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow border-2 border-white">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">
              {totalUnread > 0
                ? <span className="text-red-500 font-semibold">{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</span>
                : <span className="text-emerald-600 font-semibold">✓ Tout est à jour</span>}
            </p>
          </div>
        </div>

        {/* Filtre par type + Actualiser */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={typeMenuRef}>
            <button
              onClick={() => setShowTypeMenu(v => !v)}
              aria-label={typeFilter ? `Filtre actif : ${RELATED_CONFIG[typeFilter]?.label ?? typeFilter}. Cliquer pour changer` : 'Filtrer les conversations par type'}
              aria-expanded={showTypeMenu}
              aria-haspopup="listbox"
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
                typeFilter
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              {typeFilter ? RELATED_CONFIG[typeFilter]?.label : <span className="hidden sm:inline">Filtrer</span>}
              {typeFilter && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSetTypeFilter(null); setShowTypeMenu(false); }}
                  aria-label="Effacer le filtre actif"
                  className="ml-0.5 text-white/80 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </button>
            {showTypeMenu && presentTypes.length > 0 && (
              <div className="absolute right-0 top-11 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[180px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
                  Type de conversation
                </p>
                {presentTypes.map(type => {
                  const cfg    = RELATED_CONFIG[type];
                  if (!cfg) return null;
                  const Icon   = cfg.icon;
                  const active = typeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => { handleSetTypeFilter(active ? null : type); setShowTypeMenu(false); }}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                        active ? `${cfg.bg} ${cfg.color} font-semibold` : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', active ? cfg.color : 'text-gray-400')} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={fetchConversations}
            aria-label="Actualiser les conversations"
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un contact, une annonce, un message…"
          value={search}
          onChange={e => handleSetSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-colors"
        />
        {search && (
          <button
            onClick={() => handleSetSearch('')}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {MAIN_TABS.map(tab => {
          const count    = tab.id === 'unread' ? unreadCount : tab.id === 'to_handle' ? toHandleCount : conversations.length;
          const isActive = activeTab === tab.id;
          const TabIcon  = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleSetActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0',
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && tab.id !== 'all' && (
                <span className={cn(
                  'min-w-[18px] h-[18px] text-[10px] font-black rounded-full inline-flex items-center justify-center px-1',
                  isActive
                    ? tab.id === 'unread' ? 'bg-red-500 text-white' : 'bg-brand-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {presentTypes.length > 0 && <div className="h-5 w-px bg-gray-300 mx-1 flex-shrink-0" />}

        {/* Onglets dynamiques par type */}
        {presentTypes.map(type => {
          const cfg      = RELATED_CONFIG[type];
          if (!cfg) return null;
          const Icon     = cfg.icon;
          const count    = conversations.filter(c => c.related_type === type).length;
          const isActive = activeTab === type;
          return (
            <button
              key={type}
              onClick={() => { handleSetActiveTab(type); handleSetTypeFilter(null); }}
              aria-label={`Filtrer par type\u00a0: ${cfg.label}`}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0',
                isActive ? `bg-white shadow-sm ${cfg.color}` : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{cfg.label}</span>
              {count > 0 && (
                <span className={cn(
                  'min-w-[16px] h-4 text-[9px] font-black rounded-full inline-flex items-center justify-center px-1',
                  isActive ? `${cfg.bg} ${cfg.color}` : 'bg-gray-200 text-gray-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Liste des conversations — paginée */}
      <ConversationList
        conversations={paginated}
        allConversations={conversations}
        loading={loading}
        activeTab={activeTab}
        search={search}
        typeFilter={typeFilter}
        totalUnread={totalUnread}
        toHandleCount={toHandleCount}
        deletingConv={deletingConv}
        confirmConv={confirmConv}
        onConvClick={handleConvClick}
        onConfirmDelete={handleDeleteConversation}
        onCancelDelete={() => setConfirmConv(null)}
        onDelete={(convId) => setConfirmConv(confirmConv === convId ? null : convId)}
        onClearSearch={() => handleSetSearch('')}
      />

      {/* Bouton "Voir plus" + compteur */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-xs text-gray-400">
            {Math.min(visibleCount, filtered.length)} / {filtered.length} conversation{filtered.length > 1 ? 's' : ''}
          </p>
          {hasMoreConvs && (
            <button
              onClick={() => setVisibleCount(c => c + CONV_PAGE_SIZE)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
              Voir {Math.min(CONV_PAGE_SIZE, filtered.length - visibleCount)} de plus
            </button>
          )}
          {!hasMoreConvs && conversations.length > 0 && (
            <p className="text-xs text-gray-400 italic">
              Les messages sont privés entre vous et vos interlocuteurs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
