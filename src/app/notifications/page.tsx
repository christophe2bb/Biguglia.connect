'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, CheckCheck, MessageSquare, Info, AlertCircle, Star,
  Heart, Calendar, MapPin, Package, ShoppingBag, Wrench,
  Handshake, Gem, Search, Trash2, RefreshCw, BellOff,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Notification } from '@/types';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Config par type de notification ─────────────────────────────────────────
const NOTIF_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  message:      { icon: MessageSquare, color: 'text-blue-600',    bg: 'bg-blue-100',    border: 'border-blue-200',    label: 'Message' },
  review:       { icon: Star,          color: 'text-yellow-600',  bg: 'bg-yellow-100',  border: 'border-yellow-200',  label: 'Avis' },
  alert:        { icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-100',     border: 'border-red-200',     label: 'Alerte' },
  event:        { icon: Calendar,      color: 'text-purple-600',  bg: 'bg-purple-100',  border: 'border-purple-200',  label: 'Événement' },
  help:         { icon: Heart,         color: 'text-orange-600',  bg: 'bg-orange-100',  border: 'border-orange-200',  label: 'Coup de main' },
  listing:      { icon: ShoppingBag,   color: 'text-teal-600',    bg: 'bg-teal-100',    border: 'border-teal-200',    label: 'Annonce' },
  equipment:    { icon: Package,       color: 'text-teal-600',    bg: 'bg-teal-100',    border: 'border-teal-200',    label: 'Matériel' },
  lost_found:   { icon: Search,        color: 'text-amber-600',   bg: 'bg-amber-100',   border: 'border-amber-200',   label: 'Perdu/Trouvé' },
  outing:       { icon: MapPin,        color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200', label: 'Promenade' },
  association:  { icon: Handshake,     color: 'text-violet-600',  bg: 'bg-violet-100',  border: 'border-violet-200',  label: 'Association' },
  collection:   { icon: Gem,           color: 'text-rose-600',    bg: 'bg-rose-100',    border: 'border-rose-200',    label: 'Collectionneur' },
  artisan:      { icon: Wrench,        color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-200',    label: 'Artisan' },
  moderation:   { icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-100',     border: 'border-red-200',     label: 'Modération' },
  info:         { icon: Info,          color: 'text-brand-600',   bg: 'bg-brand-100',   border: 'border-brand-200',   label: 'Info' },
};

function getConfig(type?: string) {
  if (!type) return NOTIF_CONFIG.info;
  return NOTIF_CONFIG[type] ?? NOTIF_CONFIG.info;
}

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
    if (d.toDateString() === todayStr) groups["Aujourd'hui"].push(n);
    else if (d.toDateString() === yesterdayStr) groups['Hier'].push(n);
    else if (d >= weekAgo) groups['Cette semaine'].push(n);
    else groups['Plus ancien'].push(n);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

export default function NotificationsPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const channelRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx = useRef(0);
  const mountedRef   = useRef(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (mountedRef.current) {
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    }
  }, [profile]);

  const connectRealtime = useCallback(() => {
    if (!profile) return;
    const supabase = createClient();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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
          reconnectRef.current = setTimeout(() => {
            if (mountedRef.current) connectRealtime();
          }, delay);
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

    const handleVis = () => {
      if (document.visibilityState === 'visible') fetchNotifications();
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

  const markAllRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('Toutes les notifications marquées comme lues');
    window.dispatchEvent(new Event('new-notification'));
  };

  const markOneRead = useCallback(async (notif: Notification) => {
    if (notif.is_read) return;
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    // Optimistic update immédiat — le point rouge disparaît tout de suite
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    window.dispatchEvent(new Event('new-notification'));
  }, []);

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    // Animation sortie
    await new Promise(r => setTimeout(r, 250));
    const supabase = createClient();
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setDeletingId(null);
    window.dispatchEvent(new Event('new-notification'));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const groups = groupByDate(displayed);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center transition-colors',
              unreadCount > 0 ? 'bg-brand-100' : 'bg-gray-100'
            )}>
              {unreadCount > 0
                ? <Bell className="w-5 h-5 text-brand-600" />
                : <BellOff className="w-5 h-5 text-gray-400" />
              }
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm border-2 border-white animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {unreadCount > 0
                ? <span className="text-red-600 font-semibold">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
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

      {/* ── Filtre lues/non lues ── */}
      <div className="flex items-center gap-2 mb-5 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-1.5 rounded-xl text-sm font-semibold transition-all',
            filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Toutes
          {notifications.length > 0 && (
            <span className="ml-1.5 text-xs text-gray-400">({notifications.length})</span>
          )}
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-4 py-1.5 rounded-xl text-sm font-semibold transition-all',
            filter === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Non lues
          {unreadCount > 0 && (
            <span className="ml-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Contenu ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon="🔔"
          title={filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          description={filter === 'unread' ? 'Vous êtes à jour !' : 'Vos notifications apparaîtront ici.'}
        />
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              {/* Label du groupe */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{label}</p>

              <div className="space-y-1.5">
                {items.map(notif => {
                  const cfg = getConfig(notif.type);
                  const Icon = cfg.icon;
                  const notifBody = notif.body || (notif as unknown as { message?: string }).message || '';
                  const isDeleting = deletingId === notif.id;

                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'transition-all duration-300',
                        isDeleting && 'opacity-0 scale-95 pointer-events-none'
                      )}
                    >
                      <Link
                        href={notif.link || '#'}
                        onClick={() => markOneRead(notif)}
                        className={cn(
                          'group flex items-start gap-3 rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm hover:-translate-y-px relative overflow-hidden',
                          notif.is_read
                            ? 'bg-white border-gray-100 hover:border-gray-200'
                            : `bg-white border-l-4 ${cfg.border} shadow-sm`
                        )}
                      >
                        {/* Point rouge non-lu — dans le coin supérieur droit */}
                        {!notif.is_read && (
                          <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white shadow-sm flex-shrink-0" />
                        )}

                        {/* Icône type */}
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110',
                          notif.is_read ? 'bg-gray-100' : cfg.bg
                        )}>
                          <Icon className={cn('w-5 h-5', notif.is_read ? 'text-gray-400' : cfg.color)} />
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0 pr-5">
                          {/* Badge type */}
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md',
                              notif.is_read ? 'text-gray-400 bg-gray-100' : `${cfg.color} ${cfg.bg}`
                            )}>
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">{formatRelative(notif.created_at)}</span>
                          </div>

                          <p className={cn(
                            'text-sm leading-snug',
                            notif.is_read ? 'text-gray-600' : 'font-semibold text-gray-900'
                          )}>
                            {notif.title}
                          </p>
                          {notifBody && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notifBody}</p>
                          )}
                        </div>

                        {/* Bouton supprimer */}
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
        </div>
      )}
    </div>
  );
}
