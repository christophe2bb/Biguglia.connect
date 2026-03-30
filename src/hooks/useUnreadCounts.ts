'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';

interface UnreadCounts {
  messages: number;
  notifications: number;
  total: number;
}

export function useUnreadCounts(): UnreadCounts {
  const { profile } = useAuthStore();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0, total: 0 });
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!profile?.id) {
      setCounts({ messages: 0, notifications: 0, total: 0 });
      return;
    }

    const supabase = createClient();

    const fetchCounts = async () => {
      // Messages non lus : conversations où last_read_at < dernier message
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', profile.id);

      let unreadMessages = 0;
      if (myConvs && myConvs.length > 0) {
        for (const conv of myConvs) {
          const query = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .neq('sender_id', profile.id); // Pas mes propres messages

          if (conv.last_read_at) {
            query.gt('created_at', conv.last_read_at);
          }

          const { count } = await query;
          unreadMessages += count || 0;
        }
      }

      // Notifications non lues
      const { count: unreadNotifs } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      const messages = unreadMessages;
      const notifications = unreadNotifs || 0;
      setCounts({ messages, notifications, total: messages + notifications });
    };

    fetchCounts();

    // Écouter les nouveaux messages en temps réel
    const channel = supabase
      .channel(`unread-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        // Nouveau message pas de moi → incrémenter
        if (payload.new.sender_id !== profile.id) {
          setCounts(prev => ({
            ...prev,
            messages: prev.messages + 1,
            total: prev.total + 1,
          }));
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        setCounts(prev => ({
          ...prev,
          notifications: prev.notifications + 1,
          total: prev.total + 1,
        }));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        // Re-fetch quand une notification est marquée lue
        fetchCounts();
      })
      .subscribe();

    channelRef.current = channel;

    // Re-fetch quand on revient sur la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchCounts();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile?.id]);

  // Réinitialiser les messages non lus quand on visite /messages
  const resetMessages = () => {
    setCounts(prev => ({ ...prev, messages: 0, total: prev.notifications }));
  };

  // Exposer resetMessages via un événement custom
  useEffect(() => {
    const handler = () => resetMessages();
    window.addEventListener('messages-read', handler);
    return () => window.removeEventListener('messages-read', handler);
  });

  return counts;
}
