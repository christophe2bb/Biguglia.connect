'use client';

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { JOURS, MOIS_FR, CAT_PASTEL } from '../_constants';
import { getCat, formatEventDate, daysUntil } from '../_utils';
import AnimatedEventCell from './AnimatedEventCell';
import EventCard from './EventCard';
import type { LocalEvent } from '../_types';

interface Props {
  events: LocalEvent[];
  userId?: string;
  onJoin: (id: string, joined: boolean) => void;
  onStatusChange?: (id: string, s: string) => void;
}

export default function CalendarView({ events, userId, onJoin, onStatusChange }: Props) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [curYear, setCurYear]         = useState(today.getFullYear());
  const [curMonth, setCurMonth]       = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const firstDay = new Date(curYear, curMonth, 1);
  const lastDay  = new Date(curYear, curMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(curYear, curMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const evByDay: Record<string, LocalEvent[]> = {};
  events.forEach(ev => {
    if (!evByDay[ev.event_date]) evByDay[ev.event_date] = [];
    evByDay[ev.event_date].push(ev);
  });

  const selectedEvents    = selectedDay ? (evByDay[selectedDay] ?? []) : [];
  const totalMonthEvents  = cells.filter(d => d).reduce((acc, d) => {
    const key = d!.toISOString().split('T')[0];
    return acc + (evByDay[key]?.length ?? 0);
  }, 0);

  const prevMonth = () => {
    if (curMonth === 0) { setCurMonth(11); setCurYear(y => y - 1); }
    else setCurMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (curMonth === 11) { setCurMonth(0); setCurYear(y => y + 1); }
    else setCurMonth(m => m + 1);
  };

  return (
    <div className="cal-shell">
      {/* ── En-tête navigation ── */}
      <div className="cal-header">
        <button onClick={prevMonth} aria-label="Mois précédent" className="cal-nav-btn">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className="text-center">
          <h2 className="font-extrabold text-[17px] text-slate-900 m-0">
            {MOIS_FR[curMonth]} {curYear}
          </h2>
          <p className="text-[11px] text-slate-400 mt-[2px] font-medium m-0">
            {totalMonthEvents > 0
              ? `${totalMonthEvents} événement${totalMonthEvents > 1 ? 's' : ''} ce mois`
              : 'Aucun événement ce mois'}
          </p>
        </div>

        <button onClick={nextMonth} aria-label="Mois suivant" className="cal-nav-btn">
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* ── Corps calendrier + panel ── */}
      <div className="flex gap-0">
        {/* Grille */}
        <div className="flex-1 min-w-0">
          {/* Jours de la semaine */}
          <div className="cal-weekday-header">
            {JOURS.map((j, i) => (
              <div key={j} className={`cal-weekday-cell ${i >= 5 ? 'text-violet-600' : 'text-slate-400'}`}>
                {j}
              </div>
            ))}
          </div>
          {/* Cellules */}
          <div className="cal-grid">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="cal-empty-cell" />;
              const key          = d.toISOString().split('T')[0];
              const isPast       = d < today;
              const isTod        = d.getTime() === today.getTime();
              const isWeekendDay = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i} className={isWeekendDay && !isPast ? 'bg-purple-50/[0.03]' : undefined}>
                  <AnimatedEventCell
                    date={d}
                    dayEvents={evByDay[key] ?? []}
                    isToday={isTod}
                    isPast={isPast}
                    isSelected={selectedDay === key}
                    onSelect={() => setSelectedDay(selectedDay === key ? null : key)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel latéral */}
        <div className="cal-panel">
          {selectedDay ? (
            <div className="cal-panel-inner cal-float-in">
              <div className="cal-panel-header">
                <h3 className="cal-panel-title">
                  {new Date(selectedDay + 'T00:00:00')
                    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                    .replace(/^\w/, c => c.toUpperCase())}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  aria-label="Fermer le panneau du jour"
                  className="cal-panel-close"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {selectedEvents.length === 0 ? (
                <div className="cal-empty-day">
                  <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-slate-400 text-[13px] font-semibold m-0">Aucun événement ce jour</p>
                  <p className="text-slate-300 text-[12px] mt-1">Vous pouvez en proposer un !</p>
                </div>
              ) : (
                <div className="cal-events-list">
                  {selectedEvents.map(ev => (
                    <EventCard key={ev.id} event={ev} userId={userId} onJoin={onJoin} onStatusChange={onStatusChange} compact />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="cal-panel-inner">
              <h3 className="cal-panel-title mb-3">Prochains événements</h3>
              {events.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
                  <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-slate-400 text-[13px] m-0">Aucun événement à venir</p>
                </div>
              ) : (
                <div className="cal-upcoming-list">
                  {events.slice(0, 7).map(ev => {
                    const evCat    = getCat(ev.category);
                    const evPastel = CAT_PASTEL[evCat.id] ?? CAT_PASTEL.culture;
                    const evCD     = daysUntil(ev.event_date);
                    return (
                      <button key={ev.id}
                        onClick={() => setSelectedDay(ev.event_date)}
                        className="cal-upcoming-btn"
                        onMouseEnter={e => {
                          const el = e.currentTarget;
                          el.style.borderColor = evPastel.ring + '80';
                          el.style.transform   = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget;
                          el.style.borderColor = '#f1f5f9';
                          el.style.transform   = 'none';
                        }}
                      >
                        {/* icon — dynamic bg/border colors from event category */}
                        <span className="cal-upcoming-icon"
                          style={{ background: evPastel.bg, border: `1px solid ${evPastel.ring}30` }}>
                          {evPastel.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="cal-upcoming-title">{ev.title}</p>
                          <div className="cal-upcoming-meta">
                            <span className="text-[10px] text-slate-400">{formatEventDate(ev.event_date)}</span>
                            {evCD && (
                              <span className="cal-countdown-badge"
                                style={{
                                  background: evCD.includes('Aujourd') ? '#fee2e2' : evPastel.bg,
                                  color:      evCD.includes('Aujourd') ? '#ef4444' : evPastel.text,
                                }}>
                                {evCD}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {events.length > 7 && (
                    <p className="text-[11px] text-slate-400 text-center m-0">
                      + {events.length - 7} autres événements
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Légende catégories */}
      <div className="cal-legend">
        {Object.entries(CAT_PASTEL).slice(0, 7).map(([id, p]) => {
          const c = getCat(id);
          return (
            <span key={id} className="cal-legend-item">
              <span className="text-[13px]">{p.emoji}</span>{c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
