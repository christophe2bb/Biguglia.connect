'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, CheckCheck, MessageSquare, Info, AlertCircle, Star,
  Heart, Calendar, MapPin, Package, ShoppingBag, Wrench,
  Handshake, Gem, Search, Trash2, RefreshCw, BellOff,
  Megaphone, Award, Clock, ChevronRight, Zap, X, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Notification } from '@/types';
import Link from 'next/link';
import { formatRelative, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Config par type de notification ──────────────────────────────────────────
const NOTIF_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
  tab: string;           // onglet de rattachement
  priority: 'high' | 'medium' | 'low';
}> = {
  // ── Messaging
  message:         { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Message',        tab: 'messages',   priority: 'high'   },
  new_message:     { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Message',        tab: 'messages',   priority: 'high'   },
  new_conversation:{ icon: MessageSquare, color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  label: 'Nouvelle conv.',  tab: 'messages',   priority: 'high'   },

  // ── Activité sur contenu
  review:          { icon: Star,          color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  label: 'Avis reçu',      tab: 'activity',   priority: 'medium' },
  review_request:  { icon: Star,          color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  label: 'Demande d\'avis', tab: 'activity',   priority: 'medium' },
  review_received: { icon: Star,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Avis publié',    tab: 'activity',   priority: 'medium' },
  listing_reserved:{ icon: ShoppingBag,   color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Réservation',    tab: 'activity',   priority: 'high'   },
  listing_sold:    { icon: ShoppingBag,   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Vendu',          tab: 'activity',   priority: 'high'   },
  loan_requested:  { icon: Package,       color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Prêt demandé',   tab: 'activity',   priority: 'high'   },
  loan_returned:   { icon: Package,       color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Retour matériel', tab: 'activity',  priority: 'medium' },
  help_accepted:   { icon: Heart,         color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  label: 'Aide acceptée',  tab: 'activity',   priority: 'high'   },
  help_resolved:   { icon: Heart,         color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  label: 'Aide terminée',  tab: 'activity',   priority: 'medium' },
  outing_joined:   { icon: MapPin,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Participation',  tab: 'activity',   priority: 'medium' },
  outing_completed:{ icon: MapPin,        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Promenade faite',tab: 'activity',   priority: 'low'    },
  event_joined:    { icon: Calendar,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  label: 'Inscription',    tab: 'activity',   priority: 'medium' },
  event_reported:  { icon: Calendar,      color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    label: 'Signalement',    tab: 'activity',   priority: 'high'   },
  event_cancelled: { icon: Calendar,      color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Annulé',         tab: 'activity',   priority: 'high'   },
  badge_awarded:   { icon: Award,         color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Badge obtenu',   tab: 'activity',   priority: 'low'    },

  // ── Compte / Profil
  account_update:  { icon: Info,          color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200',   label: 'Compte',         tab: 'system',     priority: 'medium' },
  artisan_approved:{ icon: Wrench,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Artisan validé', tab: 'system',     priority: 'high'   },

  // ── Modération / Système
  content_approved:{ icon: CheckCheck,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Approuvé',       tab: 'system',     priority: 'high'   },
  content_rejected:{ icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Refusé',         tab: 'system',     priority: 'high'   },
  alert:           { icon: Zap,           color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Alerte',         tab: 'system',     priority: 'high'   },
  moderation:      { icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     label: 'Modération',     tab: 'system',     priority: 'high'   },
  info:            { icon: Info,          color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200',   label: 'Info',           tab: 'system',     priority: 'low'    },

  // ── Rappels
  event:           { icon: Calendar,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  label: 'Événement',      tab: 'reminders',  priority: 'medium' },
  help:            { icon: Heart,         color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200',  label: 'Coup de main',   tab: 'reminders',  priority: 'medium' },
  listing:         { icon: ShoppingBag,   color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Annonce',        tab: 'reminders',  priority: 'low'    },
  equipment:       { icon: Package,       color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',    label: 'Matériel',       tab: 'reminders',  priority: 'low'    },
  lost_found:      { icon: Search,        color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   label: 'Perdu/Trouvé',   tab: 'reminders',  priority: 'medium' },
  outing:          { icon: MapPin,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Promenade',      tab: 'reminders',  priority: 'medium' },
  association:     { icon: Handshake,     color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200',  label: 'Association',    tab: 'reminders',  priority: 'low'    },
  collection:      { icon: Gem,           color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    label: 'Collectionneur', tab: 'reminders',  priority: 'low'    },
  artisan:         { icon: Wrench,        color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    label: 'Artisan',        tab: 'reminders',  priority: 'medium' },
};

function getConfig(type?: string) {
  if (!type) return NOTIF_CONFIG.info;
  return NOTIF_CONFIG[type] ?? NOTIF_CONFIG.info;
}

// ─── Onglets ──────────────────────────────────────────────────────────────────
type TabId = 'all' | 'unread' | 'messages' | 'activity' | 'system' | 'reminders';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'all',       label: 'Toutes',     icon: Bell },
  { id: 'unread',    label: 'Non lues',   icon: BellOff },
  { id: 'messages',  label: 'Messages',   icon: MessageSquare },
  { id: 'activity',  label: 'Activité',   icon: Megaphone },
  { id: 'system',    label: 'Système',    icon: AlertCircle },
  { id: 'reminders', label: 'Rappels',    icon: Clock },
];

// ─── Pagination ────────────────────────────────────────────────────────────────
/** Nombre de notifications chargées par page (vraie pagination serveur). */
const PAGE_SIZE = 30;
/** Plafond pour le fetch léger des compteurs d'onglets (sans corps). */
const COUNTS_LIMIT = 500;

// ─── Regroupement par date ────────────────────────────────────────────────────
function groupByDate(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    "Aujourd'hui": [],
    'Hier': [],
    'Cette semaine': [],
    'Plus ancien': [],
  };

  for (const n of notifs) {
    const d = new Date(n.created_at);
    if (d.toDateString() === todayStr)          groups["Aujourd'hui"].push(n);
    else if (d.toDateString() === yesterdayStr)  groups['Hier'].push(n);
    else if (d >= weekAgo)                       groups['Cette semaine'].push(n);
    else                                         groups['Plus ancien'].push(n);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─── Badge de priorité ────────────────────────────────────────────────────────
function PriorityDot({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  if (priority === 'high')   return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />;
  if (priority === 'medium') return <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />;
  return null;
}

/** Extrait les types appartenant à un onglet donné. */
function tabTypes(tabId: TabId): string[] | null {
  if (tabId === 'all' || tabId === 'unread') return null;
  return Object.entries(NOTIF_CONFIG)
    .filter(([, cfg]) => cfg.tab === tabId)
    .map(([type]) => type);
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

// ─── Compteurs légers (toujours chargés) ──────────────────────────────────────
interface TabCounters {
  all: number;
  unread: number;
  messages: number;
  activity: number;
  system: number;
  reminders: number;
  messagesUnread: number;
  activityUnread: number;
  systemUnread: number;
  remindersUnread: number;
}

export default function NotificationsClient() {
  const { profile } = useAuthStore();

  // ── Notifications affichées (page courante) ────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // ── Compteurs légers (onglets) ─────────────────────────────────────────────
  const [counters, setCounters] = useState<TabCounters>({
    all: 0, unread: 0,
    messages: 0, activity: 0, system: 0, reminders: 0,
    messagesUnread: 0, activityUnread: 0, systemUnread: 0, remindersUnread: 0,
  });

  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab]   = useState<TabId>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // cursor = created_at du dernier élément chargé (pour fetch suivant)
  const [cursor, setCursor]         = useState<string | null>(null);
  const [hasMore, setHasMore]       = useState(false);

  const channelRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx = useRef(0);
  const mountedRef   = useRef(true);

  // ── Réinitialisation quand l'onglet ou la recherche changent ───────────────
  const resetPagination = useCallback(() => {
    setNotifications([]);
    setCursor(null);
    setHasMore(false);
  }, []);

  // ── Compteurs légers : ids + is_read seulement ─────────────────────────────
  const fetchCounters = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();
    // On récupère seulement type + is_read pour calculer les compteurs
    const { data } = await supabase
      .from('notifications')
      .select('type, is_read')
      .eq('user_id', profile.id)
      .limit(COUNTS_LIMIT);

    if (!mountedRef.current || !data) return;
    const rows = data as { type: string; is_read: boolean }[];
    const tab = (t: string) => getConfig(t).tab;
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

  // ── Chargement d'une page de notifications ─────────────────────────────────
  const fetchPage = useCallback(async (
    tabId: TabId,
    query: string,
    afterCursor: string | null,
    append: boolean,
  ) => {
    if (!profile) return;
    const supabase = createClient();

    let q = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1); // +1 pour savoir s'il y a une page suivante

    // Filtre onglet
    if (tabId === 'unread') {
      q = q.eq('is_read', false);
    } else {
      const types = tabTypes(tabId);
      if (types) q = q.in('type', types);
    }

    // Filtre recherche (côté serveur si pas d'index full-text disponible, on garde côté client)
    // Cursor-based pagination : les éléments plus anciens que le curseur
    if (afterCursor) q = q.lt('created_at', afterCursor);

    const { data } = await q;
    if (!mountedRef.current || !data) return;

    // Filtrage recherche côté client (léger, sur PAGE_SIZE items seulement)
    let items = data as Notification[];
    if (query) {
      const lq = query.toLowerCase();
      items = items.filter(n =>
        n.title?.toLowerCase().includes(lq) ||
        (n as unknown as { body?: string }).body?.toLowerCase().includes(lq) ||
        n.type?.toLowerCase().includes(lq)
      );
    }

    const pageItems = items.slice(0, PAGE_SIZE);
    const nextCursor = items.length > PAGE_SIZE && items[PAGE_SIZE - 1]
      ? items[PAGE_SIZE - 1].created_at
      : null;

    setNotifications(prev => append ? [...prev, ...pageItems] : pageItems);
    setCursor(nextCursor);
    setHasMore(items.length > PAGE_SIZE);
  }, [profile]);

  // ── Chargement initial (reset + première page) ─────────────────────────────
  const loadTab = useCallback(async (tabId: TabId, query: string) => {
    setLoading(true);
    resetPagination();
    await fetchPage(tabId, query, null, false);
    if (mountedRef.current) setLoading(false);
  }, [fetchPage, resetPagination]);

  // ── Charger plus (page suivante) ───────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(activeTab, searchQuery, cursor, true);
    if (mountedRef.current) setLoadingMore(false);
  }, [cursor, loadingMore, fetchPage, activeTab, searchQuery]);

  // ── Actualiser (re-charge la première page + compteurs) ────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([
      loadTab(activeTab, searchQuery),
      fetchCounters(),
    ]);
  }, [loadTab, activeTab, searchQuery, fetchCounters]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profile) return;
    const supabase = createClient();
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const channel = supabase
      .channel(`notifications-page-${profile.id}-${Date.now()}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (!mountedRef.current) return;
          const n = payload.new as Notification;
          // Injecter en tête si compatible avec l'onglet actif
          const types = tabTypes(activeTab);
          const matchesTab =
            activeTab === 'all' ||
            (activeTab === 'unread' && !n.is_read) ||
            (types && types.includes(n.type));
          if (matchesTab) {
            setNotifications(prev => [n, ...prev]);
          }
          setCounters(c => ({
            ...c,
            all: c.all + 1,
            unread: c.unread + (n.is_read ? 0 : 1),
          }));
          window.dispatchEvent(new Event('new-notification'));
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (!mountedRef.current) return;
          setNotifications(prev =>
            prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } as Notification : n)
          );
          // Recalculer les compteurs via un fetch léger
          fetchCounters();
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;
        if (status === 'SUBSCRIBED') {
          reconnectIdx.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const delay = RECONNECT_DELAYS[Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)];
          reconnectIdx.current = Math.min(reconnectIdx.current + 1, RECONNECT_DELAYS.length - 1);
          if (reconnectRef.current) clearTimeout(reconnectRef.current);
          reconnectRef.current = setTimeout(() => { if (mountedRef.current) connectRealtime(); }, delay);
          fetchCounters();
        }
      });

    channelRef.current = channel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, fetchCounters]);

  // ── Effet principal : chargement initial ──────────────────────────────────
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
  // Initial mount only — tab/search changes handled by separate effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // ── Recharger quand l'onglet ou la recherche changent ─────────────────────
  useEffect(() => {
    if (!profile) return;
    loadTab(activeTab, searchQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchQuery]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setCounters(c => ({ ...c, unread: 0, messagesUnread: 0, activityUnread: 0, systemUnread: 0, remindersUnread: 0 }));
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    toast.success('Toutes les notifications marquées comme lues');
    window.dispatchEvent(new Event('new-notification'));
  };

  const markOneRead = useCallback(async (notif: Notification) => {
    if (notif.is_read) return;
    const supabase = createClient();
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    setCounters(c => ({ ...c, unread: Math.max(0, c.unread - 1) }));
    await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    window.dispatchEvent(new Event('new-notification'));
  }, []);

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setCounters(c => ({ ...c, all: Math.max(0, c.all - 1) }));
    await new Promise(r => setTimeout(r, 250));
    const supabase = createClient();
    await supabase.from('notifications').delete().eq('id', id);
    setDeletingId(null);
    window.dispatchEvent(new Event('new-notification'));
  };

  // ── Données affichées ─────────────────────────────────────────────────────
  const groups = groupByDate(notifications);

  const tabCounts: Record<TabId, number> = {
    all:       counters.all,
    unread:    counters.unread,
    messages:  counters.messages,
    activity:  counters.activity,
    system:    counters.system,
    reminders: counters.reminders,
  };
  const tabUnread: Record<TabId, number> = {
    all:       counters.unread,
    unread:    counters.unread,
    messages:  counters.messagesUnread,
    activity:  counters.activityUnread,
    system:    counters.systemUnread,
    reminders: counters.remindersUnread,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
              counters.unread > 0 ? 'bg-brand-50' : 'bg-gray-100'
            )}>
              {counters.unread > 0
                ? <Bell className="w-5 h-5 text-brand-600" />
                : <BellOff className="w-5 h-5 text-gray-400" />
              }
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
          <button
            onClick={refresh}
            aria-label="Actualiser les notifications"
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          {counters.unread > 0 && (
            <button
              onClick={markAllRead}
              aria-label="Marquer toutes les notifications comme lues"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-semibold transition-colors"
            >
              <CheckCheck className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Tout lire</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Barre de recherche ───────────────────────────────────────────────── */}
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
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const unread   = tabUnread[tab.id];
          const count    = tabCounts[tab.id];
          const TabIcon  = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={`${tab.label}${count > 0 ? ` (${count})` : ''}`}
              aria-pressed={isActive}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0',
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {unread > 0 && tab.id !== 'unread' && (
                <span className={cn(
                  'min-w-[16px] h-4 text-[9px] font-black rounded-full inline-flex items-center justify-center px-1',
                  isActive ? 'bg-red-500 text-white' : 'bg-red-400 text-white'
                )}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Contenu ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            {activeTab === 'unread'
              ? <CheckCheck className="w-9 h-9 text-emerald-400" />
              : <Bell className="w-9 h-9 text-gray-300" />
            }
          </div>
          {activeTab === 'unread' ? (
            <>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Vous êtes à jour ✨</h3>
              <p className="text-sm text-gray-500">Aucune notification non lue.</p>
            </>
          ) : searchQuery ? (
            <>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Aucun résultat</h3>
              <p className="text-sm text-gray-500 mb-4">Aucune notification ne correspond à &laquo;&nbsp;{searchQuery}&nbsp;&raquo;</p>
              <button onClick={() => setSearchQuery('')} className="text-brand-600 font-semibold text-sm hover:underline">Effacer</button>
            </>
          ) : (
            <>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Aucune notification</h3>
              <p className="text-sm text-gray-500">Vos notifications apparaîtront ici dès qu&apos;il se passe quelque chose.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              {/* Label du groupe */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{label}</p>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-400">{items.length}</span>
              </div>

              <div className="space-y-1.5">
                {items.map(notif => {
                  const cfg = getConfig(notif.type);
                  const Icon = cfg.icon;
                  const notifBody = (notif as unknown as { body?: string; message?: string }).body
                                  || (notif as unknown as { message?: string }).message
                                  || '';
                  const isDeleting  = deletingId === notif.id;
                  const isUnread    = !notif.is_read;
                  const isHighPrio  = cfg.priority === 'high' && isUnread;

                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'transition-colors duration-300',
                        isDeleting && 'opacity-0 scale-y-0 max-h-0 overflow-hidden pointer-events-none'
                      )}
                    >
                      <Link
                        href={notif.link || '#'}
                        onClick={() => markOneRead(notif)}
                        className={cn(
                          'group flex items-start gap-3 rounded-2xl border p-4 transition-colors duration-200',
                          'hover:shadow-md hover:-translate-y-px relative overflow-hidden',
                          isUnread
                            ? `bg-white border-l-4 ${cfg.border} shadow-sm`
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        )}
                      >
                        {/* Bande urgente à gauche (haute priorité non lue) */}
                        {isHighPrio && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-400 rounded-l-2xl" />
                        )}

                        {/* Point non-lu en haut à droite */}
                        {isUnread && (
                          <span className="absolute top-3 right-10 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                        )}

                        {/* Icône type */}
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                          'transition-transform group-hover:scale-110',
                          isUnread ? cfg.bg : 'bg-gray-100'
                        )}>
                          <Icon className={cn('w-5 h-5', isUnread ? cfg.color : 'text-gray-400')} />
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0 pr-4">
                          {/* Ligne type + date */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn(
                              'text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md',
                              isUnread ? `${cfg.color} ${cfg.bg}` : 'text-gray-400 bg-gray-100'
                            )}>
                              {cfg.label}
                            </span>
                            {/* Priorité */}
                            {isUnread && <PriorityDot priority={cfg.priority} />}
                            <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                              {formatRelative(notif.created_at)}
                            </span>
                          </div>

                          {/* Titre */}
                          <p className={cn(
                            'text-sm leading-snug',
                            isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'
                          )}>
                            {notif.title}
                          </p>

                          {/* Corps */}
                          {notifBody && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {notifBody}
                            </p>
                          )}

                          {/* CTA "Voir" si lien disponible */}
                          {notif.link && notif.link !== '#' && isUnread && (
                            <div className={cn(
                              'inline-flex items-center gap-1 mt-2 text-xs font-bold',
                              cfg.color
                            )}>
                              Voir <ChevronRight className="w-3 h-3" />
                            </div>
                          )}
                        </div>

                        {/* Bouton supprimer — visible au hover */}
                        <button
                          onClick={(e) => deleteNotif(e, notif.id)}
                          aria-label={`Supprimer la notification : ${notif.title}`}
                          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-[colors,opacity]"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── Bas de page : compteur + bouton « Voir plus » ─────────────────── */}
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-gray-400">
              {notifications.length} notification{notifications.length > 1 ? 's' : ''} affichée{notifications.length > 1 ? 's' : ''}
            </p>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadingMore
                  ? <span className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
                  : <ChevronDown className="w-4 h-4" aria-hidden="true" />
                }
                {loadingMore ? 'Chargement…' : `Voir ${PAGE_SIZE} de plus`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
