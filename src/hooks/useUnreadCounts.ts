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
  // Garde en mémoire les conversation_ids de l'utilisateur
  const myConvIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!profile?.id) {
      setCounts({ messages: 0, notifications: 0, total: 0 });
      return;
    }

    const supabase = createClient();

    // ── Calcul des non-lus ──────────────────────────────────────────────────
    const fetchCounts = async () => {
      // 1. Récupérer toutes mes participations avec last_read_at
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', profile.id);

      myConvIdsRef.current = (myConvs ?? []).map(c => c.conversation_id);

      // 2. Compter les messages non lus dans chaque conversation
      let unreadMessages = 0;
      if (myConvs && myConvs.length > 0) {
        await Promise.all(
          myConvs.map(async (conv) => {
            // Build query complet avec le filtre de date inclus dès le départ
            const since = conv.last_read_at || '1970-01-01T00:00:00Z';
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.conversation_id)
              .neq('sender_id', profile.id)
              .gt('created_at', since);
            unreadMessages += count || 0;
          })
        );
      }

      // 3. Notifications non lues
      const { count: unreadNotifs } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      setCounts({
        messages: unreadMessages,
        notifications: unreadNotifs || 0,
        total: unreadMessages + (unreadNotifs || 0),
      });
    };

    fetchCounts();

    // ── Realtime ────────────────────────────────────────────────────────────
    // On supprime l'ancien canal si re-mount
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`unread-counts-${profile.id}`, {
        config: { broadcast: { ack: false }, presence: { key: '' } },
      })
      // Nouveau message dans n'importe quelle conversation
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as { sender_id: string; conversation_id: string };
        // Ignorer mes propres messages
        if (msg.sender_id === profile.id) return;
        // Vérifier que c'est une de mes conversations
        if (!myConvIdsRef.current.includes(msg.conversation_id)) return;
        setCounts(prev => ({
          ...prev,
          messages: prev.messages + 1,
          total: prev.total + 1,
        }));
      })
      // Nouvelle notification pour moi
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
      // Notification marquée lue → recalcul
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        fetchCounts();
      })
      // conversation_participants mis à jour (last_read_at) → recalcul
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${profile.id}`,
      }, () => {
        fetchCounts();
      })
      .subscribe();

    channelRef.current = channel;

    // Recalcul quand on revient sur l'onglet
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCounts();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Recalcul quand on visite /messages
    const handleMessagesRead = () => {
      setCounts(prev => ({ ...prev, messages: 0, total: prev.notifications }));
    };
    window.addEventListener('messages-read', handleMessagesRead);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('messages-read', handleMessagesRead);
    };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return counts;
}
