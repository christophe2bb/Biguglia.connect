'use client';

/**
 * src/app/(private)/notifications/NotificationsClient.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Composant principal de la page Notifications.
 *
 * Onglets :
 *   all        — toutes les notifications
 *   unread     — non lues
 *   messages   — messages directs
 *   activity   — activité (reviews, réservations…)
 *   system     — système / modération
 *   reminders  — rappels
 *   follows    — abonnements aux associations (NOUVEAU)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Bell, CheckCheck, BellOff,
  Search, RefreshCw, X, ChevronDown,
  Handshake, Loader2, ExternalLink, Trash2,
} from 'lucide-react';
import { createClient, safeRemoveChannel } from '@/lib/supabase/client';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssoFollow {
  id: string;
  asso_id: string;
  created_at: string;
  association?: {
    id: string;
    name: string;
    category: string;
    status: string;
    description_short: string;
    sector_id?: string | null;
  } | null;
}

// ─── Onglets complets (inclut "Abonnements") ─────────────────────────────────

const ALL_TABS: { id: TabId | 'follows'; label: string; icon: React.ElementType }[] = [
  ...TABS,
  { id: 'follows', label: 'Abonnements', icon: Handshake },
];

type AnyTabId = TabId | 'follows';

// ─── Valeur initiale des compteurs ────────────────────────────────────────────
const EMPTY_COUNTERS: TabCounters = {
  all: 0, unread: 0,
  messages: 0, activity: 0, system: 0, reminders: 0,
  messagesUnread: 0, activityUnread: 0, systemUnread: 0, remindersUnread: 0,
};

// ─── Composant ────────────────────────────────────────────────────────────────
export default function NotificationsClient() {
  const { profile } = useAuthStore();

  // ── État notifications ─────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counters, setCounters]           = useState<TabCounters>(EMPTY_COUNTERS);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [activeTab, setActiveTab]         = useState<AnyTabId>('all');
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [cursor, setCursor]               = useState<string | null>(null);
  const [hasMore, setHasMore]             = useState(false);

  // ── État abonnements associations ──────────────────────────────────────────
  const [follows, setFollows]             = useState<AssoFollow[]>([]);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  const channelRef        = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx      = useRef(0);
  const mountedRef        = useRef(true);
  // Refs stables — évitent de recréer connectRealtime à chaque render
  const fetchCountersRef  = useRef<() => void>(() => {});
  const connectRealtimeRef = useRef<() => void>(() => {});
  const activeTabRef       = useRef<AnyTabId>('all');

  // ── Réinitialisation ──────────────────────────────────────────────────────
  const resetPagination = useCallback(() => {
    setNotifications([]);
    setCursor(null);
    setHasMore(false);
  }, []);

  // Garder activeTabRef à jour pour connectRealtime (évite la dépendance instable)
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

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

  // Garder la ref à jour sans invalider connectRealtime
  useEffect(() => { fetchCountersRef.current = fetchCounters; }, [fetchCounters]);

  // ── Chargement abonnements associations ───────────────────────────────────
  const fetchFollows = useCallback(async () => {
    if (!profile) return;
    setFollowsLoading(true);
    try {
      const { data, error } = await createClient()
        .from('asso_follows')
        .select(`
          id,
          asso_id,
          created_at,
          association:asso_id (
            id, name, category, status, description_short, sector_id
          )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (!mountedRef.current) return;
      if (error) {
        console.error('fetchFollows error:', error);
        return;
      }
      // Supabase retourne association comme tableau — on normalise
      const normalized = (data ?? []).map((row: {
        id: string;
        asso_id: string;
        created_at: string;
        association: { id: string; name: string; category: string; status: string; description_short: string; sector_id?: string | null }[] | null;
      }): AssoFollow => ({
        id: row.id,
        asso_id: row.asso_id,
        created_at: row.created_at,
        association: Array.isArray(row.association) ? (row.association[0] ?? null) : row.association,
      }));
      setFollows(normalized);
    } finally {
      if (mountedRef.current) setFollowsLoading(false);
    }
  }, [profile]);

  // ── Désabonnement d'une association ──────────────────────────────────────
  const unfollow = useCallback(async (followId: string, assoName: string) => {
    setUnfollowingId(followId);
    try {
      const { error } = await createClient()
        .from('asso_follows')
        .delete()
        .eq('id', followId);

      if (error) throw error;
      setFollows(prev => prev.filter(f => f.id !== followId));
      toast.success(`Alertes désactivées pour « ${assoName} »`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      toast.error(`Impossible de désabonner : ${msg}`);
    } finally {
      setUnfollowingId(null);
    }
  }, []);

  // ── Chargement d'une page de notifications ───────────────────────────────
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
    await fetchPage(activeTab as TabId, searchQuery, cursor, true);
    if (mountedRef.current) setLoadingMore(false);
  }, [cursor, loadingMore, fetchPage, activeTab, searchQuery]);

  const refresh = useCallback(async () => {
    if (activeTab === 'follows') {
      await fetchFollows();
    } else {
      await Promise.all([loadTab(activeTab as TabId, searchQuery), fetchCounters()]);
    }
  }, [loadTab, activeTab, searchQuery, fetchCounters, fetchFollows]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profile?.id) return;
    const userId  = profile.id;
    const supabase = createClient();
    if (channelRef.current) { safeRemoveChannel(supabase, channelRef.current).catch(() => null); channelRef.current = null; }

    channelRef.current = supabase
      .channel(`notifications-page-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: import('@supabase/realtime-js').RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (!mountedRef.current) return;
          const n     = payload.new as Notification;
          const tab   = activeTabRef.current;
          const types = tabTypes(tab as TabId);
          const ok    = tab === 'all'
            || (tab === 'unread' && !n.is_read)
            || (types?.includes(n.type) ?? false);
          if (ok) setNotifications(prev => [n, ...prev]);
          setCounters(c => ({ ...c, all: c.all + 1, unread: c.unread + (n.is_read ? 0 : 1) }));
          window.dispatchEvent(new Event('new-notification'));
        },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: import('@supabase/realtime-js').RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (!mountedRef.current) return;
          const newData = payload.new as Record<string, unknown>;
          setNotifications(prev =>
            prev.map(n => n.id === (newData.id as string) ? { ...n, ...newData } as Notification : n),
          );
          fetchCountersRef.current();
        },
      )
      .subscribe((status: string) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          reconnectIdx.current = 0;
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          // Stopper la boucle si max tentatives atteint
          if (reconnectIdx.current >= RECONNECT_DELAYS.length - 1) {
            console.warn('[notifications] max reconnexions atteint, fallback polling');
            fetchCountersRef.current();
            return;
          }
          const delay = RECONNECT_DELAYS[reconnectIdx.current];
          reconnectIdx.current = reconnectIdx.current + 1;
          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => {
            if (mountedRef.current) connectRealtimeRef.current();
          }, delay);
          fetchCountersRef.current();
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // Garder connectRealtimeRef à jour
  useEffect(() => { connectRealtimeRef.current = connectRealtime; }, [connectRealtime]);

  // ── Effets ────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (!profile) return;
    loadTab('all', '');
    fetchCounters();
    fetchFollows();
    connectRealtime();
    window.dispatchEvent(new Event('new-notification'));

    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        if (activeTab === 'follows') {
          fetchFollows();
        } else {
          loadTab(activeTab as TabId, searchQuery);
          fetchCounters();
        }
        window.dispatchEvent(new Event('new-notification'));
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      mountedRef.current = false;
      const supabase = createClient();
      if (channelRef.current) { safeRemoveChannel(supabase, channelRef.current).catch(() => null); channelRef.current = null; }
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      document.removeEventListener('visibilitychange', handleVis);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    if (activeTab === 'follows') {
      fetchFollows();
    } else {
      loadTab(activeTab as TabId, searchQuery);
    }
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
    // Récupérer la notif avant suppression pour savoir si elle était non lue
    const notif = notifications.find(n => n.id === id);
    const wasUnread = notif ? !notif.is_read : false;
    const tab = notif ? getConfig(notif.type).tab : null;
    setNotifications(prev => prev.filter(n => n.id !== id));
    setCounters(c => ({
      ...c,
      all:             Math.max(0, c.all - 1),
      unread:          wasUnread ? Math.max(0, c.unread - 1) : c.unread,
      messages:        tab === 'messages'  ? Math.max(0, c.messages  - 1) : c.messages,
      activity:        tab === 'activity'  ? Math.max(0, c.activity  - 1) : c.activity,
      system:          tab === 'system'    ? Math.max(0, c.system    - 1) : c.system,
      reminders:       tab === 'reminders' ? Math.max(0, c.reminders - 1) : c.reminders,
      messagesUnread:  wasUnread && tab === 'messages'  ? Math.max(0, c.messagesUnread  - 1) : c.messagesUnread,
      activityUnread:  wasUnread && tab === 'activity'  ? Math.max(0, c.activityUnread  - 1) : c.activityUnread,
      systemUnread:    wasUnread && tab === 'system'    ? Math.max(0, c.systemUnread    - 1) : c.systemUnread,
      remindersUnread: wasUnread && tab === 'reminders' ? Math.max(0, c.remindersUnread - 1) : c.remindersUnread,
    }));
    await new Promise(r => setTimeout(r, 250));
    await createClient().from('notifications').delete().eq('id', id);
    setDeletingId(null);
    window.dispatchEvent(new Event('new-notification'));
  };

  // ── Données dérivées ──────────────────────────────────────────────────────
  const groups = groupByDate(notifications);

  const tabCounts: Record<AnyTabId, number> = {
    all: counters.all, unread: counters.unread,
    messages: counters.messages, activity: counters.activity,
    system: counters.system, reminders: counters.reminders,
    follows: follows.length,
  };
  const tabUnread: Record<AnyTabId, number> = {
    all: counters.unread,              unread: counters.unread,
    messages: counters.messagesUnread, activity: counters.activityUnread,
    system: counters.systemUnread,     reminders: counters.remindersUnread,
    follows: 0,
  };

  // ── Catégorie emoji rapide ─────────────────────────────────────────────────
  const CAT_EMOJI: Record<string, string> = {
    sport: '⚽', culture: '🎭', solidarite: '🤝', jeunesse: '🌱',
    environnement: '🌿', loisirs: '🎲', animaux: '🐾', patrimoine: '🏛️',
    sante: '❤️', education: '📚', seniors: '👴', autre: '🏛️',
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
            <h1 className="text-xl font-black text-gray-900">Notifications & Alertes</h1>
            <p className="text-sm text-gray-500">
              {counters.unread > 0
                ? <span className="text-red-500 font-semibold">{counters.unread} non lue{counters.unread > 1 ? 's' : ''} — votre attention est requise</span>
                : <span className="text-emerald-600 font-semibold">✓ Tout est à jour</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} aria-label="Actualiser"
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          {counters.unread > 0 && activeTab !== 'follows' && (
            <button onClick={markAllRead} aria-label="Marquer toutes les notifications comme lues"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-semibold transition-colors">
              <CheckCheck className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Tout lire</span>
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche (cachée sur l'onglet follows) */}
      {activeTab !== 'follows' && (
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
      )}

      {/* Onglets */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
        {ALL_TABS.map(tab => {
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
              {tab.id === 'follows' && count > 0 && (
                <span className={cn(
                  'min-w-[16px] h-4 text-[9px] font-black rounded-full inline-flex items-center justify-center px-1',
                  isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-400 text-white',
                )}>
                  {count}
                </span>
              )}
              {unread > 0 && tab.id !== 'unread' && tab.id !== 'follows' && (
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

      {/* ── Onglet Abonnements ─────────────────────────────────────────────── */}
      {activeTab === 'follows' ? (
        <FollowsTab
          follows={follows}
          loading={followsLoading}
          unfollowingId={unfollowingId}
          onUnfollow={unfollow}
          catEmoji={CAT_EMOJI}
        />
      ) : (
        /* ── Onglets notifications standards ─────────────────────────────── */
        loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <NotifEmptyState activeTab={activeTab as TabId} searchQuery={searchQuery} onClear={() => setSearchQuery('')} />
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
        )
      )}
    </div>
  );
}

// ─── Sous-composant : onglet Abonnements associations ─────────────────────────

interface FollowsTabProps {
  follows: AssoFollow[];
  loading: boolean;
  unfollowingId: string | null;
  onUnfollow: (followId: string, assoName: string) => Promise<void>;
  catEmoji: Record<string, string>;
}

function FollowsTab({ follows, loading, unfollowingId, onUnfollow, catEmoji }: FollowsTabProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (follows.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <Handshake className="w-9 h-9 text-emerald-300" />
        </div>
        <h3 className="font-bold text-gray-800 text-lg mb-2">Aucun abonnement</h3>
        <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
          Suivez des associations pour être alerté de leurs nouveaux besoins et événements.
        </p>
        <Link
          href="/associations"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Handshake className="w-4 h-4" />
          Découvrir les associations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bandeau informatif */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <Bell className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-emerald-800">
            Vous suivez {follows.length} association{follows.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Vous recevez une notification à chaque mise à jour, nouveau besoin ou événement.
          </p>
        </div>
      </div>

      {/* Liste des associations suivies */}
      <div className="space-y-2">
        {follows.map(follow => {
          const asso        = follow.association;
          const name        = asso?.name ?? '—';
          const cat         = asso?.category ?? '';
          const emoji       = catEmoji[cat] ?? '🏛️';
          const isActive    = asso?.status === 'active';
          const isUnfollowing = unfollowingId === follow.id;

          return (
            <div
              key={follow.id}
              className="group bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                {/* Icône catégorie */}
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 text-lg">
                  {emoji}
                </div>

                {/* Infos association */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
                    <span className={cn(
                      'text-[10px] font-black px-2 py-0.5 rounded-full',
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
                    )}>
                      {isActive ? '✅ Active' : '⏸️ Inactive'}
                    </span>
                  </div>
                  {asso?.description_short && (
                    <p className="text-xs text-gray-500 line-clamp-1 mb-1.5">
                      {asso.description_short}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">
                    Abonné depuis le{' '}
                    {new Date(follow.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {asso?.id && (
                    <Link
                      href={`/associations/${asso.id}`}
                      title="Voir la fiche"
                      className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <button
                    onClick={() => onUnfollow(follow.id, name)}
                    disabled={isUnfollowing}
                    title="Se désabonner"
                    className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    aria-label={`Se désabonner de ${name}`}
                  >
                    {isUnfollowing
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA bas de page */}
      <div className="pt-2 text-center">
        <Link
          href="/associations"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
        >
          <Handshake className="w-4 h-4" />
          Découvrir d&apos;autres associations
        </Link>
      </div>
    </div>
  );
}

// ─── Import manquant pour Bell dans FollowsTab ────────────────────────────────
// (Bell est déjà importé en haut du fichier)
