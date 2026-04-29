'use client';

/**
 * /admin/messages — Liste de TOUTES les conversations du site
 * L'admin peut voir tous les échanges et cliquer pour lire une conversation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare, Search, RefreshCw, X, ArrowLeft,
  Users, ShoppingBag, HandHeart, MapPin, Package,
  Clock, ChevronRight,
} from 'lucide-react';
import { adminFetch } from '@/lib/admin-fetch';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParticipantProfile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  role?: string | null;
}

interface Participant {
  user_id: string;
  last_read_at?: string | null;
  profile?: ParticipantProfile | null;
}

interface LastMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface AdminConversation {
  id: string;
  subject?: string | null;
  related_type?: string | null;
  related_id?: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  participants: Participant[];
  last_message?: LastMessage | null;
}

// ── Config types de conversation ──────────────────────────────────────────────

const RELATED_LABELS: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  listing:        { label: 'Annonce',       Icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
  service_request:{ label: 'Demande',       Icon: HandHeart,   color: 'text-blue-600',   bg: 'bg-blue-50'   },
  equipment:      { label: 'Matériel',      Icon: Package,     color: 'text-teal-600',   bg: 'bg-teal-50'   },
  lost_found:     { label: 'Perdu/Trouvé', Icon: MapPin,      color: 'text-orange-600', bg: 'bg-orange-50' },
  general:        { label: 'Général',       Icon: MessageSquare,color:'text-gray-600',   bg: 'bg-gray-100'  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRelatedConfig(type?: string | null) {
  if (!type) return RELATED_LABELS.general;
  return RELATED_LABELS[type] ?? RELATED_LABELS.general;
}

function getParticipantName(p: Participant): string {
  return p.profile?.full_name ?? p.profile?.email ?? p.user_id.slice(0, 8) + '…';
}

function Avatar({ profile, size = 8 }: { profile?: ParticipantProfile | null; size?: number }) {
  if (profile?.avatar_url) {
    const px = size * 4;
    return (
      <Image
        src={profile.avatar_url}
        alt={profile.full_name ?? 'avatar'}
        width={px}
        height={px}
        className={`w-${size} h-${size} rounded-full object-cover`}
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

function isSystemMsg(content: string): boolean {
  return content.startsWith('[SYSTEM]') || content.startsWith('__system__');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-gray-100 animate-pulse">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-12" />
    </div>
  );
}

// ── Composant carte conversation ──────────────────────────────────────────────

function ConversationCard({ conv }: { conv: AdminConversation }) {
  const cfg = getRelatedConfig(conv.related_type);
  const Icon = cfg.Icon;
  const names = conv.participants.map(getParticipantName).join(' & ');
  const preview = conv.last_message && !isSystemMsg(conv.last_message.content)
    ? truncate(conv.last_message.content, 80)
    : conv.subject ?? '(aucun message)';
  const ago = conv.updated_at
    ? formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: fr })
    : '';

  return (
    <Link
      href={`/admin/messages/${conv.id}`}
      className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group"
    >
      {/* Avatars participants */}
      <div className="relative flex-shrink-0 w-12 h-12">
        {conv.participants[0] && (
          <Avatar profile={conv.participants[0].profile} size={10} />
        )}
        {conv.participants[1] && (
          <div className="absolute -bottom-1 -right-1 ring-2 ring-white rounded-full">
            <Avatar profile={conv.participants[1].profile} size={5} />
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-gray-900 text-sm truncate">{names}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color} flex-shrink-0`}>
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{preview}</p>
      </div>

      {/* Méta droite */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-[10px] text-gray-400">{ago}</span>
        <span className="text-[10px] text-gray-400">{conv.message_count} msg</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
      </div>
    </Link>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await adminFetch('/api/admin/messages?limit=200');
      const body = await res.json();
      if (res.ok) setConversations(body.conversations ?? []);
      else console.error('[admin/messages]', body.error);
    } catch (e) {
      console.error('[admin/messages] network error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchConversations(); }, [fetchConversations]);

  // Filtrage local
  const filtered = conversations.filter(c => {
    if (typeFilter && c.related_type !== typeFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.participants.some(p =>
        p.profile?.full_name?.toLowerCase().includes(s) ||
        p.profile?.email?.toLowerCase().includes(s)
      ) ||
      c.last_message?.content?.toLowerCase().includes(s) ||
      c.subject?.toLowerCase().includes(s)
    );
  });

  // Types présents dans les données
  const presentTypes = [...new Set(conversations.map(c => c.related_type ?? 'general'))];

  const totalMessages = conversations.reduce((s, c) => s + c.message_count, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </Link>
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Messages</h1>
            <p className="text-xs text-gray-500">
              {loading ? '…' : `${conversations.length} conversations · ${totalMessages} messages`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchConversations}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Recherche */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher par participant, message…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtres type */}
      {presentTypes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTypeFilter(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              !typeFilter
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Users className="w-3 h-3" /> Tous ({conversations.length})
          </button>
          {presentTypes.map(type => {
            const cfg = getRelatedConfig(type);
            const Icon = cfg.Icon;
            const count = conversations.filter(c => (c.related_type ?? 'general') === type).length;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  typeFilter === type
                    ? `${cfg.bg} ${cfg.color} border-current`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-3 h-3" /> {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ConvSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">Aucune conversation</p>
            <p className="text-sm text-gray-400">
              {search ? `Aucun résultat pour « ${search} »` : 'Aucune conversation sur le site.'}
            </p>
          </div>
        ) : (
          filtered.map(conv => <ConversationCard key={conv.id} conv={conv} />)
        )}
      </div>

      {/* Pied de page */}
      {!loading && filtered.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">
          {filtered.length} conversation{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
          {typeFilter || search ? ` sur ${conversations.length} au total` : ''}
        </p>
      )}

      {/* Note légale */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">Accès admin superviseur.</span>{' '}
            Ces conversations sont privées entre les membres. Cet accès est réservé à la modération
            en cas de signalement ou de litige. Toute consultation doit être justifiée.
          </p>
        </div>
      </div>
    </div>
  );
}
