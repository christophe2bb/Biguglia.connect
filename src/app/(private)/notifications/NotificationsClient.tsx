'use client';

/**
 * src/app/(private)/notifications/NotificationsClient.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Composant principal de la page Notifications.
 *
 * Responsabilités :
 *   • État React (notifications, compteurs, pagination, onglet actif)
 *   • Fetchs Supabase + Realtime avec reconnexion exponentielle
 *   • Actions (marquer lu, tout lire, supprimer)
 *   • Orchestration du rendu
 *
 * Découpage :
 *   notif-config.ts      — config statique, types, utilitaires purs
 *   NotifRow.tsx         — ligne individuelle d'une notification
 *   NotifEmptyState.tsx  — état vide (onglet vide / recherche sans résultat)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, CheckCheck, BellOff,
  Search, RefreshCw, X, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Notification } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

import {
  TABS, PAGE_SIZE, COUNTS_LIMIT, RECONNECT_DELAYS,
  type TabId, type TabCounters,
  getConfig, tabTypes, groupByDate,
} from './notif-config';
import { NotifRow }        from './NotifRow';
import { NotifEmptyState } from './NotifEmptyState';

// ─── Valeur initiale des compteurs ────────────────────────────────────────────
const EMPTY_COUNTERS: TabCounters = {
  all: 0, unread: 0,
  messages: 0, activity: 0, system: 0, reminders: 0,
  messagesUnread: 0, activityUnread: 0, systemUnread: 0, remindersUnread: 0,
};

// ─── Composant ────────────────────────────────────────────────────────────────
export default function NotificationsClient() {
  const { profile } = useAuthStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counters, setCounters]           = useState<TabCounters>(EMPTY_COUNTERS);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [activeTab, setActiveTab]         = useState<TabId>('all');
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [cursor, setCursor]               = useState<string | null>(null);
  const [hasMore, setHasMore]             = useState(false);

  const channelRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx = useRef(0);
  const mountedRef   = useRef(true);

  // ── Réinitialisation ──────────────────────────────────────────────────────
  const resetPagination = useCallback(() => {
    setNotifications([]);
    setCursor(null);
    setHasMore(false);
  }, []);

  // ── Compteurs légers ──────────────────────────────────────────────────────
  const fetchCounters = useCallback(async () => {
    if (!profile) return;
    const { data } = await createClient()
      .from('notifications')
      .select('type, is_read')
      .eq('user_id', profile.id)
      .limit(COUNTS_LIMIT);

    if (!mountedRef.current || !data) return;
    const rows = data as { type: string; is_read: boolean }[];
    const tab  = (t: string) => getConfig(t).tab;
    setCounters({
      all:             rows.length,
      unread:          rows.filter(r => !r.is_read).length,
      messages:        rows.filter(r => tab(r.type) === 'messages').length,
      activity:        rows.filter(r => tab(r.type) === 'activity').length,
      system:          rows.filter(r => tab(r.type) === 'system').length,
      reminders:       rows.filter(r => tab(r.type) === 'reminders').length,
      messagesUnread:  rows.filter(r => !r.is_read && tab(r.type) === 'messages').length,
      activityUnread:  rows.filter(r => !r.is_read && tab(r.type) === 'activity').length,
      systemUnread:    rows.filter(r => !r.is_read && tab(r.type) === 'system').length,
      remindersUnread: rows.filter(r => !r.is_read && tab(r.type) === 'reminders').length,
    });
  }, [profile]);

  // ── Chargement d'une page ─────────────────────────────────────────────────
  const fetchPage = useCallback(async (
    tabId: TabId, query: string, afterCursor: string | null, append: boolean,
  ) => {
    if (!profile) return;
    let q = createClient()
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (tabId === 'unread') {
      q = q.eq('is_read', false);
    } else {
      const types = tabTypes(tabId);
      if (types) q = q.in('type', types);
    }
    if (afterCursor) q = q.lt('created_at', afterCursor);

    const { data } = await q;
    if (!mountedRef.current || !data) return;

    let items = data as Notification[];
    if (query) {
      const lq = query.toLowerCase();
      items = items.filter(n =>
        n.title?.toLowerCase().includes(lq) ||
        (n as unknown as { body?: string }).body?.toLowerCase().includes(lq) ||
        n.type?.toLowerCase().includes(lq),
      );
    }

    const pageItems  = items.slice(0, PAGE_SIZE);
    const nextCursor = items.length > PAGE_SIZE && items[PAGE_SIZE - 1]
      ? items[PAGE_SIZE - 1].created_at : null;

    setNotifications(prev => append ? [...prev, ...pageItems] : pageItems);
    setCursor(nextCursor);
    setHasMore(items.length > PAGE_SIZE);
  }, [profile]);

  const loadTab = useCallback(async (tabId: TabId, query: string) => {
    setLoading(true);
    resetPagination();
    await fetchPage(tabId, query, null, false);
    if (mountedRef.current) setLoading(false);
  }, [fetchPage, resetPagination]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(activeTab, searchQuery, cursor, true);
    if (mountedRef.current) setLoadingMore(false);
  }, [cursor, loadingMore, fetchPage, activeTab, searchQuery]);

  const refresh = useCallback(async () => {
    await Promise.all([loadTab(activeTab, searchQuery), fetchCounters()]);
  }, [loadTab, activeTab, searchQuery, fetchCounters]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profile) return;
    const supabase = createClient();
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    channelRef.current = supabase
      .channel(`notifications-page-${profile.id}-${Date.now()}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (!mountedRef.current) return;
          const n     = payload.new as Notification;
          const types = tabTypes(activeTab);
          const ok    = activeTab === 'all'
            || (activeTab === 'unread' && !n.is_read)
            || (types?.includes(n.type) ?? false);
          if (ok) setNotifications(prev => [n, ...prev]);
          setCounters(c => ({ ...c, all: c.all + 1, unread: c.unread + (n.is_read ? 0 : 1) }));
          window.dispatchEvent(new Event('new-notification'));
        },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (!mountedRef.current) return;
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } as Notification : n),
          );
          fetchCounters();
        },
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          reconnectIdx.current = 0;
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          reconnectIdx.current = Math.min(reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => { if (mountedRef.current) connectRealtime(); }, delay);
          fetchCounters();
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, fetchCounters]);

  // ── Effets ────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (!profile) return;
    loadTab(activeTab, searchQuery);
    fetchCounters();
    connectRealtime();
    window.dispatchEvent(new Event('new-notification'));

    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        loadTab(activeTab, searchQuery);
        fetchCounters();
        window.dispatchEvent(new Event('new-notification'));
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      mountedRef.current = false;
      const supabase = createClient();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      document.removeEventListener('visibilitychange', handleVis);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    loadTab(activeTab, searchQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!profile) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setCounters(c => ({ ...c, unread: 0, messagesUnread: 0, activityUnread: 0, systemUnread: 0, remindersUnread: 0 }));
    await createClient().from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    toast.success('Toutes les notifications marquées comme lues');
    window.dispatchEvent(new Event('new-notification'));
  };

  const markOneRead = useCallback(async (notif: Notification) => {
    if (notif.is_read) return;
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setCounters(c => ({ ...c, unread: Math.max(0, c.unread - 1) }));
    await createClient().from('notifications').update({ is_read: true }).eq('id', notif.id);
    window.dispatchEvent(new Event('new-notification'));
  }, []);

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setCounters(c => ({ ...c, all: Math.max(0, c.all - 1) }));
    await new Promise(r => setTimeout(r, 250));
    await createClient().from('notifications').delete().eq('id', id);
    setDeletingId(null);
    window.dispatchEvent(new Event('new-notification'));
  };

  // ── Données dérivées ──────────────────────────────────────────────────────
  const groups = groupByDate(notifications);

  const tabCounts: Record<TabId, number> = {
    all: counters.all, unread: counters.unread,
    messages: counters.messages, activity: counters.activity,
    system: counters.system, reminders: counters.reminders,
  };
  const tabUnread: Record<TabId, number> = {
    all: counters.unread,         unread: counters.unread,
    messages: counters.messagesUnread, activity: counters.activityUnread,
    system: counters.systemUnread,     reminders: counters.remindersUnread,
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
              counters.unread > 0 ? 'bg-brand-50' : 'bg-gray-100',
            )}>
              {counters.unread > 0
                ? <Bell className="w-5 h-5 text-brand-600" />
                : <BellOff className="w-5 h-5 text-gray-400" />}
            </div>
            {counters.unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow border-2 border-white animate-bounce">
                {counters.unread > 99 ? '99+' : counters.unread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {counters.unread > 0
                ? <span className="text-red-500 font-semibold">{counters.unread} non lue{counters.unread > 1 ? 's' : ''} — votre attention est requise</span>
                : <span className="text-emerald-600 font-semibold">✓ Tout est à jour</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} aria-label="Actualiser les notifications"
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          {counters.unread > 0 && (
            <button onClick={markAllRead} aria-label="Marquer toutes les notifications comme lues"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-semibold transition-colors">
              <CheckCheck className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Tout lire</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher une notification…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-colors"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const unread   = tabUnread[tab.id];
          const count    = tabCounts[tab.id];
          const TabIcon  = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              aria-label={`${tab.label}${count > 0 ? ` (${count})` : ''}`}
              aria-pressed={isActive}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0',
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}>
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {unread > 0 && tab.id !== 'unread' && (
                <span className={cn(
                  'min-w-[16px] h-4 text-[9px] font-black rounded-full inline-flex items-center justify-center px-1',
                  isActive ? 'bg-red-500 text-white' : 'bg-red-400 text-white',
                )}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <NotifEmptyState activeTab={activeTab} searchQuery={searchQuery} onClear={() => setSearchQuery('')} />
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{label}</p>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400">{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map(notif => (
                  <NotifRow
                    key={notif.id}
                    notif={notif}
                    isDeleting={deletingId === notif.id}
                    onRead={markOneRead}
                    onDelete={deleteNotif}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-gray-400">
              {notifications.length} notification{notifications.length > 1 ? 's' : ''} affichée{notifications.length > 1 ? 's' : ''}
            </p>
            {hasMore && (
              <button onClick={loadMore} disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {loadingMore
                  ? <span className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
                  : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                {loadingMore ? 'Chargement…' : `Voir ${PAGE_SIZE} de plus`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
