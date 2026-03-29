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

      // Mes conversations
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select(`
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
        const conv = p.conversation as unknown as Conversation & { participants?: Array<{ user_id: string; profile?: Profile }> };
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

        convs.push({
          ...conv,
          other_user: other,
          last_message_text: lastMsg?.content,
          last_message_at: lastMsg?.created_at,
        });
      }

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
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
          {filtered.map(conv => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm hover:border-gray-200 transition-all duration-200"
            >
              <Avatar
                src={conv.other_user?.avatar_url}
                name={conv.other_user?.full_name || conv.subject || '?'}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 truncate">
                    {conv.other_user?.full_name || conv.subject || 'Conversation'}
                  </span>
                  {conv.last_message_at && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatRelative(conv.last_message_at)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {conv.last_message_text || 'Aucun message pour l\'instant'}
                </p>
              </div>
              <div className="text-gray-300 flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
