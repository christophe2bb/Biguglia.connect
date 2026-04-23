'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar, Clock, MapPin, Users, Bell, ArrowRight,
  Bookmark, BookmarkCheck, Shield,
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
  const isSaved   = savedEvents?.has(event.id) ?? false;
  const cat       = getCat(event.category);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _CatIcon   = cat.icon;
  const dateLabel = formatEventDate(event.event_date);
  const countdown = daysUntil(event.event_date);
  const fillPct   = event.max_participants && event.participants_count !== undefined
    ? Math.round((event.participants_count / event.max_participants) * 100) : null;
  const isFull    = event.max_participants !== null && (event.participants_count ?? 0) >= event.max_participants;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [pendingEventAction, setPendingEventAction] = useState<{ id: string; key: string; label: string } | null>(null);
  const photoItems   = event.cover_photo ? [{ url: event.cover_photo, isPrimary: true }] : [];
  const isUrgent     = countdown?.includes("Aujourd'hui") || countdown === 'Demain';
  const isAnnule     = event.status === 'annule' || event.status === 'cancelled';
  const isReporte    = event.status === 'reporte' || event.status === 'postponed';

  // ── Compact card ──────────────────────────────────────────────────────────
  if (compact) {
    const isPastEvent      = new Date(event.event_date + 'T23:59:59') < new Date();
    const participantCount = event.participants_count ?? 0;
    return (
      <div className={cn(
        'bg-white rounded-xl border shadow-sm overflow-hidden transition-colors',
        isPastEvent ? 'opacity-50 grayscale border-gray-100' : isUrgent ? 'border-purple-200' : 'border-gray-100',
        isAnnule && 'opacity-60',
      )}>
        {event.cover_photo && !isPastEvent && (
          <div className="relative h-28 cursor-pointer" role="button" tabIndex={0} onClick={() => setLightboxOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxOpen(true); } }}>
            <Image src={event.cover_photo} alt={event.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cat.dot)} />
            <span className={cn('text-xs font-bold', cat.color)}>{cat.label}</span>
            {isPastEvent
              ? <span className="ml-auto text-xs text-gray-400 italic">Terminé</span>
              : countdown && (
                <span className={cn('ml-auto text-xs font-semibold', isUrgent ? 'text-red-500' : 'text-gray-400')}>
                  {countdown}
                </span>
              )}
          </div>
          <p className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">{event.title}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <Clock className="w-3 h-3 flex-shrink-0" />{event.event_time}
            <span className="mx-1">·</span>
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 text-xs mb-2 px-2 py-1.5 rounded-lg',
            participantCount > 0 ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400',
          )}>
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
                <button
                  onClick={() => onJoin(event.id, !!event.user_joined)}
                  disabled={isFull && !event.user_joined}
                  className={cn(
                    'text-xs font-bold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50',
                    event.user_joined ? 'bg-gray-100 text-gray-600' : `${cat.bg} ${cat.color} border ${cat.border}`,
                  )}
                >
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

  // ── Full card ─────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm hover:shadow-md transition-[color,border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 overflow-hidden group',
      isUrgent && !isAnnule ? 'border-purple-200' : isAnnule ? 'border-red-100 opacity-75' : isReporte ? 'border-amber-200' : 'border-gray-100',
    )}>
      {/* Zone photo */}
      <div className="relative h-44 overflow-hidden">
        {event.cover_photo ? (
          <div className="relative w-full h-full cursor-pointer" role="button" tabIndex={0} onClick={() => setLightboxOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxOpen(true); } }}>
            <Image src={event.cover_photo} alt={event.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
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
          <span className={cn(
            'absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full shadow',
            countdown.includes('Aujourd') ? 'bg-red-500 text-white animate-pulse' : countdown === 'Demain' ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-700',
          )}>
            {countdown}
          </span>
        )}

        {/* Titre bas */}
        <div className="absolute bottom-3 left-3 right-3">
          {event.sector_id && <div className="mb-1"><SectorBadge sectorId={event.sector_id} size="xs" /></div>}
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
                      ? <Image src={p.user.avatar_url} alt={p.user.full_name ?? ''} fill className="object-cover" />
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
                <div
                  className={cn('h-full rounded-full transition-colors', fillPct! > 80 ? 'bg-red-400' : fillPct! > 50 ? 'bg-amber-400' : 'bg-emerald-400')}
                  style={{ width: `${Math.min(fillPct ?? 0, 100)}%` }}
                />
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
                ✅ Inscription requise
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
            {onToggleSave && (
              <button onClick={() => onToggleSave(event.id)} title={isSaved ? 'Retirer des favoris' : 'Sauvegarder'}
                className={cn('p-1.5 rounded-xl transition-colors border', isSaved ? 'bg-yellow-50 text-yellow-500 border-yellow-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-yellow-50 hover:text-yellow-500')}>
                {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>
            )}
            <Link href={`/evenements/${event.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
              <ArrowRight className="w-3 h-3" /> Voir
            </Link>
            {!isAnnule && (userId ? (
              <button
                onClick={() => onJoin(event.id, !!event.user_joined)}
                disabled={isFull && !event.user_joined}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50',
                  event.user_joined ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : `${cat.bg} ${cat.color} border ${cat.border} hover:shadow-sm`,
                )}
              >
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
              <>
                {onStatusChange && (() => {
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
                        <button key={a.key}
                          onClick={() => setPendingEventAction({ id: event.id, key: a.key, label: a.label })}
                          className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors', a.color)}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
                {/* Confirmation inline de changement de statut */}
                {pendingEventAction && pendingEventAction.id === event.id && (
                  <div className="flex items-center gap-2 mt-1 p-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] text-amber-800 font-semibold flex-1">{pendingEventAction.label} cet événement ?</span>
                    <button onClick={() => { if (onStatusChange) onStatusChange(pendingEventAction.id, pendingEventAction.key); setPendingEventAction(null); }}
                      className="text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded">Oui</button>
                    <button onClick={() => setPendingEventAction(null)}
                      className="text-[10px] font-bold text-gray-600 px-1">✕</button>
                  </div>
                )}
              </>
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
