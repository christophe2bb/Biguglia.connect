'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import {
  Calendar, MapPin, Clock, Users, Plus, MessageSquare, ChevronRight,
  Music, Utensils, Dumbbell, Heart, Palette,
  PartyPopper, CheckCircle, Bell, ArrowRight,
  AlertCircle, Baby, Mic2, X, Loader2, ImageIcon, Trash2,
  ChevronLeft, Send, Search, Filter, Star, ShoppingBag,
  Sparkles, Building2, Flag, Share2, Bookmark, Tag, Zap,
  CheckCircle2, Shield, TrendingUp, Info, ChevronDown,
  BookmarkCheck, Eye, Navigation, ListFilter, CalendarDays,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import toast from 'react-hot-toast';
import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import SectorFilter, { SectorBadge } from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';

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
  sector_id?: string | null;
  registration_required?: boolean;
  audience?: string | null;
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

// ─── Catégories d'événements (CDC §4) ────────────────────────────────────────
type EventCat = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  dot: string;
  emoji: string;
  description: string;
};

const EVENT_CATEGORIES: EventCat[] = [
  { id: 'fete',        label: 'Fête & animation', icon: PartyPopper,  color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500',  emoji: '🎉', description: 'Fêtes communales, repas, bals, carnavals' },
  { id: 'culture',     label: 'Culture & arts',   icon: Palette,      color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200', dot: 'bg-purple-500',  emoji: '🎭', description: 'Concerts, spectacles, expositions' },
  { id: 'sport',       label: 'Sport & plein air', icon: Dumbbell,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500', emoji: '🏃', description: 'Tournois, marches, randonnées, sport' },
  { id: 'association', label: 'Association',       icon: Heart,        color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500',    emoji: '🤝', description: 'Collectes, forum associatif, solidarité' },
  { id: 'citoyen',     label: 'Citoyen & mairie',  icon: Building2,   color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-500',    emoji: '🏛️', description: 'Réunions publiques, permanences mairie' },
  { id: 'marche',      label: 'Marché & commerce', icon: ShoppingBag, color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-500',   emoji: '🛍️', description: 'Marchés, brocantes, vide-greniers' },
  { id: 'famille',     label: 'Enfance & famille', icon: Baby,        color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',    dot: 'bg-sky-500',     emoji: '👨‍👩‍👧', description: 'Ateliers, kermesses, activités famille' },
  // héritage compat
  { id: 'musique',     label: 'Musique',           icon: Music,        color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',   dot: 'bg-pink-500',    emoji: '🎵', description: 'Concerts, scènes ouvertes, festivals' },
  { id: 'repas',       label: 'Repas & fête',      icon: Utensils,    color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200', dot: 'bg-orange-500',  emoji: '🍽️', description: 'Repas partagés, barbecues, fêtes' },
  { id: 'nature',      label: 'Nature & sport',    icon: Dumbbell,    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500', emoji: '🌿', description: 'Sorties nature, randonnées, écologie' },
  { id: 'social',      label: 'Vie sociale',       icon: Heart,        color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',   dot: 'bg-rose-500',    emoji: '🎊', description: 'Rencontres, animations de quartier' },
  { id: 'conference',  label: 'Conférence',        icon: Mic2,        color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',   dot: 'bg-teal-500',    emoji: '🎤', description: 'Conférences, débats, présentations' },
];

function getCat(id: string) {
  return EVENT_CATEGORIES.find(c => c.id === id) ?? EVENT_CATEGORIES[0];
}

// ─── Filtres rapides (hero shortcuts) ────────────────────────────────────────
type QuickFilter = 'aujourd_hui' | 'ce_weekend' | 'famille' | 'gratuit' | 'officiel' | null;

// ─── Helpers dates ────────────────────────────────────────────────────────────
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

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6;
}

function isThisWeekend(dateStr: string): boolean {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = today.getDay();
  const daysUntilSat = (6 - dayOfWeek + 7) % 7;
  const sat = new Date(today); sat.setDate(today.getDate() + daysUntilSat);
  const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
  return d >= sat && d <= sun;
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
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [open, setOpen]           = useState(false);
  const [comments, setComments]   = useState<EventComment[]>([]);
  const [loading, setLoading]     = useState(false);
  const [text, setText]           = useState('');
  const [sending, setSending]     = useState(false);
  const [count, setCount]         = useState<number | null>(null);
  const [tableOk, setTableOk]     = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from('event_comments').select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .then(({ count: c, error }) => {
        if (cancelled) return;
        if (error) { setTableOk(false); }
        else { setTableOk(true); setCount(c ?? 0); }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_comments')
      .select('id, content, created_at, author:profiles(full_name, avatar_url)')
      .eq('event_id', eventId).order('created_at', { ascending: true }).limit(50);
    if (!error) { setComments((data ?? []) as EventComment[]); setCount((data ?? []).length); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleSend = async () => {
    if (!text.trim() || !userId || sending) return;
    setSending(true);
    const { error } = await supabase.from('event_comments')
      .insert({ event_id: eventId, author_id: userId, content: text.trim() });
    if (!error) { setText(''); await fetchComments(); }
    setSending(false);
  };

  if (tableOk === false) return null;

  return (
    <div className="border-t border-gray-100 mt-2 pt-2">
      <button
        onClick={() => { const w = !open; setOpen(w); if (w) { fetchComments(); setTimeout(() => inputRef.current?.focus(), 200); } }}
        className={cn('flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg w-full transition-all',
          open ? `${catBg} ${catColor} border ${catBorder}` : 'bg-gray-50 text-gray-500 hover:bg-gray-100')}
      >
        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Discussion</span>
        {count !== null && count > 0 && (
          <span className={cn('text-xs font-black px-1.5 py-0.5 rounded-full', open ? 'bg-white/70' : 'bg-gray-200 text-gray-600')}>{count}</span>
        )}
        <span className="ml-auto text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2 italic">Soyez le premier à démarrer la discussion !</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-white"
                    style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)' }}>
                    {c.author?.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5">
                    <p className="text-xs font-bold text-gray-700 leading-tight">
                      {c.author?.full_name ?? 'Anonyme'}
                      <span className="font-normal text-gray-400 ml-1.5">{formatRelative(c.created_at)}</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {userId ? (
            <div className="flex items-end gap-1.5">
              <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Votre message… (Entrée pour envoyer)" rows={2}
                className={cn('flex-1 text-xs rounded-lg border px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all bg-white text-gray-700 placeholder-gray-400', catBorder)}
              />
              <button onClick={handleSend} disabled={!text.trim() || sending}
                className={cn('p-2 rounded-lg transition-all flex-shrink-0 disabled:opacity-40', catBg, catColor, `border ${catBorder}`, 'hover:opacity-80')}>
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

// ─── EventCard PRO ────────────────────────────────────────────────────────────
function EventCard({
  event, userId, onJoin, compact = false, onStatusChange, onToggleSave, savedEvents,
}: { event: LocalEvent; userId?: string; onJoin: (id: string, joined: boolean) => void; compact?: boolean; onStatusChange?: (id: string, newStatus: string) => void; onToggleSave?: (id: string) => void; savedEvents?: Set<string> }) {
  const isSaved = savedEvents?.has(event.id) ?? false;
  const cat = getCat(event.category);
  const CatIcon = cat.icon;
  const dateLabel = formatEventDate(event.event_date);
  const countdown = daysUntil(event.event_date);
  const fillPct = event.max_participants && event.participants_count !== undefined
    ? Math.round((event.participants_count / event.max_participants) * 100) : null;
  const isFull = event.max_participants !== null && (event.participants_count ?? 0) >= event.max_participants;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photoItems = event.cover_photo ? [{ url: event.cover_photo, isPrimary: true }] : [];
  const isUrgent = countdown?.includes("Aujourd'hui") || countdown === 'Demain';
  const isAnnule = event.status === 'annule' || event.status === 'cancelled';
  const isReporte = event.status === 'reporte' || event.status === 'postponed';

  if (compact) {
    const isPastEvent = new Date(event.event_date + 'T23:59:59') < new Date();
    const participantCount = event.participants_count ?? 0;
    return (
      <div className={cn('bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
        isPastEvent ? 'opacity-50 grayscale border-gray-100' : isUrgent ? 'border-purple-200' : 'border-gray-100',
        isAnnule && 'opacity-60')}>
        {event.cover_photo && !isPastEvent && (
          <div className="cursor-pointer" onClick={() => setLightboxOpen(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.cover_photo} alt={event.title} className="w-full h-28 object-cover" />
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cat.dot)} />
            <span className={cn('text-xs font-bold', cat.color)}>{cat.label}</span>
            {isPastEvent ? <span className="ml-auto text-xs text-gray-400 italic">Terminé</span>
              : countdown && <span className={cn('ml-auto text-xs font-semibold', isUrgent ? 'text-red-500' : 'text-gray-400')}>{countdown}</span>}
          </div>
          <p className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">{event.title}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <Clock className="w-3 h-3 flex-shrink-0" />{event.event_time}
            <span className="mx-1">·</span>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className={cn('flex items-center gap-1.5 text-xs mb-2 px-2 py-1.5 rounded-lg',
            participantCount > 0 ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400')}>
            <Users className="w-3 h-3 flex-shrink-0" />
            {participantCount > 0
              ? <span className="font-semibold">{participantCount} participant{participantCount > 1 ? 's' : ''}{event.max_participants ? ` / ${event.max_participants}` : ''}</span>
              : <span>Soyez le premier</span>}
            {isFull && <span className="ml-auto font-bold text-red-500">Complet</span>}
          </div>
          {!isPastEvent && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <span className={cn('text-xs font-bold', event.is_free ? 'text-emerald-600' : 'text-purple-600')}>
                {event.is_free ? '🎟️ Gratuit' : `${event.price} €`}
              </span>
              {userId ? (
                <button onClick={() => onJoin(event.id, !!event.user_joined)} disabled={isFull && !event.user_joined}
                  className={cn('text-xs font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50',
                    event.user_joined ? 'bg-gray-100 text-gray-600' : `${cat.bg} ${cat.color} border ${cat.border}`)}>
                  {event.user_joined ? '✓ Inscrit' : isFull ? 'Complet' : 'Participer'}
                </button>
              ) : (
                <Link href="/connexion" className={cn('text-xs font-bold px-2.5 py-1 rounded-lg', cat.bg, cat.color, `border ${cat.border}`)}>
                  Participer
                </Link>
              )}
            </div>
          )}
          {isPastEvent && (
            <div className="mt-2 pt-2 border-t border-gray-50">
              <RatingWidget targetType="event" targetId={event.id} authorId={event.author_id} userId={userId} compact />
            </div>
          )}
          <EventMiniForum eventId={event.id} userId={userId} catColor={cat.color} catBg={cat.bg} catBorder={cat.border} />
        </div>
        {lightboxOpen && photoItems.length > 0 && (
          <PhotoViewer photos={photoItems} initialIndex={0} onClose={() => setLightboxOpen(false)} title={event.title} />
        )}
      </div>
    );
  }

  // ── Card pleine ──
  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 overflow-hidden group',
      isUrgent && !isAnnule ? 'border-purple-200' : isAnnule ? 'border-red-100 opacity-75' : isReporte ? 'border-amber-200' : 'border-gray-100'
    )}>
      {/* Zone photo */}
      <div className="relative h-44 overflow-hidden">
        {event.cover_photo ? (
          <div className="w-full h-full cursor-pointer" onClick={() => setLightboxOpen(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.cover_photo} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center', cat.bg)}>
            <span className="text-5xl opacity-30">{cat.emoji}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={cn('inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full shadow', cat.bg, cat.color)}>
            <span>{cat.emoji}</span>{cat.label}
          </span>
          {event.is_official && (
            <span className="text-xs bg-blue-600 text-white font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
              <Shield className="w-3 h-3" /> Officiel
            </span>
          )}
          {isAnnule && <span className="text-xs bg-red-500 text-white font-bold px-2.5 py-1 rounded-full shadow">❌ Annulé</span>}
          {isReporte && <span className="text-xs bg-amber-400 text-white font-bold px-2.5 py-1 rounded-full shadow">🔄 Reporté</span>}
          {!isAnnule && !isReporte && (
            <StatusBadge status={event.status || 'active'} contentType="event"
              extra={{ eventDate: event.event_date, isFull }} size="xs" showIcon className="shadow" />
          )}
        </div>

        {/* Countdown haut droite */}
        {countdown && !isAnnule && (
          <span className={cn('absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full shadow',
            countdown.includes('Aujourd') ? 'bg-red-500 text-white animate-pulse' : countdown === 'Demain' ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-700')}>
            {countdown}
          </span>
        )}

        {/* Titre bas */}
        <div className="absolute bottom-3 left-3 right-3">
          {event.sector_id && (
            <div className="mb-1">
              <SectorBadge sectorId={event.sector_id} size="xs" />
            </div>
          )}
          <Link href={`/evenements/${event.id}`} className="block hover:underline">
            <p className="text-white font-black text-sm leading-tight drop-shadow line-clamp-2">{event.title}</p>
          </Link>
        </div>
      </div>

      <div className="p-5">
        <p className="text-gray-500 text-xs leading-relaxed mb-4 line-clamp-2">{event.description}</p>

        {/* Infos essentielles */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" /><span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" /><span>{event.event_time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          {event.organizer_name && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">Par <span className="font-semibold text-gray-600">{event.organizer_name}</span></span>
            </div>
          )}
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {event.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">#{tag}</span>
            ))}
          </div>
        )}

        {/* Participants */}
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
                  <span className="text-xs text-gray-500 font-semibold ml-1">+{(event.participants_count ?? 0) - 8}</span>
                )}
              </div>
            )}
            {event.max_participants && (
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', fillPct! > 80 ? 'bg-red-400' : fillPct! > 50 ? 'bg-amber-400' : 'bg-emerald-400')}
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

        {/* Badges inscription + audience */}
        {(event.registration_required || event.audience) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {event.registration_required && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Inscription requise
              </span>
            )}
            {event.audience && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" /> {event.audience}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className={cn('text-sm font-black', event.is_free ? 'text-emerald-600' : 'text-purple-600')}>
            {event.is_free ? '🎟️ Gratuit' : `${event.price} €`}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bouton favoris */}
            {onToggleSave && (
              <button onClick={() => onToggleSave(event.id)} title={isSaved ? 'Retirer des favoris' : 'Sauvegarder'}
                className={cn('p-1.5 rounded-xl transition-all border', isSaved ? 'bg-yellow-50 text-yellow-500 border-yellow-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-yellow-50 hover:text-yellow-500')}>
                {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>
            )}
            <Link href={`/evenements/${event.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-all">
              <ArrowRight className="w-3 h-3" /> Voir
            </Link>
            {!isAnnule && (userId ? (
              <button onClick={() => onJoin(event.id, !!event.user_joined)} disabled={isFull && !event.user_joined}
                className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-50',
                  event.user_joined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : `${cat.bg} ${cat.color} border ${cat.border} hover:shadow-sm`)}>
                <Bell className="w-3.5 h-3.5" />
                {event.user_joined ? 'Inscrit ✓' : isFull ? 'Complet' : 'Je participe'}
              </button>
            ) : (
              <Link href="/connexion" className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl', cat.bg, cat.color, `border ${cat.border}`)}>
                <Bell className="w-3.5 h-3.5" /> Participer
              </Link>
            ))}
            {userId && userId !== event.author_id && (
              <ReportButton targetType="event" targetId={event.id} targetTitle={event.title} variant="icon" />
            )}
            {userId === event.author_id ? (
              onStatusChange && (() => {
                const s = event.status || 'a_venir';
                const isPast = new Date(event.event_date + 'T23:59:59') < new Date();
                const acts: { label: string; key: string; color: string }[] = [];
                if (!['annule','cancelled','archive','archived'].includes(s)) {
                  if (!isPast) acts.push({ label: '✖ Annuler', key: 'annule', color: 'text-red-500 bg-red-50 border-red-200' });
                  if (!['reporte','postponed'].includes(s)) acts.push({ label: '🔄 Reporter', key: 'reporte', color: 'text-amber-600 bg-amber-50 border-amber-200' });
                } else if (isPast || ['completed','complet'].includes(s)) {
                  acts.push({ label: '📦 Archiver', key: 'archive', color: 'text-gray-500 bg-gray-50 border-gray-200' });
                }
                return acts.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {acts.map(a => (
                      <button key={a.key} onClick={() => { if (window.confirm(`${a.label} cet événement ?`)) onStatusChange(event.id, a.key); }}
                        className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors', a.color)}>
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()
            ) : (
              <ContactButton sourceType="event" sourceId={event.id} sourceTitle={event.title} ownerId={event.author_id} userId={userId} size="sm" />
            )}
          </div>
        </div>

        {/* Notation post-événement */}
        {new Date(event.event_date + 'T23:59:59') < new Date() && (
          <div className="pt-3">
            <RatingWidget targetType="event" targetId={event.id} authorId={event.author_id} userId={userId} compact={false} showPoll />
          </div>
        )}
      </div>

      {lightboxOpen && photoItems.length > 0 && (
        <PhotoViewer photos={photoItems} initialIndex={0} onClose={() => setLightboxOpen(false)} title={event.title} />
      )}
    </div>
  );
}

// ─── Calendrier animé ─────────────────────────────────────────────────────────
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const CAT_PASTEL: Record<string, { bg: string; ring: string; text: string; emoji: string }> = {
  fete:        { bg: '#fff7ed', ring: '#fb923c', text: '#c2410c', emoji: '🎉' },
  culture:     { bg: '#f3e8ff', ring: '#c084fc', text: '#7e22ce', emoji: '🎭' },
  sport:       { bg: '#ecfdf5', ring: '#34d399', text: '#065f46', emoji: '🏃' },
  association: { bg: '#fff1f2', ring: '#fb7185', text: '#be123c', emoji: '🤝' },
  citoyen:     { bg: '#eff6ff', ring: '#60a5fa', text: '#1d4ed8', emoji: '🏛️' },
  marche:      { bg: '#fffbeb', ring: '#fbbf24', text: '#92400e', emoji: '🛍️' },
  famille:     { bg: '#e0f2fe', ring: '#38bdf8', text: '#0369a1', emoji: '👨‍👩‍👧' },
  musique:     { bg: '#fce7f3', ring: '#f472b6', text: '#be185d', emoji: '🎵' },
  repas:       { bg: '#fff7ed', ring: '#fb923c', text: '#c2410c', emoji: '🍽️' },
  nature:      { bg: '#ecfdf5', ring: '#34d399', text: '#065f46', emoji: '🌿' },
  social:      { bg: '#fff1f2', ring: '#fb7185', text: '#be123c', emoji: '🎊' },
  conference:  { bg: '#f0fdfa', ring: '#2dd4bf', text: '#0f766e', emoji: '🎤' },
};

function AnimatedEventCell({
  date, dayEvents, isToday, isPast, isSelected, onSelect,
}: {
  date: Date; dayEvents: LocalEvent[]; isToday: boolean; isPast: boolean; isSelected: boolean; onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasEvents = dayEvents.length > 0;
  const upcomingEvents = dayEvents.filter(() => !isPast);
  const firstEv = upcomingEvents[0] ?? dayEvents[0];
  const cat = firstEv ? getCat(firstEv.category) : null;
  const pastel = cat ? (CAT_PASTEL[cat.id] ?? CAT_PASTEL.culture) : null;
  const hasCover = !!firstEv?.cover_photo;
  const showAnim = hasEvents && !isPast;
  const pc = firstEv?.participants_count ?? 0;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={showAnim ? 'cal-cell-event' : ''}
      style={{
        position: 'relative', height: '9rem',
        borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
        overflow: 'hidden', cursor: 'pointer',
        transition: 'transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s ease',
        background: isSelected ? (pastel?.bg ?? '#faf5ff')
          : showAnim ? (hovered ? (pastel?.bg ?? '#faf5ff') : 'white')
          : isPast ? '#fafafa' : 'white',
        transform: hovered && showAnim ? 'scale(1.04) translateZ(0)' : 'scale(1)',
        boxShadow: isSelected
          ? `0 0 0 2.5px ${pastel?.ring ?? '#a855f7'} inset, 0 6px 24px rgba(0,0,0,0.1)`
          : hovered && showAnim ? `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1.5px ${pastel?.ring ?? '#a855f7'}40 inset` : 'none',
        zIndex: hovered || isSelected ? 20 : 1,
      }}
    >
      {showAnim && hasCover && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={firstEv!.cover_photo!} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: hovered ? 0.3 : 0.15, transform: hovered ? 'scale(1.12)' : 'scale(1.04)',
              transition: 'all 0.7s cubic-bezier(.4,0,.2,1)' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 30%, ${pastel?.ring ?? '#a855f7'}22 100%)` }} />
        </div>
      )}
      {showAnim && !hasCover && pastel && (
        <>
          <div className={hovered ? 'orb-hover' : 'orb-idle'}
            style={{ position: 'absolute', width: '85%', height: '85%', borderRadius: '50%',
              background: `radial-gradient(circle at 60% 40%, ${pastel.ring}28 0%, transparent 70%)`,
              top: '-20%', right: '-20%', transition: 'transform 0.6s ease, opacity 0.4s ease',
              transform: hovered ? 'scale(1.4)' : 'scale(1)', opacity: hovered ? 1 : 0.7 }} />
          <div style={{ position: 'absolute', width: '55%', height: '55%', borderRadius: '50%',
            background: `radial-gradient(circle, ${pastel.ring}18 0%, transparent 70%)`,
            bottom: hovered ? '0%' : '-10%', left: hovered ? '0%' : '-5%',
            transition: 'all 0.65s ease', transform: hovered ? 'scale(1.2)' : 'scale(1)' }} />
          {hovered && (
            <div className="shimmer-band" style={{ position: 'absolute', width: '40%', height: '200%',
              top: '-50%', left: '-20%', background: `linear-gradient(105deg, transparent, ${pastel.ring}18, transparent)`,
              transform: 'skewX(-15deg)' }} />
          )}
        </>
      )}
      {showAnim && (isToday || isSelected) && pastel && (
        <div className={isToday ? 'pulse-ring' : ''}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 2,
            boxShadow: `0 0 0 2.5px ${pastel.ring} inset` }} />
      )}
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', padding: '6px 7px' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, flexShrink: 0, alignSelf: 'flex-start',
          background: isToday ? 'linear-gradient(135deg, #7c3aed, #ec4899)' : 'transparent',
          color: isToday ? 'white' : isPast ? '#cbd5e1' : showAnim ? (pastel?.text ?? '#374151') : '#64748b',
          boxShadow: isToday ? '0 2px 10px rgba(124,58,237,0.45)' : undefined,
          outline: isSelected && !isToday ? `2px solid ${pastel?.ring ?? '#a855f7'}` : undefined,
          transition: 'transform 0.2s ease', transform: hovered && showAnim ? 'scale(1.15)' : 'scale(1)' }}>
          {date.getDate()}
        </div>
        {showAnim && firstEv && (
          <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3,
              transform: hovered ? 'translateY(-1px)' : 'translateY(0)', transition: 'transform 0.3s ease' }}>
              <span className={hovered ? 'emoji-bounce' : ''} style={{ fontSize: hasCover ? 13 : 15, lineHeight: 1,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))', display: 'inline-block', flexShrink: 0,
                transition: 'transform 0.3s ease', transform: hovered ? 'scale(1.25) rotate(-8deg)' : 'scale(1)' }}>
                {pastel?.emoji}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: pastel?.text ?? '#374151',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: 1.3 }}>
                {firstEv.title}
              </span>
            </div>
            {upcomingEvents.length >= 2 && (() => {
              const ev2 = upcomingEvents[1];
              const p2 = CAT_PASTEL[getCat(ev2.category).id] ?? CAT_PASTEL.culture;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0.85 }}>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{p2.emoji}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev2.title}</span>
                </div>
              );
            })()}
            {upcomingEvents.length > 2 && (
              <span style={{ fontSize: 9.5, fontWeight: 700, color: pastel?.text, background: pastel?.bg,
                padding: '1px 5px', borderRadius: 4, alignSelf: 'flex-start' }}>
                +{upcomingEvents.length - 2} autres
              </span>
            )}
            {pc > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 'auto' }}>
                <Users style={{ width: 9, height: 9, color: pastel?.ring, flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontWeight: 600, color: pastel?.ring }}>{pc}</span>
              </div>
            )}
          </div>
        )}
        {!showAnim && hasEvents && isPast && (
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{dayEvents.length} passé{dayEvents.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function CalendarView({
  events, userId, onJoin, onStatusChange,
}: { events: LocalEvent[]; userId?: string; onJoin: (id: string, joined: boolean) => void; onStatusChange?: (id: string, s: string) => void }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const firstDay = new Date(curYear, curMonth, 1);
  const lastDay  = new Date(curYear, curMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(curYear, curMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const evByDay: Record<string, LocalEvent[]> = {};
  events.forEach(ev => { if (!evByDay[ev.event_date]) evByDay[ev.event_date] = []; evByDay[ev.event_date].push(ev); });

  const selectedEvents = selectedDay ? (evByDay[selectedDay] ?? []) : [];
  const totalMonthEvents = cells.filter(d => d).reduce((acc, d) => {
    const key = d!.toISOString().split('T')[0];
    return acc + (evByDay[key]?.length ?? 0);
  }, 0);

  return (
    <div style={{ fontFamily: 'inherit' }}>
      <style>{`
        @keyframes floatIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{opacity:0.7} 50%{opacity:0.3} 100%{opacity:0.7} }
        @keyframes shimmer { 0%{left:-30%} 100%{left:120%} }
        @keyframes bounce { 0%,100%{transform:scale(1.25) rotate(-8deg)} 50%{transform:scale(1.4) rotate(-12deg)} }
        .pulse-ring { animation: pulse-ring 2.2s ease-in-out infinite; }
        .emoji-bounce { animation: bounce 0.7s ease-in-out; }
        .shimmer-band { animation: shimmer 1.2s ease forwards; }
        .orb-idle { } .orb-hover { }
        .cal-cell-event:hover { }
      `}</style>

      <div style={{ background: 'white', borderRadius: 20, border: '1px solid #f1f5f9',
        boxShadow: '0 4px 32px rgba(0,0,0,0.07)', overflow: 'hidden', minWidth: 0 }}>

        {/* ── En-tête navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #f8fafc',
          background: 'linear-gradient(135deg,#7c3aed08,#ec489908)' }}>
          <button onClick={() => { if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); } else setCurMonth(m => m - 1); }}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7c3aed', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', margin: 0 }}>
              {MOIS_FR[curMonth]} {curYear}
            </h2>
            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', fontWeight: 500 }}>
              {totalMonthEvents > 0 ? `${totalMonthEvents} événement${totalMonthEvents > 1 ? 's' : ''} ce mois` : 'Aucun événement ce mois'}
            </p>
          </div>
          <button onClick={() => { if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); } else setCurMonth(m => m + 1); }}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#7c3aed', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* ── Corps calendrier + panel ── */}
        <div style={{ display: 'flex', gap: 0 }}>
          {/* Grille */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Jours de la semaine */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #f1f5f9' }}>
              {JOURS.map((j, i) => (
                <div key={j} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700,
                  color: i >= 5 ? '#7c3aed' : '#94a3b8', letterSpacing: '0.05em' }}>
                  {j}
                </div>
              ))}
            </div>
            {/* Cellules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} style={{ height: '9rem', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }} />;
                const key = d.toISOString().split('T')[0];
                const isPast = d < today;
                const isTod = d.getTime() === today.getTime();
                const isWeekendDay = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={i} style={{ background: isWeekendDay && !isPast ? '#faf5ff08' : undefined }}>
                    <AnimatedEventCell
                      date={d} dayEvents={evByDay[key] ?? []}
                      isToday={isTod} isPast={isPast}
                      isSelected={selectedDay === key}
                      onSelect={() => setSelectedDay(selectedDay === key ? null : key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel latéral */}
          <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #f1f5f9', background: '#fafcff' }}>
            {selectedDay ? (
              <div style={{ padding: 16, animation: 'floatIn 0.25s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', margin: 0 }}>
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                  </h3>
                  <button onClick={() => setSelectedDay(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 8 }}>
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                {selectedEvents.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: 16, border: '1px solid #f1f5f9', padding: 24, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                    <Calendar style={{ width: 32, height: 32, color: '#e2e8f0', margin: '0 auto 8px' }} />
                    <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: 0 }}>Aucun événement ce jour</p>
                    <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Vous pouvez en proposer un !</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedEvents.map(ev => (
                      <EventCard key={ev.id} event={ev} userId={userId} onJoin={onJoin} onStatusChange={onStatusChange} compact />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 12 }}>Prochains événements</h3>
                {events.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: 16, border: '1px solid #f1f5f9', padding: 24, textAlign: 'center' }}>
                    <Calendar style={{ width: 32, height: 32, color: '#e2e8f0', margin: '0 auto 8px' }} />
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Aucun événement à venir</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {events.slice(0, 7).map(ev => {
                      const evCat = getCat(ev.category);
                      const evPastel = CAT_PASTEL[evCat.id] ?? CAT_PASTEL.culture;
                      const evCD = daysUntil(ev.event_date);
                      return (
                        <button key={ev.id} onClick={() => setSelectedDay(ev.event_date)}
                          style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9',
                            padding: '9px 10px', textAlign: 'left', cursor: 'pointer',
                            boxShadow: '0 1px 6px rgba(0,0,0,0.04)', transition: 'all 0.2s ease',
                            display: 'flex', alignItems: 'flex-start', gap: 8 }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = evPastel.ring + '80'; el.style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#f1f5f9'; el.style.transform = 'none'; }}>
                          <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: evPastel.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                            border: `1px solid ${evPastel.ring}30` }}>
                            {evPastel.emoji}
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.title}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatEventDate(ev.event_date)}</span>
                              {evCD && (
                                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 20,
                                  background: evCD.includes('Aujourd') ? '#fee2e2' : evPastel.bg,
                                  color: evCD.includes('Aujourd') ? '#ef4444' : evPastel.text }}>
                                  {evCD}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {events.length > 7 && (
                      <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 0 }}>+ {events.length - 7} autres événements</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Légende catégories */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f8fafc', display: 'flex', flexWrap: 'wrap', gap: 12, background: '#fafcff' }}>
          {Object.entries(CAT_PASTEL).slice(0, 7).map(([id, p]) => {
            const c = getCat(id);
            return (
              <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                <span style={{ fontSize: 13 }}>{p.emoji}</span>{c.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function EvenementsPage() {
  const { profile } = useAuthStore();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'agenda' | 'liste' | 'semaine' | 'forum' | 'creer'>('agenda');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('a_venir');
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [showAdvFilters, setShowAdvFilters] = useState(false);
  const [filterInscription, setFilterInscription] = useState<boolean>(false);
  const [filterFree, setFilterFree] = useState<boolean>(false);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);

  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [forumCategoryId, setForumCategoryId] = useState<string | null>(null);
  const [loadingForum, setLoadingForum] = useState(false);

  // Formulaire création événement enrichi
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', event_date: '', event_time: '18:00',
    location: '', category: 'fete', organizer_name: '',
    max_participants: '', is_free: true, price: '',
    sector_id: '', tags: '', audience: 'Tout public',
    registration_required: false,
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [eventPhotoPreviews, setEventPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Forum post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [submittingPost, setSubmittingPost] = useState(false);

  // ── Fetch events ──────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let data: LocalEvent[] | null = null;
      let error: unknown = null;

      const { data: evData, error: evErr } = await supabase
        .from('events')
        .select(`*, author:profiles(full_name, avatar_url), participants:event_participants(count), participants_list:event_participants(user_id, user:profiles(full_name, avatar_url))`)
        .in('status', ['a_venir', 'complet', 'reporte'])
        .gte('event_date', today)
        .order('event_date', { ascending: true });
      if (!evErr && evData) {
        data = evData.map((e: Record<string, unknown>) => ({
          ...e,
          is_free: e.price_type === 'gratuit',
          event_time: e.start_time ?? '18:00',
          max_participants: e.capacity ?? null,
        })) as LocalEvent[];
      } else {
        const { data: legData, error: legErr } = await supabase
          .from('events')
          .select(`*, author:profiles(full_name, avatar_url), participants:event_participants(count), participants_list:event_participants(user_id, user:profiles(full_name, avatar_url))`)
          .in('status', ['active', 'publie', 'a_venir', 'complet', 'reporte'])
          .gte('event_date', today)
          .order('event_date', { ascending: true });
        if (!legErr) { data = legData as LocalEvent[] | null; }
        else {
          const { data: oldData, error: oldErr } = await supabase
            .from('events')
            .select(`*, participants:event_participants(count), participants_list:event_participants(user_id, user:profiles(full_name, avatar_url))`)
            .in('status', ['active', 'publie', 'a_venir', 'complet', 'reporte'])
            .gte('event_date', today)
            .order('event_date', { ascending: true });
          data = oldData as LocalEvent[] | null;
          error = oldErr;
        }
      }

      if (error) {
        const err = error as { code?: string; message?: string };
        if (err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist')) {
          setDbReady(false);
        }
        setLoadingEvents(false); return;
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
        const { data: joins } = await supabase.from('event_participants').select('event_id').in('event_id', ids).eq('user_id', profile.id);
        const joinedSet = new Set((joins || []).map((j: { event_id: string }) => j.event_id));
        enriched = enriched.map(e => ({ ...e, user_joined: joinedSet.has(e.id) }));
      }

      if (enriched.length > 0) {
        const ids = enriched.map(e => e.id);
        const { data: photos } = await supabase.from('event_photos').select('event_id, url, display_order')
          .in('event_id', ids).order('display_order', { ascending: true });
        if (photos && photos.length > 0) {
          const coverMap: Record<string, string> = {};
          (photos as { event_id: string; url: string }[]).forEach(p => { if (!coverMap[p.event_id]) coverMap[p.event_id] = p.url; });
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

  const fetchForum = useCallback(async () => {
    setLoadingForum(true);
    try {
      const { data: cats } = await supabase.from('forum_categories').select('id').eq('slug', 'evenements').maybeSingle();
      const catId = cats?.id ?? null;
      setForumCategoryId(catId);
      if (!catId) { setLoadingForum(false); return; }
      const { data } = await supabase.from('forum_posts')
        .select(`*, author:profiles!forum_posts_author_id_fkey(full_name, avatar_url), comment_count:forum_comments(count)`)
        .eq('category_id', catId).eq('is_closed', false)
        .order('created_at', { ascending: false }).limit(20);
      setForumPosts((data as unknown as ForumPost[]) || []);
    } catch (err) { console.error('fetchForum:', err); }
    setLoadingForum(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { if (activeTab === 'forum') fetchForum(); }, [activeTab, fetchForum]);

  // ── Favoris (saved events) — localStorage ────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('biguglia_saved_events');
      if (raw) setSavedEvents(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  const toggleSaved = (eventId: string) => {
    setSavedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) { next.delete(eventId); toast('Événement retiré des favoris'); }
      else { next.add(eventId); toast.success('⭐ Ajouté aux favoris !'); }
      try { localStorage.setItem('biguglia_saved_events', JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Join / Leave ──────────────────────────────────────────────────────────
  const handleJoin = async (eventId: string, joined: boolean) => {
    if (!profile) { toast.error('Connectez-vous pour participer'); return; }
    if (joined) {
      await supabase.from('event_participants').delete().eq('event_id', eventId).eq('user_id', profile.id);
      toast.success('Inscription annulée');
    } else {
      const { error } = await supabase.from('event_participants').insert({ event_id: eventId, user_id: profile.id, status: 'inscrit' });
      if (error) {
        const { error: e2 } = await supabase.from('event_participants').insert({ event_id: eventId, user_id: profile.id });
        if (e2) { toast.error('Erreur lors de l\'inscription'); return; }
      }
      toast.success('✅ Inscription enregistrée !');
    }
    fetchEvents();
  };

  const handleEventStatusChange = async (eventId: string, newStatus: string) => {
    await supabase.from('events').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', eventId);
    const labels: Record<string, string> = { a_venir: 'À venir', complet: 'Complet', reporte: 'Reporté', annule: 'Annulé', archive: 'Archivé' };
    toast.success(`✅ Statut : ${labels[newStatus] || newStatus}`);
    fetchEvents();
  };

  // ── Photo helpers ─────────────────────────────────────────────────────────
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const toAdd = files.slice(0, 5 - eventPhotos.length);
    setEventPhotos(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => { const reader = new FileReader(); reader.onload = ev => setEventPhotoPreviews(prev => [...prev, ev.target?.result as string]); reader.readAsDataURL(f); });
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
    if (!newEvent.title.trim() || !newEvent.event_date) { toast.error('Titre et date obligatoires'); return; }
    setSubmittingEvent(true);

    const parsedTags = newEvent.tags ? newEvent.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const eventPayload: Record<string, unknown> = {
      author_id: profile.id,
      title: newEvent.title.trim(),
      description: newEvent.description.trim(),
      event_date: newEvent.event_date,
      event_time: newEvent.event_time,
      start_time: newEvent.event_time,
      location: newEvent.location.trim() || 'Biguglia',
      category: newEvent.category,
      organizer_name: newEvent.organizer_name.trim() || null,
      max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
      capacity: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
      is_unlimited: !newEvent.max_participants,
      is_free: newEvent.is_free,
      price_type: newEvent.is_free ? 'gratuit' : 'payant',
      price: !newEvent.is_free && newEvent.price ? parseFloat(newEvent.price) : null,
      price_amount: !newEvent.is_free && newEvent.price ? parseFloat(newEvent.price) : null,
      status: 'a_venir',
      registration_open: true,
      registration_required: newEvent.registration_required,
      audience: newEvent.audience || 'Tout public',
      tags: parsedTags,
    };
    if (newEvent.sector_id) eventPayload.sector_id = newEvent.sector_id;

    const { data: inserted, error } = await supabase.from('events').insert(eventPayload).select('id').single();

    if (error) {
      // fallback minimal
      const { data: ins2, error: e2 } = await supabase.from('events').insert({
        author_id: profile.id, title: newEvent.title.trim(), description: newEvent.description.trim(),
        event_date: newEvent.event_date, event_time: newEvent.event_time,
        location: newEvent.location.trim() || 'Biguglia', category: newEvent.category,
        organizer_name: newEvent.organizer_name.trim() || null,
        max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
        is_free: newEvent.is_free, price: !newEvent.is_free && newEvent.price ? parseFloat(newEvent.price) : null,
        tags: parsedTags, status: 'a_venir',
      }).select('id').single();
      if (e2) { toast.error(`Erreur : ${e2.message}`); setSubmittingEvent(false); return; }
      if (ins2) {
        await uploadEventPhotos(ins2.id);
        toast.success('🎉 Événement publié !', { duration: 4000 });
        resetForm(); await fetchEvents(); setSubmittingEvent(false); return;
      }
    }
    if (inserted?.id) {
      await uploadEventPhotos(inserted.id);
      toast.success('🎉 Événement publié ! Visible dans l\'agenda.', { duration: 4000 });
      resetForm(); await fetchEvents();
    }
    setSubmittingEvent(false);
  };

  const uploadEventPhotos = async (eventId: string) => {
    if (eventPhotos.length === 0) return;
    for (let i = 0; i < eventPhotos.length; i++) {
      const file = eventPhotos[i];
      const rawExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext = ['jpg','jpeg','png','webp','gif'].includes(rawExt) ? rawExt : 'jpg';
      const path = `events/${eventId}/${Date.now()}_${i}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage.from('photos').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) { toast.error(`Photo ${i+1} : ${upErr.message}`); continue; }
      if (up?.path) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(up.path);
        await supabase.from('event_photos').insert({ event_id: eventId, url: urlData.publicUrl, display_order: i });
      }
    }
  };

  const resetForm = () => {
    setNewEvent({ title:'', description:'', event_date:'', event_time:'18:00', location:'', category:'fete', organizer_name:'', max_participants:'', is_free:true, price:'', sector_id:'', tags:'', audience:'Tout public', registration_required:false });
    setEventPhotos([]); setEventPhotoPreviews([]); setActiveTab('agenda');
  };

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
    const { error } = await supabase.from('forum_posts').insert({ category_id: catId, author_id: profile.id, title: postForm.title.trim(), content: postForm.content.trim() });
    if (error) { toast.error(`Erreur : ${error.message}`); }
    else { toast.success('🎉 Sujet publié !', { duration: 4000 }); setPostForm({ title:'', content:'' }); setShowPostForm(false); fetchForum(); }
    setSubmittingPost(false);
  };

  // ── Computed filters ──────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.event_date >= today && ['a_venir','complet','reporte','active','publie'].includes(e.status));
  const todayEvents = events.filter(e => e.event_date === today);
  const weekendEvents = events.filter(e => isThisWeekend(e.event_date));
  const officialEvents = events.filter(e => e.is_official);
  const freeEvents = events.filter(e => e.is_free && e.event_date >= today);

  let filteredEvents = filterStatus === 'all' ? events
    : filterStatus === 'a_venir' ? events.filter(e => ['a_venir','active','publie'].includes(e.status) && e.event_date >= today)
    : filterStatus === 'passe' ? events.filter(e => e.status === 'passe' || (e.event_date < today && !['annule','reporte'].includes(e.status)))
    : events.filter(e => e.status === filterStatus);

  if (filterCat !== 'all') filteredEvents = filteredEvents.filter(e => e.category === filterCat);
  if (filterSector) {
    filteredEvents = filterSector === 'ville'
      ? filteredEvents.filter(e => !e.sector_id)
      : filteredEvents.filter(e => e.sector_id === filterSector);
  }
  // Quick filter
  if (quickFilter === 'aujourd_hui') filteredEvents = filteredEvents.filter(e => e.event_date === today);
  else if (quickFilter === 'ce_weekend') filteredEvents = filteredEvents.filter(e => isThisWeekend(e.event_date));
  else if (quickFilter === 'famille') filteredEvents = filteredEvents.filter(e => ['famille','fete','sport'].includes(e.category) || e.audience?.toLowerCase().includes('famille'));
  else if (quickFilter === 'gratuit') filteredEvents = filteredEvents.filter(e => e.is_free);
  else if (quickFilter === 'officiel') filteredEvents = filteredEvents.filter(e => e.is_official);

  // Additional filters from list view
  if (filterInscription) filteredEvents = filteredEvents.filter(e => e.registration_required);
  if (filterFree) filteredEvents = filteredEvents.filter(e => e.is_free);
  if (showSavedOnly) filteredEvents = filteredEvents.filter(e => savedEvents.has(e.id));

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredEvents = filteredEvents.filter(e =>
      e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) || e.organizer_name?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) || (e.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
    );
  }

  // ── Vue "Cette semaine" : events des 7 prochains jours groupés par jour ────
  const sevenDaysLater = new Date(); sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
  const thisWeekEvents = upcomingEvents.filter(e => {
    const d = new Date(e.event_date + 'T00:00:00');
    return d >= new Date(today) && d <= sevenDaysLater;
  });
  const thisWeekByDay = thisWeekEvents.reduce<Record<string, LocalEvent[]>>((acc, ev) => {
    if (!acc[ev.event_date]) acc[ev.event_date] = [];
    acc[ev.event_date].push(ev);
    return acc;
  }, {});
  const thisWeekDays = Object.keys(thisWeekByDay).sort();

  const totalCount = upcomingEvents.length;
  const activeFiltersCount = [filterCat !== 'all', filterStatus !== 'a_venir', !!filterSector, !!quickFilter, !!searchQuery.trim(), filterInscription, filterFree, showSavedOnly].filter(Boolean).length;

  // ── Next featured event (for sidebar) ────────────────────────────────────
  const featuredEvent = upcomingEvents[0] ?? null;
  const nextWeekEvents = upcomingEvents.slice(0, 5);

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/biguglia-etang.jpg" alt="" aria-hidden="true"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          objectPosition: 'center top', zIndex: 0, opacity: 0.2, pointerEvents: 'none' }} />

      <div className="relative" style={{ zIndex: 1 }}>
        {!dbReady && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Tables manquantes</p>
                <p className="text-xs text-amber-700 mt-0.5">Exécutez <code className="bg-amber-100 px-1 rounded font-mono">migration_themes.sql</code> dans Supabase SQL Editor.</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            HERO PRO
        ══════════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-600 to-pink-600 text-white">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/10 rounded-full blur-2xl" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white/20 rounded-xl"><PartyPopper className="w-5 h-5" /></div>
                  <span className="text-purple-200 text-sm font-semibold tracking-wide">Thème · Événements locaux</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-2 leading-tight">
                  🎉 Agenda de Biguglia
                </h1>
                <p className="text-purple-100 text-sm sm:text-base max-w-xl mb-5">
                  Concerts, fêtes de quartier, marchés, réunions citoyennes — tout ce qui se passe à Biguglia.
                </p>

                {/* ── KPIs dynamiques ── */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {[
                    { icon: Calendar,    label: `${totalCount} à venir`,         color: 'bg-white/15 border-white/25' },
                    { icon: Zap,         label: `${todayEvents.length} aujourd'hui`, color: todayEvents.length > 0 ? 'bg-red-400/25 border-red-300/40' : 'bg-white/10 border-white/20' },
                    { icon: Star,        label: `${weekendEvents.length} ce week-end`, color: 'bg-white/15 border-white/25' },
                    { icon: CheckCircle2,label: `${freeEvents.length} gratuits`,   color: 'bg-emerald-400/20 border-emerald-300/30' },
                  ].map(({ icon: I, label, color }) => (
                    <span key={label} className={cn('inline-flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-sm font-semibold', color)}>
                      <I className="w-3.5 h-3.5" /> {label}
                    </span>
                  ))}
                </div>

                {/* ── Raccourcis rapides ── */}
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'aujourd_hui', label: "Aujourd'hui", emoji: '⚡', count: todayEvents.length },
                    { id: 'ce_weekend',  label: 'Ce week-end', emoji: '🏖️', count: weekendEvents.length },
                    { id: 'famille',     label: 'En famille',  emoji: '👨‍👩‍👧', count: null },
                    { id: 'gratuit',     label: 'Gratuit',     emoji: '🎟️', count: freeEvents.length },
                    { id: 'officiel',    label: 'Officiel',    emoji: '🏛️', count: officialEvents.length },
                  ] as const).map(({ id, label, emoji, count }) => (
                    <button key={id}
                      onClick={() => {
                        setQuickFilter(quickFilter === id ? null : id);
                        setActiveTab('liste');
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-all',
                        quickFilter === id
                          ? 'bg-white text-purple-700 border-white shadow-md'
                          : 'bg-white/15 text-white border-white/30 hover:bg-white/25'
                      )}>
                      <span>{emoji}</span>{label}
                      {count !== null && count > 0 && (
                        <span className={cn('text-xs font-black px-1.5 rounded-full', quickFilter === id ? 'bg-purple-100 text-purple-700' : 'bg-white/25')}>
                          {count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA créer */}
              {profile ? (
                <div className="flex-shrink-0 flex flex-col gap-2">
                  <Link href="/evenements/nouveau"
                    className="inline-flex items-center gap-2 bg-white text-purple-700 font-black px-6 py-3 rounded-2xl hover:bg-purple-50 transition-all shadow-lg hover:-translate-y-0.5 text-sm">
                    <Plus className="w-4 h-4" /> Proposer un événement
                  </Link>
                  <button onClick={() => setActiveTab('creer')}
                    className="inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-semibold px-5 py-2 rounded-xl hover:bg-white/25 transition-all text-sm">
                    <Plus className="w-3.5 h-3.5" /> Formulaire rapide
                  </button>
                </div>
              ) : (
                <Link href="/connexion"
                  className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-purple-700 font-black px-6 py-3 rounded-2xl hover:bg-purple-50 transition-all shadow-lg hover:-translate-y-0.5 text-sm">
                  <Plus className="w-4 h-4" /> Je propose un événement
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CONTENU PRINCIPAL
        ══════════════════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── ONGLETS ── */}
          <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-2xl border border-gray-100 p-1.5 w-fit shadow-sm">
            {([
              { id: 'agenda',  label: 'Calendrier',   icon: Calendar,      count: 0 },
              { id: 'semaine', label: 'Cette semaine', icon: CalendarDays,  count: thisWeekEvents.length },
              { id: 'liste',   label: 'Tout voir',     icon: ListFilter,    count: 0 },
              { id: 'forum',   label: 'Forum',         icon: MessageSquare, count: 0 },
              { id: 'creer',   label: 'Créer',         icon: Plus,          count: 0 },
            ] as { id: 'agenda'|'semaine'|'liste'|'forum'|'creer'; label: string; icon: React.ElementType; count: number }[]).map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
                className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  activeTab === id ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
                <Icon className="w-4 h-4" /> {label}
                {id === 'semaine' && count > 0 && (
                  <span className={cn('text-[10px] font-black px-1.5 py-0.5 rounded-full', activeTab === 'semaine' ? 'bg-white/25' : 'bg-purple-100 text-purple-700')}>{count}</span>
                )}
                {id === 'liste' && activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-purple-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{activeFiltersCount}</span>
                )}
              </button>
            ))}
            <Link href="/communaute/evenements"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-purple-600 hover:bg-purple-50 border border-purple-100">
              <Users className="w-4 h-4" /> Communauté
            </Link>
          </div>

          {/* Layout 2 colonnes */}
          <div className="flex gap-8 items-start">

            {/* ── COLONNE PRINCIPALE ── */}
            <div className="flex-1 min-w-0">

              {/* ══ TAB AGENDA ══ */}
              {activeTab === 'agenda' && (
                <div>
                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
                  ) : (
                    <CalendarView events={events} userId={profile?.id} onJoin={handleJoin} onStatusChange={handleEventStatusChange} />
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

              {/* ══ TAB SEMAINE ══ */}
              {activeTab === 'semaine' && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-purple-500" />
                        Cette semaine
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">Événements des 7 prochains jours</p>
                    </div>
                    {thisWeekEvents.length > 0 && (
                      <span className="text-sm font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
                        {thisWeekEvents.length} événement{thisWeekEvents.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-purple-400 animate-spin" /></div>
                  ) : thisWeekDays.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                      <CalendarDays className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                      <p className="font-bold text-gray-500 text-lg">Aucun événement cette semaine</p>
                      <p className="text-gray-400 text-sm mt-1 mb-4">Consultez le calendrier pour les prochaines dates.</p>
                      <button onClick={() => setActiveTab('agenda')} className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
                        <Calendar className="w-4 h-4" /> Voir le calendrier
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {thisWeekDays.map(dayKey => {
                        const dayEvs = thisWeekByDay[dayKey];
                        const dayDate = new Date(dayKey + 'T00:00:00');
                        const isToday = dayKey === today;
                        const isTomorrow = dayKey === (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })();
                        const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : dayDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase());
                        return (
                          <div key={dayKey}>
                            <div className={cn('flex items-center gap-3 mb-3')}>
                              <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isToday ? 'bg-red-500 animate-pulse' : 'bg-purple-400')} />
                              <h3 className={cn('font-black text-sm', isToday ? 'text-red-600' : 'text-gray-700')}>{dayLabel}</h3>
                              <div className="flex-1 h-px bg-gray-100" />
                              <span className="text-xs text-gray-400 font-semibold">{dayEvs.length} événement{dayEvs.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {dayEvs.map(ev => (
                                <EventCard key={ev.id} event={ev} userId={profile?.id} onJoin={handleJoin} onStatusChange={handleEventStatusChange} onToggleSave={toggleSaved} savedEvents={savedEvents} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB LISTE ══ */}
              {activeTab === 'liste' && (
                <div>
                  {/* Filtres */}
                  <div className="mb-5 space-y-3">
                    {/* Barre recherche */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un événement (titre, lieu, organisateur, tag…)"
                        className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white shadow-sm" />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Quick filters pills actifs */}
                    {(quickFilter || filterInscription || filterFree || showSavedOnly) && (
                      <div className="flex flex-wrap gap-2">
                        {quickFilter && (
                          <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full">
                            <Zap className="w-3 h-3" />
                            {quickFilter === 'aujourd_hui' ? "Aujourd'hui" : quickFilter === 'ce_weekend' ? 'Ce week-end' : quickFilter === 'famille' ? 'En famille' : quickFilter === 'gratuit' ? 'Gratuit' : 'Officiel'}
                            <button onClick={() => setQuickFilter(null)} className="ml-0.5 hover:text-purple-900"><X className="w-3 h-3" /></button>
                          </span>
                        )}
                        {filterInscription && (
                          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Inscription requise
                            <button onClick={() => setFilterInscription(false)} className="ml-0.5 hover:text-amber-900"><X className="w-3 h-3" /></button>
                          </span>
                        )}
                        {filterFree && (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                            🎟️ Gratuit seulement
                            <button onClick={() => setFilterFree(false)} className="ml-0.5 hover:text-emerald-900"><X className="w-3 h-3" /></button>
                          </span>
                        )}
                        {showSavedOnly && (
                          <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-full">
                            <BookmarkCheck className="w-3 h-3" /> Mes favoris
                            <button onClick={() => setShowSavedOnly(false)} className="ml-0.5 hover:text-yellow-900"><X className="w-3 h-3" /></button>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Secteur */}
                    <SectorFilter value={filterSector} onChange={setFilterSector} showAll allowCitywide compact label="Secteur" />

                    {/* Statut */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all',     label: 'Tous' },
                        { id: 'a_venir', label: '🟢 À venir' },
                        { id: 'complet', label: '🟡 Complet' },
                        { id: 'reporte', label: '🔵 Reporté' },
                        { id: 'annule',  label: '🔴 Annulé' },
                        { id: 'passe',   label: '⚪ Passé' },
                      ].map(s => (
                        <button key={s.id} onClick={() => setFilterStatus(s.id)}
                          className={cn('px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                            filterStatus === s.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50')}>
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Filtres rapides supplémentaires */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setFilterInscription(f => !f)}
                        className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                          filterInscription ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                        <CheckCircle2 className="w-3 h-3" /> Inscription requise
                      </button>
                      <button onClick={() => setFilterFree(f => !f)}
                        className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                          filterFree ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                        🎟️ Gratuit
                      </button>
                      {savedEvents.size > 0 && (
                        <button onClick={() => setShowSavedOnly(f => !f)}
                          className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                            showSavedOnly ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                          <BookmarkCheck className="w-3 h-3" /> Favoris ({savedEvents.size})
                        </button>
                      )}
                    </div>

                    {/* Catégories + toggle avancé */}
                    <div>
                      <button onClick={() => setShowAdvFilters(f => !f)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold mb-2 hover:text-purple-600 transition-colors">
                        <Filter className="w-3.5 h-3.5" /> Filtrer par catégorie
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showAdvFilters && 'rotate-180')} />
                      </button>
                      {showAdvFilters && (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setFilterCat('all')}
                            className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all',
                              filterCat === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50')}>
                            Toutes
                          </button>
                          {EVENT_CATEGORIES.slice(0, 7).map(c => (
                            <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
                              className={cn('px-3 py-1 rounded-full text-xs font-semibold transition-all',
                                filterCat === c.id ? `${c.bg} ${c.color} border ${c.border}` : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50')}>
                              {c.emoji} {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Résultats */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-gray-700">
                      {loadingEvents ? 'Chargement…' : `${filteredEvents.length} événement${filteredEvents.length !== 1 ? 's' : ''}`}
                      {activeFiltersCount > 0 && <span className="text-purple-500 ml-1 font-normal">({activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''})</span>}
                    </p>
                    {activeFiltersCount > 0 && (
                      <button onClick={() => { setFilterCat('all'); setFilterStatus('a_venir'); setFilterSector(null); setQuickFilter(null); setSearchQuery(''); setFilterInscription(false); setFilterFree(false); setShowSavedOnly(false); }}
                        className="text-xs text-gray-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors">
                        <X className="w-3 h-3" /> Réinitialiser
                      </button>
                    )}
                  </div>

                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                      <Calendar className="w-14 h-14 text-gray-200 mx-auto mb-3" />
                      <p className="font-bold text-gray-500 text-lg">Aucun événement</p>
                      <p className="text-gray-400 text-sm mt-1 mb-4">Modifiez les filtres ou proposez un événement !</p>
                      {profile && (
                        <button onClick={() => setActiveTab('creer')}
                          className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-purple-700">
                          <Plus className="w-4 h-4" /> Créer un événement
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredEvents.map(ev => (
                        <EventCard key={ev.id} event={ev} userId={profile?.id} onJoin={handleJoin} onStatusChange={handleEventStatusChange} onToggleSave={toggleSaved} savedEvents={savedEvents} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB FORUM ══ */}
              {activeTab === 'forum' && (
                <div className="max-w-3xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-black text-gray-900">Forum événements</h2>
                      <p className="text-sm text-gray-400 mt-0.5">Questions, suggestions et retours sur les événements de Biguglia</p>
                    </div>
                    {profile && (
                      <button onClick={() => setShowPostForm(!showPostForm)}
                        className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-all text-sm shadow-sm">
                        <Plus className="w-4 h-4" /> Nouveau sujet
                      </button>
                    )}
                  </div>

                  {showPostForm && profile && (
                    <form onSubmit={handlePostSubmit} className="bg-white rounded-2xl border border-purple-200 p-5 mb-6 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-800">Nouveau sujet</h3>
                        <button type="button" onClick={() => setShowPostForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                      <input type="text" placeholder="Titre (ex: Qui organise la fête de la musique ?)" required
                        value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                      <textarea placeholder="Votre message, question ou proposition…" required rows={4}
                        value={postForm.content} onChange={e => setPostForm(f => ({ ...f, content: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={submittingPost}
                          className="flex items-center gap-2 bg-purple-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
                          {submittingPost ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publication…</> : 'Publier'}
                        </button>
                        <button type="button" onClick={() => setShowPostForm(false)} className="px-5 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 border border-gray-200">Annuler</button>
                      </div>
                    </form>
                  )}

                  {loadingForum ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-purple-400 animate-spin" /></div>
                  ) : !forumCategoryId ? (
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
                      <AlertCircle className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                      <p className="font-bold text-purple-800 mb-1">Forum temporairement indisponible</p>
                      <p className="text-purple-700 text-sm">La catégorie forum n&apos;existe pas encore. Exécutez la migration SQL.</p>
                    </div>
                  ) : forumPosts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
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
                                <span className="text-xs text-gray-400">{post.author?.full_name ?? 'Anonyme'} · {formatRelative(post.created_at)}</span>
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

              {/* ══ TAB CRÉER ══ */}
              {activeTab === 'creer' && (
                <div className="max-w-2xl">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <PartyPopper className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-gray-900">Proposer un événement</h2>
                        <p className="text-gray-400 text-xs mt-0.5">Votre événement sera publié et visible dans l&apos;agenda communautaire</p>
                      </div>
                    </div>

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

                        {/* Titre */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Titre *</label>
                          <input type="text" placeholder="Ex: Tournoi de pétanque inter-quartiers" required
                            value={newEvent.title} onChange={e => setNewEvent(f => ({ ...f, title: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>

                        {/* Date + heure */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Date *</label>
                            <input type="date" required min={new Date().toISOString().split('T')[0]}
                              value={newEvent.event_date} onChange={e => setNewEvent(f => ({ ...f, event_date: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Heure de début</label>
                            <input type="time" value={newEvent.event_time} onChange={e => setNewEvent(f => ({ ...f, event_time: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                          </div>
                        </div>

                        {/* Lieu + catégorie */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Lieu</label>
                            <input type="text" placeholder="Ex: Place du village, Salle des fêtes…"
                              value={newEvent.location} onChange={e => setNewEvent(f => ({ ...f, location: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Catégorie *</label>
                            <select value={newEvent.category} onChange={e => setNewEvent(f => ({ ...f, category: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                              {EVENT_CATEGORIES.slice(0, 7).map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Secteur */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Secteur géographique</label>
                          <SectorFilter
                            value={newEvent.sector_id || null}
                            onChange={v => setNewEvent(f => ({ ...f, sector_id: v || '' }))}
                            showAll compact label=""
                          />
                        </div>

                        {/* Organisateur + participants */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Organisateur</label>
                            <input type="text" placeholder="Association ou nom de l'organisateur"
                              value={newEvent.organizer_name} onChange={e => setNewEvent(f => ({ ...f, organizer_name: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Max participants</label>
                            <input type="number" placeholder="Illimité si vide" min="1"
                              value={newEvent.max_participants} onChange={e => setNewEvent(f => ({ ...f, max_participants: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                          </div>
                        </div>

                        {/* Public cible + inscription */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Public cible</label>
                            <select value={newEvent.audience} onChange={e => setNewEvent(f => ({ ...f, audience: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                              {['Tout public', 'Famille', 'Enfants', 'Ados', 'Adultes', 'Seniors'].map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col justify-end pb-0.5">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                              <input type="checkbox" checked={newEvent.registration_required}
                                onChange={e => setNewEvent(f => ({ ...f, registration_required: e.target.checked }))}
                                className="w-4 h-4 rounded accent-purple-600" />
                              <span className="text-sm font-semibold text-gray-700">Inscription requise</span>
                            </label>
                          </div>
                        </div>

                        {/* Tarif */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Tarif</label>
                          <div className="flex gap-3 items-center">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: true }))} className="accent-purple-600" />
                              <span className="text-sm">🎟️ Gratuit</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" checked={!newEvent.is_free} onChange={() => setNewEvent(f => ({ ...f, is_free: false }))} className="accent-purple-600" />
                              <span className="text-sm">💶 Payant</span>
                            </label>
                            {!newEvent.is_free && (
                              <input type="number" placeholder="Prix (€)" min="0" step="0.01"
                                value={newEvent.price} onChange={e => setNewEvent(f => ({ ...f, price: e.target.value }))}
                                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">
                            <Tag className="w-3.5 h-3.5 inline mr-1" />Tags <span className="font-normal text-gray-400">(séparés par virgules)</span>
                          </label>
                          <input type="text" placeholder="Ex: famille, plein air, gratuit, musique, vide-grenier…"
                            value={newEvent.tags} onChange={e => setNewEvent(f => ({ ...f, tags: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                          <textarea placeholder="Décrivez l'événement : programme, conditions d'accès, infos pratiques, contacts…" rows={4}
                            value={newEvent.description} onChange={e => setNewEvent(f => ({ ...f, description: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300" />
                        </div>

                        {/* Photos */}
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">
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

                        <div className="pt-2 border-t border-gray-100 flex gap-2">
                          <button type="submit" disabled={submittingEvent}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold py-3 rounded-xl hover:from-purple-700 hover:to-violet-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm shadow-purple-200">
                            {submittingEvent
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</>
                              : <><PartyPopper className="w-4 h-4" /> Publier l&apos;événement</>}
                          </button>
                          <button type="button" onClick={resetForm}
                            className="px-5 py-3 rounded-xl text-gray-500 hover:bg-gray-100 border border-gray-200 text-sm">
                            Annuler
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════
                SIDEBAR COMMUNAUTÉ (desktop only)
            ══════════════════════════════════════════════════════════ */}
            <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

              {/* Prochain événement à la une */}
              {featuredEvent && (
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 rounded-2xl p-5 text-white shadow-lg overflow-hidden relative">
                  <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center text-sm">{getCat(featuredEvent.category).emoji}</span>
                      <div>
                        <p className="text-[11px] text-purple-200 font-semibold">⚡ Prochain événement</p>
                        <p className="text-xs font-black">{daysUntil(featuredEvent.event_date) ?? 'Prochainement'}</p>
                      </div>
                    </div>
                    <h3 className="font-black text-sm mb-2 line-clamp-2">{featuredEvent.title}</h3>
                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-purple-100 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />{formatEventDate(featuredEvent.event_date)}
                      </p>
                      <p className="text-xs text-purple-100 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />{featuredEvent.event_time}
                      </p>
                      <p className="text-xs text-purple-100 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />{featuredEvent.location}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full">
                        {featuredEvent.is_free ? '🎟️ Gratuit' : `${featuredEvent.price} €`}
                      </span>
                      <Link href={`/evenements/${featuredEvent.id}`}
                        className="text-xs font-bold bg-white/90 text-purple-700 px-3 py-1.5 rounded-xl hover:bg-white transition-all">
                        Voir <ArrowRight className="w-3 h-3 inline ml-0.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Agenda semaine — regroupé par jour */}
              {thisWeekDays.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-purple-500" /> Cette semaine
                    </h3>
                    <button onClick={() => setActiveTab('semaine')}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-800 transition-colors bg-purple-50 px-2 py-0.5 rounded-full">
                      Tout voir →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {thisWeekDays.slice(0, 4).map(dayKey => {
                      const dayEvs = thisWeekByDay[dayKey];
                      const isToday = dayKey === today;
                      const isTomorrow = dayKey === (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })();
                      const dayD = new Date(dayKey + 'T00:00:00');
                      const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : dayD.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
                      return (
                        <div key={dayKey}>
                          <p className={cn('text-[11px] font-black mb-1.5 flex items-center gap-1', isToday ? 'text-red-500' : 'text-gray-500')}>
                            {isToday && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />}
                            {dayLabel}
                          </p>
                          {dayEvs.slice(0, 2).map(ev => {
                            const evCat = getCat(ev.category);
                            return (
                              <Link key={ev.id} href={`/evenements/${ev.id}`}
                                className="flex items-start gap-2 py-1.5 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors group">
                                <span className="text-base flex-shrink-0 leading-none mt-0.5">{evCat.emoji}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-gray-800 line-clamp-1 group-hover:text-purple-600">{ev.title}</p>
                                  <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" />{ev.event_time}
                                    {ev.is_free && <span className="text-emerald-500 font-semibold ml-1">Gratuit</span>}
                                  </p>
                                </div>
                              </Link>
                            );
                          })}
                          {dayEvs.length > 2 && (
                            <p className="text-[10px] text-purple-500 font-semibold pl-6">+{dayEvs.length-2} autre{dayEvs.length-2>1?'s':''}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {thisWeekDays.length > 4 && (
                    <button onClick={() => setActiveTab('semaine')}
                      className="mt-3 w-full text-xs text-purple-600 font-semibold py-2 border border-purple-100 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-1">
                      {thisWeekEvents.length - thisWeekDays.slice(0,4).reduce((s,d) => s + Math.min(thisWeekByDay[d].length, 2), 0)} autres événements <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Prochains événements (si rien cette semaine) */}
              {thisWeekDays.length === 0 && nextWeekEvents.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" /> Prochains événements
                  </h3>
                  <div className="space-y-2">
                    {nextWeekEvents.slice(1, 6).map(ev => {
                      const evCat = getCat(ev.category);
                      const cd = daysUntil(ev.event_date);
                      return (
                        <Link key={ev.id} href={`/evenements/${ev.id}`}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                          <span className="text-xl flex-shrink-0 leading-none">{evCat.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-purple-600 transition-colors">{ev.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400">{formatEventDate(ev.event_date)}</span>
                              {cd && <span className={cn('text-[10px] font-bold', cd.includes('Aujourd') ? 'text-red-500' : 'text-gray-400')}>{cd}</span>}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  {upcomingEvents.length > 6 && (
                    <button onClick={() => setActiveTab('liste')}
                      className="mt-3 w-full text-xs text-purple-600 font-semibold py-2 border border-purple-100 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-1">
                      Voir tout <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Explorer par catégorie */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" /> Explorer par catégorie
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_CATEGORIES.slice(0, 7).map(c => {
                    const count = upcomingEvents.filter(e => e.category === c.id).length;
                    const isActive = filterCat === c.id && activeTab === 'liste';
                    return (
                      <button key={c.id}
                        onClick={() => { setFilterCat(filterCat === c.id && activeTab === 'liste' ? 'all' : c.id); setActiveTab('liste'); setShowAdvFilters(true); }}
                        className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all hover:shadow-sm text-xs font-bold',
                          isActive ? `${c.bg} ${c.color} ${c.border}` : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200')}>
                        <span className="text-xl leading-none">{c.emoji}</span>
                        <span className="leading-tight">{c.label}</span>
                        {count > 0 && <span className={cn('text-[10px] font-semibold', isActive ? c.color : 'text-gray-400')}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats communauté */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" /> Activité de la commune
                </h3>
                <div className="space-y-3">
                  {[
                    { icon: Calendar, label: `${totalCount} événement${totalCount !== 1 ? 's' : ''}`, sub: 'à venir', color: 'text-purple-500', bg: 'bg-purple-50' },
                    { icon: Zap,      label: `${todayEvents.length} aujourd'hui`,  sub: 'ce jour',         color: 'text-red-500',    bg: 'bg-red-50' },
                    { icon: CheckCircle2, label: `${freeEvents.length} gratuits`,  sub: 'accessibles à tous', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { icon: Shield,   label: `${officialEvents.length} officiels`, sub: 'mairie & institutions', color: 'text-blue-500', bg: 'bg-blue-50' },
                  ].map(({ icon: I, label, sub, color, bg }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                        <I className={cn('w-4 h-4', color)} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mes favoris (si au moins 1) */}
              {savedEvents.size > 0 && (
                <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-yellow-800 flex items-center gap-2">
                      <BookmarkCheck className="w-4 h-4 text-yellow-500" /> Mes favoris
                    </h3>
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{savedEvents.size}</span>
                  </div>
                  <button onClick={() => { setShowSavedOnly(true); setActiveTab('liste'); }}
                    className="w-full text-xs font-bold text-yellow-700 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Voir mes événements sauvegardés
                  </button>
                </div>
              )}

              {/* Charte organisateur */}
              <div className="bg-purple-50 rounded-2xl border border-purple-100 p-5 shadow-sm">
                <h3 className="text-sm font-black text-purple-800 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-500" /> Charte événements
                </h3>
                <ul className="space-y-2">
                  {[
                    'Informations exactes et vérifiables',
                    'Lieu et horaires précisés clairement',
                    'Public cible indiqué',
                    'Pas de contenu publicitaire trompeur',
                    'Mise à jour en cas de changement',
                  ].map(rule => (
                    <li key={rule} className="flex items-start gap-2 text-xs text-purple-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />{rule}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA non connecté */}
              {!profile && (
                <div className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl p-5 text-white shadow-lg">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black mb-1">Rejoignez la communauté</h3>
                  <p className="text-xs text-purple-200 mb-4 leading-relaxed">Inscrivez-vous pour participer aux événements et proposer vos propres animations.</p>
                  <Link href="/connexion"
                    className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-purple-50 transition-all w-full justify-center shadow-sm">
                    <Plus className="w-3.5 h-3.5" /> Se connecter & participer
                  </Link>
                </div>
              )}

            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
