'use client';

/**
 * /admin/messages — Liste de TOUTES les conversations du site
 * Refonte : tri par date, groupage par type, stats, pagination, recherche améliorée.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare, Search, RefreshCw, X, ArrowLeft,
  Users, ShoppingBag, HandHeart, MapPin, Package,
  Clock, ChevronRight, SortAsc, SortDesc, Filter,
  Hash, Calendar, BarChart2, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminFetch } from '@/lib/admin-fetch';
import { formatDistanceToNow, format } from 'date-fns';
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

type SortField = 'date' | 'messages';
type SortDir   = 'desc' | 'asc';

// ── Config types ──────────────────────────────────────────────────────────────

const RELATED_LABELS: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string; border: string }> = {
  listing:         { label: 'Annonce',       Icon: ShoppingBag,   color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
  service_request: { label: 'Demande',       Icon: HandHeart,     color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200'   },
  equipment:       { label: 'Matériel',      Icon: Package,       color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200'   },
  lost_found:      { label: 'Perdu/Trouvé',  Icon: MapPin,        color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
  general:         { label: 'Général',       Icon: MessageSquare, color: 'text-gray-600',   bg: 'bg-gray-100',   border: 'border-gray-200'   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCfg(type?: string | null) {
  if (!type) return RELATED_LABELS.general;
  return RELATED_LABELS[type] ?? RELATED_LABELS.general;
}

function getParticipantName(p: Participant): string {
  if (p.profile?.full_name?.trim()) return p.profile.full_name.trim();
  if (p.profile?.email) return p.profile.email.split('@')[0];
  return p.user_id.slice(0, 8) + '…';
}

function isSystemMsg(content: string): boolean {
  return (
    content.startsWith('👋') ||
    content.startsWith('✅') ||
    content.startsWith('🤝') ||
    content.startsWith('[SYSTEM]') ||
    content.startsWith('__system__')
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function relativeDate(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch { return iso; }
}

function shortDate(iso: string): string {
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch { return iso; }
}

// ── Avatar mini ───────────────────────────────────────────────────────────────

function ParticipantAvatar({ profile, size = 10 }: { profile?: ParticipantProfile | null; size?: number }) {
  const px = size * 4;
  if (profile?.avatar_url) {
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
  const initial = (profile?.full_name?.trim() ?? profile?.email ?? '?').charAt(0).toUpperCase();
  const colors = [
    'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700',
    'bg-teal-100 text-teal-700', 'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700', 'bg-green-100 text-green-700',
  ];
  const color = colors[(initial.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className={`w-${size} h-${size} rounded-full ${color} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
      {initial}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 animate-pulse">
      <div className="flex -space-x-2 flex-shrink-0">
        <div className="w-10 h-10 bg-gray-200 rounded-full ring-2 ring-white" />
        <div className="w-7 h-7 bg-gray-100 rounded-full ring-2 ring-white" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex gap-2">
          <div className="h-3.5 bg-gray-200 rounded w-32" />
          <div className="h-3.5 bg-gray-100 rounded w-16" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-10" />
      </div>
    </div>
  );
}

// ── Carte conversation ────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  onDelete,
  isDeleting,
}: {
  conv: AdminConversation;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const cfg   = getCfg(conv.related_type);
  const Icon  = cfg.Icon;
  const names = conv.participants.map(getParticipantName);

  const preview = (() => {
    if (conv.last_message && !isSystemMsg(conv.last_message.content)) {
      return truncate(conv.last_message.content, 90);
    }
    return conv.subject ? truncate(conv.subject, 90) : null;
  })();

  const hasMessages = conv.message_count > 0;

  return (
    <div className="flex items-center gap-2 border-b border-gray-100 hover:bg-gray-50/80 transition-colors group pr-3">
      <Link
        href={`/admin/messages/${conv.id}`}
        className="flex items-center gap-4 px-5 py-4 flex-1 min-w-0"
      >
        {/* Avatars empilés */}
        <div className="flex -space-x-2 flex-shrink-0">
          <div className="relative">
            <ParticipantAvatar profile={conv.participants[0]?.profile} size={10} />
          </div>
          {conv.participants[1] && (
            <div className="relative ring-2 ring-white rounded-full">
              <ParticipantAvatar profile={conv.participants[1]?.profile} size={6} />
            </div>
          )}
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* Ligne 1 : noms + badge type */}
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <span className="font-semibold text-gray-900 text-sm truncate">
              {names.join(' & ')}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color} flex-shrink-0 border ${cfg.border}`}>
              <Icon className="w-2.5 h-2.5" />
              {cfg.label}
            </span>
          </div>

          {/* Ligne 2 : sujet ou aperçu message */}
          {conv.subject && (
            <p className="text-xs font-medium text-gray-600 truncate mb-0.5">
              📌 {conv.subject}
            </p>
          )}
          {preview && (
            <p className="text-xs text-gray-400 truncate italic">{preview}</p>
          )}
        </div>

        {/* Méta droite */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[80px]">
          <span className="text-[10px] text-gray-400 whitespace-nowrap" title={shortDate(conv.updated_at)}>
            {relativeDate(conv.updated_at)}
          </span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            hasMessages
              ? 'bg-brand-50 text-brand-700'
              : 'bg-gray-100 text-gray-400'
          }`}>
            <Hash className="w-2.5 h-2.5" />
            {conv.message_count} msg
          </span>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
      </Link>

      {/* Bouton supprimer */}
      <button
        onClick={() => onDelete(conv.id)}
        disabled={isDeleting}
        title="Supprimer cette conversation"
        className="flex-shrink-0 p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isDeleting
          ? <RefreshCw className="w-4 h-4 animate-spin" />
          : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ conversations }: { conversations: AdminConversation[] }) {
  const total   = conversations.length;
  const msgs    = conversations.reduce((s, c) => s + c.message_count, 0);
  const byType  = Object.entries(RELATED_LABELS).map(([type, cfg]) => ({
    type, cfg,
    count: conversations.filter(c => (c.related_type ?? 'general') === type).length,
  })).filter(e => e.count > 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {/* Total conversations */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-brand-600" />
        </div>
        <div>
          <div className="text-xl font-black text-gray-900">{total}</div>
          <div className="text-[10px] text-gray-500 leading-none">conversations</div>
        </div>
      </div>

      {/* Total messages */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
          <BarChart2 className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <div className="text-xl font-black text-gray-900">{msgs}</div>
          <div className="text-[10px] text-gray-500 leading-none">messages</div>
        </div>
      </div>

      {/* Répartition par type (2 premières) */}
      {byType.slice(0, 2).map(({ type, cfg, count }) => (
        <div key={type} className={`rounded-2xl border p-3 flex items-center gap-2 ${cfg.bg} ${cfg.border}`}>
          <div className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
            <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div>
            <div className={`text-xl font-black ${cfg.color}`}>{count}</div>
            <div className={`text-[10px] leading-none ${cfg.color} opacity-80`}>{cfg.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [typeFilter, setTypeFilter]       = useState<string | null>(null);
  const [sortField, setSortField]         = useState<SortField>('date');
  const [sortDir, setSortDir]             = useState<SortDir>('desc');
  const [page, setPage]                   = useState(0);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [confirmId, setConfirmId]         = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await adminFetch('/api/admin/messages?limit=500');
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

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmId) return;
    setDeletingId(confirmId);
    setConfirmId(null);
    try {
      const res = await adminFetch(`/api/admin/messages/${confirmId}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== confirmId));
        toast.success('Conversation supprimée');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeletingId(null);
    }
  }, [confirmId]);

  // Reset page quand filtres changent
  useEffect(() => { setPage(0); }, [search, typeFilter, sortField, sortDir]);

  // Types présents — on itère sur les clés fixes de RELATED_LABELS
  // pour éviter les doublons dus aux related_type null → tous mappés en 'general'
  const presentTypes = useMemo(
    () => Object.keys(RELATED_LABELS).filter(type =>
      conversations.some(c => (c.related_type ?? 'general') === type)
    ),
    [conversations],
  );

  // Filtrage + tri
  const filtered = useMemo(() => {
    let list = conversations.filter(c => {
      if (typeFilter) {
        const ct = c.related_type ?? 'general';
        if (ct !== typeFilter) return false;
      }
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

    list = [...list].sort((a, b) => {
      let va: number, vb: number;
      if (sortField === 'date') {
        va = new Date(a.updated_at).getTime();
        vb = new Date(b.updated_at).getTime();
      } else {
        va = a.message_count;
        vb = b.message_count;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });

    return list;
  }, [conversations, search, typeFilter, sortField, sortDir]);

  const paginated   = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore     = paginated.length < filtered.length;

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  const SortIcon = sortDir === 'desc' ? SortDesc : SortAsc;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 rounded-xl hover:bg-gray-100 transition-colors" title="Retour admin">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="w-11 h-11 rounded-2xl bg-brand-50 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Conversations membres</h1>
            <p className="text-xs text-gray-500">
              {loading ? 'Chargement…' : `${conversations.length} conversations · ${conversations.reduce((s, c) => s + c.message_count, 0)} messages`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchConversations}
          title="Actualiser"
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-brand-600 hover:border-brand-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {!loading && conversations.length > 0 && (
        <StatsBar conversations={conversations} />
      )}

      {/* Recherche */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher par nom, email, message, sujet…"
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

      {/* Filtres type + tri */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {/* Filtre par type */}
        <div className="flex items-center gap-1.5 mr-1">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400 font-medium">Type :</span>
        </div>
        <button
          onClick={() => setTypeFilter(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            !typeFilter
              ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <Users className="w-3 h-3" /> Tous ({conversations.length})
        </button>
        {presentTypes.map(type => {
          const cfg   = getCfg(type);
          const count = conversations.filter(c => (c.related_type ?? 'general') === type).length;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? null : type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                typeFilter === type
                  ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <cfg.Icon className="w-3 h-3" /> {cfg.label} ({count})
            </button>
          );
        })}

        {/* Séparateur */}
        <div className="h-5 w-px bg-gray-200 mx-1" />

        {/* Tri */}
        <button
          onClick={() => toggleSort('date')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            sortField === 'date'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <Calendar className="w-3 h-3" /> Date
          {sortField === 'date' && <SortIcon className="w-3 h-3" />}
        </button>
        <button
          onClick={() => toggleSort('messages')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            sortField === 'messages'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <Hash className="w-3 h-3" /> Messages
          {sortField === 'messages' && <SortIcon className="w-3 h-3" />}
        </button>
      </div>

      {/* Compteur résultat */}
      {!loading && (search || typeFilter) && (
        <p className="text-xs text-gray-500 mb-3">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          {typeFilter && ` · filtre "${getCfg(typeFilter).label}"`}
          {search && ` · recherche "${search}"`}
        </p>
      )}

      {/* Liste */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <ConvSkeleton key={i} />)
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">Aucune conversation</p>
            <p className="text-sm text-gray-400">
              {search
                ? `Aucun résultat pour « ${search} »`
                : typeFilter
                  ? `Aucune conversation de type « ${getCfg(typeFilter).label} »`
                  : 'Aucune conversation sur le site.'}
            </p>
            {(search || typeFilter) && (
              <button
                onClick={() => { setSearch(''); setTypeFilter(null); }}
                className="mt-3 text-brand-600 text-sm font-semibold hover:underline"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            {/* En-tête colonne */}
            <div className="flex items-center gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100">
              <div className="w-14 flex-shrink-0" />
              <div className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Participants · Sujet · Aperçu
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 min-w-[80px] text-right">
                Activité
              </div>
            </div>
            {paginated.map(conv => (
              <ConversationRow
                key={conv.id}
                conv={conv}
                onDelete={handleDeleteClick}
                isDeleting={deletingId === conv.id}
              />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-xs text-gray-400">
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length} conversation{filtered.length > 1 ? 's' : ''}
            {(search || typeFilter) ? ` (sur ${conversations.length} au total)` : ''}
          </p>
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
            >
              Voir {Math.min(PAGE_SIZE, filtered.length - paginated.length)} de plus
            </button>
          )}
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmId && (() => {
        const conv = conversations.find(c => c.id === confirmId);
        const names = conv?.participants.map(getParticipantName).join(' & ') ?? '…';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-base">Supprimer la conversation</h2>
                  <p className="text-xs text-gray-500">{names}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Cette action est <span className="font-semibold text-red-600">irréversible</span>.
                Tous les messages seront définitivement supprimés.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Note légale */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
        <div className="flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Accès admin superviseur.</span>{' '}
            Ces conversations sont privées entre les membres. Cet accès est réservé à la modération
            en cas de signalement ou de litige. Toute consultation doit être justifiée.
          </p>
        </div>
      </div>
    </div>
  );
}
