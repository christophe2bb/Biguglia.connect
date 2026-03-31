'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Calendar, MapPin, Clock, Users, Plus, MessageSquare, ChevronRight,
  Music, Utensils, Dumbbell, Heart, Palette,
  PartyPopper, CheckCircle, Bell, ArrowRight,
  AlertCircle, Baby, Mic2, X, Loader2, RefreshCw, ImageIcon, Trash2,
  ChevronLeft, Send,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
type LocalEvent = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  category: string;
  organizer_name: string | null;
  author_id: string;
  author?: { full_name: string; avatar_url?: string } | null;
  max_participants: number | null;
  is_free: boolean;
  price: number | null;
  tags: string[];
  is_official: boolean;
  status: string;
  participants_count?: number;
  user_joined?: boolean;
  participants_list?: { user_id: string; user?: { full_name: string; avatar_url?: string } }[];
  cover_photo?: string | null;
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

// ─── Catégories d'événements ──────────────────────────────────────────────────
type EventCat = { id: string; label: string; icon: React.ElementType; color: string; bg: string; border: string; dot: string };
const EVENT_CATEGORIES: EventCat[] = [
  { id: 'culture',    label: 'Culture & arts',  icon: Palette,     color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-500' },
  { id: 'musique',    label: 'Musique',          icon: Music,       color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',   dot: 'bg-pink-500' },
  { id: 'repas',      label: 'Repas & fête',     icon: Utensils,    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500' },
  { id: 'nature',     label: 'Nature & sport',   icon: Dumbbell,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500' },
  { id: 'famille',    label: 'Famille',          icon: Baby,        color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',    dot: 'bg-sky-500' },
  { id: 'social',     label: 'Vie sociale',      icon: Heart,       color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500' },
  { id: 'conference', label: 'Conférence',       icon: Mic2,        color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   dot: 'bg-teal-500' },
];

function getCat(id: string) {
  return EVENT_CATEGORIES.find(c => c.id === id) ?? EVENT_CATEGORIES[0];
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return null;
  if (diff === 0) return "Aujourd'hui !";
  if (diff === 1) return 'Demain';
  return `Dans ${diff} j.`;
}

// ─── Mini-forum par événement ─────────────────────────────────────────────────
type EventComment = {
  id: string;
  content: string;
  created_at: string;
  author?: { full_name?: string; avatar_url?: string } | null;
};

function EventMiniForum({ eventId, userId, catColor, catBg, catBorder }: {
  eventId: string;
  userId?: string;
  catColor: string;
  catBg: string;
  catBorder: string;
}) {
  // Stabiliser le client supabase — ne pas le recréer à chaque render
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [open, setOpen]           = useState(false);
  const [comments, setComments]   = useState<EventComment[]>([]);
  const [loading, setLoading]     = useState(false);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [count, setCount]         = useState<number | null>(null);
  const [tableOk, setTableOk]     = useState<boolean | null>(null); // null = inconnu
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Vérifier si la table existe + charger le compteur
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('event_comments')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .then(({ count: c, error }) => {
        if (cancelled) return;
        if (error) {
          // table absente ou erreur RLS → on masque le composant
          setTableOk(false);
        } else {
          setTableOk(true);
          setCount(c ?? 0);
        }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_comments')
      .select('id, content, created_at, author:profiles(full_name, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (!error) {
      setComments((data ?? []) as EventComment[]);
      setCount((data ?? []).length);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleOpen = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      fetchComments();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !userId || sending) return;
    setSending(true);
    const { error } = await supabase
      .from('event_comments')
      .insert({ event_id: eventId, author_id: userId, content: text.trim() });
    if (!error) {
      setText('');
      await fetchComments();
    }
    setSending(false);
  };

  // Table pas encore créée → ne pas afficher le composant
  if (tableOk === false) return null;

  return (
    <div className="border-t border-gray-100 mt-2 pt-2">
      {/* Bouton toggle */}
      <button
        onClick={handleOpen}
        className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg w-full transition-all
          ${open ? `${catBg} ${catColor} border ${catBorder}` : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
      >
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Discussion</span>
        {count !== null && count > 0 && (
          <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${open ? 'bg-white/70 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>
            {count}
          </span>
        )}
        <span className="ml-auto text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {/* Panel commentaires */}
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2 italic">
              Aucun message — soyez le premier à démarrer la discussion !
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  {/* Avatar initiale */}
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)' }}
                  >
                    {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-xs font-bold text-gray-700 leading-tight">
                      {c.author?.full_name ?? 'Anonyme'}
                      <span className="font-normal text-gray-400 ml-1.5 text-xs">{formatRelative(c.created_at)}</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Zone de saisie */}
          {userId ? (
            <div className="flex items-end gap-1.5">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Votre message… (Entrée pour envoyer)"
                rows={2}
                className={`flex-1 text-xs rounded-lg border px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all bg-white text-gray-700 placeholder-gray-400 ${catBorder}`}
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className={`p-2 rounded-lg transition-all flex-shrink-0 disabled:opacity-40 ${catBg} ${catColor} border ${catBorder} hover:opacity-80`}
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <Link href="/connexion" className="text-xs text-center text-purple-600 font-semibold py-1 hover:underline block">
              Connectez-vous pour participer →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EventCard (utilisée dans Proposer + panel jour) ─────────────────────────
function EventCard({
  event, userId, onJoin, compact = false,
}: { event: LocalEvent; userId?: string; onJoin: (id: string, joined: boolean) => void; compact?: boolean }) {
  const cat = getCat(event.category);
  const CatIcon = cat.icon;
  const dateLabel = formatEventDate(event.event_date);
  const countdown = daysUntil(event.event_date);
  const fillPct = event.max_participants && event.participants_count !== undefined
    ? Math.round((event.participants_count / event.max_participants) * 100) : null;
  const isFull = event.max_participants !== null && (event.participants_count ?? 0) >= event.max_participants;

  if (compact) {
    const isPastEvent = new Date(event.event_date + 'T23:59:59') < new Date();
    const participantCount = event.participants_count ?? 0;

    return (
      <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${isPastEvent ? 'opacity-50 grayscale border-gray-100' : 'border-gray-100'}`}>
        {/* Photo — masquée si événement passé */}
        {event.cover_photo && !isPastEvent && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={event.cover_photo} alt={event.title} className="w-full h-28 object-cover" />
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`} />
            <span className={`text-xs font-bold ${cat.color}`}>{cat.label}</span>
            {isPastEvent
              ? <span className="ml-auto text-xs text-gray-400 italic">Terminé</span>
              : countdown && <span className="ml-auto text-xs text-gray-400 font-medium">{countdown}</span>
            }
          </div>
          <p className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">{event.title}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <Clock className="w-3 h-3 flex-shrink-0" />{event.event_time}
            <span className="mx-1">·</span>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>

          {/* ── Compteur participants ── */}
          <div className={`flex items-center gap-1.5 text-xs mb-2 px-2 py-1.5 rounded-lg ${participantCount > 0 ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400'}`}>
            <Users className="w-3 h-3 flex-shrink-0" />
            {participantCount > 0
              ? <span className="font-semibold">{participantCount} participant{participantCount > 1 ? 's' : ''}{event.max_participants ? ` / ${event.max_participants}` : ''}</span>
              : <span>Soyez le premier à participer</span>
            }
            {isFull && <span className="ml-auto font-bold text-red-500">Complet</span>}
          </div>
          {/* Barre de progression */}
          {event.max_participants && fillPct !== null && !isPastEvent && (
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${fillPct > 80 ? 'bg-red-400' : fillPct > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(fillPct, 100)}%` }}
              />
            </div>
          )}

          {!isPastEvent && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <span className={`text-xs font-bold ${event.is_free ? 'text-emerald-600' : 'text-purple-600'}`}>
                {event.is_free ? 'Gratuit' : `${event.price} €`}
              </span>
              {userId ? (
                <button onClick={() => onJoin(event.id, !!event.user_joined)} disabled={isFull && !event.user_joined}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 ${
                    event.user_joined ? 'bg-gray-100 text-gray-600' : `${cat.bg} ${cat.color} border ${cat.border}`
                  }`}>
                  {event.user_joined ? '✓ Inscrit' : isFull ? 'Complet' : 'Participer'}
                </button>
              ) : (
                <Link href="/connexion" className={`text-xs font-bold px-2.5 py-1 rounded-lg ${cat.bg} ${cat.color} border ${cat.border}`}>
                  Participer
                </Link>
              )}
            </div>
          )}

          {/* ── Mini-forum de l'événement ── */}
          <EventMiniForum
            eventId={event.id}
            userId={userId}
            catColor={cat.color}
            catBg={cat.bg}
            catBorder={cat.border}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group">
      {event.cover_photo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={event.cover_photo} alt={event.title} className="w-full h-36 object-cover" />
      )}
      <div className={`${cat.bg} px-5 pt-4 pb-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white rounded-xl shadow-sm">
              <CatIcon className={`w-4 h-4 ${cat.color}`} />
            </div>
            <span className={`text-xs font-bold ${cat.color}`}>{cat.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {event.is_official && (
              <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Officiel
              </span>
            )}
            {countdown && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countdown.includes('Aujourd') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                {countdown}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-sm mb-2 leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">{event.title}</h3>
        <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">{event.description}</p>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            <span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
            <span>{event.event_time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {(event.participants_count ?? 0) > 0 && (
          <div className="mb-4 bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-500" />
                {event.participants_count} participant{(event.participants_count ?? 0) > 1 ? 's' : ''}
                {event.max_participants ? ` / ${event.max_participants}` : ''}
              </span>
              {isFull && <span className="text-xs text-red-500 font-bold">⚠️ Complet</span>}
            </div>
            {event.participants_list && event.participants_list.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {event.participants_list.slice(0, 8).map((p, i) => (
                  <div key={p.user_id ?? i} title={p.user?.full_name ?? 'Participant'}
                    className="w-7 h-7 rounded-full border-2 border-white shadow-sm bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.user?.avatar_url
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={p.user.avatar_url} alt={p.user.full_name} className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-purple-600">{(p.user?.full_name ?? '?').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                ))}
                {(event.participants_count ?? 0) > 8 && (
                  <span className="text-xs text-gray-500 font-semibold ml-1">+{(event.participants_count ?? 0) - 8} autres</span>
                )}
              </div>
            )}
            {event.max_participants && (
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${fillPct! > 80 ? 'bg-red-400' : fillPct! > 50 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(fillPct ?? 0, 100)}%` }} />
              </div>
            )}
          </div>
        )}

        {(event.participants_count ?? 0) === 0 && (
          <div className="mb-4 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Soyez le premier à participer !
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className={`text-sm font-black ${event.is_free ? 'text-emerald-600' : 'text-purple-600'}`}>
            {event.is_free ? '🎟️ Gratuit' : `${event.price} €`}
          </span>
          {userId ? (
            <button onClick={() => onJoin(event.id, !!event.user_joined)} disabled={isFull && !event.user_joined}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 ${
                event.user_joined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : `${cat.bg} ${cat.color} border ${cat.border} hover:shadow-sm`
              }`}>
              <Bell className="w-3.5 h-3.5" />
              {event.user_joined ? 'Inscrit ✓' : isFull ? 'Complet' : 'Je participe'}
            </button>
          ) : (
            <Link href="/connexion" className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${cat.bg} ${cat.color} border ${cat.border}`}>
              <Bell className="w-3.5 h-3.5" /> Participer
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Calendrier clair & animé ───────────────────────────────────────────────
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Couleur pastel par catégorie (fond clair)
const CAT_PASTEL: Record<string, { bg: string; ring: string; text: string; emoji: string }> = {
  culture:    { bg: '#f3e8ff', ring: '#c084fc', text: '#7e22ce', emoji: '🎭' },
  musique:    { bg: '#fce7f3', ring: '#f472b6', text: '#be185d', emoji: '🎵' },
  repas:      { bg: '#fff7ed', ring: '#fb923c', text: '#c2410c', emoji: '🍽️' },
  nature:     { bg: '#ecfdf5', ring: '#34d399', text: '#065f46', emoji: '🌿' },
  famille:    { bg: '#e0f2fe', ring: '#38bdf8', text: '#0369a1', emoji: '👨‍👩‍👧' },
  social:     { bg: '#fff1f2', ring: '#fb7185', text: '#be123c', emoji: '🎉' },
  conference: { bg: '#f0fdfa', ring: '#2dd4bf', text: '#0f766e', emoji: '🎤' },
};

function AnimatedEventCell({
  date, dayEvents, isToday, isPast, isSelected, onSelect,
}: {
  date: Date;
  dayEvents: LocalEvent[];
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasEvents = dayEvents.length > 0;
  const upcomingEvents = dayEvents.filter(() => !isPast);
  const firstEv  = upcomingEvents[0] ?? dayEvents[0];
  const cat      = firstEv ? getCat(firstEv.category) : null;
  const pastel   = cat ? (CAT_PASTEL[cat.id] ?? CAT_PASTEL.culture) : null;
  const hasCover = !!firstEv?.cover_photo;
  const showAnim = hasEvents && !isPast;
  const pc       = firstEv?.participants_count ?? 0;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={showAnim ? 'cal-cell-event' : ''}
      style={{
        position: 'relative',
        height: '9rem',
        borderRight: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s ease',
        background: isSelected
          ? (pastel?.bg ?? '#faf5ff')
          : showAnim
            ? (hovered ? (pastel?.bg ?? '#faf5ff') : 'white')
            : isPast ? '#fafafa' : 'white',
        transform: hovered && showAnim ? 'scale(1.04) translateZ(0)' : 'scale(1)',
        boxShadow: isSelected
          ? `0 0 0 2.5px ${pastel?.ring ?? '#a855f7'} inset, 0 6px 24px rgba(0,0,0,0.1)`
          : hovered && showAnim
            ? `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1.5px ${pastel?.ring ?? '#a855f7'}40 inset`
            : 'none',
        zIndex: hovered || isSelected ? 20 : 1,
      }}
    >
      {/* ── PHOTO de couverture animée ── */}
      {showAnim && hasCover && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={firstEv!.cover_photo!}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: hovered ? 0.3 : 0.15,
              transform: hovered ? 'scale(1.12)' : 'scale(1.04)',
              transition: 'all 0.7s cubic-bezier(.4,0,.2,1)',
            }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, transparent 30%, ${pastel?.ring ?? '#a855f7'}22 100%)`,
          }} />
        </div>
      )}

      {/* ── Fond dégradé animé (sans photo) ── */}
      {showAnim && !hasCover && pastel && (
        <>
          {/* Grande orbe principale */}
          <div
            className={hovered ? 'orb-hover' : 'orb-idle'}
            style={{
              position: 'absolute',
              width: '85%', height: '85%',
              borderRadius: '50%',
              background: `radial-gradient(circle at 60% 40%, ${pastel.ring}28 0%, transparent 70%)`,
              top: '-20%', right: '-20%',
              transition: 'transform 0.6s ease, opacity 0.4s ease',
              transform: hovered ? 'scale(1.4)' : 'scale(1)',
              opacity: hovered ? 1 : 0.7,
            }}
          />
          {/* Petite orbe secondaire */}
          <div style={{
            position: 'absolute',
            width: '55%', height: '55%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${pastel.ring}18 0%, transparent 70%)`,
            bottom: hovered ? '0%' : '-10%',
            left: hovered ? '0%' : '-5%',
            transition: 'all 0.65s ease',
            transform: hovered ? 'scale(1.2)' : 'scale(1)',
          }} />
          {/* Shimmer bande */}
          {hovered && (
            <div
              className="shimmer-band"
              style={{
                position: 'absolute',
                width: '40%', height: '200%',
                top: '-50%', left: '-20%',
                background: `linear-gradient(105deg, transparent, ${pastel.ring}18, transparent)`,
                transform: 'skewX(-15deg)',
              }}
            />
          )}
        </>
      )}

      {/* ── Anneau pulsant (aujourd'hui ou sélectionné avec événement) ── */}
      {showAnim && (isToday || isSelected) && pastel && (
        <div
          className={isToday ? 'pulse-ring' : ''}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            borderRadius: 2,
            boxShadow: `0 0 0 2.5px ${pastel.ring} inset`,
          }}
        />
      )}

      {/* ── CONTENU ── */}
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%', display: 'flex', flexDirection: 'column',
        padding: '6px 7px',
      }}>
        {/* Numéro du jour */}
        <div style={{
          width: 26, height: 26,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, flexShrink: 0, alignSelf: 'flex-start',
          background: isToday
            ? 'linear-gradient(135deg, #7c3aed, #ec4899)'
            : 'transparent',
          color: isToday ? 'white'
            : isPast ? '#cbd5e1'
            : showAnim ? (pastel?.text ?? '#374151')
            : '#64748b',
          boxShadow: isToday ? '0 2px 10px rgba(124,58,237,0.45)' : undefined,
          outline: isSelected && !isToday ? `2px solid ${pastel?.ring ?? '#a855f7'}` : undefined,
          transition: 'transform 0.2s ease',
          transform: hovered && showAnim ? 'scale(1.15)' : 'scale(1)',
        }}>
          {date.getDate()}
        </div>

        {/* ── Bloc événement(s) ── */}
        {showAnim && firstEv && (
          <div style={{
            marginTop: 5, display: 'flex', flexDirection: 'column',
            gap: 3, flex: 1, minHeight: 0, overflow: 'hidden',
          }}>

            {/* Ligne 1 : emoji + titre */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'transform 0.3s ease',
            }}>
              <span
                className={hovered ? 'emoji-bounce' : ''}
                style={{
                  fontSize: hasCover ? 13 : 15, lineHeight: 1,
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))',
                  display: 'inline-block', flexShrink: 0,
                  transition: 'transform 0.3s ease',
                  transform: hovered ? 'scale(1.25) rotate(-8deg)' : 'scale(1)',
                }}
              >
                {pastel?.emoji}
              </span>
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                color: pastel?.text ?? '#374151',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, lineHeight: 1.3,
              }}>
                {firstEv.title}
              </span>
            </div>

            {/* Ligne 2 : 2ème événement */}
            {upcomingEvents.length >= 2 && (() => {
              const ev2 = upcomingEvents[1];
              const p2  = CAT_PASTEL[getCat(ev2.category).id] ?? CAT_PASTEL.culture;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0.85 }}>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{p2.emoji}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev2.title}
                  </span>
                </div>
              );
            })()}

            {/* Badge +N */}
            {upcomingEvents.length > 2 && (
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                color: pastel?.text,
                background: pastel?.bg,
                border: `1px solid ${pastel?.ring}44`,
                borderRadius: 5, padding: '1px 5px',
                alignSelf: 'flex-start',
                boxShadow: `0 1px 4px ${pastel?.ring}22`,
              }}>
                +{upcomingEvents.length - 1} de plus
              </span>
            )}

            {/* Bas de cellule : heure + participants */}
            <div style={{
              marginTop: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              opacity: hovered ? 1 : 0.55,
              transition: 'opacity 0.25s ease',
            }}>
              {firstEv.event_time && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700,
                  color: pastel?.text ?? '#64748b',
                  display: 'flex', alignItems: 'center', gap: 2,
                }}>
                  <Clock style={{ width: 8, height: 8 }} />
                  {firstEv.event_time.slice(0, 5)}
                </span>
              )}
              {pc > 0 && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700,
                  color: pastel?.text ?? '#64748b',
                  display: 'flex', alignItems: 'center', gap: 2,
                }}>
                  <Users style={{ width: 8, height: 8 }} />
                  {pc}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Pastille point (événements passés) */}
        {hasEvents && isPast && (
          <div style={{
            marginTop: 6,
            width: 6, height: 6, borderRadius: '50%',
            background: '#e2e8f0',
          }} />
        )}
      </div>
    </button>
  );
}

function CalendarView({
  events, userId, onJoin,
}: { events: LocalEvent[]; userId?: string; onJoin: (id: string, joined: boolean) => void }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [calYear,    setCalYear]    = useState(today.getFullYear());
  const [calMonth,   setCalMonth]   = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slideDir,   setSlideDir]   = useState<'left'|'right'|null>(null);
  const [gridKey,    setGridKey]    = useState(0);

  const firstOfMonth = new Date(calYear, calMonth, 1);
  const lastOfMonth  = new Date(calYear, calMonth + 1, 0);
  const startDow     = (firstOfMonth.getDay() + 6) % 7;
  const totalDays    = lastOfMonth.getDate();
  const totalCells   = Math.ceil((startDow + totalDays) / 7) * 7;

  const eventsByDay: Record<string, LocalEvent[]> = {};
  events.forEach(ev => {
    if (!eventsByDay[ev.event_date]) eventsByDay[ev.event_date] = [];
    eventsByDay[ev.event_date].push(ev);
  });

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = i - startDow + 1;
    cells.push(d >= 1 && d <= totalDays ? new Date(calYear, calMonth, d) : null);
  }

  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const changeMonth = (dir: 'prev'|'next') => {
    setSlideDir(dir === 'prev' ? 'right' : 'left');
    setTimeout(() => {
      if (dir === 'prev') {
        if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); }
        else setCalMonth(m => m-1);
      } else {
        if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); }
        else setCalMonth(m => m+1);
      }
      setSelectedDay(null);
      setGridKey(k => k+1);
      setSlideDir(null);
    }, 220);
  };

  const monthPfx        = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const eventsThisMonth = events.filter(e => e.event_date.startsWith(monthPfx));
  const selectedEvents  = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        /* ── entrée & slide ── */
        @keyframes floatIn {
          from { opacity:0; transform: translateY(14px) scale(0.97); }
          to   { opacity:1; transform: translateY(0)    scale(1);    }
        }
        @keyframes calSlideLeft {
          from { opacity:0; transform: translateX(32px);  }
          to   { opacity:1; transform: translateX(0);     }
        }
        @keyframes calSlideRight {
          from { opacity:0; transform: translateX(-32px); }
          to   { opacity:1; transform: translateX(0);     }
        }
        .cal-grid { animation: floatIn 0.32s cubic-bezier(.4,0,.2,1) both; }
        .cal-grid.slide-left  { animation: calSlideLeft  0.26s cubic-bezier(.4,0,.2,1) both; }
        .cal-grid.slide-right { animation: calSlideRight 0.26s cubic-bezier(.4,0,.2,1) both; }

        /* ── shimmer bande ── */
        @keyframes shimmerSlide {
          from { left: -40%; }
          to   { left: 120%;  }
        }
        .shimmer-band { animation: shimmerSlide 0.7s cubic-bezier(.4,0,.2,1) both; }

        /* ── emoji bounce ── */
        @keyframes emojiBounce {
          0%,100% { transform: scale(1.25) rotate(-8deg) translateY(0); }
          50%      { transform: scale(1.35) rotate(-12deg) translateY(-3px); }
        }
        .emoji-bounce { animation: emojiBounce 0.7s ease infinite; }

        /* ── anneau pulsant sur la cellule d'aujourd'hui ── */
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 2.5px currentColor inset, 0 0 0 0px rgba(168,85,247,0.4); }
          50%  { box-shadow: 0 0 0 2.5px currentColor inset, 0 0 0 4px  rgba(168,85,247,0.0); }
          100% { box-shadow: 0 0 0 2.5px currentColor inset, 0 0 0 0px rgba(168,85,247,0.4); }
        }
        .pulse-ring { animation: pulseRing 2s ease infinite; }

        /* ── cellule avec événement : légère animation continue ── */
        @keyframes cellBreath {
          0%,100% { background-position: 0% 50%;   }
          50%      { background-position: 100% 50%; }
        }
        .cal-cell-event:not(:hover) {
          background-size: 200% 200%;
          transition: background 0.8s ease;
        }
      `}</style>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* ── CALENDRIER ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: 'white',
            borderRadius: 24,
            boxShadow: '0 4px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.06)',
          }}>

            {/* HEADER */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #f0fdf4 100%)',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}>
              <button
                onClick={() => changeMonth('prev')}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  background: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease',
                  color: '#6b7280',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
              >
                <ChevronLeft style={{ width: 18, height: 18 }} />
              </button>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {MOIS_FR[calMonth]}
                  <span style={{ WebkitTextFillColor: '#94a3b8', fontWeight: 400, fontSize: 18, marginLeft: 8 }}>
                    {calYear}
                  </span>
                </div>
                {eventsThisMonth.length > 0 && (
                  <div style={{
                    marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700,
                    padding: '2px 10px', borderRadius: 20,
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))',
                    color: '#7c3aed',
                    border: '1px solid rgba(124,58,237,0.15)',
                  }}>
                    <PartyPopper style={{ width: 11, height: 11 }} />
                    {eventsThisMonth.length} événement{eventsThisMonth.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <button
                onClick={() => changeMonth('next')}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  background: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease',
                  color: '#6b7280',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 12px rgba(0,0,0,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
              >
                <ChevronRight style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* JOURS DE LA SEMAINE */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
              borderBottom: '1px solid #f1f5f9',
              background: '#fafafa',
            }}>
              {JOURS.map((j, ji) => (
                <div key={j} style={{
                  padding: '10px 0',
                  textAlign: 'center',
                  fontSize: 11, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: ji >= 5 ? '#a855f7' : '#94a3b8',
                }}>
                  {j}
                </div>
              ))}
            </div>

            {/* GRILLE */}
            <div
              key={gridKey}
              className={`cal-grid${slideDir === 'left' ? ' slide-left' : slideDir === 'right' ? ' slide-right' : ''}`}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}
            >
              {cells.map((date, i) => {
                if (!date) return (
                  <div key={i} style={{
                    height: '9rem',
                    borderRight: i % 7 !== 6 ? '1px solid #f1f5f9' : undefined,
                    borderBottom: '1px solid #f1f5f9',
                    background: '#fafafa',
                  }} />
                );
                const iso        = toISO(date);
                const dayEvents  = eventsByDay[iso] ?? [];
                const isToday    = iso === toISO(today);
                const isPast     = date < today;
                const isSelected = selectedDay === iso;
                return (
                  <AnimatedEventCell
                    key={iso}
                    date={date}
                    dayEvents={dayEvents}
                    isToday={isToday}
                    isPast={isPast}
                    isSelected={isSelected}
                    onSelect={() => setSelectedDay(isSelected ? null : iso)}
                  />
                );
              })}
            </div>

            {/* LÉGENDE */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid #f1f5f9',
              background: '#fafafa',
              display: 'flex', flexWrap: 'wrap', gap: '8px 16px',
            }}>
              {EVENT_CATEGORIES.map(c => {
                const p = CAT_PASTEL[c.id] ?? CAT_PASTEL.culture;
                return (
                  <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                    <span style={{ fontSize: 13 }}>{p.emoji}</span>
                    {c.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── PANEL LATÉRAL ── */}
        <div style={{ width: 300, flexShrink: 0 }}>
          {selectedDay ? (
            <div style={{ animation: 'floatIn 0.25s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', margin: 0 }}>
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  }).replace(/^\w/, c => c.toUpperCase())}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 8 }}
                >
                  <X style={{ width: 16, height: 16 }} />
                </button>
              </div>
              {selectedEvents.length === 0 ? (
                <div style={{
                  background: 'white', borderRadius: 16,
                  border: '1px solid #f1f5f9',
                  padding: 24, textAlign: 'center',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                }}>
                  <Calendar style={{ width: 32, height: 32, color: '#e2e8f0', margin: '0 auto 8px' }} />
                  <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: 0 }}>Aucun événement ce jour</p>
                  <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Vous pouvez en proposer un !</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedEvents.map(ev => (
                    <EventCard key={ev.id} event={ev} userId={userId} onJoin={onJoin} compact />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 16 }}>Prochains événements</h3>
              {events.length === 0 ? (
                <div style={{
                  background: 'white', borderRadius: 16,
                  border: '1px solid #f1f5f9',
                  padding: 24, textAlign: 'center',
                }}>
                  <Calendar style={{ width: 32, height: 32, color: '#e2e8f0', margin: '0 auto 8px' }} />
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Aucun événement à venir</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {events.slice(0, 6).map(ev => {
                    const evCat    = getCat(ev.category);
                    const evPastel = CAT_PASTEL[evCat.id] ?? CAT_PASTEL.culture;
                    const evCD     = daysUntil(ev.event_date);
                    const evPC     = ev.participants_count ?? 0;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedDay(ev.event_date)}
                        style={{
                          background: 'white', borderRadius: 14,
                          border: '1px solid #f1f5f9',
                          padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                          boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s ease',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = evPastel.ring + '80';
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9';
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.04)';
                          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                        }}
                      >
                        <span style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: evPastel.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                          border: `1px solid ${evPastel.ring}30`,
                        }}>
                          {evPastel.emoji}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{formatEventDate(ev.event_date)}</span>
                            {evCD && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
                                background: evCD.includes('Aujourd') ? '#fee2e2' : evPastel.bg,
                                color: evCD.includes('Aujourd') ? '#ef4444' : evPastel.text,
                              }}>
                                {evCD}
                              </span>
                            )}
                          </div>
                          {evPC > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Users style={{ width: 11, height: 11, color: evPastel.ring }} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: evPastel.text }}>
                                {evPC} participant{evPC > 1 ? 's' : ''}{ev.max_participants ? ` / ${ev.max_participants}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {events.length > 6 && (
                    <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                      + {events.length - 6} autres événements
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Page principale ──────────────────────────────────────────────────────────
export default function EvenementsPage() {
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'agenda' | 'forum' | 'creer'>('agenda');
  const [filterCat, setFilterCat] = useState<string>('all');

  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);
  const [loadingForum, setLoadingForum] = useState(false);

  // Create event form
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', event_date: '', event_time: '18:00',
    location: '', category: 'culture', organizer_name: '',
    max_participants: '', is_free: true, price: '',
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [eventPhotoPreviews, setEventPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Forum post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // ── Fetch all future events (no filter, calendar shows all) ──────────────
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('local_events')
        .select(`*, author:profiles!local_events_author_id_fkey(full_name, avatar_url), participants:event_participations(count), participants_list:event_participations(user_id, user:profiles!event_participations_user_id_fkey(full_name, avatar_url))`)
        .eq('status', 'active')
        .gte('event_date', today)
        .order('event_date', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingEvents(false);
        return;
      }
      setDbReady(true);

      let enriched = (data || []).map((e: LocalEvent & { participants?: { count: number }[] }) => ({
        ...e,
        participants_count: e.participants?.[0]?.count ?? 0,
        participants_list: (e as LocalEvent).participants_list ?? [],
        user_joined: false,
      }));

      if (profile && enriched.length > 0) {
        const ids = enriched.map(e => e.id);
        const { data: joins } = await supabase
          .from('event_participations').select('event_id')
          .in('event_id', ids).eq('user_id', profile.id);
        const joinedSet = new Set((joins || []).map((j: { event_id: string }) => j.event_id));
        enriched = enriched.map(e => ({ ...e, user_joined: joinedSet.has(e.id) }));
      }

      if (enriched.length > 0) {
        const ids = enriched.map(e => e.id);
        const { data: photos, error: photoErr } = await supabase
          .from('event_photos').select('event_id, url, display_order')
          .in('event_id', ids).order('display_order', { ascending: true });
        if (photoErr) {
          console.error('[event_photos] fetch error:', photoErr.message, photoErr.code);
        }
        if (photos && photos.length > 0) {
          const coverMap: Record<string, string> = {};
          (photos as { event_id: string; url: string; display_order: number }[]).forEach(p => {
            if (!coverMap[p.event_id]) coverMap[p.event_id] = p.url;
          });
          enriched = enriched.map(e => ({ ...e, cover_photo: coverMap[e.id] ?? null }));
        }
      }

      setEvents(enriched);
    } catch (err) {
      console.error('fetchEvents error:', err);
      setDbReady(false);
    }
    setLoadingEvents(false);
  }, [profile]);

  // ── Fetch forum ───────────────────────────────────────────────────────────
  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    try {
      const { data: cats } = await supabase
        .from('forum_categories').select('id').eq('slug', 'evenements').maybeSingle();
      const catId = cats?.id ?? null;
      setForumCategoryId(catId);
      if (!catId) { setLoadingForum(false); return; }
      const { data } = await supabase
        .from('forum_posts')
        .select(`*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
        .eq('category_id', catId).eq('is_closed', false)
        .order('created_at', { ascending: false }).limit(20);
      setForumPosts((data as unknown as ForumPost[]) || []);
    } catch (err) { console.error('fetchForum evenements:', err); }
    setLoadingForum(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);

  // ── Join / Leave ──────────────────────────────────────────────────────────
  const handleJoin = async (eventId: string, joined: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour participer'); return; }
    if (joined) {
      await supabase.from('event_participations').delete().eq('event_id', eventId).eq('user_id', profile.id);
      toast.success('Inscription annulée');
    } else {
      const { error } = await supabase.from('event_participations').insert({ event_id: eventId, user_id: profile.id });
      if (error) { toast.error('Erreur lors de l\'inscription'); return; }
      toast.success('Inscription enregistrée !');
    }
    fetchEvents();
  };

  // ── Photo helpers ─────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const toAdd = files.slice(0, 5 - eventPhotos.length);
    setEventPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setEventPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    if (photoInputRef.current) photoInputRef.current.value = '';
  };
  const handlePhotoRemove = (idx: number) => {
    setEventPhotos(prev => prev.filter((_, i) => i !== idx));
    setEventPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Create event ──────────────────────────────────────────────────────────
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!newEvent.title.trim() || !newEvent.event_date) {
      toast.error('Titre et date obligatoires'); return;
    }
    setSubmittingEvent(true);
    const { data: inserted, error } = await supabase.from('local_events').insert({
      author_id: profile.id,
      title: newEvent.title.trim(),
      description: newEvent.description.trim(),
      event_date: newEvent.event_date,
      event_time: newEvent.event_time,
      location: newEvent.location.trim() || 'Biguglia',
      category: newEvent.category,
      organizer_name: newEvent.organizer_name.trim() || null,
      max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
      is_free: newEvent.is_free,
      price: !newEvent.is_free && newEvent.price ? parseFloat(newEvent.price) : null,
      status: 'active',
    }).select('id').single();

    if (error) {
      toast.error('Erreur lors de la soumission'); console.error(error);
    } else {
      // ── Upload photos AVANT fetchEvents ──────────────────────────────────
      if (eventPhotos.length > 0 && inserted?.id) {
        const uploadToast = toast.loading(`Upload des photos (0/${eventPhotos.length})…`);
        let uploaded = 0;
        for (let i = 0; i < eventPhotos.length; i++) {
          const file = eventPhotos[i];
          // Extension sécurisée
          const rawExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
          const ext = ['jpg','jpeg','png','webp','gif'].includes(rawExt) ? rawExt : 'jpg';
          // Chemin : events/<event_id>/<timestamp>_<i>.<ext>
          const path = `events/${inserted.id}/${Date.now()}_${i}.${ext}`;

          const { data: up, error: upErr } = await supabase.storage
            .from('photos')
            .upload(path, file, { upsert: true, contentType: file.type });

          if (upErr) {
            console.error('[storage] upload error:', upErr.message);
            toast.error(`Photo ${i+1} : échec upload — ${upErr.message}`);
            continue;
          }

          if (up?.path) {
            const { data: urlData } = supabase.storage.from('photos').getPublicUrl(up.path);
            const publicUrl = urlData.publicUrl;
            console.log('[event_photos] uploading to DB:', publicUrl);
            const { error: insErr } = await supabase
              .from('event_photos')
              .insert({ event_id: inserted.id, url: publicUrl, display_order: i });
            if (insErr) {
              console.error('[event_photos] insert error:', insErr.message, insErr.code);
              toast.error(`Photo ${i+1} : erreur DB — ${insErr.message}`);
            } else {
              uploaded++;
              toast.loading(`Upload des photos (${uploaded}/${eventPhotos.length})…`, { id: uploadToast });
            }
          }
        }
        toast.dismiss(uploadToast);
        if (uploaded > 0) toast.success(`${uploaded} photo${uploaded > 1 ? 's' : ''} uploadée${uploaded > 1 ? 's' : ''} ✓`);
      }

      toast.success('🎉 Événement publié ! Visible dans l\'agenda.', { duration: 4000 });
      setNewEvent({ title: '', description: '', event_date: '', event_time: '18:00', location: '', category: 'culture', organizer_name: '', max_participants: '', is_free: true, price: '' });
      setEventPhotos([]); setEventPhotoPreviews([]);
      setActiveTab('agenda');
      // fetchEvents après que les photos soient bien enregistrées
      await fetchEvents();
    }
    setSubmittingEvent(false);
  };

  // ── Submit forum post ─────────────────────────────────────────────────────
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) { toast.error('Connectez-vous pour poster'); return; }
    if (!postForm.title.trim() || !postForm.content.trim()) { toast.error('Titre et contenu requis'); return; }
    setSubmittingPost(true);
    let catId = forumCategoryId;
    if (!catId) {
      const { data: existing } = await supabase.from('forum_categories').select('id').eq('slug', 'evenements').maybeSingle();
      catId = existing?.id ?? null;
      if (catId) setForumCategoryId(catId);
    }
    if (!catId) { toast.error('Catégorie forum introuvable'); setSubmittingPost(false); return; }
    const { error } = await supabase.from('forum_posts').insert({
      category_id: catId, author_id: profile.id,
      title: postForm.title.trim(), content: postForm.content.trim(),
    });
    if (error) { toast.error(`Erreur : ${error.message}`); }
    else {
      toast.success('🎉 Sujet publié !', { duration: 4000 });
      setPostForm({ title: '', content: '' });
      setShowPostForm(false);
      fetchForum();
    }
    setSubmittingPost(false);
  };

  const filteredEvents = filterCat === 'all' ? events : events.filter(e => e.category === filterCat);
  const totalCount = events.length;

  return (
    <div className="min-h-screen relative">
      {/* Photo de fond nette */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/biguglia-village.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          zIndex: 0,
          opacity: 0.13,
          pointerEvents: 'none',
          imageRendering: 'crisp-edges',
        }}
      />
      <div className="relative" style={{ zIndex: 1 }}>

      {!dbReady && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Tables manquantes</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Exécutez <code className="bg-amber-100 px-1 rounded font-mono">migration_themes.sql</code> dans Supabase SQL Editor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600/90 via-violet-600/90 to-pink-500/90 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-white/20 rounded-xl"><PartyPopper className="w-5 h-5" /></div>
                <span className="text-purple-100 text-sm font-semibold">Thème · Événements locaux</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">🎉 Événements de Biguglia</h1>
              <p className="text-purple-100 text-sm sm:text-base max-w-xl">
                Concerts, vide-greniers, fêtes de quartier — tout ce qui se passe à Biguglia.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  { icon: Calendar, label: `${totalCount} à venir` },
                  { icon: Music,    label: 'Culture & musique' },
                  { icon: Users,    label: 'Fêtes & social' },
                ].map(({ icon: I, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 text-sm font-medium">
                    <I className="w-3.5 h-3.5" /> {label}
                  </span>
                ))}
              </div>
            </div>
            {profile && (
              <button onClick={() => setActiveTab('creer')}
                className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-6 py-3 rounded-2xl hover:bg-purple-50 transition-all shadow-lg hover:-translate-y-0.5">
                <Plus className="w-4 h-4" /> Proposer un événement
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── ONGLETS ── */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
          {[
            { id: 'agenda', label: 'Agenda',                icon: Calendar },
            { id: 'forum',  label: 'Forum',                 icon: MessageSquare },
            { id: 'creer',  label: 'Proposer un événement', icon: Plus },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── AGENDA — Calendrier mensuel ── */}
        {activeTab === 'agenda' && (
          <div>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : (
              <CalendarView events={events} userId={profile?.id} onJoin={handleJoin} />
            )}

            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4">
              <Bell className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-purple-800 mb-1">🔔 Ne ratez aucun événement</p>
                <p className="text-purple-600 text-sm">
                  Cliquez sur un jour puis « Participer » pour être notifié avant l'événement.
                  {!profile && <> <Link href="/inscription" className="underline font-medium">Créez un compte</Link> pour activer les alertes.</>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── FORUM ── */}
        {activeTab === 'forum' && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Forum événements</h2>
              {profile && (
                <button onClick={() => setShowPostForm(!showPostForm)}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all text-sm">
                  <Plus className="w-4 h-4" /> Nouveau message
                </button>
              )}
            </div>

            {showPostForm && profile && (
              <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-purple-200 p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800">Nouveau message</h3>
                  <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input type="text" placeholder="Titre (ex: Qui organise la fête de la musique ?)" required
                  value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <textarea placeholder="Votre message, question ou proposition..." required
                  rows={4} value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={submittingPost}
                    className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
                    {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication...</> : 'Publier'}
                  </button>
                  <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Annuler</button>
                </div>
              </form>
            )}

            {loadingForum ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 text-purple-400 animate-spin" /></div>
            ) : !forumCategoryId && !loadingForum ? (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
                <AlertCircle className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                <p className="font-bold text-purple-800 mb-1">Forum temporairement indisponible</p>
                <p className="text-purple-700 text-sm">La catégorie forum n&apos;existe pas encore. Exécutez la migration SQL.</p>
              </div>
            ) : forumPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-500 text-lg">Pas encore de sujets</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Lancez la discussion !</p>
                {profile && (
                  <button onClick={() => setShowPostForm(true)}
                    className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
                    <Plus className="w-4 h-4" /> Créer un sujet
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {forumPosts.map(post => (
                  <Link key={post.id} href={`/forum/${post.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-purple-200 hover:shadow-sm transition-all group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors line-clamp-1">{post.title}</h3>
                        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {post.author?.full_name ?? 'Anonyme'} · {formatRelative(post.created_at)}
                          </span>
                          {(post.comment_count ?? 0) > 0 && (
                            <span className="text-xs bg-purple-50 text-purple-600 font-semibold px-2 py-0.5 rounded-full">
                              {post.comment_count} réponse{(post.comment_count ?? 0) > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROPOSER UN ÉVÉNEMENT ── */}
        {activeTab === 'creer' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Proposer un événement</h2>
              <p className="text-gray-500 text-sm mb-6">Votre événement sera publié immédiatement et visible dans l&apos;agenda.</p>

              {!profile ? (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
                  <PartyPopper className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-800 font-bold mb-2">Connectez-vous pour proposer un événement</p>
                  <Link href="/connexion"
                    className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700 transition-all">
                    Se connecter <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre *</label>
                    <input type="text" placeholder="Ex: Tournoi de pétanque inter-quartiers" required
                      value={newEvent.title} onChange={e => setNewEvent(f => ({ ...f, title: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date *</label>
                      <input type="date" required min={new Date().toISOString().split('T')[0]}
                        value={newEvent.event_date} onChange={e => setNewEvent(f => ({ ...f, event_date: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Heure</label>
                      <input type="time" value={newEvent.event_time} onChange={e => setNewEvent(f => ({ ...f, event_time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Lieu</label>
                      <input type="text" placeholder="Ex: Place du village, Stade municipal..."
                        value={newEvent.location} onChange={e => setNewEvent(f => ({ ...f, location: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catégorie</label>
                      <select value={newEvent.category} onChange={e => setNewEvent(f => ({ ...f, category: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                        {EVENT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organisateur</label>
                      <input type="text" placeholder="Association ou nom de l'organisateur"
                        value={newEvent.organizer_name} onChange={e => setNewEvent(f => ({ ...f, organizer_name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nb max participants</label>
                      <input type="number" placeholder="Illimité si vide" min="1"
                        value={newEvent.max_participants} onChange={e => setNewEvent(f => ({ ...f, max_participants: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tarif</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: true }))} className="accent-purple-600" />
                        <span className="text-sm">Gratuit</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: false }))} className="accent-purple-600" />
                        <span className="text-sm">Payant</span>
                      </label>
                      {!newEvent.is_free && (
                        <input type="number" placeholder="Prix (€)" min="0" step="0.01"
                          value={newEvent.price} onChange={e => setNewEvent(f => ({ ...f, price: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                    <textarea placeholder="Décrivez l'événement, le programme, les conditions d'accès..."
                      rows={4} value={newEvent.description} onChange={e => setNewEvent(f => ({ ...f, description: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>

                  {/* ── Photos ── */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Photos <span className="text-gray-400 font-normal">(optionnel · max 5)</span>
                    </label>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
                    {eventPhotoPreviews.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-2">
                        {eventPhotoPreviews.map((src, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group/img">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`photo ${i+1}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => handlePhotoRemove(i)}
                              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {eventPhotos.length < 5 && (
                      <button type="button" onClick={() => photoInputRef.current?.click()}
                        className="flex items-center gap-2 border-2 border-dashed border-purple-200 text-purple-500 hover:border-purple-400 hover:bg-purple-50 rounded-xl px-4 py-3 text-sm font-medium transition-all w-full justify-center">
                        <ImageIcon className="w-4 h-4" />
                        {eventPhotos.length === 0 ? 'Ajouter des photos' : `Ajouter (${eventPhotos.length}/5)`}
                      </button>
                    )}
                  </div>

                  <button type="submit" disabled={submittingEvent}
                    className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {submittingEvent
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
                      : <><PartyPopper className="w-4 h-4" /> Publier l&apos;événement</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
