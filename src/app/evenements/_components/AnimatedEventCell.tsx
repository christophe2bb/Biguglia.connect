'use client';

import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { getCat } from '../_utils';
import { CAT_PASTEL } from '../_constants';
import type { LocalEvent } from '../_types';

interface Props {
  date: Date;
  dayEvents: LocalEvent[];
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export default function AnimatedEventCell({ date, dayEvents, isToday, isPast, isSelected, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);
  const hasEvents     = dayEvents.length > 0;
  const upcomingEvents = dayEvents.filter(() => !isPast);
  const firstEv       = upcomingEvents[0] ?? dayEvents[0];
  const cat           = firstEv ? getCat(firstEv.category) : null;
  const pastel        = cat ? (CAT_PASTEL[cat.id] ?? CAT_PASTEL.culture) : null;
  const hasCover      = !!firstEv?.cover_photo;
  const showAnim      = hasEvents && !isPast;
  const pc            = firstEv?.participants_count ?? 0;

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
          <div
            className={hovered ? 'orb-hover' : 'orb-idle'}
            style={{ position: 'absolute', width: '85%', height: '85%', borderRadius: '50%',
              background: `radial-gradient(circle at 60% 40%, ${pastel.ring}28 0%, transparent 70%)`,
              top: '-20%', right: '-20%', transition: 'transform 0.6s ease, opacity 0.4s ease',
              transform: hovered ? 'scale(1.4)' : 'scale(1)', opacity: hovered ? 1 : 0.7 }}
          />
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
        <div
          className={isToday ? 'pulse-ring' : ''}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 2,
            boxShadow: `0 0 0 2.5px ${pastel.ring} inset` }}
        />
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
              const p2  = CAT_PASTEL[getCat(ev2.category).id] ?? CAT_PASTEL.culture;
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
            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
              {dayEvents.length} passé{dayEvents.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
