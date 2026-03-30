'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, MessageSquare, Info, AlertCircle, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Notification } from '@/types';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { formatRelative, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function NotifIcon({ type }: { type: string }) {
  if (type === 'message') return <MessageSquare className="w-4 h-4 text-blue-500" />;
  if (type === 'review') return <Star className="w-4 h-4 text-yellow-500" />;
  if (type === 'alert') return <AlertCircle className="w-4 h-4 text-red-500" />;
  return <Info className="w-4 h-4 text-brand-500" />;
}

export default function NotificationsPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    fetchNotifications();

    // Realtime: nouvelles notifications
    const supabase = createClient();
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload) => {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } as Notification : n));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, router, fetchNotifications]);

  const markAllRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('Toutes les notifications marquées comme lues');
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read) {
      const supabase = createClient();
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-500" /> Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-brand-600 font-medium mt-0.5">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" /> Tout marquer lu
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="Aucune notification" description="Vos notifications apparaîtront ici." />
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <Link
              key={notif.id}
              href={notif.link || '#'}
              onClick={() => handleNotifClick(notif)}
            >
              <div className={cn(
                'group bg-white rounded-2xl border p-4 hover:shadow-sm transition-all flex items-start gap-3',
                notif.is_read ? 'border-gray-100' : 'border-brand-200 bg-brand-50/30'
              )}>
                {/* Icône type */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  notif.is_read ? 'bg-gray-100' : 'bg-brand-100'
                )}>
                  <NotifIcon type={notif.type || 'info'} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn('text-sm', notif.is_read ? 'text-gray-700' : 'font-semibold text-gray-900')}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-sm text-gray-500 truncate">{notif.body}</p>
                      )}
                      {/* Fallback pour ancien champ 'message' */}
                      {!notif.body && (notif as unknown as { message?: string }).message && (
                        <p className="text-sm text-gray-500 truncate">{(notif as unknown as { message?: string }).message}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{formatRelative(notif.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-brand-500 rounded-full" />
                      )}
                      <button
                        onClick={(e) => deleteNotif(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs px-1"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
