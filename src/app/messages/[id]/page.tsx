'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, ChevronLeft, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Message, Profile } from '@/types';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { cn, formatRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<(Message & { sender?: Profile })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [subject, setSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }

    const fetchConversation = async () => {
      const supabase = createClient();

      // Vérifier accès
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', id as string);

      if (!participants?.find(p => p.user_id === profile.id)) {
        toast.error('Accès refusé');
        router.push('/messages');
        return;
      }

      // Récupérer le profil de l'autre participant
      const otherParticipant = participants.find(p => p.user_id !== profile.id);
      if (otherParticipant) {
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', otherParticipant.user_id)
          .single();
        setOtherUser((otherProfile as unknown as Profile) || null);
      }

      // Sujet
      const { data: conv } = await supabase
        .from('conversations')
        .select('subject')
        .eq('id', id as string)
        .single();
      setSubject(conv?.subject || 'Conversation');

      // Messages (sans JOIN cassé — on récupère les profils séparément)
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id as string)
        .order('created_at', { ascending: true });

      // Enrichir avec les profils des expéditeurs
      const enriched: (Message & { sender?: Profile })[] = [];
      const profileCache: Record<string, Profile> = {};
      for (const msg of msgs || []) {
        if (msg.sender_id && !profileCache[msg.sender_id]) {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();
          if (senderProfile) profileCache[msg.sender_id] = senderProfile as Profile;
        }
        enriched.push({ ...msg, sender: profileCache[msg.sender_id] });
      }
      setMessages(enriched);
      setLoading(false);

      // Marquer comme lu
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', id as string)
        .eq('user_id', profile.id);
    };

    fetchConversation();

    // Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, async (payload) => {
        const { data: newMsg } = await supabase
          .from('messages')
          .select('*')
          .eq('id', payload.new.id)
          .single();
        if (newMsg) {
          // Fetch sender profile
          let senderProfile: Profile | undefined;
          if (newMsg.sender_id) {
            const { data: sp } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single();
            senderProfile = sp as Profile | undefined;
          }
          setMessages(prev => [...prev, { ...newMsg, sender: senderProfile } as Message & { sender?: Profile }]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, profile, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile || sending) return;
    setSending(true);
    const supabase = createClient();

    const { error } = await supabase.from('messages').insert({
      conversation_id: id as string,
      sender_id: profile.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error('Erreur d\'envoi');
    } else {
      setNewMessage('');
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
        <Link href="/messages" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <Avatar
          src={otherUser?.avatar_url}
          name={otherUser?.full_name || '?'}
          size="md"
        />
        <div>
          <div className="font-semibold text-gray-900">{otherUser?.full_name || 'Inconnu'}</div>
          <div className="text-xs text-gray-500 truncate max-w-[200px]">{subject}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-sm">Chargement des messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-gray-500 text-sm">Démarrez la conversation !</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === profile?.id;
            const showAvatar = !isMe && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);

            return (
              <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                {!isMe && (
                  <div className={cn('flex-shrink-0', showAvatar ? 'opacity-100' : 'opacity-0')}>
                    <Avatar
                      src={msg.sender?.avatar_url}
                      name={msg.sender?.full_name || '?'}
                      size="sm"
                    />
                  </div>
                )}
                <div className={cn('max-w-[70%]', isMe && 'items-end flex flex-col')}>
                  <div className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm',
                    isMe
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  )}>
                    {msg.content}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 px-1">
                    {formatRelative(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
