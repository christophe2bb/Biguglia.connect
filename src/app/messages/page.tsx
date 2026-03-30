'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Conversation, Profile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ConvWithOther extends Conversation {
  other_user?: Profile;
  last_message_text?: string;
  last_message_at?: string;
  unread_count?: number;
}

export default function MessagesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConvWithOther[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }

    const fetchConversations = async () => {
      const supabase = createClient();

      // Mes participations avec last_read_at
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversation:conversations(
            id, subject, related_type, updated_at,
            participants:conversation_participants(
              user_id,
              profile:profiles(id, full_name, avatar_url)
            )
          )
        `)
        .eq('user_id', profile.id)
        .order('conversation(updated_at)', { ascending: false });

      if (!participations) { setLoading(false); return; }

      const convs: ConvWithOther[] = [];
      for (const p of participations) {
        const conv = p.conversation as unknown as Conversation & {
          participants?: Array<{ user_id: string; profile?: Profile }>;
        };
        if (!conv) continue;

        const other = conv.participants?.find(pp => pp.user_id !== profile.id)?.profile;

        // Dernier message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Compter les messages non lus
        let unreadCount = 0;
        const lastRead = p.last_read_at;
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', profile.id)
          .gt('created_at', lastRead || '1970-01-01');
        unreadCount = count || 0;

        convs.push({
          ...conv,
          other_user: other,
          last_message_text: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
          unread_count: unreadCount,
        });
      }

      // Trier par date du dernier message
      convs.sort((a, b) => {
        const aDate = a.last_message_at || a.updated_at || '';
        const bDate = b.last_message_at || b.updated_at || '';
        return bDate.localeCompare(aDate);
      });

      setConversations(convs);
      setLoading(false);
    };

    fetchConversations();
  }, [profile, router]);

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
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                  )}
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
                    'text-sm truncate',
                    hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'
                  )}>
                    {conv.last_message_text || 'Aucun message pour l\'instant'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
