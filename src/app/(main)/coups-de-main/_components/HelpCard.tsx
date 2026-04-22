'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Heart, Users, Clock, MapPin, Calendar, MessageSquare, Send,
  Loader2, CheckCircle2, Pencil, Trash2, Share2,
  ChevronDown, ChevronUp, HandHeart, Pause, Play, Check,
  Bookmark, BookmarkCheck, Flame, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import GlobalTrustBadge from '@/components/ui/TrustBadge';
import dynamic from 'next/dynamic';
import { toPhotoItems } from '@/components/ui/photo-utils';
// PhotoViewer (lightbox 572L) : lazy-load — chargé uniquement au premier clic
const PhotoViewer = dynamic(() => import('@/components/ui/PhotoViewer').then(m => ({ default: m.PhotoViewer })), {
  ssr: false,
});
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { TYPE_CONFIG, URGENCY_CONFIG, CATEGORIES, DURATION_OPTIONS, COMPENSATION_CONFIG } from '../_constants';
import type { HelpRequest, HelpComment, HelpStatus, DisplayName } from '../_types';
import StatusManagerCDM from './StatusManagerCDM';

// ── Helpers locaux ────────────────────────────────────────────────────────────
function getDisplayName(author: HelpRequest['author'], mode: DisplayName): string {
  if (!author?.full_name) return 'Membre';
  const parts = author.full_name.trim().split(' ');
  if (mode === 'prenom') return parts[0];
  if (mode === 'prenom_initiale') return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
  return author.full_name;
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

// ─── HelpCard ─────────────────────────────────────────────────────────────────
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

export default function HelpCard({
  item, userId, isAuthor, onEdit, onDelete, onResolve, onPause, onStatusChange,
  savedIds, onToggleSave, onCanHelp,
}: Props) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const _router = useRouter();
  const [openChat, setOpenChat] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<HelpComment[]>([]);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCount, setChatCount] = useState(item.comment_count ?? 0);
  const [helperCount, setHelperCount] = useState(item.helper_count ?? 0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  const typeConf = TYPE_CONFIG[item.help_type];
  const urgConf = URGENCY_CONFIG[item.urgency];
  const catConf = CATEGORIES.find(c => c.value === item.category);
  const CatIcon = catConf?.icon ?? HandHeart;
  const coverPhoto = item.photos?.[0]?.url;
  const allPhotos = toPhotoItems(item.photos ?? []);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [localStatus, setLocalStatus] = useState(item.status);
  const isPaused = localStatus === 'paused';
  const isResolved = localStatus === 'resolved';
  const isSaved = savedIds.has(item.id);
  const isUrgent = item.urgency === 'urgent';

  useEffect(() => {
    supabase.from('help_comments').select('id', { count: 'exact', head: true })
      .eq('help_id', item.id)
      .then(({ count }) => setChatCount(count ?? 0));
    supabase.from('help_request_participants').select('id', { count: 'exact', head: true })
      .eq('help_request_id', item.id).eq('role', 'helper')
      .then(({ count }) => setHelperCount(count ?? 0));
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setOpenShare(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [item.id, supabase]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase.from('help_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('help_id', item.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as HelpComment[]);
    setChatCount((data ?? []).length);
  }, [item.id, supabase]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    await supabase.from('help_comments').insert({ help_id: item.id, author_id: userId, content: chatText.trim() });
    setChatText('');
    await fetchComments();
    setSending(false);
  };

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/coups-de-main/${item.id}`;
  const shareText = encodeURIComponent(`${typeConf.emoji} ${item.title} — ${item.location_area}\n${shareUrl}`);

  // Resolve and pause actions are handled locally then delegated up
  const handleLocalResolve = () => { setLocalStatus('resolved'); onResolve(item.id); };
  const handleLocalPause = () => {
    const wasPaused = localStatus === 'paused';
    setLocalStatus(wasPaused ? 'active' : 'paused');
    onPause(item.id, wasPaused);
  };
  const handleLocalStatusChange = (newStatus: string) => {
    setLocalStatus(newStatus as HelpStatus);
    onStatusChange(item.id, newStatus);
  };

  return (
    <div
      id={item.id}
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-colors overflow-hidden group ${
        isResolved ? 'opacity-60 border-gray-200' : isPaused ? 'border-gray-300' :
        item.help_type === 'demande' ? 'border-orange-200' :
        item.help_type === 'offre'   ? 'border-emerald-200' :
                                       'border-blue-200'
      }`}
    >
      {/* ── Urgent banner ── */}
      {isUrgent && localStatus === 'active' && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black px-4 py-1.5 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 flex-shrink-0" />
          URGENT — Aide recherchée aujourd&apos;hui
        </div>
      )}

      {/* ── Zone photo / header ── */}
      <div className="relative h-44 overflow-hidden">
        {coverPhoto ? (
          <div className="w-full h-full cursor-pointer" role="button" tabIndex={0} onClick={() => { setLightboxIdx(0); setLightboxOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIdx(0); setLightboxOpen(true); } }}>
            <Image src={coverPhoto} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                +{allPhotos.length - 1} photo{allPhotos.length > 2 ? 's' : ''}
              </div>
            )}
          </div>
        ) : (
          <div className={`w-full h-full ${typeConf.bg} flex items-center justify-center`}>
            <CatIcon className={`w-16 h-16 opacity-15 ${typeConf.color}`} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`text-xs font-black px-2.5 py-1 rounded-full shadow ${
            item.help_type === 'demande' ? 'bg-orange-500 text-white' :
            item.help_type === 'offre'   ? 'bg-emerald-500 text-white' :
                                           'bg-blue-500 text-white'
          }`}>{typeConf.emoji} {typeConf.label}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 shadow ${urgConf.color}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${urgConf.dotColor} mr-1`} />
            {urgConf.label}
          </span>
          {localStatus === 'resolved'    && <StatusBadge status="resolved"    contentType="help_request" size="xs" showIcon className="shadow" />}
          {localStatus === 'paused'      && <StatusBadge status="paused"      contentType="help_request" size="xs" showIcon className="shadow" />}
          {localStatus === 'in_progress' && <StatusBadge status="in_progress" contentType="help_request" size="xs" showIcon className="shadow" />}
          {localStatus === 'closed'      && <StatusBadge status="closed"      contentType="help_request" size="xs" showIcon className="shadow" />}
          {localStatus === 'archived'    && <StatusBadge status="archived"    contentType="help_request" size="xs" showIcon className="shadow" />}
          {localStatus === 'active'      && <StatusBadge status="open"        contentType="help_request" size="xs" showDot showIcon className="shadow" />}
        </div>

        {/* Boutons auteur + favoris haut droite */}
        <div className="absolute top-3 right-3 flex gap-1">
          {userId && (
            <button type="button" onClick={() => onToggleSave(item.id)}
              title={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="p-1.5 bg-white/80 rounded-lg transition-transform shadow backdrop-blur-sm hover:scale-110">
              {isSaved
                ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                : <Bookmark className="w-3.5 h-3.5 text-gray-500 hover:text-amber-500" />}
            </button>
          )}
          {isAuthor && (
            <>
              {!isResolved && (
                <button type="button" onClick={handleLocalResolve} title="Marquer résolu"
                  className="p-1.5 bg-white/80 text-gray-600 hover:text-emerald-600 rounded-lg transition-[colors,opacity] shadow backdrop-blur-sm opacity-0 group-hover:opacity-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button type="button" onClick={handleLocalPause} title={isPaused ? 'Réactiver' : 'Mettre en pause'}
                className="p-1.5 bg-white/80 text-gray-600 hover:text-amber-600 rounded-lg transition-[colors,opacity] shadow backdrop-blur-sm opacity-0 group-hover:opacity-100">
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button type="button" onClick={() => onEdit(item)}
                className="p-1.5 bg-white/80 text-gray-600 hover:text-blue-600 rounded-lg transition-[colors,opacity] shadow backdrop-blur-sm opacity-0 group-hover:opacity-100">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => onDelete(item.id)}
                className="p-1.5 bg-white/80 text-gray-600 hover:text-red-600 rounded-lg transition-[colors,opacity] shadow backdrop-blur-sm opacity-0 group-hover:opacity-100">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Titre + catégorie bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CatIcon className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
            <span className="text-white/80 text-xs font-semibold">{catConf?.label ?? item.category}</span>
          </div>
          <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{item.title}</p>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="p-5">
        {/* Auteur + trust badge */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
            style={{
              background: item.help_type === 'demande'
                ? 'linear-gradient(135deg,#f97316,#fb923c)'
                : item.help_type === 'offre'
                  ? 'linear-gradient(135deg,#10b981,#34d399)'
                  : 'linear-gradient(135deg,#3b82f6,#60a5fa)',
            }}
          >
            {getDisplayName(item.author, item.display_name)[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-xs font-semibold text-gray-700">{getDisplayName(item.author, item.display_name)}</span>
          <LocalTrustBadge author={item.author} />
          <span className="ml-auto text-xs text-gray-400">{formatRelative(item.created_at)}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{item.description}</p>

        {/* Infos pratiques */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 text-xs text-gray-500">
          {item.sector_id && <SectorBadge sectorId={item.sector_id} size="xs" />}
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />{item.location_area}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
            {DURATION_OPTIONS.find(d => d.value === item.duration)?.label ?? item.duration}
          </span>
          {item.help_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400 flex-shrink-0" />
              {new Date(item.help_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              {item.help_time ? ` · ${item.help_time}` : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            {item.persons_needed} personne{item.persons_needed > 1 ? 's' : ''}
          </span>
        </div>

        {/* Compensation */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeConf.bg} ${typeConf.color} border ${typeConf.border}`}>
            {COMPENSATION_CONFIG[item.compensation]?.emoji} {COMPENSATION_CONFIG[item.compensation]?.label}
          </span>
          {item.compensation_detail && (
            <span className="text-xs text-gray-500 italic">· {item.compensation_detail}</span>
          )}
        </div>

        {/* Conditions */}
        {item.conditions.length > 0 && item.conditions[0] !== 'Rien de particulier' && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.conditions.map(c => (
              <span key={c} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
        )}

        {/* Pour qui */}
        {item.for_who && item.for_who !== 'Pour moi' && (
          <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-400 flex-shrink-0" /> {item.for_who}
          </p>
        )}

        {/* Matériel */}
        {item.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.equipment.map(e => (
              <span key={e} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">🔧 {e}</span>
            ))}
          </div>
        )}

        {/* Galerie miniatures */}
        {allPhotos.length > 1 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            {allPhotos.slice(1).map((ph, i) => (
              <button key={i} onClick={() => { setLightboxIdx(i + 1); setLightboxOpen(true); }}
                className="flex-shrink-0 focus:outline-none">
                <Image src={ph.url} alt="" fill className="object-cover rounded-lg border border-gray-100 hover:border-orange-300 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Bouton voir plus / lien détail */}
        <div className="flex items-center gap-3 mb-3">
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1">
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" />Moins</>
              : <><ChevronDown className="w-3.5 h-3.5" />Plus de détails</>}
          </button>
          <Link href={`/coups-de-main/${item.id}`}
            className="ml-auto text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1">
            Voir l&apos;annonce <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {expanded && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 text-xs space-y-1.5">
            <p className="text-gray-600"><span className="font-semibold">Pour :</span> {item.for_who}</p>
            <p className="text-gray-600"><span className="font-semibold">Visibilité :</span> {item.visibility === 'public' ? '🌍 Tout le monde' : '🔒 Membres connectés'}</p>
            <p className="text-gray-600"><span className="font-semibold">Contact :</span> {item.contact_mode === 'messagerie' ? '💬 Messagerie plateforme' : '📞 Téléphone possible après 1er échange'}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          {isAuthor ? (
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 italic">✉️ Les membres vous contacteront ici</span>
                {helperCount > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                    {helperCount} helper{helperCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <StatusManagerCDM
                status={localStatus}
                onStatusChange={handleLocalStatusChange}
                onResolve={handleLocalResolve}
                onPause={handleLocalPause}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center gap-2">
                <ContactButton
                  sourceType="help_request"
                  sourceId={item.id}
                  sourceTitle={item.title}
                  ownerId={item.author_id}
                  userId={userId}
                  size="sm"
                />
                {userId && localStatus === 'active' && (
                  <button type="button" onClick={() => onCanHelp(item.id, item.title)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    <Check className="w-3 h-3" />
                    Je peux aider
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Discussion */}
          <button type="button" onClick={handleOpenChat}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0 ${
              openChat ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <MessageSquare className="w-3.5 h-3.5" />
            {chatCount > 0 && <span className="bg-violet-100 text-violet-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>}
          </button>

          {/* Partager + signaler */}
          <div ref={shareRef} className="relative flex items-center gap-1 flex-shrink-0">
            {userId && !isAuthor && (
              <ReportButton targetType="help_request" targetId={item.id} targetTitle={item.title} variant="mini" />
            )}
            <button type="button" onClick={() => setOpenShare(!openShare)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
            {openShare && (
              <div className="absolute right-0 bottom-8 bg-white rounded-xl shadow-lg border border-gray-100 z-20 min-w-36 overflow-hidden">
                <button type="button" onClick={() => { window.open(`sms:?body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">💬 Par SMS</button>
                <button type="button" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(item.title)}&body=${shareText}`, '_self'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">📧 Par Email</button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(shareUrl); toast.success('Lien copié !'); setOpenShare(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">🔗 Copier lien</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Mini-forum ── */}
        {openChat && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — démarrez la discussion !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#f97316,#fb923c)' }}>
                      {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
                      <p className="text-xs font-bold text-gray-700">
                        {c.author?.full_name ?? 'Anonyme'}
                        <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                ))}
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
                  className="flex-1 text-xs rounded-lg border border-orange-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button type="button" onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 disabled:opacity-40 transition-colors flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-orange-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Notation */}
      <div className="mt-3 px-5 pb-5 border-t border-gray-100 pt-3">
        {item.status === 'resolved' ? (
          <RatingWidget targetType="help_request" targetId={item.id} authorId={item.author_id} userId={userId} compact={false} showPoll />
        ) : (
          <RatingWidget targetType="help_request" targetId={item.id} authorId={item.author_id} userId={userId} compact />
        )}
      </div>

      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoViewer photos={allPhotos} initialIndex={lightboxIdx} onClose={() => setLightboxOpen(false)} title={item.title} />
      )}
    </div>
  );
}
