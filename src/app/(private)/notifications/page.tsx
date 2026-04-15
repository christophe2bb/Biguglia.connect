'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCheck, MessageSquare, Info, AlertCircle, Star,
  Heart, Calendar, MapPin, Package, ShoppingBag, Wrench,
  Handshake, Gem, Search, Trash2, RefreshCw, BellOff,
  Megaphone, Award, Clock, ChevronRight, Zap, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Notification } from '@/types';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
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

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

export default function NotificationsPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const channelRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx = useRef(0);
  const mountedRef   = useRef(true);

  // ── Chargement ───────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(150);
    if (mountedRef.current) {
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    }
  }, [profile]);

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
          setNotifications(prev => [payload.new as Notification, ...prev]);
          window.dispatchEvent(new Event('new-notification'));
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          if (!mountedRef.current) return;
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } as Notification : n));
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
          fetchNotifications();
        }
      });

    channelRef.current = channel;
  }, [profile, fetchNotifications]);

  useEffect(() => {
    mountedRef.current = true;
    if (!profile) { router.push('/connexion'); return; }
    fetchNotifications();
    connectRealtime();
    // Quand on arrive sur la page notifications → forcer recalcul du badge immédiatement
    window.dispatchEvent(new Event('new-notification'));
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
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
  }, [profile, router, fetchNotifications, connectRealtime]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    // Optimistic update immédiat
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    // Écriture BDD puis signal (après await → is_read visible en BDD)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    toast.success('Toutes les notifications marquées comme lues');
    window.dispatchEvent(new Event('new-notification'));
  };

  const markOneRead = useCallback(async (notif: Notification) => {
    if (notif.is_read) return;
    const supabase = createClient();
    // 1. Optimistic update local immédiat — point rouge disparaît tout de suite
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    // 2. Écriture BDD (await) puis signal — fetchCounts lira is_read=true en BDD
    await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id); // read_at n'existe pas en DB
    window.dispatchEvent(new Event('new-notification'));
  }, []);

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    // Optimistic local d'abord
    setNotifications(prev => prev.filter(n => n.id !== id));
    await new Promise(r => setTimeout(r, 250));
    const supabase = createClient();
    await supabase.from('notifications').delete().eq('id', id);
    setDeletingId(null);
    // Signal après écriture BDD
    window.dispatchEvent(new Event('new-notification'));
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = notifications.filter(n => {
    if (activeTab === 'unread' && n.is_read) return false;
    if (activeTab !== 'all' && activeTab !== 'unread') {
      const cfg = getConfig(n.type);
      if (cfg.tab !== activeTab) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(q) ||
        (n as unknown as { body?: string }).body?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount  = notifications.filter(n => !n.is_read).length;
  const tabCounts: Record<TabId, number> = {
    all:       notifications.length,
    unread:    unreadCount,
    messages:  notifications.filter(n => getConfig(n.type).tab === 'messages').length,
    activity:  notifications.filter(n => getConfig(n.type).tab === 'activity').length,
    system:    notifications.filter(n => getConfig(n.type).tab === 'system').length,
    reminders: notifications.filter(n => getConfig(n.type).tab === 'reminders').length,
  };
  const tabUnread: Record<TabId, number> = {
    all:       unreadCount,
    unread:    unreadCount,
    messages:  notifications.filter(n => !n.is_read && getConfig(n.type).tab === 'messages').length,
    activity:  notifications.filter(n => !n.is_read && getConfig(n.type).tab === 'activity').length,
    system:    notifications.filter(n => !n.is_read && getConfig(n.type).tab === 'system').length,
    reminders: notifications.filter(n => !n.is_read && getConfig(n.type).tab === 'reminders').length,
  };

  const groups = groupByDate(filtered);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
              unreadCount > 0 ? 'bg-brand-50' : 'bg-gray-100'
            )}>
              {unreadCount > 0
                ? <Bell className="w-5 h-5 text-brand-600" />
                : <BellOff className="w-5 h-5 text-gray-400" />
              }
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow border-2 border-white animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0
                ? <span className="text-red-500 font-semibold">{unreadCount} non lue{unreadCount > 1 ? 's' : ''} — votre attention est requise</span>
                : <span className="text-emerald-600 font-semibold">✓ Tout est à jour</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 text-sm font-semibold transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
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
          className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const unread   = tabUnread[tab.id];
          const TabIcon  = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0',
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
      ) : filtered.length === 0 ? (
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
                        'transition-all duration-300',
                        isDeleting && 'opacity-0 scale-y-0 max-h-0 overflow-hidden pointer-events-none'
                      )}
                    >
                      <Link
                        href={notif.link || '#'}
                        onClick={() => markOneRead(notif)}
                        className={cn(
                          'group flex items-start gap-3 rounded-2xl border p-4 transition-all duration-200',
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
                          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bas de page */}
          <p className="text-center text-xs text-gray-400 py-2">
            {filtered.length} notification{filtered.length > 1 ? 's' : ''} · Affichage des 150 dernières
          </p>
        </div>
      )}
    </div>
  );
}
