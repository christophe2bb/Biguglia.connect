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
  const [curYear, setCurYear]       = useState(today.getFullYear());
  const [curMonth, setCurMonth]     = useState(today.getMonth());
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

  const selectedEvents = selectedDay ? (evByDay[selectedDay] ?? []) : [];
  const totalMonthEvents = cells.filter(d => d).reduce((acc, d) => {
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
          <button onClick={prevMonth}
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
              {totalMonthEvents > 0
                ? `${totalMonthEvents} événement${totalMonthEvents > 1 ? 's' : ''} ce mois`
                : 'Aucun événement ce mois'}
            </p>
          </div>
          <button onClick={nextMonth}
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
                const key          = d.toISOString().split('T')[0];
                const isPast       = d < today;
                const isTod        = d.getTime() === today.getTime();
                const isWeekendDay = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={i} style={{ background: isWeekendDay && !isPast ? '#faf5ff08' : undefined }}>
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
                      const evCat    = getCat(ev.category);
                      const evPastel = CAT_PASTEL[evCat.id] ?? CAT_PASTEL.culture;
                      const evCD     = daysUntil(ev.event_date);
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
                      <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
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
