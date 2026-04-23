'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar, CalendarDays, Clock, MapPin, Sparkles, TrendingUp,
  BookmarkCheck, Eye, Info, CheckCircle2, ChevronRight, Plus, Shield, Zap,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCat, daysUntil, formatEventDate } from '../_utils';
import { EVENT_CATEGORIES } from '../_constants';
import type { LocalEvent } from '../_types';

interface Props {
  featuredEvent: LocalEvent | null;
  upcomingEvents: LocalEvent[];
  thisWeekDays: string[];
  thisWeekByDay: Record<string, LocalEvent[]>;
  thisWeekEvents: LocalEvent[];
  today: string;
  totalCount: number;
  todayEvents: LocalEvent[];
  freeEvents: LocalEvent[];
  officialEvents: LocalEvent[];
  filterCat: string;
  activeTab: string;
  savedEvents: Set<string>;
  profile: { id: string } | null;
  onSetFilterCat: (cat: string) => void;
  onSetActiveTab: (tab: string) => void;
  onShowSemaine: () => void;
  onShowSavedOnly: () => void;
}

export default function EventSidebar({
  featuredEvent, upcomingEvents, thisWeekDays, thisWeekByDay, thisWeekEvents,
  today, totalCount, todayEvents, freeEvents, officialEvents,
  filterCat, activeTab, savedEvents, profile,
  onSetFilterCat, onSetActiveTab, onShowSemaine, onShowSavedOnly,
}: Props) {
  const getTomorrowKey = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  return (
    <aside className="hidden lg:flex flex-col gap-5 w-72 flex-shrink-0">

      {/* Prochain événement à la une */}
      {featuredEvent && (
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-pink-500 rounded-2xl p-5 text-white shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.07] bg-dot-grid-sm" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center text-sm">
                {getCat(featuredEvent.category).emoji}
              </span>
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
                className="text-xs font-bold bg-white/90 text-purple-700 px-3 py-1.5 rounded-xl hover:bg-white transition-colors">
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
            <button onClick={onShowSemaine}
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800 transition-colors bg-purple-50 px-2 py-0.5 rounded-full">
              Tout voir →
            </button>
          </div>
          <div className="space-y-3">
            {thisWeekDays.slice(0, 4).map(dayKey => {
              const dayEvs    = thisWeekByDay[dayKey];
              const isToday   = dayKey === today;
              const isTomorrow = dayKey === getTomorrowKey();
              const dayD      = new Date(dayKey + 'T00:00:00');
              const dayLabel  = isToday ? "Aujourd'hui" : isTomorrow ? 'Demain' : dayD.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
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
                    <p className="text-[10px] text-purple-500 font-semibold pl-6">
                      +{dayEvs.length - 2} autre{dayEvs.length - 2 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {thisWeekDays.length > 4 && (
            <button onClick={onShowSemaine}
              className="mt-3 w-full text-xs text-purple-600 font-semibold py-2 border border-purple-100 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-1">
              {thisWeekEvents.length - thisWeekDays.slice(0, 4).reduce((s, d) => s + Math.min(thisWeekByDay[d].length, 2), 0)} autres événements <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Prochains événements (si rien cette semaine) */}
      {thisWeekDays.length === 0 && upcomingEvents.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" /> Prochains événements
          </h3>
          <div className="space-y-2">
            {upcomingEvents.slice(1, 6).map(ev => {
              const evCat = getCat(ev.category);
              const cd    = daysUntil(ev.event_date);
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
            <button onClick={() => onSetActiveTab('liste')}
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
            const count    = upcomingEvents.filter(e => e.category === c.id).length;
            const isActive = filterCat === c.id && activeTab === 'liste';
            return (
              <button key={c.id}
                onClick={() => { onSetFilterCat(filterCat === c.id && activeTab === 'liste' ? 'all' : c.id); onSetActiveTab('liste'); }}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-colors hover:shadow-sm text-xs font-bold',
                  isActive ? `${c.bg} ${c.color} ${c.border}` : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200',
                )}>
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
            { icon: Calendar,    label: `${totalCount} événement${totalCount !== 1 ? 's' : ''}`, sub: 'à venir',              color: 'text-purple-500',  bg: 'bg-purple-50' },
            { icon: Zap,         label: `${todayEvents.length} aujourd'hui`,                      sub: 'ce jour',              color: 'text-red-500',     bg: 'bg-red-50' },
            { icon: CheckCircle2,label: `${freeEvents.length} gratuits`,                          sub: 'accessibles à tous',   color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { icon: Shield,      label: `${officialEvents.length} officiels`,                     sub: 'mairie & institutions', color: 'text-blue-500',    bg: 'bg-blue-50' },
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

      {/* Mes favoris */}
      {savedEvents.size > 0 && (
        <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-yellow-800 flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-yellow-500" /> Mes favoris
            </h3>
            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{savedEvents.size}</span>
          </div>
          <button onClick={onShowSavedOnly}
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
          <p className="text-xs text-purple-200 mb-4 leading-relaxed">
            Inscrivez-vous pour participer aux événements et proposer vos propres animations.
          </p>
          <Link href="/connexion"
            className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-purple-50 transition-colors w-full justify-center shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Se connecter & participer
          </Link>
        </div>
      )}

    </aside>
  );
}
