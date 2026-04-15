'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Search, RefreshCw, SlidersHorizontal, X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { TabId } from './_types';
import { RELATED_CONFIG, MAIN_TABS } from './_config';
import { filterConversations, computeCounts } from './_utils';
import { useConversationList } from './_hooks/useConversationList';
import ConversationList from './_components/ConversationList';

export default function MessagesPage() {
  const { profile, loading: authLoading } = useAuthStore();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState('');
  const [activeTab, setActiveTab]       = useState<TabId>('all');
  const [typeFilter, setTypeFilter]     = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
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
  const filtered  = filterConversations(conversations, { activeTab, typeFilter, search });
  const { totalUnread, unreadCount, toHandleCount, presentTypes } = computeCounts(conversations);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

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
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                typeFilter
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
              )}
              title="Filtrer par type"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {typeFilter ? RELATED_CONFIG[typeFilter]?.label : <span className="hidden sm:inline">Filtrer</span>}
              {typeFilter && (
                <button
                  onClick={(e) => { e.stopPropagation(); setTypeFilter(null); setShowTypeMenu(false); }}
                  className="ml-0.5 text-white/80 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
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
                      onClick={() => { setTypeFilter(active ? null : type); setShowTypeMenu(false); }}
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
            title="Actualiser"
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
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
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
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
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0',
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
              onClick={() => { setActiveTab(type); setTypeFilter(null); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0',
                isActive ? `bg-white shadow-sm ${cfg.color}` : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
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

      {/* Liste des conversations */}
      <ConversationList
        conversations={filtered}
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
        onClearSearch={() => setSearch('')}
      />

      {/* Note de bas de page */}
      {!loading && conversations.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Les messages sont privés et chiffrés entre vous et vos interlocuteurs.
        </p>
      )}
    </div>
  );
}
