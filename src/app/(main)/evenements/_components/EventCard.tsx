'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar, Clock, MapPin, Users, Bell, ArrowRight,
  Bookmark, BookmarkCheck, Shield, Tag,
} from 'lucide-react';

import ReportButton from '@/components/ui/ReportButton';
import RatingWidget from '@/components/ui/RatingWidget';
import { PhotoViewer } from '@/components/ui/PhotoViewer';
import ContactButton from '@/components/ui/ContactButton';
import StatusBadge from '@/components/ui/StatusBadge';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { cn } from '@/lib/utils';
import { getCat, formatEventDate, daysUntil } from '../_utils';
import EventMiniForum from './EventMiniForum';
import type { LocalEvent } from '../_types';

interface Props {
  event: LocalEvent;
  userId?: string;
  onJoin: (id: string, joined: boolean) => void;
  compact?: boolean;
  onStatusChange?: (id: string, newStatus: string) => void;
  onToggleSave?: (id: string) => void;
  savedEvents?: Set<string>;
}

export default function EventCard({
  event, userId, onJoin, compact = false, onStatusChange, onToggleSave, savedEvents,
}: Props) {
  const isSaved        = savedEvents?.has(event.id) ?? false;
  const cat            = getCat(event.category);
  const dateLabel      = formatEventDate(event.event_date);
  const countdown      = daysUntil(event.event_date);
  const timeLabel      = (event.event_time ?? '').slice(0, 5);
  const isPastEvent    = new Date(event.event_date + 'T23:59:59') < new Date();
  const participantCount = event.participants_count ?? 0;
  const isUrgent       = countdown?.includes("Aujourd'hui") || countdown === 'Demain';
  const isAnnule       = event.status === 'annule' || event.status === 'cancelled';
  const isReporte      = event.status === 'reporte' || event.status === 'postponed';
  const isFull         = event.max_participants !== null && participantCount >= (event.max_participants ?? 0);
  const fillPct        = event.max_participants
    ? Math.round((participantCount / event.max_participants) * 100) : null;
  const priceLabel     = event.is_free
    ? 'Gratuit' : event.price != null && event.price > 0 ? `${event.price} €` : 'Payant';

  const [lightboxOpen, setLightboxOpen]         = useState(false);
  const [pendingAction, setPendingAction]         = useState<{ id: string; key: string; label: string } | null>(null);
  const photoItems = event.cover_photo ? [{ url: event.cover_photo, isPrimary: true }] : [];

  // ── Compact card (calendrier) ─────────────────────────────────────────────
  if (compact) {
    return (
      <div className={cn(
        'bg-white rounded-xl border shadow-sm overflow-hidden transition-all',
        isPastEvent ? 'opacity-50 grayscale border-gray-100' : isUrgent ? 'border-purple-200' : 'border-gray-100',
        isAnnule && 'opacity-60',
      )}>
        {event.cover_photo && !isPastEvent && (
          <Link href={`/evenements/${event.id}`} className="block relative h-28 overflow-hidden">
            <Image src={event.cover_photo} alt={event.title} fill sizes="300px" className="object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </Link>
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn('text-xs font-bold', cat.color)}>{cat.emoji} {cat.label}</span>
            {countdown && !isPastEvent && (
              <span className={cn('ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full', isUrgent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500')}>
                {countdown}
              </span>
            )}
          </div>
          <Link href={`/evenements/${event.id}`} className="block hover:text-purple-700 mb-1">
            <p className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug">{event.title}</p>
          </Link>
          <div className="space-y-1 mb-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-purple-400" />{dateLabel}</div>
            <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-sky-400" />{timeLabel}</div>
            <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-rose-400" /><span className="truncate">{event.location}</span></div>
          </div>
          {!isPastEvent && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className={cn('text-xs font-bold', event.is_free ? 'text-emerald-600' : 'text-purple-600')}>{event.is_free ? '🎟️ Gratuit' : priceLabel}</span>
              {userId ? (
                <button onClick={() => onJoin(event.id, !!event.user_joined)} disabled={isFull && !event.user_joined}
                  className={cn('text-xs font-bold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50',
                    event.user_joined ? 'bg-gray-100 text-gray-600' : `${cat.bg} ${cat.color} border ${cat.border}`)}>
                  {event.user_joined ? 'Inscrit ✓' : isFull ? 'Complet' : 'Participer'}
                </button>
              ) : (
                <Link href="/connexion" className={cn('text-xs font-bold px-2.5 py-1 rounded-lg', cat.bg, cat.color, `border ${cat.border}`)}>Participer</Link>
              )}
            </div>
          )}
          {isPastEvent && <RatingWidget targetType="event" targetId={event.id} authorId={event.author_id} userId={userId} compact />}
          <EventMiniForum eventId={event.id} userId={userId} catColor={cat.color} catBg={cat.bg} catBorder={cat.border} />
        </div>
        {lightboxOpen && photoItems.length > 0 && (
          <PhotoViewer photos={photoItems} initialIndex={0} onClose={() => setLightboxOpen(false)} title={event.title} />
        )}
      </div>
    );
  }

  // ── Full card ─────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden',
      isUrgent && !isAnnule ? 'border-purple-300' : isAnnule ? 'border-red-100 opacity-75' : isReporte ? 'border-amber-200' : 'border-gray-200',
    )}>

      {/* ══ ZONE HERO ══════════════════════════════════════════════════════════ */}
      {event.cover_photo ? (
        /* Avec photo — grande image cliquable */
        <div className="relative overflow-hidden" style={{ height: '260px' }}>
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="relative w-full h-full block focus:outline-none"
            aria-label="Voir la photo en grand"
          >
            <Image
              src={event.cover_photo}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          </button>

          {/* Badges haut gauche */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
            <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shadow', cat.bg, cat.color)}>
              {cat.emoji} {cat.label}
            </span>
            {event.is_official && (
              <span className="text-xs bg-blue-600 text-white font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                <Shield className="w-3 h-3" /> Officiel
              </span>
            )}
            {isAnnule && <span className="text-xs bg-red-500 text-white font-bold px-2.5 py-1 rounded-full shadow">❌ Annulé</span>}
            {isReporte && <span className="text-xs bg-amber-400 text-white font-bold px-2.5 py-1 rounded-full shadow">🔄 Reporté</span>}
            {!isAnnule && !isReporte && (
              <StatusBadge status={event.status || 'active'} contentType="event" extra={{ eventDate: event.event_date, isFull }} size="xs" showIcon className="shadow" />
            )}
          </div>

          {/* Countdown haut droite */}
          {countdown && !isAnnule && (
            <span className={cn(
              'absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full shadow',
              countdown.includes('Aujourd') ? 'bg-red-500 text-white animate-pulse' : countdown === 'Demain' ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-700',
            )}>{countdown}</span>
          )}

          {/* Titre + méta en bas de la photo */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            {event.sector_id && <div className="mb-1.5 pointer-events-auto"><SectorBadge sectorId={event.sector_id} size="xs" /></div>}
            <Link href={`/evenements/${event.id}`} className="block pointer-events-auto">
              <h3 className="text-white font-black text-lg leading-tight drop-shadow-lg line-clamp-2 mb-2">{event.title}</h3>
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-white/90 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />{dateLabel}
              </span>
              {timeLabel && <span className="flex items-center gap-1 text-white/90 text-xs font-semibold"><Clock className="w-3.5 h-3.5" />{timeLabel}</span>}
              <span className="flex items-center gap-1 text-white/90 text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5" /><span className="truncate max-w-[150px]">{event.location}</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Sans photo — carte design avec toutes les infos visibles */
        <div className={cn('relative p-5', cat.bg)}>
          {/* Emoji décoratif en arrière-plan */}
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-8xl opacity-10 select-none pointer-events-none">{cat.emoji}</span>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className={cn('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 shadow-sm', cat.color)}>
              {cat.emoji} {cat.label}
            </span>
            {event.is_official && (
              <span className="text-xs bg-blue-600 text-white font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Shield className="w-3 h-3" /> Officiel
              </span>
            )}
            {isAnnule && <span className="text-xs bg-red-500 text-white font-bold px-2.5 py-1 rounded-full">❌ Annulé</span>}
            {isReporte && <span className="text-xs bg-amber-400 text-white font-bold px-2.5 py-1 rounded-full">🔄 Reporté</span>}
            {!isAnnule && !isReporte && (
              <StatusBadge status={event.status || 'active'} contentType="event" extra={{ eventDate: event.event_date, isFull }} size="xs" showIcon />
            )}
            {countdown && !isAnnule && (
              <span className={cn(
                'ml-auto text-xs font-bold px-2.5 py-1 rounded-full',
                countdown.includes('Aujourd') ? 'bg-red-500 text-white animate-pulse' : countdown === 'Demain' ? 'bg-amber-400 text-white' : 'bg-white/70 text-gray-700',
              )}>{countdown}</span>
            )}
          </div>

          {/* Quartier */}
          {event.sector_id && <div className="mb-2"><SectorBadge sectorId={event.sector_id} size="xs" /></div>}

          {/* Titre */}
          <Link href={`/evenements/${event.id}`} className="block mb-3">
            <h3 className={cn('font-black text-xl leading-tight line-clamp-2', cat.color)}>{event.title}</h3>
          </Link>

          {/* Infos clés */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />{dateLabel}
            </div>
            {timeLabel && (
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />{timeLabel}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 col-span-2">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />{event.location}
            </div>
            {event.organizer_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />Par <span className="font-semibold">{event.organizer_name}</span>
              </div>
            )}
          </div>

          {/* Prix + participants */}
          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-black px-3 py-1 rounded-full bg-white/70 shadow-sm', event.is_free ? 'text-emerald-700' : 'text-purple-700')}>
              {event.is_free ? '🎟️ Gratuit' : `💰 ${priceLabel}`}
            </span>
            <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full bg-white/70', participantCount > 0 ? 'text-purple-700' : 'text-gray-500')}>
              <Users className="w-3 h-3 inline mr-1" />
              {participantCount}{event.max_participants ? ` / ${event.max_participants}` : ''} participants
            </span>
          </div>
        </div>
      )}

      {/* ══ CORPS ══════════════════════════════════════════════════════════════ */}
      <div className="p-4">

        {/* Description */}
        {event.description && (
          <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-2">{event.description}</p>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            <Tag className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
            {event.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* Avec photo seulement : organisateur + participants ici */}
        {event.cover_photo && (
          <div className="flex items-center justify-between mb-3">
            {event.organizer_name ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                Par <span className="font-semibold text-gray-700 ml-1">{event.organizer_name}</span>
              </span>
            ) : <span />}
            <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold',
              participantCount > 0 ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400')}>
              <Users className="w-3 h-3" />
              {participantCount}{event.max_participants ? ` / ${event.max_participants}` : ''}
              {isFull && <span className="text-red-500 ml-1">· Complet</span>}
            </div>
          </div>
        )}

        {/* Barre de remplissage */}
        {event.max_participants && fillPct !== null && (
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className={cn('h-full rounded-full transition-all',
              fillPct > 80 ? 'bg-red-400' : fillPct > 50 ? 'bg-amber-400' : 'bg-emerald-400')}
              style={{ width: `${Math.min(fillPct, 100)}%` }} />
          </div>
        )}

        {/* Avatars participants */}
        {event.participants_list && event.participants_list.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {event.participants_list.slice(0, 6).map((p, i) => (
              <div key={p.user_id ?? i} title={p.user?.full_name ?? 'Participant'}
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative"
                style={{ marginLeft: i === 0 ? 0 : -6 }}>
                {p.user?.avatar_url
                  ? <Image src={p.user.avatar_url} alt={p.user.full_name ?? ''} fill className="object-cover" />
                  : <span className="text-[9px] font-bold text-purple-600">{(p.user?.full_name ?? '?').charAt(0).toUpperCase()}</span>}
              </div>
            ))}
            {participantCount > 6 && <span className="text-xs text-gray-400 ml-2">+{participantCount - 6}</span>}
          </div>
        )}

        {/* ── Barre d'actions ── */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2 flex-wrap">
          {/* Prix (avec photo) */}
          {event.cover_photo && (
            <span className={cn('text-sm font-black', event.is_free ? 'text-emerald-600' : 'text-purple-600')}>
              {event.is_free ? '🎟️ Gratuit' : `💰 ${priceLabel}`}
            </span>
          )}

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Sauvegarder */}
            {onToggleSave && (
              <button onClick={() => onToggleSave(event.id)} title={isSaved ? 'Retirer des favoris' : 'Sauvegarder'}
                className={cn('p-1.5 rounded-xl border transition-colors',
                  isSaved ? 'bg-yellow-50 text-yellow-500 border-yellow-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-yellow-500')}>
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            )}

            {/* Voir */}
            <Link href={`/evenements/${event.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
              <ArrowRight className="w-3.5 h-3.5" /> Voir
            </Link>

            {/* Participer */}
            {!isAnnule && !isPastEvent && (userId ? (
              <button
                onClick={() => onJoin(event.id, !!event.user_joined)}
                disabled={isFull && !event.user_joined}
                className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50',
                  event.user_joined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : `${cat.bg} ${cat.color} border ${cat.border}`)}>
                <Bell className="w-3.5 h-3.5" />
                {event.user_joined ? 'Inscrit ✓' : isFull ? 'Complet' : 'Je participe'}
              </button>
            ) : (
              <Link href="/connexion" className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl', cat.bg, cat.color, `border ${cat.border}`)}>
                <Bell className="w-3.5 h-3.5" /> Participer
              </Link>
            ))}

            {/* Report */}
            {userId && userId !== event.author_id && (
              <ReportButton targetType="event" targetId={event.id} targetTitle={event.title} variant="icon" />
            )}

            {/* Actions auteur */}
            {userId === event.author_id ? (
              <>
                {onStatusChange && (() => {
                  const s = event.status || 'a_venir';
                  const isPast = new Date(event.event_date + 'T23:59:59') < new Date();
                  const acts: { label: string; key: string; color: string }[] = [];
                  if (!['annule','cancelled','archive','archived'].includes(s)) {
                    if (!isPast) acts.push({ label: '✖ Annuler', key: 'annule', color: 'text-red-500 bg-red-50 border-red-200' });
                    if (!['reporte','postponed'].includes(s)) acts.push({ label: '🔄 Reporter', key: 'reporte', color: 'text-amber-600 bg-amber-50 border-amber-200' });
                  } else if (isPast) {
                    acts.push({ label: '📦 Archiver', key: 'archive', color: 'text-gray-500 bg-gray-50 border-gray-200' });
                  }
                  return acts.length > 0 ? (
                    <div className="flex gap-1">
                      {acts.map(a => (
                        <button key={a.key} onClick={() => setPendingAction({ id: event.id, key: a.key, label: a.label })}
                          className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors', a.color)}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
                {pendingAction?.id === event.id && (
                  <div className="flex items-center gap-2 mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded-xl w-full">
                    <span className="text-[10px] text-amber-800 font-semibold flex-1">{pendingAction.label} cet événement ?</span>
                    <button onClick={() => { if (onStatusChange) onStatusChange(pendingAction.id, pendingAction.key); setPendingAction(null); }}
                      className="text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded">Oui</button>
                    <button onClick={() => setPendingAction(null)} className="text-[10px] text-gray-500 px-1">✕</button>
                  </div>
                )}
              </>
            ) : (
              <ContactButton sourceType="event" sourceId={event.id} sourceTitle={event.title} ownerId={event.author_id} userId={userId} size="sm" />
            )}
          </div>
        </div>

        {/* Notation post-événement */}
        {isPastEvent && (
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
