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
  ChevronLeft,
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

// ─── Calendrier moderne animé ─────────────────────────────────────────────────
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Gradients par catégorie pour les cases
const CAT_GRADIENTS: Record<string, string> = {
  culture:    'from-purple-500 to-violet-600',
  musique:    'from-pink-500 to-rose-500',
  repas:      'from-orange-400 to-amber-500',
  nature:     'from-emerald-400 to-teal-500',
  famille:    'from-sky-400 to-blue-500',
  social:     'from-rose-400 to-pink-500',
  conference: 'from-teal-400 to-cyan-500',
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
  const hasEvents = dayEvents.length > 0 && !isPast;
  const firstEv = dayEvents[0];
  const cat = firstEv ? getCat(firstEv.category) : null;
  const gradient = cat ? (CAT_GRADIENTS[cat.id] ?? 'from-purple-500 to-pink-500') : '';
  const hasCover = !!firstEv?.cover_photo;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative overflow-hidden text-left
        border-b border-gray-100
        transition-all duration-300
        ${isSelected ? 'z-20' : 'z-0'}
      `}
      style={{
        height: '7rem',
        borderRight: '1px solid #f3f4f6',
        boxShadow: isSelected
          ? '0 0 0 2px #a855f7 inset, 0 8px 30px rgba(168,85,247,0.25)'
          : hovered && hasEvents
            ? '0 4px 20px rgba(168,85,247,0.15)'
            : undefined,
        transform: hovered && hasEvents ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* ── Fond animé pour cases avec événements ── */}
      {hasEvents && (
        <>
          {hasCover ? (
            /* Photo de couverture animée */
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={firstEv!.cover_photo!}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                style={{
                  opacity: hovered ? 0.65 : 0.38,
                  transform: hovered ? 'scale(1.12)' : 'scale(1.03)',
                }}
              />
              {/* Dégradé overlay dynamique */}
              <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                  background: hovered
                    ? 'linear-gradient(135deg, rgba(139,92,246,0.6) 0%, rgba(236,72,153,0.4) 100%)'
                    : 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)',
                  opacity: 1,
                }}
              />
            </>
          ) : (
            /* Fond dégradé animé */
            <>
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-opacity duration-300`}
                style={{ opacity: hovered ? 0.85 : 0.55 }}
              />
              {/* Cercles décoratifs animés */}
              <div
                className="absolute rounded-full transition-all duration-500"
                style={{
                  width: '60%', height: '60%',
                  background: 'rgba(255,255,255,0.15)',
                  top: hovered ? '-15%' : '-20%',
                  right: hovered ? '-10%' : '-15%',
                  transform: hovered ? 'scale(1.2)' : 'scale(1)',
                  filter: 'blur(8px)',
                }}
              />
              <div
                className="absolute rounded-full transition-all duration-700"
                style={{
                  width: '40%', height: '40%',
                  background: 'rgba(255,255,255,0.1)',
                  bottom: hovered ? '-5%' : '-10%',
                  left: hovered ? '5%' : '0%',
                  transform: hovered ? 'scale(1.3) rotate(20deg)' : 'scale(1)',
                  filter: 'blur(6px)',
                }}
              />
            </>
          )}

          {/* Particules scintillantes au hover */}
          {hovered && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(5)].map((_, pi) => (
                <div
                  key={pi}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: `${3 + pi * 1.5}px`,
                    height: `${3 + pi * 1.5}px`,
                    left: `${15 + pi * 17}%`,
                    top: `${20 + (pi % 3) * 25}%`,
                    opacity: 0.6 - pi * 0.08,
                    animation: `pulse ${0.8 + pi * 0.2}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Fond des jours sans événements ── */}
      {!hasEvents && (
        <div
          className="absolute inset-0 transition-colors duration-200"
          style={{ background: hovered ? 'rgba(243,244,246,0.8)' : (isPast ? 'rgba(249,250,251,0.5)' : 'white') }}
        />
      )}

      {/* ── Contenu ── */}
      <div className="relative z-10 h-full flex flex-col p-1.5 sm:p-2">

        {/* Numéro du jour */}
        <div
          className="flex-shrink-0 self-start transition-all duration-300"
          style={{ transform: hovered && hasEvents ? 'scale(1.15)' : 'scale(1)' }}
        >
          <span
            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-black"
            style={{
              background: isToday
                ? 'linear-gradient(135deg, #7c3aed, #ec4899)'
                : 'transparent',
              color: isToday
                ? 'white'
                : isPast
                  ? '#d1d5db'
                  : hasEvents
                    ? hasCover ? 'white' : 'white'
                    : '#374151',
              boxShadow: isToday ? '0 2px 12px rgba(124,58,237,0.5)' : undefined,
              textShadow: hasEvents && !isToday ? '0 1px 3px rgba(0,0,0,0.4)' : undefined,
            }}
          >
            {date.getDate()}
          </span>
        </div>

        {/* ── Labels événements ── */}
        {hasEvents && (
          <div className="mt-1 flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">

            {/* Premier événement */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all duration-300"
              style={{
                background: hasCover
                  ? 'rgba(0,0,0,0.45)'
                  : 'rgba(255,255,255,0.25)',
                backdropFilter: 'blur(4px)',
                transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              />
              <span className="text-[10px] sm:text-xs font-bold truncate text-white leading-tight"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {firstEv!.title}
              </span>
            </div>

            {/* Deuxième événement */}
            {dayEvents.length >= 2 && (() => {
              const ev2 = dayEvents[1];
              const c2 = getCat(ev2.category);
              return (
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(4px)',
                    transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
                    transitionDelay: '30ms',
                  }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c2.dot}`} />
                  <span className="text-[10px] font-semibold truncate text-white/90 leading-tight">
                    {ev2.title}
                  </span>
                </div>
              );
            })()}

            {/* Badge +N */}
            {dayEvents.length > 2 && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <span className="text-[10px] font-bold text-white/80">
                  +{dayEvents.length - 1} événements
                </span>
              </div>
            )}
          </div>
        )}

        {/* Compteur participants (si 1 seul événement avec participants) */}
        {hasEvents && dayEvents.length === 1 && (firstEv!.participants_count ?? 0) > 0 && (
          <div
            className="mt-auto flex items-center gap-1 transition-all duration-300"
            style={{
              opacity: hovered ? 1 : 0.7,
              transform: hovered ? 'translateY(0)' : 'translateY(2px)',
            }}
          >
            <Users className="w-2.5 h-2.5 text-white/80" />
            <span className="text-[9px] sm:text-[10px] font-semibold text-white/80">
              {firstEv!.participants_count}
            </span>
          </div>
        )}
      </div>

      {/* ── Bordure sélection animée ── */}
      {isSelected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: '0 0 0 2.5px #a855f7 inset',
            borderRadius: '2px',
          }}
        />
      )}
    </button>
  );
}

function CalendarView({
  events, userId, onJoin,
}: { events: LocalEvent[]; userId?: string; onJoin: (id: string, joined: boolean) => void }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [animDir, setAnimDir]   = useState<'left' | 'right' | null>(null);
  const [visible, setVisible]   = useState(true);

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

  const changeMonth = (dir: 'prev' | 'next') => {
    setAnimDir(dir === 'prev' ? 'right' : 'left');
    setVisible(false);
    setTimeout(() => {
      if (dir === 'prev') {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
      } else {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
      }
      setSelectedDay(null);
      setVisible(true);
      setAnimDir(null);
    }, 200);
  };

  const monthPrefix     = `${calYear}-${String(calMonth+1).padStart(2,'0')}`;
  const eventsThisMonth = events.filter(e => e.event_date.startsWith(monthPrefix));
  const selectedEvents  = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── GRILLE CALENDRIER ── */}
      <div className="flex-1 min-w-0">
        <div
          className="rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* ── HEADER ── */}
          <div
            className="relative px-6 py-5 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(236,72,153,0.2) 50%, rgba(59,130,246,0.2) 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Orbes décoratifs */}
            <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full opacity-20 blur-2xl"
              style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
            <div className="absolute top-0 right-1/4 w-24 h-24 rounded-full opacity-15 blur-xl"
              style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />

            <div className="relative flex items-center justify-between">
              <button
                onClick={() => changeMonth('prev')}
                className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2
                  className="text-2xl font-black tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #fff 0%, #e9d5ff 50%, #fbcfe8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {MOIS_FR[calMonth]}
                  <span className="ml-2 text-white/50 font-light text-xl">{calYear}</span>
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background: 'rgba(168,85,247,0.3)',
                      border: '1px solid rgba(168,85,247,0.5)',
                      color: '#e9d5ff',
                    }}
                  >
                    <PartyPopper className="w-3 h-3" />
                    {eventsThisMonth.length} événement{eventsThisMonth.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <button
                onClick={() => changeMonth('next')}
                className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── EN-TÊTES JOURS ── */}
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {JOURS.map((j, ji) => (
              <div
                key={j}
                className="py-3 text-center text-xs font-black uppercase tracking-widest"
                style={{ color: ji >= 5 ? 'rgba(216,180,254,0.7)' : 'rgba(255,255,255,0.35)' }}
              >
                {j}
              </div>
            ))}
          </div>

          {/* ── GRILLE DES JOURS ── */}
          <div
            className="grid grid-cols-7"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : `translateX(${animDir === 'left' ? '-20px' : '20px'})`,
              transition: 'opacity 0.2s ease, transform 0.2s ease',
            }}
          >
            {cells.map((date, i) => {
              if (!date) {
                return (
                  <div
                    key={i}
                    style={{
                      height: '7rem',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      borderRight: i % 7 !== 6 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                      background: 'rgba(0,0,0,0.15)',
                    }}
                  />
                );
              }
              const iso       = toISO(date);
              const dayEvents = eventsByDay[iso] ?? [];
              const isToday   = iso === toISO(today);
              const isPast    = date < today;
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

          {/* ── LÉGENDE ── */}
          <div
            className="px-5 py-3 flex flex-wrap gap-x-4 gap-y-1.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {EVENT_CATEGORIES.map(c => (
              <span key={c.id} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <span className={`w-2 h-2 rounded-sm ${c.dot}`} style={{ opacity: 0.85 }} />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PANEL LATÉRAL ── */}
      <div className="lg:w-80 xl:w-96 flex-shrink-0">
        {selectedDay ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900 text-base">
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long'
                }).replace(/^\w/, c => c.toUpperCase())}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-semibold">Aucun événement ce jour</p>
                <p className="text-gray-400 text-xs mt-1">Vous pouvez en proposer un !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map(ev => (
                  <EventCard key={ev.id} event={ev} userId={userId} onJoin={onJoin} compact />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="font-black text-gray-900 text-base mb-4">Prochains événements</h3>
            {events.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Aucun événement à venir</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {events.slice(0, 6).map(ev => {
                  const cat = getCat(ev.category);
                  const countdown = daysUntil(ev.event_date);
                  const pcount = ev.participants_count ?? 0;
                  return (
                    <button key={ev.id} onClick={() => setSelectedDay(ev.event_date)}
                      className="w-full bg-white rounded-xl border border-gray-100 p-3 text-left hover:border-purple-200 hover:shadow-sm transition-all group/item">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cat.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-sm line-clamp-1 group-hover/item:text-purple-700 transition-colors">{ev.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-500">{formatEventDate(ev.event_date)}</span>
                            {countdown && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${countdown.includes('Aujourd') ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {countdown}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Users className={`w-3 h-3 flex-shrink-0 ${pcount > 0 ? 'text-purple-500' : 'text-gray-300'}`} />
                            <span className={`text-xs font-semibold ${pcount > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                              {pcount > 0
                                ? `${pcount} participant${pcount > 1 ? 's' : ''}${ev.max_participants ? ` / ${ev.max_participants}` : ''}`
                                : 'Aucun inscrit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {events.length > 6 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    + {events.length - 6} autres événements
                  </p>
                )}
              </div>
            )}
          </div>
        )}
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
        const { data: photos } = await supabase
          .from('event_photos').select('event_id, url, display_order')
          .in('event_id', ids).order('display_order', { ascending: true });
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
      if (eventPhotos.length > 0 && inserted?.id) {
        for (let i = 0; i < eventPhotos.length; i++) {
          const file = eventPhotos[i];
          const ext = file.name.split('.').pop();
          const path = `events/${inserted.id}/${Date.now()}_${i}.${ext}`;
          const { data: up } = await supabase.storage.from('photos').upload(path, file, { upsert: true });
          if (up?.path) {
            const { data: urlData } = supabase.storage.from('photos').getPublicUrl(up.path);
            await supabase.from('event_photos').insert({ event_id: inserted.id, url: urlData.publicUrl, display_order: i });
          }
        }
      }
      toast.success('🎉 Événement publié ! Visible dans l\'agenda.', { duration: 4000 });
      setNewEvent({ title: '', description: '', event_date: '', event_time: '18:00', location: '', category: 'culture', organizer_name: '', max_participants: '', is_free: true, price: '' });
      setEventPhotos([]); setEventPhotoPreviews([]);
      setActiveTab('agenda');
      fetchEvents();
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">

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
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-pink-500 text-white">
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
  );
}
