'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Search, RefreshCw, ShoppingBag, HandHeart, Dog, Users, MapPin, Wrench } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Conversation, Profile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';

// Icônes par type de contenu lié
const RELATED_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  listing:         { icon: ShoppingBag, color: 'text-blue-500',    label: 'Annonce' },
  equipment:       { icon: Wrench,      color: 'text-teal-500',    label: 'Matériel' },
  help_request:    { icon: HandHeart,   color: 'text-orange-500',  label: 'Coup de main' },
  lost_found:      { icon: Dog,         color: 'text-amber-500',   label: 'Perdu/Trouvé' },
  association:     { icon: Users,       color: 'text-purple-500',  label: 'Association' },
  outing:          { icon: MapPin,      color: 'text-emerald-500', label: 'Sortie' },
  collection_item: { icon: ShoppingBag, color: 'text-rose-500',    label: 'Collectionneur' },
  service_request: { icon: Wrench,      color: 'text-brand-500',   label: 'Artisan' },
};
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ConvWithOther extends Conversation {
  other_user?: Profile;
  last_message_text?: string;
  last_message_at?: string;
  unread_count?: number;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

export default function MessagesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConvWithOther[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const channelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx    = useRef(0);
  const mountedRef      = useRef(true);

  // ── Chargement des conversations ──────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (!profile) return;

    // Mes participations avec last_read_at
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversation:conversations(
          id, subject, related_type, related_id, updated_at,
          participants:conversation_participants(
            user_id,
            profile:profiles(id, full_name, avatar_url)
          )
        )
      `)
      .eq('user_id', profile.id)
      .order('conversation(updated_at)', { ascending: false });

    if (!participations) { setLoading(false); return; }

    // Enrichir chaque conversation en parallèle
    const convs = await Promise.all(
      participations.map(async (p) => {
        const conv = p.conversation as unknown as Conversation & {
          participants?: Array<{ user_id: string; profile?: Profile }>;
        };
        if (!conv) return null;

        const other = conv.participants?.find(pp => pp.user_id !== profile.id)?.profile;

        // Dernier message + compteur non-lus en parallèle
        const since = p.last_read_at || '1970-01-01T00:00:00Z';
        const [lastMsgRes, unreadRes] = await Promise.all([
          supabase
            .from('messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', profile.id)
            .gt('created_at', since),
        ]);

        return {
          ...conv,
          other_user: other,
          last_message_text: lastMsgRes.data?.content,
          last_message_at: lastMsgRes.data?.created_at,
          unread_count: unreadRes.count || 0,
          related_type: (conv as ConvWithOther & { related_type?: string }).related_type ?? null,
          related_id: (conv as ConvWithOther & { related_id?: string }).related_id ?? null,
        } as ConvWithOther;
      })
    );

    // Filtrer les nulls et trier par date du dernier message
    const valid = convs.filter(Boolean) as ConvWithOther[];
    valid.sort((a, b) => {
      const aDate = a.last_message_at || a.updated_at || '';
      const bDate = b.last_message_at || b.updated_at || '';
      return bDate.localeCompare(aDate);
    });

    setConversations(valid);
    setLoading(false);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connexion Realtime avec reconnexion auto ──────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profile) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages-list-${profile.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        if (!mountedRef.current) return;
        const msg = payload.new as { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };

        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === msg.conversation_id);
          if (idx === -1) {
            // Conversation inconnue → refetch complet
            fetchConversations();
            return prev;
          }

          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.last_message_text = msg.content;
          conv.last_message_at = msg.created_at;

          if (msg.sender_id !== profile.id) {
            conv.unread_count = (conv.unread_count || 0) + 1;
          }

          updated.splice(idx, 1);
          updated.unshift(conv);
          return updated;
        });
      })
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
        }
      });

    channelRef.current = channel;
  }, [profile, fetchConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    if (!profile) { router.push('/connexion'); return; }
    fetchConversations();
    connectRealtime();

    const handleVis = () => {
      if (document.visibilityState === 'visible') fetchConversations();
    };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [profile, router, fetchConversations, connectRealtime]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = conversations.filter(c =>
    !search ||
    c.other_user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-brand-500" /> Messages
            {totalUnread > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Vos conversations privées</p>
        </div>
        <button
          onClick={fetchConversations}
          title="Actualiser"
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <Input
        placeholder="Rechercher une conversation..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
        className="mb-6"
      />

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="💬"
          title="Aucune conversation"
          description="Vos échanges avec les artisans et habitants apparaîtront ici."
          action={{ label: 'Trouver un artisan', onClick: () => router.push('/artisans') }}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(conv => {
            const hasUnread = (conv.unread_count || 0) > 0;
            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-4 hover:shadow-sm transition-all duration-200',
                  hasUnread
                    ? 'bg-brand-50/40 border-brand-200 hover:border-brand-300'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                )}
              >
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={conv.other_user?.avatar_url}
                    name={conv.other_user?.full_name || conv.subject || '?'}
                    size="md"
                  />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                  {/* Badge contexte (annonce, coup de main…) — coin bas droite si pas de badge non-lu */}
                  {!hasUnread && conv.related_type && RELATED_ICONS[conv.related_type] && (() => {
                    const ri = RELATED_ICONS[conv.related_type!];
                    const RIcon = ri.icon;
                    return (
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                        <RIcon className={cn('w-3 h-3', ri.color)} />
                      </span>
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'truncate',
                      hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'
                    )}>
                      {conv.other_user?.full_name || conv.subject || 'Conversation'}
                    </span>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {conv.last_message_at && (
                        <span className="text-xs text-gray-400">
                          {formatRelative(conv.last_message_at)}
                        </span>
                      )}
                      {hasUnread && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                          {conv.unread_count! > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={cn(
                    'text-sm truncate mt-0.5',
                    hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'
                  )}>
                    {conv.last_message_text || 'Aucun message pour l\'instant'}
                  </p>
                  {/* Label contexte */}
                  {conv.related_type && RELATED_ICONS[conv.related_type] && (
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs mt-1',
                      RELATED_ICONS[conv.related_type].color, 'opacity-70'
                    )}>
                      {React.createElement(RELATED_ICONS[conv.related_type].icon, { className: 'w-3 h-3' })}
                      {RELATED_ICONS[conv.related_type].label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
