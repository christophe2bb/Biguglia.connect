'use client';

/**
 * /admin/messages/[id] — Vue complète d'une conversation (mode lecture admin)
 * L'admin voit tous les messages avec les expéditeurs identifiés.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, MessageSquare, RefreshCw, ShoppingBag,
  HandHeart, Package, MapPin, Users, Clock, ExternalLink,
} from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  role?: string | null;
}

interface Participant {
  user_id: string;
  last_read_at?: string | null;
  joined_at?: string | null;
  profile?: Profile | null;
}

interface Conversation {
  id: string;
  subject?: string | null;
  related_type?: string | null;
  related_id?: string | null;
  created_at: string;
  updated_at: string;
  participants: Participant[];
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url?: string | null;
  created_at: string;
  sender?: Profile | null;
}

// ── Config types ──────────────────────────────────────────────────────────────

const RELATED_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  listing:         { label: 'Annonce',        Icon: ShoppingBag,   color: 'text-purple-600', bg: 'bg-purple-50' },
  service_request: { label: 'Demande',        Icon: HandHeart,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
  equipment:       { label: 'Matériel',       Icon: Package,       color: 'text-teal-600',   bg: 'bg-teal-50'   },
  lost_found:      { label: 'Perdu/Trouvé',  Icon: MapPin,        color: 'text-orange-600', bg: 'bg-orange-50' },
  general:         { label: 'Général',        Icon: MessageSquare, color: 'text-gray-600',   bg: 'bg-gray-100'  },
};

function getRelatedCfg(type?: string | null) {
  if (!type) return RELATED_CONFIG.general;
  return RELATED_CONFIG[type] ?? RELATED_CONFIG.general;
}

function isSystemMsg(content: string): boolean {
  return content.startsWith('[SYSTEM]') || content.startsWith('__system__');
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ profile, size = 8 }: { profile?: Profile | null; size?: number }) {
  if (profile?.avatar_url) {
    const px = size * 4;
    return (
      <Image
        src={profile.avatar_url}
        alt={profile.full_name ?? 'avatar'}
        width={px}
        height={px}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
        unoptimized
      />
    );
  }
  const initials = (profile?.full_name ?? profile?.email ?? '?').charAt(0).toUpperCase();
  return (
    <div className={`w-${size} h-${size} rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Bulle de message ──────────────────────────────────────────────────────────

function MessageBubble({ msg, participants }: { msg: Message; participants: Participant[] }) {
  if (isSystemMsg(msg.content)) {
    const text = msg.content.replace(/^\[SYSTEM\]\s*|^__system__\s*/i, '');
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{text}</span>
      </div>
    );
  }

  // Identifier le participant pour savoir de quel côté afficher
  const participantIndex = participants.findIndex(p => p.user_id === msg.sender_id);
  const isLeft = participantIndex !== 1; // premier participant = gauche, second = droite

  const senderProfile = msg.sender ?? participants.find(p => p.user_id === msg.sender_id)?.profile;
  const senderName = senderProfile?.full_name ?? senderProfile?.email ?? msg.sender_id.slice(0, 8) + '…';
  const timeStr = format(new Date(msg.created_at), 'HH:mm', { locale: fr });
  const dateStr = format(new Date(msg.created_at), 'dd MMM yyyy', { locale: fr });

  return (
    <div className={`flex gap-2 mb-3 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      <Avatar profile={senderProfile} size={8} />
      <div className={`max-w-[70%] ${isLeft ? '' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isLeft ? '' : 'flex-row-reverse'}`}>
          <span className="text-xs font-semibold text-gray-700">{senderName}</span>
          {senderProfile?.role && senderProfile.role !== 'resident' && (
            <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
              {senderProfile.role === 'admin' ? 'Admin' : senderProfile.role === 'artisan_verified' ? 'Artisan' : senderProfile.role}
            </span>
          )}
        </div>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isLeft
              ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
              : 'bg-brand-600 text-white rounded-tr-sm'
          }`}
        >
          {msg.content}
          {msg.attachment_url && (
            <a
              href={msg.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 mt-2 text-xs underline ${isLeft ? 'text-brand-600' : 'text-white/80'}`}
            >
              <ExternalLink className="w-3 h-3" /> Pièce jointe
            </a>
          )}
        </div>
        <p className={`text-[10px] text-gray-400 mt-1 ${isLeft ? '' : 'text-right'}`} title={dateStr}>
          {timeStr}
        </p>
      </div>
    </div>
  );
}

// ── Séparateur date ────────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
        {format(new Date(date), 'EEEE d MMMM yyyy', { locale: fr })}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function MsgSkeleton({ right = false }: { right?: boolean }) {
  return (
    <div className={`flex gap-2 mb-3 ${right ? 'flex-row-reverse' : ''} animate-pulse`}>
      <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
      <div className={`space-y-1 ${right ? 'items-end flex flex-col' : ''}`}>
        <div className="h-2.5 bg-gray-200 rounded w-20" />
        <div className={`h-10 bg-gray-100 rounded-2xl ${right ? 'w-48' : 'w-56'}`} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminConversationPage() {
  const { id } = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await adminFetch(`/api/admin/messages/${id}`);
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Erreur chargement'); return; }
      setConversation(body.conversation);
      setMessages(body.messages ?? []);
    } catch (e) {
      setError('Erreur réseau');
      console.error('[admin/messages/id]', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Scroll vers le bas au chargement
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loading, messages.length]);

  const cfg = getRelatedCfg(conversation?.related_type);
  const CfgIcon = cfg.Icon;

  // Grouper les messages par jour
  const groupedByDay: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const day = msg.created_at.slice(0, 10);
    const last = groupedByDay[groupedByDay.length - 1];
    if (last && last.date === day) {
      last.msgs.push(msg);
    } else {
      groupedByDay.push({ date: day, msgs: [msg] });
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col min-h-[calc(100vh-64px)]">

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin/messages" className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>

        {/* Avatars */}
        <div className="relative w-10 h-10 flex-shrink-0">
          {conversation?.participants?.[0] && (
            <Avatar profile={conversation.participants[0].profile} size={10} />
          )}
          {conversation?.participants?.[1] && (
            <div className="absolute -bottom-1 -right-1 ring-2 ring-white rounded-full">
              <Avatar profile={conversation.participants[1].profile} size={5} />
            </div>
          )}
          {!conversation && <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />}
        </div>

        <div className="flex-1 min-w-0">
          {conversation ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-sm">
                  {conversation.participants.map(p =>
                    p.profile?.full_name ?? p.profile?.email ?? p.user_id.slice(0, 8)
                  ).join(' & ')}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                  <CfgIcon className="w-2.5 h-2.5" />
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {messages.length} message{messages.length > 1 ? 's' : ''}
                {conversation.subject ? ` · ${conversation.subject}` : ''}
              </p>
            </>
          ) : (
            <div className="space-y-1 animate-pulse">
              <div className="h-3.5 bg-gray-200 rounded w-40" />
              <div className="h-2.5 bg-gray-100 rounded w-24" />
            </div>
          )}
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Infos participants */}
      {conversation && (
        <div className="flex flex-wrap gap-2 mb-4">
          {conversation.participants.map(p => (
            <Link
              key={p.user_id}
              href={`/admin/utilisateurs?user=${p.user_id}`}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Avatar profile={p.profile} size={5} />
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  {p.profile?.full_name ?? p.profile?.email ?? p.user_id.slice(0, 8)}
                </p>
                <p className="text-[10px] text-gray-400">{p.profile?.role ?? 'resident'}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-300" />
            </Link>
          ))}
          {conversation.related_id && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
              <CfgIcon className={`w-4 h-4 ${cfg.color}`} />
              <div>
                <p className="text-xs font-semibold text-gray-800">{cfg.label} lié</p>
                <p className="text-[10px] text-gray-400 font-mono">{conversation.related_id.slice(0, 8)}…</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zone messages */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-y-auto min-h-[400px] max-h-[60vh]">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-red-500 font-semibold mb-2">{error}</p>
            <button onClick={fetchData} className="text-sm text-brand-600 hover:underline">Réessayer</button>
          </div>
        ) : loading ? (
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <MsgSkeleton key={i} right={i % 2 === 1} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Aucun message dans cette conversation</p>
          </div>
        ) : (
          <>
            {groupedByDay.map(group => (
              <div key={group.date}>
                <DateSeparator date={group.date} />
                {group.msgs.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    participants={conversation?.participants ?? []}
                  />
                ))}
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Note légale */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <p className="text-[11px] text-amber-700">
            <span className="font-semibold">Lecture seule — Mode supervision admin.</span>{' '}
            Ces messages sont privés. L&apos;accès est réservé à la modération en cas de signalement.
          </p>
        </div>
      </div>

      {/* Lien participants */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <Link
          href="/admin/messages"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Toutes les conversations
        </Link>
      </div>
    </div>
  );
}
