'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  MapPin, Clock, Mountain, Camera, MessageSquare, Footprints, TreePine,
  Heart, ChevronRight, Navigation, Compass, Sun, Plus, Users, Eye,
  Map, Leaf, X, Image as ImageIcon, AlertCircle, Loader2, RefreshCw,
  Send, Pencil, Trash2, Baby, Dog, ParkingSquare, BarChart3,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type Promenade = {
  id: string;
  title: string;
  description: string;
  distance_km: number | null;
  duration_min: number | null;
  difficulty: 'facile' | 'moyen' | 'difficile';
  tags: string[];
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  likes_count?: number;
  user_liked?: boolean;
  views: number;
  created_at: string;
  type: 'balade' | 'randonnee' | 'velo' | 'plage' | 'nature';
  photos?: { url: string }[];
};

type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  created_at: string;
  comment_count?: number;
};

type GroupOuting = {
  id: string;
  title: string;
  description: string | null;
  outing_date: string;
  outing_time: string;
  max_participants: number;
  meeting_point: string | null;
  parking_info: string | null;
  parking_available: boolean;
  stroller_accessible: boolean;
  difficulty: 'facile' | 'moyen' | 'difficile' | null;
  kids_friendly: boolean;
  dogs_allowed: boolean;
  status: string;
  organizer_id: string;
  organizer?: { full_name: string } | null;
  participants_count?: number;
  user_joined?: boolean;
  cover_photo?: string | null;
};

type OutingComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DIFF_CONFIG = {
  facile:    { label: 'Facile',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  moyen:     { label: 'Moyen',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  difficile: { label: 'Difficile', color: 'bg-red-100 text-red-700 border-red-200' },
};

const TYPE_CONFIG = {
  balade:    { icon: Footprints, label: 'Balade',    color: 'text-sky-600',     bg: 'bg-sky-50' },
  randonnee: { icon: Mountain,   label: 'Randonnée', color: 'text-orange-600',  bg: 'bg-orange-50' },
  velo:      { icon: Navigation, label: 'Vélo',      color: 'text-purple-600',  bg: 'bg-purple-50' },
  plage:     { icon: Sun,        label: 'Plage',     color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  nature:    { icon: Leaf,       label: 'Nature',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

function formatDuration(min: number | null) {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

// ─── PromenadeCard ─────────────────────────────────────────────────────────────
function PromenadeCard({
  p, userId, onLike,
}: { p: Promenade; userId?: string; onLike: (id: string, liked: boolean) => void }) {
  const diff = DIFF_CONFIG[p.difficulty];
  const type = TYPE_CONFIG[p.type];
  const TypeIcon = type.icon;
  const firstPhoto = p.photos?.[0]?.url;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group">
      {/* ── Zone photo / header — hauteur fixe 44 ── */}
      <div className="relative h-44 overflow-hidden">
        {firstPhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={firstPhoto} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full ${type.bg} flex items-center justify-center`}>
            <TypeIcon className={`w-14 h-14 opacity-20 ${type.color}`} />
          </div>
        )}
        {/* Overlay gradient bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-white/90 shadow ${type.color}`}>
            <TypeIcon className="w-3 h-3" />{type.label}
          </span>
        </div>
        {/* Difficulté haut droite */}
        <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full border ${diff.color} bg-white/90`}>{diff.label}</span>
        {/* Titre en bas de la photo */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{p.title}</p>
        </div>
      </div>

      <div className="p-5">
        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{p.description}</p>

        {/* Stats */}
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
          {p.distance_km && (
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-500" />{p.distance_km} km</span>
          )}
          {p.duration_min && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-sky-500" />{formatDuration(p.duration_min)}</span>
          )}
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-gray-400" />{p.views}</span>
          <button
            onClick={() => userId && onLike(p.id, !!p.user_liked)}
            className={`flex items-center gap-1 transition-colors ${p.user_liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'} ${!userId ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Heart className={`w-3.5 h-3.5 ${p.user_liked ? 'fill-current' : ''}`} />
            {p.likes_count || 0}
          </button>
        </div>

        {/* Tags */}
        {p.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {p.tags.map(t => (
              <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"># {t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">{p.author?.full_name ?? 'Anonyme'} · {formatRelative(p.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── OutingCard ──────────────────────────────────────────────────────────────
function OutingCard({ outing, userId, isOrganizer, onJoin, onEdit, onDelete, onStatusChange }: {
  outing: GroupOuting;
  userId?: string;
  isOrganizer: boolean;
  onJoin: (id: string, joined: boolean) => void;
  onEdit: (o: GroupOuting) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const fillPct  = Math.round(((outing.participants_count || 0) / outing.max_participants) * 100);
  const isFull   = (outing.participants_count || 0) >= outing.max_participants;
  const dateLabel = new Date(outing.outing_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  const diffConf  = outing.difficulty ? DIFF_CONFIG[outing.difficulty] : null;

  const [openChat, setOpenChat]     = useState(false);
  const [comments, setComments]     = useState<OutingComment[]>([]);
  const [loadingC, setLoadingC]     = useState(false);
  const [chatText, setChatText]     = useState('');
  const [sending,  setSending]      = useState(false);
  const [chatCount,setChatCount]    = useState<number|null>(null);
  const [tableOk,  setTableOk]      = useState<boolean|null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photoItems = outing.cover_photo ? [{ url: outing.cover_photo, isPrimary: true }] : [];
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('outing_comments').select('id', { count:'exact', head:true }).eq('outing_id', outing.id)
      .then(({ count: c, error }) => {
        if (cancelled) return;
        if (error) { setTableOk(false); } else { setTableOk(true); setChatCount(c ?? 0); }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outing.id]);

  const fetchComments = useCallback(async () => {
    setLoadingC(true);
    const { data } = await supabase.from('outing_comments')
      .select('id, content, created_at, author:profiles(full_name)')
      .eq('outing_id', outing.id).order('created_at', { ascending: true }).limit(50);
    setComments((data ?? []) as OutingComment[]);
    setChatCount((data ?? []).length);
    setLoadingC(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outing.id]);

  const handleOpenChat = () => {
    const will = !openChat;
    setOpenChat(will);
    if (will) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); }
  };

  const handleSend = async () => {
    if (!chatText.trim() || !userId || sending) return;
    setSending(true);
    const { error } = await supabase.from('outing_comments')
      .insert({ outing_id: outing.id, author_id: userId, content: chatText.trim() });
    if (!error) { setChatText(''); await fetchComments(); }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* ── Zone photo / header — hauteur fixe 44 ── */}
      <div className="relative h-44 overflow-hidden">
        {outing.cover_photo ? (
          <div className="w-full h-full cursor-pointer" onClick={() => setLightboxOpen(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={outing.cover_photo} alt={outing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
            <Footprints className="w-16 h-16 opacity-15 text-emerald-500" />
          </div>
        )}
        {/* Overlay gradient bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow">
            <Sun className="w-3 h-3" /> {dateLabel} · {outing.outing_time}
          </span>
          {diffConf && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 shadow border ${diffConf.color}`}>
              <BarChart3 className="w-3 h-3 inline mr-1" />{diffConf.label}
            </span>
          )}
          <StatusBadge
            status={outing.status || 'active'}
            contentType="outing"
            extra={{
              outingDate: outing.outing_date,
              isFull,
              fillPct,
            }}
            size="xs" showIcon className="shadow"
          />
        </div>
        {/* Boutons organisateur haut droite */}
        {isOrganizer && (
          <div className="absolute top-3 right-3 flex gap-1">
            <button type="button" onClick={() => onEdit(outing)} className="p-1.5 bg-white/80 text-gray-600 hover:text-emerald-600 rounded-lg transition-all shadow"><Pencil className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onDelete(outing.id)} className="p-1.5 bg-white/80 text-gray-600 hover:text-red-600 rounded-lg transition-all shadow"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {/* Badges bas gauche, titre bas */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex flex-wrap gap-1.5 mb-1">
            {outing.parking_available && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white shadow">
                <ParkingSquare className="w-3 h-3 inline mr-1" />Parking
              </span>
            )}
            {outing.stroller_accessible && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-500 text-white shadow">
                <Baby className="w-3 h-3 inline mr-1" />Poussette
              </span>
            )}
            {outing.kids_friendly && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white shadow">
                <Users className="w-3 h-3 inline mr-1" />Enfants
              </span>
            )}
            {outing.dogs_allowed && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow">
                <Dog className="w-3 h-3 inline mr-1" />Chiens
              </span>
            )}
          </div>
          <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{outing.title}</p>
        </div>
      </div>

      <div className="p-5">
        {outing.description && <p className="text-sm text-gray-500 mb-3 leading-relaxed">{outing.description}</p>}

        {/* Infos */}
        <div className="flex flex-col gap-1 mb-3">
          {outing.meeting_point && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> {outing.meeting_point}
            </p>
          )}
          {outing.parking_info && (
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <ParkingSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> {outing.parking_info}
            </p>
          )}
          <p className="text-xs text-gray-400">Organisé par <span className="font-semibold text-gray-600">{outing.organizer?.full_name ?? 'Membre'}</span></p>
        </div>

        {/* Compteur participants + barre */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={`font-bold flex items-center gap-1 ${isFull ? 'text-red-500' : 'text-emerald-600'}`}>
              <Users className="w-3.5 h-3.5" />
              {outing.participants_count || 0} / {outing.max_participants} participants
              {isFull && ' · Complet'}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${fillPct > 80 ? 'bg-red-400' : fillPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
              style={{ width: `${Math.min(fillPct, 100)}%` }} />
          </div>
        </div>

        {/* Boutons action */}
        <div className="flex gap-2 flex-wrap">
          {userId ? (
            <button onClick={() => onJoin(outing.id, !!outing.user_joined)}
              disabled={isFull && !outing.user_joined}
              className={`inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50 ${
                outing.user_joined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}>
              <Users className="w-4 h-4" />
              {outing.user_joined ? '✓ Inscrit — Annuler' : isFull ? 'Complet' : 'Je participe'}
            </button>
          ) : (
            <Link href="/connexion" className="inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
              <Users className="w-4 h-4" /> Je participe
            </Link>
          )}

          {/* Suivi interaction promenade — ContactButton gère lui-même la redirection /connexion */}
          {isOrganizer ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400 italic">✉️ Les membres vous contacteront ici</span>
              {/* Organizer status actions */}
              {onStatusChange && (() => {
                const s = outing.status;
                const actions: { label: string; key: string; color: string }[] = [];
                if (s === 'active' || s === 'open') {
                  actions.push({ label: '✅ Terminer', key: 'completed', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' });
                  actions.push({ label: '✖ Annuler', key: 'cancelled', color: 'text-red-500 bg-red-50 border-red-200' });
                } else if (s === 'cancelled') {
                  actions.push({ label: '🔄 Réactiver', key: 'active', color: 'text-brand-600 bg-brand-50 border-brand-200' });
                } else if (s === 'completed') {
                  actions.push({ label: '📦 Archiver', key: 'archived', color: 'text-gray-500 bg-gray-50 border-gray-200' });
                }
                return actions.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {actions.map(a => (
                      <button key={a.key} onClick={() => {
                        if (window.confirm(`${a.label} cette sortie ?`)) onStatusChange(outing.id, a.key);
                      }} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${a.color}`}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <ContactButton
              sourceType="outing"
              sourceId={outing.id}
              sourceTitle={outing.title}
              ownerId={outing.organizer_id}
              userId={userId}
              size="sm"
            />
          )}

          {/* Bouton discussion */}
          {tableOk !== false && (
            <button onClick={handleOpenChat}
              className={`inline-flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all border ${
                openChat ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}>
              <MessageSquare className="w-4 h-4" />
              Discussion
              {chatCount !== null && chatCount > 0 && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-1.5 py-0.5 rounded-full">{chatCount}</span>
              )}
            </button>
          )}

          {/* Bouton signaler */}
          {userId && !isOrganizer && (
            <ReportButton targetType="outing" targetId={outing.id} targetTitle={outing.title} variant="mini" />
          )}
        </div>

        {/* Mini-forum */}
        {openChat && tableOk && (
          <div className="mt-3 border-t border-gray-100 pt-3 flex flex-col gap-2">
            {loadingC ? (
              <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2 italic">Aucun message — démarrez la discussion !</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                      style={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
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
                <textarea ref={inputRef} value={chatText} onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Votre message… (Entrée pour envoyer)" rows={2}
                  className="flex-1 text-xs rounded-lg border border-emerald-200 px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white text-gray-700 placeholder-gray-400"
                />
                <button onClick={handleSend} disabled={!chatText.trim() || sending}
                  className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition-all flex-shrink-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="text-xs text-center text-emerald-600 font-semibold py-1 hover:underline block">
                Connectez-vous pour participer →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Notation sortie (si passée) */}
      {new Date(outing.outing_date + 'T23:59:59') < new Date() && (
        <div className="px-4 pb-4">
          <RatingWidget
            targetType="outing"
            targetId={outing.id}
            authorId={outing.organizer_id}
            userId={userId}
            compact={false}
            showPoll
          />
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && photoItems.length > 0 && (
        <PhotoViewer photos={photoItems} initialIndex={0} onClose={() => setLightboxOpen(false)} title={outing.title} />
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function PromenadePage() {
  const { profile } = useAuthStore();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'forum' | 'agenda'>('forum');

  // Lire ?tab=agenda depuis l'URL côté client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'agenda') setActiveTab('agenda');
    }
  }, []);
  const [filter, setFilter] = useState<string>('all');
  const [dbReady, setDbReady] = useState(true);

  // Promenades state
  const [promenades, setPromenades] = useState<Promenade[]>([]);
  const [loadingPromenades, setLoadingPromenades] = useState(true);

  // Forum state
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loadingForum, setLoadingForum] = useState(false);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);

  // Agenda state
  const [outings, setOutings] = useState<GroupOuting[]>([]);
  const [loadingOutings, setLoadingOutings] = useState(false);

  // New promenade form
  const [showForm, setShowForm] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', distance_km: '', duration_min: '',
    difficulty: 'facile', type: 'balade', tags: '', start_point: '',
  });

  // New forum post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // New outing form
  const [showOutingForm, setShowOutingForm]   = useState(false);
  const [editingOuting,  setEditingOuting]    = useState<GroupOuting | null>(null);
  const [outingForm, setOutingForm] = useState({
    title: '', description: '', outing_date: '', outing_time: '09:00',
    max_participants: '10', meeting_point: '',
    parking_info: '', parking_available: false, stroller_accessible: false,
    difficulty: 'facile' as 'facile'|'moyen'|'difficile',
    kids_friendly: false, dogs_allowed: false,
  });
  const [outingPhotos,   setOutingPhotos]     = useState<File[]>([]);
  const [outingPreviews, setOutingPreviews]   = useState<string[]>([]);
  const outingPhotoRef = useRef<HTMLInputElement>(null);
  const [submittingOuting, setSubmittingOuting] = useState(false);

  // ── Fetch promenades ──────────────────────────────────────────────────────
  const fetchPromenades = useCallback(async () => {
    setLoadingPromenades(true);
    try {
      let query = supabase
        .from('promenades')
        .select(`*, author:profiles!promenades_author_id_fkey(full_name, avatar_url), photos:promenade_photos(url)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        if (['balade', 'randonnee', 'velo', 'plage', 'nature'].includes(filter)) {
          query = query.eq('type', filter);
        } else if (['facile', 'moyen', 'difficile'].includes(filter)) {
          query = query.eq('difficulty', filter);
        }
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingPromenades(false);
        return;
      }
      setDbReady(true);

      let enriched = (data || []) as Promenade[];
      if (profile && enriched.length > 0) {
        const ids = enriched.map(p => p.id);
        const { data: likesData } = await supabase
          .from('promenade_likes')
          .select('promenade_id')
          .in('promenade_id', ids)
          .eq('user_id', profile.id);
        const likedSet = new Set((likesData || []).map((l: { promenade_id: string }) => l.promenade_id));

        const { data: countsData } = await supabase
          .from('promenade_likes')
          .select('promenade_id')
          .in('promenade_id', ids);
        const countMap: Record<string, number> = {};
        (countsData || []).forEach((l: { promenade_id: string }) => {
          countMap[l.promenade_id] = (countMap[l.promenade_id] || 0) + 1;
        });
        enriched = enriched.map(p => ({
          ...p,
          user_liked: likedSet.has(p.id),
          likes_count: countMap[p.id] || 0,
        }));
      }
      setPromenades(enriched);
    } catch (err) {
      console.error('fetchPromenades error:', err);
      setDbReady(false);
    }
    setLoadingPromenades(false);
  }, [filter, profile]);

  // ── Fetch forum ───────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    // Get or create promenades forum category
    const { data: cats } = await supabase.from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
    const catId = cats?.id ?? null;
    setForumCategoryId(catId);

    if (!catId) { setLoadingForum(false); return; }

    const { data } = await supabase
      .from('forum_posts')
      .select(`*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
      .eq('category_id', catId)
      .eq('is_closed', false)
      .order('created_at', { ascending: false })
      .limit(20);
    setForumPosts((data as unknown as ForumPost[]) || []);
    setLoadingForum(false);
  }, []);

  // ── Fetch outings ─────────────────────────────────────────────────────────
  const fetchOutings = useCallback(async () => {
    setLoadingOutings(true);
    const { data } = await supabase
      .from('group_outings')
      .select(`*, organizer:profiles!group_outings_organizer_id_fkey(full_name), participants:outing_participants(count)`)
      .in('status', ['open', 'full'])
      .gte('outing_date', new Date().toISOString().split('T')[0])
      .order('outing_date', { ascending: true })
      .limit(20);
    const enriched = (data || []).map((o: GroupOuting & { participants?: { count: number }[] }) => ({
      ...o,
      participants_count: o.participants?.[0]?.count ?? 0,
      user_joined: false,
    }));

    // Load cover photos from outing_photos
    if (enriched.length > 0) {
      const ids = enriched.map(o => o.id);
      const { data: photos } = await supabase
        .from('outing_photos')
        .select('outing_id, url, display_order')
        .in('outing_id', ids)
        .order('display_order', { ascending: true });
      const photoMap: Record<string, string> = {};
      (photos || []).forEach((p: { outing_id: string; url: string }) => {
        if (!photoMap[p.outing_id]) photoMap[p.outing_id] = p.url;
      });
      enriched.forEach(o => { o.cover_photo = photoMap[o.id] ?? null; });
    }

    if (profile && enriched.length > 0) {
      const ids = enriched.map(o => o.id);
      const { data: joins } = await supabase
        .from('outing_participants').select('outing_id')
        .in('outing_id', ids).eq('user_id', profile.id);
      const joinedSet = new Set((joins || []).map((j: { outing_id: string }) => j.outing_id));
      setOutings(enriched.map(o => ({ ...o, user_joined: joinedSet.has(o.id) })));
    } else {
      setOutings(enriched);
    }
    setLoadingOutings(false);
  }, [profile]);

  useEffect(() => { fetchPromenades(); }, [fetchPromenades]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);
  useEffect(() => { if (activeTab === 'agenda') fetchOutings(); }, [activeTab, fetchOutings]);

  // ── Like / Unlike ─────────────────────────────────────────────────────────
  const handleLike = async (id: string, alreadyLiked: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour liker'); return; }
    if (alreadyLiked) {
      await supabase.from('promenade_likes').delete().eq('promenade_id', id).eq('user_id', profile.id);
    } else {
      await supabase.from('promenade_likes').insert({ promenade_id: id, user_id: profile.id });
    }
    setPromenades(prev => prev.map(p => p.id === id ? {
      ...p,
      user_liked: !alreadyLiked,
      likes_count: (p.likes_count || 0) + (alreadyLiked ? -1 : 1),
    } : p));
  };

  // ── Submit promenade ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Titre et description obligatoires');
      return;
    }
    setSubmitting(true);
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const { data: prom, error } = await supabase
      .from('promenades')
      .insert({
        author_id: profile.id,
        title: form.title.trim(),
        description: form.description.trim(),
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        duration_min: form.duration_min ? parseInt(form.duration_min) : null,
        difficulty: form.difficulty,
        type: form.type,
        tags,
        start_point: form.start_point.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la publication');
      console.error(error);
      setSubmitting(false);
      return;
    }

    // Upload photos
    if (photos.length > 0 && prom) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const ext = photo.name.split('.').pop() || 'jpg';
        const fileName = `promenades/${prom.id}/${Date.now()}-${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from('photos')
          .upload(fileName, photo, { upsert: true });
        if (upErr) {
          console.error('[storage] promenade photo upload error:', upErr.message);
          toast.error(`Photo ${i+1} non sauvegardée : ${upErr.message}`);
          continue;
        }
        if (up?.path) {
          const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(up.path);
          const { error: dbErr } = await supabase.from('promenade_photos').insert({
            promenade_id: prom.id, url: publicUrl, display_order: i,
          });
          if (dbErr) console.error('[promenade_photos] insert error:', dbErr.message);
        }
      }
    }

    toast.success('🌿 Itinéraire publié avec succès !', { duration: 4000 });
    setForm({ title: '', description: '', distance_km: '', duration_min: '', difficulty: 'facile', type: 'balade', tags: '', start_point: '' });
    setPhotos([]);
    setShowForm(false);
    fetchPromenades();
    setSubmitting(false);
  };

  // ── Submit forum post ─────────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) {
      toast.error('Titre et contenu requis');
      return;
    }
    setSubmittingPost(true);
    // Récupère la catégorie forum promenades
    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase
        .from('forum_categories').select('id').eq('slug', 'promenades').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) {
      toast.error('Catégorie forum introuvable — la migration SQL doit être exécutée dans Supabase.');
      setSubmittingPost(false); return;
    }
    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId,
      author_id: profile.id,
      title: postForm.title.trim(),
      content: postForm.content.trim(),
    });
    if (error) {
      console.error(error);
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('🎉 Sujet publié dans le forum des promenades !', { duration: 4000 });
      setPostForm({ title: '', content: '' });
      setShowPostForm(false);
      fetchForum();
    }
    setSubmittingPost(false);
  };

  // ── Helpers photo outing ─────────────────────────────────────────────────
  const handleOutingPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 3 - outingPhotos.length);
    setOutingPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setOutingPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };
  const removeOutingPhoto = (i: number) => {
    setOutingPhotos(p => p.filter((_, idx) => idx !== i));
    setOutingPreviews(p => p.filter((_, idx) => idx !== i));
  };
  const resetOutingForm = () => {
    setOutingForm({ title:'', description:'', outing_date:'', outing_time:'09:00', max_participants:'10', meeting_point:'', parking_info:'', parking_available:false, stroller_accessible:false, difficulty:'facile', kids_friendly:false, dogs_allowed:false });
    setOutingPhotos([]); setOutingPreviews([]);
    setEditingOuting(null); setShowOutingForm(false);
  };
  const startEditOuting = (o: GroupOuting) => {
    setEditingOuting(o);
    setOutingForm({
      title: o.title, description: o.description||'', outing_date: o.outing_date,
      outing_time: o.outing_time, max_participants: String(o.max_participants),
      meeting_point: o.meeting_point||'', parking_info: o.parking_info||'',
      parking_available: o.parking_available||false, stroller_accessible: o.stroller_accessible||false,
      difficulty: o.difficulty||'facile', kids_friendly: o.kids_friendly||false,
      dogs_allowed: o.dogs_allowed||false,
    });
    setOutingPhotos([]); setOutingPreviews([]);
    setShowOutingForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior:'smooth' }), 100);
  };
  const handleDeleteOuting = async (id: string) => {
    if (!confirm('Supprimer cette sortie ?')) return;
    await supabase.from('group_outings').delete().eq('id', id);
    toast.success('Sortie supprimée');
    fetchOutings();
  };

  const handleOutingStatusChange = async (id: string, newStatus: string) => {
    const supabase = createClient();
    await supabase.from('group_outings').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    const labels: Record<string, string> = {
      active: 'Ouverte', cancelled: 'Annulée', completed: 'Terminée', archived: 'Archivée',
    };
    toast.success(`✅ Statut : ${labels[newStatus] || newStatus}`);
    fetchOutings();
  };

  // ── Submit outing ─────────────────────────────────────────────────────────
  const handleOutingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!outingForm.title.trim() || !outingForm.outing_date) {
      toast.error('Titre et date obligatoires'); return;
    }
    setSubmittingOuting(true);
    const payload = {
      organizer_id: profile.id,
      title: outingForm.title.trim(),
      description: outingForm.description.trim() || null,
      outing_date: outingForm.outing_date,
      outing_time: outingForm.outing_time,
      max_participants: parseInt(outingForm.max_participants) || 10,
      meeting_point: outingForm.meeting_point.trim() || null,
      parking_info: outingForm.parking_info.trim() || null,
      parking_available: outingForm.parking_available,
      stroller_accessible: outingForm.stroller_accessible,
      difficulty: outingForm.difficulty,
      kids_friendly: outingForm.kids_friendly,
      dogs_allowed: outingForm.dogs_allowed,
    };
    let outingId: string | null = null;
    if (editingOuting) {
      const { error } = await supabase.from('group_outings').update(payload).eq('id', editingOuting.id);
      if (error) { toast.error('Erreur modification'); console.error(error); setSubmittingOuting(false); return; }
      outingId = editingOuting.id;
      toast.success('Sortie modifiée ✓');
    } else {
      const { data: inserted, error } = await supabase.from('group_outings').insert(payload).select('id').single();
      if (error) { toast.error('Erreur création'); console.error(error); setSubmittingOuting(false); return; }
      outingId = inserted?.id ?? null;
      toast.success('🥾 Sortie créée ! Les participants pourront s\'inscrire.', { duration: 4000 });
    }
    // Upload photos
    if (outingPhotos.length > 0 && outingId) {
      for (let i = 0; i < outingPhotos.length; i++) {
        const file = outingPhotos[i];
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const path = `outings/${outingId}/${Date.now()}_${i}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) {
          console.error('[storage] upload error:', upErr.message);
          toast.error(`Photo ${i+1} : ${upErr.message}. Vérifiez le bucket "photos" dans Admin → Migration.`);
          continue;
        }
        if (up?.path) {
          const { data: u } = supabase.storage.from('photos').getPublicUrl(up.path);
          const { error: dbErr } = await supabase.from('outing_photos').insert({ outing_id: outingId, url: u.publicUrl, display_order: i });
          if (dbErr) console.error('[outing_photos] insert error:', dbErr.message);
        }
      }
    }
    resetOutingForm();
    fetchOutings();
    setSubmittingOuting(false);
  };

  // ── Join / Leave outing ───────────────────────────────────────────────────
  const handleJoinOuting = async (outingId: string, joined: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour participer'); return; }
    if (joined) {
      await supabase.from('outing_participants').delete().eq('outing_id', outingId).eq('user_id', profile.id);
      toast.success('Inscription annulée');
    } else {
      const { error } = await supabase.from('outing_participants').insert({ outing_id: outingId, user_id: profile.id });
      if (error) { toast.error('Erreur lors de l\'inscription'); return; }
      toast.success('Inscription confirmée ! L\'organisateur vous contactera.');
    }
    fetchOutings();
  };

  const filteredPromenades = promenades;
  const totalCount = promenades.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-white">

      {/* ── BANNER migration DB ── */}
      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Tables de base de données manquantes</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Exécutez le fichier <code className="bg-amber-100 px-1 rounded font-mono">src/lib/migration_themes.sql</code> dans votre éditeur SQL Supabase pour activer cette page.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <TreePine className="w-5 h-5" />
                </div>
                <span className="text-emerald-100 text-sm font-semibold">Thème · Promenades & Nature</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">
                🌿 Promenades de Biguglia
              </h1>
              <p className="text-emerald-100 text-base sm:text-lg max-w-xl leading-relaxed">
                Itinéraires, balades, sentiers nature, vélo et sorties en famille autour de Biguglia.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                {[
                  { icon: Footprints, label: `${totalCount} itinéraire${totalCount !== 1 ? 's' : ''}` },
                  { icon: TreePine,   label: 'Réserve naturelle' },
                  { icon: Camera,    label: 'Photos partagées' },
                ].map(({ icon: I, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <I className="w-3.5 h-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── ONGLETS ── */}
        <div className="flex gap-2 mb-8 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
          {[
            { id: 'forum',  label: 'Forum',            icon: MessageSquare },
            { id: 'agenda', label: 'Sorties groupées', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
          <Link href="/communaute/promenades"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all text-emerald-600 hover:bg-emerald-50 border border-emerald-100">
            <Users className="w-4 h-4" /> Communauté
          </Link>
        </div>


        {/* ── FORUM ── */}
        {activeTab === 'forum' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Échanges & conseils promenades</h2>
              {profile && (
                <button onClick={() => setShowPostForm(!showPostForm)}
                  className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all text-sm">
                  <Plus className="w-4 h-4" /> Nouveau message
                </button>
              )}
            </div>

            {showPostForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">Nouveau message</h3>
                  <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input type="text" placeholder="Titre (ex: Groupe rando samedi matin...)" required
                  value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <textarea placeholder="Décrivez votre itinéraire, partagez un bon plan, proposez une sortie groupée..."
                  rows={4} value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" required
                />
                <div className="flex gap-2 mt-3">
                  <button type="submit" disabled={submittingPost}
                    className="flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all">
                    {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication...</> : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowPostForm(false)}
                    className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {loadingForum ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              </div>
            ) : !forumCategoryId && !loadingForum ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                <p className="font-bold text-emerald-800 mb-1">Forum temporairement indisponible</p>
                <p className="text-emerald-700 text-sm mb-4">
                  La catégorie forum &quot;Promenades&quot; n&apos;existe pas encore.<br />
                  Exécutez <code className="bg-emerald-100 px-1 rounded font-mono text-xs">migration_themes.sql</code> dans Supabase.
                </p>
                {profile && (
                  <Link href="/forum/nouveau"
                    className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                    <Plus className="w-4 h-4" /> Poster dans le forum général
                  </Link>
                )}
              </div>
            ) : forumPosts.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun message pour l'instant</p>
                {profile && (
                  <button onClick={() => setShowPostForm(true)}
                    className="mt-4 text-emerald-600 font-semibold text-sm hover:underline">
                    Soyez le premier à écrire !
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {forumPosts.map(post => (
                  <Link key={post.id} href={`/forum/${post.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-emerald-200 hover:shadow-sm transition-all">
                    <h3 className="font-bold text-gray-900 mb-2 hover:text-emerald-700 transition-colors">{post.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{post.content}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-2">
                        {post.author && <Avatar src={post.author.avatar_url} name={post.author.full_name} size="xs" />}
                        {post.author?.full_name ?? 'Membre'} · {formatRelative(post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {(post.comment_count as unknown as { count: number }[])?.[0]?.count ?? 0} réponses
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!profile && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <p className="text-emerald-700 font-medium mb-3">Connectez-vous pour participer aux discussions</p>
                <Link href="/connexion" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── SORTIES GROUPÉES ── */}
        {activeTab === 'agenda' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Sorties groupées & rendez-vous nature</h2>
              {profile && (
                <button onClick={() => { resetOutingForm(); setShowOutingForm(!showOutingForm); }}
                  className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                  <Plus className="w-4 h-4" /> {showOutingForm ? 'Annuler' : 'Créer une sortie'}
                </button>
              )}
            </div>

            {/* ── Formulaire sortie ── */}
            {showOutingForm && profile && (
              <form onSubmit={handleOutingSubmit} className="bg-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">{editingOuting ? '✏️ Modifier la sortie' : '🥾 Organiser une sortie'}</h3>
                  <button type="button" onClick={resetOutingForm} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                  {/* Titre */}
                  <input type="text" placeholder="Titre de la sortie *" required
                    value={outingForm.title} onChange={e => setOutingForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  {/* Date + Heure */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                      <input type="date" required value={outingForm.outing_date}
                        onChange={e => setOutingForm(f => ({ ...f, outing_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Heure</label>
                      <input type="time" value={outingForm.outing_time}
                        onChange={e => setOutingForm(f => ({ ...f, outing_time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                  </div>
                  {/* Difficulté */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Niveau de difficulté</label>
                    <div className="flex gap-2">
                      {(['facile','moyen','difficile'] as const).map(d => (
                        <button key={d} type="button"
                          onClick={() => setOutingForm(f => ({ ...f, difficulty: d }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            outingForm.difficulty === d
                              ? d === 'facile' ? 'bg-emerald-500 text-white border-emerald-500'
                                : d === 'moyen' ? 'bg-amber-400 text-white border-amber-400'
                                : 'bg-red-500 text-white border-red-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}>
                          {d === 'facile' ? '🟢 Facile' : d === 'moyen' ? '🟡 Moyen' : '🔴 Difficile'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* RDV */}
                  <input type="text" placeholder="Point de rendez-vous"
                    value={outingForm.meeting_point} onChange={e => setOutingForm(f => ({ ...f, meeting_point: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  {/* Nb participants */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre max de participants</label>
                    <input type="number" min="2" max="100"
                      value={outingForm.max_participants} onChange={e => setOutingForm(f => ({ ...f, max_participants: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  {/* Options — 4 toggles */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Options</label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Parking */}
                      <button type="button"
                        onClick={() => setOutingForm(f => ({ ...f, parking_available: !f.parking_available }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${outingForm.parking_available ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        <ParkingSquare className="w-4 h-4 flex-shrink-0" />
                        <span>Parking disponible</span>
                      </button>
                      {/* Accès poussette */}
                      <button type="button"
                        onClick={() => setOutingForm(f => ({ ...f, stroller_accessible: !f.stroller_accessible }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${outingForm.stroller_accessible ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        <Baby className="w-4 h-4 flex-shrink-0" />
                        <span>Accès poussette</span>
                      </button>
                      {/* Enfants */}
                      <button type="button"
                        onClick={() => setOutingForm(f => ({ ...f, kids_friendly: !f.kids_friendly }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${outingForm.kids_friendly ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>Adapté enfants</span>
                      </button>
                      {/* Chiens */}
                      <button type="button"
                        onClick={() => setOutingForm(f => ({ ...f, dogs_allowed: !f.dogs_allowed }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${outingForm.dogs_allowed ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        <Dog className="w-4 h-4 flex-shrink-0" />
                        <span>Chiens acceptés</span>
                      </button>
                    </div>
                  </div>
                  {/* Parking texte (conditionnel) */}
                  {outingForm.parking_available && (
                    <input type="text" placeholder="Détails parking (ex: parking gratuit route forestière)"
                      value={outingForm.parking_info} onChange={e => setOutingForm(f => ({ ...f, parking_info: e.target.value }))}
                      className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-blue-50/40"
                    />
                  )}
                  {/* Description */}
                  <textarea placeholder="Description (itinéraire, conseils, équipement conseillé…)"
                    rows={3} value={outingForm.description} onChange={e => setOutingForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  {/* Photos */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Photos (max 3)</label>
                    <div className="flex gap-2 flex-wrap">
                      {outingPreviews.map((src, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeOutingPhoto(i)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {outingPhotos.length < 3 && (
                        <button type="button" onClick={() => outingPhotoRef.current?.click()}
                          className="w-20 h-20 rounded-xl border-2 border-dashed border-emerald-300 flex flex-col items-center justify-center text-emerald-400 hover:bg-emerald-50 transition-all">
                          <Camera className="w-5 h-5" />
                          <span className="text-xs mt-1">Photo</span>
                        </button>
                      )}
                    </div>
                    <input ref={outingPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleOutingPhotoSelect} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" disabled={submittingOuting}
                    className="flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all">
                    {submittingOuting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {editingOuting ? 'Modification...' : 'Création...'}</> : editingOuting ? '✓ Enregistrer' : '🥾 Créer la sortie'}
                  </button>
                  <button type="button" onClick={resetOutingForm} className="px-5 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {loadingOutings ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-emerald-400 animate-spin" /></div>
            ) : outings.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucune sortie groupée prévue</p>
                {profile ? (
                  <button onClick={() => setShowOutingForm(true)}
                    className="mt-4 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                    <Plus className="w-4 h-4" /> Organiser une sortie
                  </button>
                ) : (
                  <Link href="/connexion" className="mt-4 inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                    Se connecter pour créer une sortie
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {outings.map(outing => (
                  <OutingCard
                    key={outing.id}
                    outing={outing}
                    userId={profile?.id}
                    isOrganizer={profile?.id === outing.organizer_id}
                    onJoin={handleJoinOuting}
                    onEdit={startEditOuting}
                    onDelete={handleDeleteOuting}
                    onStatusChange={handleOutingStatusChange}
                  />
                ))}
              </div>
            )}

            {!profile && outings.length > 0 && (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <p className="text-emerald-700 font-medium mb-3">Connectez-vous pour rejoindre ou créer une sortie</p>
                <Link href="/connexion" className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-600 transition-all">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
