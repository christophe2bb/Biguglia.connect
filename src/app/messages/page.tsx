'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Search, RefreshCw, ShoppingBag, HandHeart, Dog,
  Users, MapPin, Wrench, Trash2, Filter, Archive, Inbox,
  MailOpen, Clock, BookOpen, Star, SlidersHorizontal, X, CheckCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth-store';
import { Conversation, Profile } from '@/types';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { formatRelative, cn } from '@/lib/utils';

// ─── Cache module-level : survit au démontage du composant ────────────────────
// Stocke convId → timestamp (ms) de la dernière lecture locale.
// Permet à fetchConversations de ne pas recompter un message comme non lu
// si le PATCH BDD n'est pas encore persisté au moment du remontage.
const _localReadMap: Record<string, number> = {};

// ─── Config type de contenu lié ───────────────────────────────────────────────
const RELATED_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
  tab: string;
}> = {
  listing:         { icon: ShoppingBag,   color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',   label: 'Annonce',       tab: 'listing' },
  equipment:       { icon: Wrench,        color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200',   label: 'Matériel',      tab: 'equipment' },
  help_request:    { icon: HandHeart,     color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200', label: 'Coup de main',  tab: 'help_request' },
  lost_found:      { icon: Dog,           color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',  label: 'Perdu/Trouvé',  tab: 'lost_found' },
  association:     { icon: Users,         color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200', label: 'Association',   tab: 'association' },
  outing:          { icon: MapPin,        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',label: 'Promenade',     tab: 'outing' },
  event:           { icon: MapPin,        color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200', label: 'Événement',     tab: 'event' },
  collection_item: { icon: ShoppingBag,   color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',   label: 'Collectionneur',tab: 'collection_item' },
  service_request: { icon: Wrench,        color: 'text-brand-600',   bg: 'bg-brand-50',   border: 'border-brand-200',  label: 'Artisan',       tab: 'service_request' },
  general:         { icon: MessageSquare, color: 'text-gray-500',    bg: 'bg-gray-50',    border: 'border-gray-200',   label: 'Message',       tab: 'general' },
};

// ─── Onglets ──────────────────────────────────────────────────────────────────
type TabId = 'all' | 'unread' | 'to_handle' | 'archived' | string;

const MAIN_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'all',       label: 'Tous',       icon: Inbox },
  { id: 'unread',    label: 'Non lus',    icon: MailOpen },
  { id: 'to_handle', label: 'À traiter',  icon: Clock },
];

interface ConvWithOther extends Conversation {
  other_user?: Profile;
  last_message_text?: string;
  last_message_at?: string;
  unread_count?: number;
}

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

// ─── Badge de type ──────────────────────────────────────────────────────────
function TypeBadge({ relatedType }: { relatedType?: string | null }) {
  if (!relatedType || !RELATED_CONFIG[relatedType]) return null;
  const cfg = RELATED_CONFIG[relatedType];
  const Icon = cfg.icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md',
      cfg.color, cfg.bg
    )}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-16" />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const supabase = createClient();

  const [conversations, setConversations] = useState<ConvWithOther[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [activeTab, setActiveTab]       = useState<TabId>('all');
  const [typeFilter, setTypeFilter]     = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [deletingConv, setDeletingConv] = useState<string | null>(null);
  const [confirmConv, setConfirmConv]   = useState<string | null>(null);
  const channelRef      = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectIdx    = useRef(0);
  const mountedRef      = useRef(true);
  const typeMenuRef     = useRef<HTMLDivElement>(null);
  // Timestamp de montage — rejette les événements realtime rejoués (antérieurs)
  const pageStartRef    = useRef<number>(Date.now());
  // Ref stable vers conversations (évite stale-closure dans les listeners d'events)
  const conversationsRef = useRef<ConvWithOther[]>([]);
  // Cache local de last_read_at — pointe vers le singleton module-level _localReadMap.
  // Survit au démontage/remontage du composant (navigation vers [id] puis retour).
  const localReadMapRef = useRef<Record<string, number>>(_localReadMap);

  // Fermer menus si clic dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-conv-menu]')) setConfirmConv(null);
      if (typeMenuRef.current && !typeMenuRef.current.contains(t)) setShowTypeMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Chargement des conversations ──────────────────────────────────────────
  // Passe par l'API /api/messages/conversations (admin client) pour contourner
  // la récursion infinie dans les politiques RLS de conversation_participants.
  const fetchConversations = useCallback(async () => {
    if (!profile) return;

    // Récupérer le token pour l'authentification Bearer
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch('/api/messages/conversations', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    }).catch(() => null);

    if (!res || !res.ok) { setLoading(false); return; }

    const json = await res.json().catch(() => null);
    const participations = json?.participations;

    if (!participations) { setLoading(false); return; }

    const convs = (participations as Array<{
      conversation_id: string;
      last_read_at: string | null;
      joined_at: string | null;
      conversation: unknown;
    }>).map((p) => {
      const conv = p.conversation as unknown as Conversation & {
        participants?: Array<{ user_id: string; profile?: Profile }>;
        last_msg?: Array<{ content: string; created_at: string; sender_id: string }>;
      };
      if (!conv) return null;

      const other = conv.participants?.find(pp => pp.user_id !== profile.id)?.profile;
      const msgs = conv.last_msg || [];
      msgs.sort((a, b) => b.created_at.localeCompare(a.created_at));

      // Préférer le dernier message NON-système (vrai échange), sinon le dernier tout court
      const isSystemMsg = (content: string) => {
        if (!content) return false;
        const l = content.toLowerCase();
        return content.startsWith('👋') || content.startsWith('✅') || content.startsWith('🤝') ||
          l.includes('échange confirmé') || l.includes('echange confirme') ||
          l.includes('je vous contacte') || l.includes('via biguglia connect') ||
          l.includes('conversation créée') || l.includes('conversation creee');
      };
      const lastRealMsg = msgs.find(m => !isSystemMsg(m.content)) ?? msgs[0];
      const lastMsg = lastRealMsg;

      // Si last_read_at est NULL, utiliser joined_at (messages avant l'entrée dans la conv = lus)
      // Comparaison robuste via timestamp (évite les problèmes de format +00:00 vs Z)
      // Utiliser le max entre la valeur BDD et le cache local (le PATCH BDD peut avoir du retard)
      const dbSinceTs    = new Date(p.last_read_at || p.joined_at || '1970-01-01T00:00:00Z').getTime();
      const localSinceTs = localReadMapRef.current[p.conversation_id] ?? 0;
      const sinceTs      = Math.max(dbSinceTs, localSinceTs);
      // Exclure les messages système (messages d'intro automatiques) du compteur non lus
      const unread = msgs.filter(m =>
        m.sender_id !== profile.id &&
        new Date(m.created_at).getTime() > sinceTs &&
        !isSystemMsg(m.content)
      ).length;

      return {
        ...conv,
        other_user: other,
        last_message_text: lastMsg?.content,
        last_message_at: msgs[0]?.created_at || conv.updated_at, // date basée sur le tout dernier msg
        unread_count: unread,
        related_type: (conv as ConvWithOther & { related_type?: string }).related_type ?? null,
        related_id: (conv as ConvWithOther & { related_id?: string }).related_id ?? null,
      } as ConvWithOther;
    });

    const valid = convs.filter(Boolean) as ConvWithOther[];
    valid.sort((a, b) => {
      const aDate = a.last_message_at || a.updated_at || '';
      const bDate = b.last_message_at || b.updated_at || '';
      return bDate.localeCompare(aDate);
    });

    conversationsRef.current = valid;
    setConversations(valid);
    setLoading(false);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime ──────────────────────────────────────────────────────────────
  const connectRealtime = useCallback(() => {
    if (!profile) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const channel = supabase
      .channel(`messages-list-${profile.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        if (!mountedRef.current) return;
        const msg = payload.new as { id: string; conversation_id: string; sender_id: string; content: string; created_at: string };

        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === msg.conversation_id);
          if (idx === -1) { fetchConversations(); return prev; }
          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.last_message_text = msg.content;
          conv.last_message_at = msg.created_at;
          // Ne pas incrémenter le badge pour les messages système/auto
          // Ignorer les événements rejoués (antérieurs au montage de la page)
          const msgAt    = new Date(msg.created_at).getTime();
          const replayed = msgAt < pageStartRef.current;
          const lc = (msg.content || '').toLowerCase();
          const isSys = msg.content?.startsWith('👋') || msg.content?.startsWith('✅') || msg.content?.startsWith('🤝') ||
            lc.includes('je vous contacte') || lc.includes('échange confirmé') || lc.includes('echange confirme') ||
            lc.includes('conversation créée') || lc.includes('conversation creee') || lc.includes('via biguglia connect');
          const isOther   = msg.sender_id !== profile.id;
          const willCount = isOther && !isSys && !replayed;
          // ── DIAGNOSTIC badge ──────────────────────────────────────────────────────
          console.info(
            `[badge:realtime:page] conv=${msg.conversation_id.slice(0,8)} ` +
            `msgId=${msg.id.slice(0,8)} created_at=${msg.created_at} ` +
            `replayed=${replayed}(pageStart=${new Date(pageStartRef.current).toISOString()}) ` +
            `isOther=${isOther} isSystem=${isSys} → COMPTÉ=${willCount}`
          );
          if (replayed) return prev;
          if (willCount) conv.unread_count = (conv.unread_count || 0) + 1;
          updated.splice(idx, 1);
          updated.unshift(conv);
          conversationsRef.current = updated;
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
          reconnectRef.current = setTimeout(() => { if (mountedRef.current) connectRealtime(); }, delay);
        }
      });

    channelRef.current = channel;
  }, [profile, fetchConversations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    if (!profile) { router.push('/connexion'); return; }
    fetchConversations();
    connectRealtime();

    // Retour sur onglet navigateur → rafraîchir
    const handleVis = () => { if (document.visibilityState === 'visible') fetchConversations(); };
    document.addEventListener('visibilitychange', handleVis);

    // ── 'messages-read' : une conversation vient d'être lue depuis [id]/page ──
    // On met à 0 le badge de cette conversation IMMÉDIATEMENT (sans requête BDD)
    // puis on recharge la liste après 2s pour confirmer.
    const handleMessagesRead = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId?: string; readAt?: number }>).detail;
      const convId = detail?.conversationId;
      const readAt = detail?.readAt ?? Date.now();
      // ── DIAGNOSTIC badge ──────────────────────────────────────────────────────
      const prevUnread = conversationsRef.current.find(c => c.id === convId)?.unread_count ?? '?';
      console.info(
        `[badge:messages-read:page] convId=${convId?.slice(0,8) ?? 'undefined'} ` +
        `readAt=${new Date(readAt).toISOString()} unread_count_avant=${prevUnread} → remise à 0`
      );
      if (convId) {
        // 1. Mettre à jour le cache local (évite la recalcul erroné si BDD pas encore à jour)
        const current = localReadMapRef.current[convId] ?? 0;
        localReadMapRef.current[convId] = Math.max(readAt, current);
        // 2. Mise à zéro immédiate du badge dans la liste
        setConversations(prev => {
          const next = prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c);
          conversationsRef.current = next;
          return next;
        });
      }
      // Confirmation BDD après 5s (laisse le temps au PATCH de se propager)
      setTimeout(() => { if (mountedRef.current) fetchConversations(); }, 5000);
    };
    window.addEventListener('messages-read', handleMessagesRead);

    return () => {
      mountedRef.current = false;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('messages-read', handleMessagesRead);
    };
  }, [profile, router, fetchConversations, connectRealtime]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supprimer une conversation ────────────────────────────────────────────
  const handleDeleteConversation = async (convId: string) => {
    setConfirmConv(null);
    setDeletingConv(convId);
    await new Promise(r => setTimeout(r, 280));
    // Utilise l'API admin pour contourner la récursion RLS
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/messages/conversations?conversationId=${convId}`, {
      method: 'DELETE',
      headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {},
    }).catch(() => null);
    setConversations(prev => prev.filter(c => c.id !== convId));
    setDeletingConv(null);
  };

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const MAIN_TAB_IDS = ['all', 'unread', 'to_handle'];

  const filtered = conversations.filter(c => {
    // Filtre onglet principal
    if (activeTab === 'unread' && !(c.unread_count && c.unread_count > 0)) return false;
    if (activeTab === 'to_handle') {
      if (!(c.unread_count && c.unread_count > 0)) return false;
      if (!c.related_type || c.related_type === 'general') return false;
    }

    // Filtre onglet par type de contenu (ex: activeTab === 'event')
    if (!MAIN_TAB_IDS.includes(activeTab)) {
      if (c.related_type !== activeTab) return false;
    }

    // Filtre type de contenu (menu déroulant Filtrer)
    if (typeFilter && c.related_type !== typeFilter) return false;

    // Filtre recherche
    if (search) {
      const q = search.toLowerCase();
      const relatedLabel = c.related_type ? RELATED_CONFIG[c.related_type]?.label?.toLowerCase() : '';
      return (
        c.other_user?.full_name?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.last_message_text?.toLowerCase().includes(q) ||
        relatedLabel?.includes(q)
      );
    }
    return true;
  });

  const totalUnread  = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const unreadCount  = conversations.filter(c => c.unread_count && c.unread_count > 0).length;
  const toHandleCount= conversations.filter(c => c.unread_count && c.unread_count > 0 && c.related_type && c.related_type !== 'general').length;

  // Types présents dans la liste pour le filtre
  const presentTypes = Array.from(new Set(
    conversations.map(c => c.related_type).filter(Boolean) as string[]
  ));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-brand-600" />
            </div>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow border-2 border-white">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">
              {totalUnread > 0
                ? <span className="text-red-500 font-semibold">{totalUnread} non lu{totalUnread > 1 ? 's' : ''}</span>
                : <span className="text-emerald-600 font-semibold">✓ Tout est à jour</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filtre par type */}
          <div className="relative" ref={typeMenuRef}>
            <button
              onClick={() => setShowTypeMenu(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                typeFilter
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
              )}
              title="Filtrer par type"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {typeFilter ? RELATED_CONFIG[typeFilter]?.label : <span className="hidden sm:inline">Filtrer</span>}
              {typeFilter && (
                <button
                  onClick={(e) => { e.stopPropagation(); setTypeFilter(null); setShowTypeMenu(false); }}
                  className="ml-0.5 text-white/80 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </button>
            {showTypeMenu && presentTypes.length > 0 && (
              <div className="absolute right-0 top-11 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 min-w-[180px]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">Type de conversation</p>
                {presentTypes.map(type => {
                  const cfg = RELATED_CONFIG[type];
                  if (!cfg) return null;
                  const Icon = cfg.icon;
                  const isActive = typeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => { setTypeFilter(isActive ? null : type); setShowTypeMenu(false); }}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors',
                        isActive ? `${cfg.bg} ${cfg.color} font-semibold` : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', isActive ? cfg.color : 'text-gray-400')} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={fetchConversations}
            title="Actualiser"
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Barre de recherche ───────────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un contact, une annonce, un message…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-all"
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

      {/* ── Onglets ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {MAIN_TABS.map(tab => {
          const count = tab.id === 'unread' ? unreadCount : tab.id === 'to_handle' ? toHandleCount : conversations.length;
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0',
                isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && tab.id !== 'all' && (
                <span className={cn(
                  'min-w-[18px] h-[18px] text-[10px] font-black rounded-full inline-flex items-center justify-center px-1',
                  isActive
                    ? tab.id === 'unread' ? 'bg-red-500 text-white' : 'bg-brand-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Séparateur */}
        {presentTypes.length > 0 && <div className="h-5 w-px bg-gray-300 mx-1 flex-shrink-0" />}

        {/* Onglets dynamiques par type */}
        {presentTypes.map(type => {
          const cfg = RELATED_CONFIG[type];
          if (!cfg) return null;
          const Icon = cfg.icon;
          const typeCount = conversations.filter(c => c.related_type === type).length;
          const isActive = activeTab === type;
          return (
            <button
              key={type}
              onClick={() => { setActiveTab(type); setTypeFilter(null); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0',
                isActive ? `bg-white shadow-sm ${cfg.color}` : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{cfg.label}</span>
              {typeCount > 0 && (
                <span className={cn(
                  'min-w-[16px] h-4 text-[9px] font-black rounded-full inline-flex items-center justify-center px-1',
                  isActive ? `${cfg.bg} ${cfg.color}` : 'bg-gray-200 text-gray-600'
                )}>
                  {typeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Liste des conversations ───────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => <ConvSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            {activeTab === 'unread' ? (
              <CheckCheck className="w-9 h-9 text-emerald-400" />
            ) : activeTab === 'to_handle' ? (
              <Clock className="w-9 h-9 text-gray-400" />
            ) : (
              <MessageSquare className="w-9 h-9 text-gray-300" />
            )}
          </div>
          {activeTab === 'unread' ? (
            <>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Tout est à jour ✨</h3>
              <p className="text-sm text-gray-500">Vous n&apos;avez aucun message non lu.</p>
            </>
          ) : activeTab === 'to_handle' ? (
            <>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Rien à traiter</h3>
              <p className="text-sm text-gray-500">Toutes vos conversations contextuelles sont à jour.</p>
            </>
          ) : search ? (
            <>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Aucun résultat</h3>
              <p className="text-sm text-gray-500 mb-4">Aucune conversation ne correspond à &laquo;&nbsp;{search}&nbsp;&raquo;</p>
              <button onClick={() => setSearch('')} className="text-brand-600 font-semibold text-sm hover:underline">
                Effacer la recherche
              </button>
            </>
          ) : (
            <>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Aucune conversation pour le moment</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                Retrouvez ici tous vos échanges avec les habitants, artisans et associations de Biguglia.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => router.push('/annonces')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
                  <ShoppingBag className="w-4 h-4" /> Annonces
                </button>
                <button onClick={() => router.push('/coups-de-main')} className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors">
                  <HandHeart className="w-4 h-4" /> Coups de main
                </button>
                <button onClick={() => router.push('/promenades')} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors">
                  <MapPin className="w-4 h-4" /> Promenades
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-sm">
          {/* Stats rapides en haut de la liste */}
          {activeTab === 'all' && !search && !typeFilter && conversations.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-3 bg-gray-50/70 text-xs text-gray-500">
              <span className="flex items-center gap-1 font-semibold text-gray-700">
                <BookOpen className="w-3.5 h-3.5" />
                {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
              </span>
              {totalUnread > 0 && (
                <span className="flex items-center gap-1 text-red-500 font-semibold">
                  <MailOpen className="w-3.5 h-3.5" />
                  {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
                </span>
              )}
              {toHandleCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  {toHandleCount} à traiter
                </span>
              )}
            </div>
          )}

          {filtered.map(conv => {
            const hasUnread  = (conv.unread_count || 0) > 0;
            const isDeleting = deletingConv === conv.id;
            const isConfirm  = confirmConv  === conv.id;
            const relCfg     = conv.related_type ? RELATED_CONFIG[conv.related_type] : null;

            return (
              <div
                key={conv.id}
                className={cn(
                  'transition-all duration-300',
                  isDeleting && 'opacity-0 scale-y-0 max-h-0 overflow-hidden pointer-events-none'
                )}
              >
                {/* Popup confirmation suppression */}
                {isConfirm && (
                  <div data-conv-menu className="flex items-center gap-2 bg-red-50 border-b border-red-100 px-5 py-3 text-sm">
                    <Trash2 className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="flex-1 text-gray-700 font-medium">Supprimer cette conversation ?</span>
                    <button
                      onClick={() => handleDeleteConversation(conv.id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Supprimer
                    </button>
                    <button
                      onClick={() => setConfirmConv(null)}
                      className="text-gray-400 hover:text-gray-600 font-medium text-xs px-2"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {/* Ligne de conversation */}
                <div className={cn(
                  'group flex items-center gap-0 transition-colors',
                  isConfirm ? 'bg-red-50/50' : hasUnread ? 'bg-brand-50/20' : 'hover:bg-gray-50/60'
                )}>
                  {/* Bande non-lu */}
                  <div className={cn('w-1 self-stretch rounded-r flex-shrink-0', hasUnread ? 'bg-brand-500' : 'bg-transparent')} />

                  {/* Lien principal — div + router.push pour laisser React re-render avant navigation */}
                  <div
                    role="link"
                    tabIndex={0}
                    className="flex-1 flex items-center gap-3.5 px-4 py-4 min-w-0 cursor-pointer"
                    onClick={() => {
                      // 1) Mise à zéro optimiste AVANT la navigation
                      //    → React re-render la liste (badge disparaît) avant que router.push
                      //      ne démonte le composant.
                      if ((conv.unread_count || 0) > 0) {
                        const readAt = Date.now();
                        // Mettre à jour le cache local immédiatement
                        localReadMapRef.current[conv.id] = Math.max(readAt, localReadMapRef.current[conv.id] ?? 0);
                        setConversations(prev =>
                          prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
                        );
                        window.dispatchEvent(new CustomEvent('messages-read', { detail: { conversationId: conv.id, readAt } }));
                      }
                      // 2) Navigation différée d'un tick (requestAnimationFrame) pour que
                      //    React ait le temps de peindre le nouveau badge avant de naviguer.
                      requestAnimationFrame(() => router.push(`/messages/${conv.id}`));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if ((conv.unread_count || 0) > 0) {
                          const readAt = Date.now();
                          localReadMapRef.current[conv.id] = Math.max(readAt, localReadMapRef.current[conv.id] ?? 0);
                          setConversations(prev =>
                            prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
                          );
                          window.dispatchEvent(new CustomEvent('messages-read', { detail: { conversationId: conv.id, readAt } }));
                        }
                        requestAnimationFrame(() => router.push(`/messages/${conv.id}`));
                      }
                    }}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Avatar
                        src={conv.other_user?.avatar_url}
                        name={conv.other_user?.full_name || conv.subject || '?'}
                        size="md"
                      />
                      {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                      )}
                      {!hasUnread && relCfg && (() => {
                        const RIcon = relCfg.icon;
                        return (
                          <span className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border border-white flex items-center justify-center shadow-sm',
                            relCfg.bg
                          )}>
                            <RIcon className={cn('w-2.5 h-2.5', relCfg.color)} />
                          </span>
                        );
                      })()}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={cn(
                          'truncate text-sm',
                          hasUnread ? 'font-black text-gray-900' : 'font-semibold text-gray-800'
                        )}>
                          {conv.other_user?.full_name || conv.subject || 'Conversation'}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {conv.last_message_at ? formatRelative(conv.last_message_at) : ''}
                          </span>
                          {hasUnread && (
                            <span className="bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                              {conv.unread_count! > 99 ? '99+' : conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className={cn(
                        'text-sm truncate',
                        hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500'
                      )}>
                        {conv.last_message_text || <span className="italic text-gray-400">Aucun message</span>}
                      </p>

                      {/* Badge type */}
                      {conv.related_type && conv.related_type !== 'general' && (
                        <div className="mt-1.5">
                          <TypeBadge relatedType={conv.related_type} />
                          {conv.subject && (
                            <span className="text-xs text-gray-400 ml-1.5 truncate">
                              · {conv.subject.slice(0, 40)}{conv.subject.length > 40 ? '…' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bouton supprimer */}
                  <button
                    data-conv-menu
                    onClick={() => setConfirmConv(isConfirm ? null : conv.id)}
                    className={cn(
                      'flex-shrink-0 w-9 h-9 rounded-xl mr-3 flex items-center justify-center transition-all',
                      'opacity-0 group-hover:opacity-100',
                      isConfirm
                        ? 'bg-red-500 text-white opacity-100'
                        : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                    )}
                    title="Supprimer la conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Note de bas de page ──────────────────────────────────────────────── */}
      {!loading && conversations.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">
          Les messages sont privés et chiffrés entre vous et vos interlocuteurs.
        </p>
      )}
    </div>
  );
}
