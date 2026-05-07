'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Clock, MapPin, Calendar, MessageSquare, Send,
  Loader2, CheckCircle2, Pencil, Trash2, Share2,
  HandHeart, Pause, Play, Check,
  Bookmark, BookmarkCheck, Flame, ExternalLink,
  Users, ChevronDown, ChevronUp, Heart, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import GlobalTrustBadge from '@/components/ui/TrustBadge';
import dynamic from 'next/dynamic';
import { toPhotoItems } from '@/components/ui/photo-utils';
const PhotoViewer = dynamic(
  () => import('@/components/ui/PhotoViewer').then(m => ({ default: m.PhotoViewer })),
  { ssr: false },
);
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import { SectorBadge } from '@/components/ui/SectorFilter';
import {
  TYPE_CONFIG, URGENCY_CONFIG, CATEGORIES,
  DURATION_OPTIONS, COMPENSATION_CONFIG,
} from '../_constants';
import type { HelpRequest, HelpComment, HelpStatus, DisplayName } from '../_types';
import StatusManagerCDM from './StatusManagerCDM';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDisplayName(author: HelpRequest['author'], mode: DisplayName): string {
  if (!author?.full_name) return 'Membre';
  const parts = author.full_name.trim().split(' ');
  if (mode === 'prenom') return parts[0];
  if (mode === 'prenom_initiale') return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  return author.full_name;
}

function AuthorAvatar({
  name, color, size = 'sm',
}: { name: string; color: string; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-black text-white flex-shrink-0 ${color}`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function LocalTrustBadge({ author }: { author: HelpRequest['author'] }) {
  if (!author?.created_at) return null;
  return (
    <GlobalTrustBadge
      profile={{
        created_at: author.created_at,
        role: 'resident',
        avatar_url: (author as { full_name: string; avatar_url?: string; created_at?: string }).avatar_url,
      }}
      variant="mini"
    />
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  item: HelpRequest;
  userId?: string;
  isAuthor: boolean;
  onEdit: (i: HelpRequest) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
  onPause: (id: string, paused: boolean) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  onCanHelp: (id: string, title: string) => void;
};

// ── Constante couleur selon type ──────────────────────────────────────────────

const TYPE_ACCENT: Record<string, { border: string; header: string; avatarBg: string; pill: string }> = {
  demande: {
    border:    'border-orange-200',
    header:    'bg-gradient-to-r from-orange-500 to-amber-500',
    avatarBg:  'bg-gradient-to-br from-orange-400 to-amber-500',
    pill:      'bg-orange-100 text-orange-700 border-orange-200',
  },
  offre: {
    border:    'border-emerald-200',
    header:    'bg-gradient-to-r from-emerald-500 to-teal-500',
    avatarBg:  'bg-gradient-to-br from-emerald-400 to-teal-500',
    pill:      'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  echange: {
    border:    'border-blue-200',
    header:    'bg-gradient-to-r from-blue-500 to-indigo-500',
    avatarBg:  'bg-gradient-to-br from-blue-400 to-indigo-500',
    pill:      'bg-blue-100 text-blue-700 border-blue-200',
  },
};

// ─── HelpCard ─────────────────────────────────────────────────────────────────

export default function HelpCard({
  item, userId, isAuthor, onEdit, onDelete, onResolve, onPause, onStatusChange,
  savedIds, onToggleSave, onCanHelp,
}: Props) {
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;
  const _router     = useRouter();

  const [openChat,    setOpenChat]    = useState(false);
  const [openShare,   setOpenShare]   = useState(false);
  const [expanded,    setExpanded]    = useState(false);
  const [comments,    setComments]    = useState<HelpComment[]>([]);
  const [chatText,    setChatText]    = useState('');
  const [sending,     setSending]     = useState(false);
  const [chatCount,   setChatCount]   = useState(item.comment_count ?? 0);
  const [helperCount, setHelperCount] = useState(item.helper_count ?? 0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx,  setLightboxIdx]  = useState(0);
  const [localStatus, setLocalStatus]  = useState(item.status);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const typeConf  = TYPE_CONFIG[item.help_type];
  const urgConf   = URGENCY_CONFIG[item.urgency];
  const catConf   = CATEGORIES.find(c => c.value === item.category);
  const CatIcon   = catConf?.icon ?? HandHeart;
  const accent    = TYPE_ACCENT[item.help_type] ?? TYPE_ACCENT.demande;

  const sortedPhotos = [...(item.photos ?? [])].sort((a, b) => a.display_order - b.display_order);
  const coverPhoto   = sortedPhotos[0]?.url;
  const allPhotos    = toPhotoItems(sortedPhotos);

  const isPaused    = localStatus === 'paused';
  const isResolved  = localStatus === 'resolved';
  const isSaved     = savedIds.has(item.id);
  const isUrgent    = item.urgency === 'urgent';
  const displayName = getDisplayName(item.author, item.display_name);

  // ── Counts ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('help_comments')
      .select('id', { count: 'exact', head: true })
      .eq('help_id', item.id)
      .then(({ count }: { count: number | null }) => setChatCount(count ?? 0));
    supabase.from('help_request_participants')
      .select('id', { count: 'exact', head: true })
      .eq('help_request_id', item.id).eq('role', 'helper')
      .then(({ count }: { count: number | null }) => setHelperCount(count ?? 0));
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [item.id, supabase]);

  // ── Comments ──────────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('help_comments')
      .select('id, content, created_at, author_id, author:profiles(full_name)')
      .eq('help_id', item.id)
      .order('created_at', { ascending: true })
      .limit(50);
    setComments((data ?? []) as HelpComment[]);
    setChatCount((data ?? []).length);
  }, [item.id, supabase]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('help_comments')
      .delete()
      .eq('id', commentId);
    if (error) {
      toast.error('Impossible de supprimer ce message');
    } else {
      toast.success('Message supprimé');
      await fetchComments();
    }
  }, [supabase, userId, fetchComments]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('help_comments').insert({
      help_id: item.id, author_id: userId, content: chatText.trim(),
    });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  // ── Actions auteur ────────────────────────────────────────────────────────
  const handleLocalResolve = () => { setLocalStatus('resolved'); onResolve(item.id); };
  const handleLocalPause   = () => {
    const wasPaused = localStatus === 'paused';
    setLocalStatus(wasPaused ? 'active' : 'paused');
    onPause(item.id, wasPaused);
  };
  const handleLocalStatusChange = (s: string) => {
    setLocalStatus(s as HelpStatus);
    onStatusChange(item.id, s);
  };

  // ── Partage ───────────────────────────────────────────────────────────────
  const shareUrl  = `${typeof window !== 'undefined' ? window.location.origin : ''}/coups-de-main/${item.id}`;
  const shareText = encodeURIComponent(`${typeConf.emoji} ${item.title} — ${item.location_area}\n${shareUrl}`);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <article
      id={item.id}
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col ${
        isResolved ? 'opacity-60' : ''
      } ${accent.border}`}
    >
      {/* ── BANDEAU URGENT ─────────────────────────────────────────────────── */}
      {isUrgent && localStatus === 'active' && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black">
          <Flame className="w-3.5 h-3.5 flex-shrink-0" />
          URGENT — Aide recherchée aujourd&apos;hui
        </div>
      )}

      {/* ── HEADER COLORÉ ──────────────────────────────────────────────────── */}
      <div className={`relative ${accent.header} px-4 py-3`}>
        {/* Photo de couverture si disponible */}
        {coverPhoto && (
          <div
            className="absolute inset-0 opacity-20 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }}
            onKeyDown={e => { if (e.key === 'Enter') { setLightboxIdx(0); setLightboxOpen(true); } }}
          >
            <Image src={coverPhoto} alt="" fill className="object-cover" />
          </div>
        )}

        {/* Contenu header */}
        <div className="relative z-10 flex items-start justify-between gap-2">
          {/* Gauche : type + catégorie */}
          <div className="flex flex-col gap-1.5">
            {/* Pills type + urgence */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-white/25 text-white text-xs font-black px-2.5 py-1 rounded-full backdrop-blur-sm">
                {typeConf.emoji} {typeConf.label}
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                item.urgency === 'urgent'
                  ? 'bg-red-600/80 text-white'
                  : item.urgency === 'rapidement'
                  ? 'bg-amber-500/80 text-white'
                  : 'bg-white/20 text-white'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                {urgConf.label}
              </span>
            </div>

            {/* Catégorie */}
            <div className="flex items-center gap-1 text-white/90 text-xs font-semibold">
              <CatIcon className="w-3.5 h-3.5 flex-shrink-0" />
              {catConf?.label ?? item.category}
            </div>
          </div>

          {/* Droite : favoris + actions auteur */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {userId && (
              <button
                type="button"
                onClick={() => onToggleSave(item.id)}
                title={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                className="p-1.5 bg-white/20 hover:bg-white/35 rounded-lg transition-colors backdrop-blur-sm"
              >
                {isSaved
                  ? <BookmarkCheck className="w-4 h-4 text-amber-300" />
                  : <Bookmark className="w-4 h-4 text-white" />}
              </button>
            )}
            {isAuthor && !isResolved && (
              <>
                <button
                  type="button"
                  onClick={handleLocalResolve}
                  title="Marquer résolu"
                  className="p-1.5 bg-white/20 hover:bg-white/35 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={handleLocalPause}
                  title={isPaused ? 'Réactiver' : 'Mettre en pause'}
                  className="p-1.5 bg-white/20 hover:bg-white/35 rounded-lg transition-colors backdrop-blur-sm"
                >
                  {isPaused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
                </button>
                <Link
                  href={`/coups-de-main/${item.id}/modifier`}
                  title="Modifier"
                  className="p-1.5 bg-white/20 hover:bg-white/35 rounded-lg transition-colors backdrop-blur-sm inline-flex items-center"
                >
                  <Pencil className="w-4 h-4 text-white" />
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 bg-white/20 hover:bg-red-600/70 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Statuts (hors active) */}
        {localStatus !== 'active' && (
          <div className="relative z-10 flex gap-1 mt-2 flex-wrap">
            {localStatus === 'resolved'    && <StatusBadge status="resolved"    contentType="help_request" size="xs" showIcon className="shadow" />}
            {localStatus === 'paused'      && <StatusBadge status="paused"      contentType="help_request" size="xs" showIcon className="shadow" />}
            {localStatus === 'in_progress' && <StatusBadge status="in_progress" contentType="help_request" size="xs" showIcon className="shadow" />}
            {localStatus === 'closed'      && <StatusBadge status="closed"      contentType="help_request" size="xs" showIcon className="shadow" />}
            {localStatus === 'archived'    && <StatusBadge status="archived"    contentType="help_request" size="xs" showIcon className="shadow" />}
          </div>
        )}
      </div>

      {/* ── CORPS PRINCIPAL ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-4 gap-3">

        {/* Titre */}
        <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">
          {item.title}
        </h3>

        {/* Auteur + date */}
        <div className="flex items-center gap-2">
          <AuthorAvatar name={displayName} color={accent.avatarBg} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
            <div className="flex items-center gap-1.5">
              <LocalTrustBadge author={item.author} />
              <span className="text-xs text-gray-400">{formatRelative(item.created_at)}</span>
            </div>
          </div>
          {/* Compteurs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {helperCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                <Users className="w-3 h-3" />{helperCount}
              </span>
            )}
            {chatCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-violet-600 font-bold">
                <MessageSquare className="w-3 h-3" />{chatCount}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {item.description}
        </p>

        {/* Infos clés — grille 2 col */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-500">
          {item.sector_id && (
            <span className="col-span-2">
              <SectorBadge sectorId={item.sector_id} size="xs" />
            </span>
          )}
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
            {item.location_area}
          </span>
          <span className="flex items-center gap-1.5 truncate">
            <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
            {DURATION_OPTIONS.find(d => d.value === item.duration)?.label ?? item.duration}
          </span>
          {item.help_date && (
            <span className="flex items-center gap-1.5 truncate">
              <Calendar className="w-3 h-3 text-purple-400 flex-shrink-0" />
              {new Date(item.help_date + 'T00:00:00').toLocaleDateString('fr-FR', {
                weekday: 'short', day: 'numeric', month: 'short',
              })}
              {item.help_time ? ` · ${item.help_time}` : ''}
            </span>
          )}
          <span className="flex items-center gap-1.5 truncate">
            <Users className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            {item.persons_needed} personne{item.persons_needed > 1 ? 's' : ''}
          </span>
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-100" />

        {/* Compensation + conditions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${accent.pill}`}>
            {COMPENSATION_CONFIG[item.compensation]?.emoji}{' '}
            {COMPENSATION_CONFIG[item.compensation]?.label}
          </span>
          {item.compensation_detail && (
            <span className="text-xs text-gray-400 italic truncate max-w-[120px]">
              {item.compensation_detail}
            </span>
          )}
          {item.conditions.length > 0 && item.conditions[0] !== 'Rien de particulier' &&
            item.conditions.slice(0, 2).map(c => (
              <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
            ))
          }
          {item.for_who && item.for_who !== 'Pour moi' && (
            <span className="flex items-center gap-1 text-xs text-rose-500">
              <Heart className="w-3 h-3 flex-shrink-0" /> {item.for_who}
            </span>
          )}
        </div>

        {/* Galerie miniatures */}
        {allPhotos.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {allPhotos.slice(0, 4).map((ph, i) => (
              <button
                key={i}
                onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
                className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-300 border border-gray-100"
              >
                <Image
                  src={ph.url}
                  alt={`Photo ${i + 1}`}
                  fill
                  sizes="56px"
                  className="object-cover hover:scale-110 transition-transform duration-300"
                />
                {i === 3 && allPhotos.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-black">+{allPhotos.length - 4}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Voir plus */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors self-start"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" />Moins</>
            : <><ChevronDown className="w-3.5 h-3.5" />Plus de détails</>}
        </button>

        {expanded && (
          <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 border border-gray-100">
            {item.equipment.length > 0 && (
              <p className="text-gray-600">
                <span className="font-semibold">Matériel :</span>{' '}
                {item.equipment.map(e => `🔧 ${e}`).join(' · ')}
              </p>
            )}
            <p className="text-gray-600">
              <span className="font-semibold">Visibilité :</span>{' '}
              {item.visibility === 'public' ? '🌍 Tout le monde' : '🔒 Membres connectés'}
            </p>
            <p className="text-gray-600">
              <span className="font-semibold">Contact :</span>{' '}
              {item.contact_mode === 'messagerie'
                ? '💬 Messagerie plateforme'
                : '📞 Téléphone possible après 1er échange'}
            </p>
          </div>
        )}

        {/* ── ZONE ACTIONS ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 pt-1 mt-auto">

          {isAuthor ? (
            <div className="flex-1 flex flex-col gap-1">
              <p className="text-xs text-gray-400 italic">
                ✉️ Les membres vous contacteront ici
                {helperCount > 0 && (
                  <span className="ml-2 bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full not-italic">
                    {helperCount} helper{helperCount > 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <StatusManagerCDM
                status={localStatus}
                onStatusChange={handleLocalStatusChange}
                onResolve={handleLocalResolve}
                onPause={handleLocalPause}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <ContactButton
                sourceType="help_request"
                sourceId={item.id}
                sourceTitle={item.title}
                ownerId={item.author_id}
                userId={userId}
                size="sm"
              />
              {userId && localStatus === 'active' && (
                <button
                  type="button"
                  onClick={() => onCanHelp(item.id, item.title)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <Check className="w-3 h-3" /> Je peux aider
                </button>
              )}
            </div>
          )}

          {/* Discussion */}
          <button
            type="button"
            onClick={handleOpenChat}
            title="Discussion"
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
              openChat
                ? 'bg-violet-100 text-violet-700 border border-violet-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {chatCount > 0 && (
              <span className="bg-violet-100 text-violet-700 font-black px-1.5 py-0.5 rounded-full text-[10px]">
                {chatCount}
              </span>
            )}
          </button>

          {/* Partager + signaler */}
          <div ref={shareRef} className="relative flex items-center gap-1 flex-shrink-0">
            {userId && !isAuthor && (
              <ReportButton
                targetType="help_request"
                targetId={item.id}
                targetTitle={item.title}
                variant="mini"
              />
            )}
            <button
              type="button"
              onClick={() => setOpenShare(!openShare)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {openShare && (
              <div className="absolute right-0 bottom-9 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-36 overflow-hidden">
                <button
                  type="button"
                  onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                >💬 Par SMS</button>
                <button
                  type="button"
                  onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50"
                >📧 Par Email</button>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success('Lien copié !'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50"
                >🔗 Copier lien</button>
              </div>
            )}
          </div>
        </div>

        {/* ── MINI-FORUM ───────────────────────────────────────────────────── */}
        {openChat && (
          <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">
                Aucun message — démarrez la discussion !
              </p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {comments.map(c => {
                  const canDelete = !!userId && (c.author_id === userId || isAuthor);
                  return (
                    <div key={c.id} className="flex items-start gap-2 group/msg">
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white ${accent.avatarBg}`}>
                        {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 relative">
                        <p className="text-xs font-bold text-gray-700">
                          {c.author?.full_name ?? 'Anonyme'}
                          <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            title="Supprimer ce message"
                            className="absolute top-1 right-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {userId ? (
              <div className="flex items-end gap-1.5">
                <textarea
                  ref={inputRef}
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre message… (Entrée pour envoyer)"
                  rows={2}
                  className="flex-1 text-xs rounded-xl border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!chatText.trim() || sending}
                  className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link
                href="/connexion"
                className="text-xs text-center text-orange-600 font-semibold py-1 hover:underline block"
              >
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── PIED : LIEN DÉTAIL + BOUTONS AUTEUR + NOTATION ─────────────────── */}
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">

        {/* Ligne principale : lien détail + notation */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/coups-de-main/${item.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Voir l&apos;annonce complète
          </Link>

          <div className="flex-shrink-0">
            {item.status === 'resolved' ? (
              <RatingWidget
                targetType="help_request"
                targetId={item.id}
                authorId={item.author_id}
                userId={userId}
                compact={false}
                showPoll
              />
            ) : (
              <RatingWidget
                targetType="help_request"
                targetId={item.id}
                authorId={item.author_id}
                userId={userId}
                compact
              />
            )}
          </div>
        </div>

        {/* Ligne auteur : Modifier + Supprimer */}
        {isAuthor && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
            <Link
              href={`/coups-de-main/${item.id}/modifier`}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </Link>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer
          photos={allPhotos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxOpen(false)}
          title={item.title}
        />
      )}
    </article>
  );
}
