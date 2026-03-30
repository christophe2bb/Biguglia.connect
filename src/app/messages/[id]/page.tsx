'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, ChevronLeft } from 'lucide-react';
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
  const profileCacheRef = useRef<Record<string, Profile>>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Charger le profil d'un expéditeur (avec cache)
  const getSenderProfile = useCallback(async (senderId: string): Promise<Profile | undefined> => {
    if (profileCacheRef.current[senderId]) return profileCacheRef.current[senderId];
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', senderId)
      .single();
    if (data) {
      profileCacheRef.current[senderId] = data as Profile;
      return data as Profile;
    }
  }, []);

  useEffect(() => {
    if (!profile) { router.push('/connexion'); return; }

    const supabase = createClient();

    const fetchConversation = async () => {
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

      // Profil de l'autre participant
      const otherParticipant = participants.find(p => p.user_id !== profile.id);
      if (otherParticipant) {
        const otherProfile = await getSenderProfile(otherParticipant.user_id);
        setOtherUser(otherProfile || null);
      }

      // Sujet de la conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('subject')
        .eq('id', id as string)
        .single();
      setSubject(conv?.subject || 'Conversation');

      // Charger les messages
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id as string)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Messages fetch error:', error);
      }

      // Enrichir avec les profils
      const enriched: (Message & { sender?: Profile })[] = [];
      for (const msg of msgs || []) {
        const sender = msg.sender_id ? await getSenderProfile(msg.sender_id) : undefined;
        enriched.push({ ...msg, sender });
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

    // Realtime : écoute les nouveaux messages
    const channel = supabase
      .channel(`conv-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        // Éviter les doublons (le message qu'on vient d'envoyer est déjà ajouté localement)
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        // Charger le profil de l'expéditeur en arrière-plan
        if (newMsg.sender_id) {
          getSenderProfile(newMsg.sender_id).then(sender => {
            setMessages(prev =>
              prev.map(m => m.id === newMsg.id ? { ...m, sender } : m)
            );
          });
        }
      })
      .subscribe((status) => {
        console.log('Realtime status:', status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [id, profile, router, getSenderProfile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile || sending) return;
    const content = newMessage.trim();
    setSending(true);
    setNewMessage(''); // Vider le champ immédiatement

    const supabase = createClient();

    // Ajouter le message localement tout de suite (optimistic UI)
    const tempMsg: Message & { sender?: Profile } = {
      id: `temp-${Date.now()}`,
      conversation_id: id as string,
      sender_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      sender: profile as unknown as Profile,
    };
    setMessages(prev => [...prev, tempMsg]);

    const { data: savedMsg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id as string,
        sender_id: profile.id,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Send error:', error);
      toast.error('Erreur lors de l\'envoi');
      // Retirer le message temporaire
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setNewMessage(content); // Restaurer le texte
    } else if (savedMsg) {
      // Remplacer le message temporaire par le vrai
      setMessages(prev =>
        prev.map(m => m.id === tempMsg.id
          ? { ...savedMsg, sender: profile as unknown as Profile }
          : m
        )
      );
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
            <div className="animate-pulse space-y-3 w-full px-4">
              <div className="h-10 bg-gray-100 rounded-2xl w-2/3" />
              <div className="h-10 bg-gray-100 rounded-2xl w-1/2 ml-auto" />
              <div className="h-10 bg-gray-100 rounded-2xl w-3/4" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-gray-500 text-sm">Démarrez la conversation !</p>
            <p className="text-gray-400 text-xs mt-1">Écrivez votre premier message ci-dessous</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === profile?.id;
            const showAvatar = !isMe && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
            const isTemp = msg.id.startsWith('temp-');

            return (
              <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                {!isMe && (
                  <div className={cn('flex-shrink-0 w-8', !showAvatar && 'invisible')}>
                    <Avatar
                      src={msg.sender?.avatar_url}
                      name={msg.sender?.full_name || '?'}
                      size="sm"
                    />
                  </div>
                )}
                <div className={cn('max-w-[70%]', isMe && 'items-end flex flex-col')}>
                  <div className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm transition-opacity',
                    isMe
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm',
                    isTemp && 'opacity-60'
                  )}>
                    {msg.content}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 px-1 flex items-center gap-1">
                    {formatRelative(msg.created_at)}
                    {isTemp && <span className="text-gray-300">· envoi...</span>}
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
            disabled={sending}
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
