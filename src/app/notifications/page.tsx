'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Notification } from '@/types';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { formatRelative, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    };
    fetch();
  }, [profile, router]);

  const markAllRead = async () => {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('Toutes les notifications marquées comme lues');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" /> Tout marquer lu
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="Aucune notification" description="Vos notifications apparaîtront ici." />
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <Link key={notif.id} href={notif.link || '#'}>
              <div className={cn(
                'bg-white rounded-2xl border p-4 hover:shadow-sm transition-all',
                notif.is_read ? 'border-gray-100' : 'border-brand-200 bg-brand-50/30'
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', notif.is_read ? 'bg-gray-300' : 'bg-brand-500')} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                    <p className="text-sm text-gray-500">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelative(notif.created_at)}</p>
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
