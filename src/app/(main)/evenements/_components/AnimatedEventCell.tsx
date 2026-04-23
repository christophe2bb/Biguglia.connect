'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  const hasEvents      = dayEvents.length > 0;
  const upcomingEvents = dayEvents.filter(() => !isPast);
  const firstEv        = upcomingEvents[0] ?? dayEvents[0];
  const cat            = firstEv ? getCat(firstEv.category) : null;
  const pastel         = cat ? (CAT_PASTEL[cat.id] ?? CAT_PASTEL.culture) : null;
  const hasCover       = !!firstEv?.cover_photo;
  const showAnim       = hasEvents && !isPast;
  const pc             = firstEv?.participants_count ?? 0;

  /* ── Background color (dynamic → must stay as style) ── */
  const bg = isSelected
    ? (pastel?.bg ?? '#faf5ff')
    : showAnim
      ? (hovered ? (pastel?.bg ?? '#faf5ff') : 'white')
      : isPast ? '#fafafa' : 'white';

  /* ── Box-shadow (dynamic ring color → must stay as style) ── */
  const shadow = isSelected
    ? `0 0 0 2.5px ${pastel?.ring ?? '#a855f7'} inset, 0 6px 24px rgba(0,0,0,0.1)`
    : hovered && showAnim
      ? `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1.5px ${pastel?.ring ?? '#a855f7'}40 inset`
      : 'none';

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`aec-root${showAnim ? ' cal-cell-event' : ''}`}
      style={{
        /* Only truly dynamic values remain here */
        background:  bg,
        transform:   hovered && showAnim ? 'scale(1.04) translateZ(0)' : 'scale(1)',
        boxShadow:   shadow,
        zIndex:      hovered || isSelected ? 20 : 1,
        /* CSS custom properties consumed by .aec-gradient-overlay / .aec-orb-* */
        '--aec-ring':    pastel?.ring ?? '#a855f7',
        '--aec-ring-22': `${pastel?.ring ?? '#a855f7'}22`,
        '--aec-ring-28': `${pastel?.ring ?? '#a855f7'}28`,
        '--aec-ring-18': `${pastel?.ring ?? '#a855f7'}18`,
      } as React.CSSProperties}
    >
      {/* Cover photo layer */}
      {showAnim && hasCover && (
        <div className="aec-cover-wrapper">
          <Image src={firstEv!.cover_photo!} alt="" fill sizes="(max-width: 768px) 14vw, 9vw"
            style={{
              objectFit:  'cover',
              opacity:    hovered ? 0.3 : 0.15,
              transform:  hovered ? 'scale(1.12)' : 'scale(1.04)',
              transition: 'all 0.7s cubic-bezier(.4,0,.2,1)',
            }} />
          {/* gradient overlay uses CSS custom property for ring color */}
          <div className="aec-gradient-overlay" />
        </div>
      )}

      {/* Ambient orb layer (no cover) */}
      {showAnim && !hasCover && pastel && (
        <>
          <div className="aec-orb-top" style={{
            transform: hovered ? 'scale(1.4)' : 'scale(1)',
            opacity:   hovered ? 1 : 0.7,
          }} />
          <div className="aec-orb-bottom" style={{
            bottom:    hovered ? '0%' : '-10%',
            left:      hovered ? '0%' : '-5%',
            transform: hovered ? 'scale(1.2)' : 'scale(1)',
          }} />
          {hovered && <div className="aec-shimmer cal-shimmer" />}
        </>
      )}

      {/* Today / selected ring overlay */}
      {showAnim && (isToday || isSelected) && pastel && (
        <div className={`aec-ring-overlay${isToday ? ' cal-pulse-ring' : ''}`} />
      )}

      {/* Content */}
      <div className="aec-body">
        {/* Day number badge */}
        <div className="aec-day-badge" style={{
          background: isToday ? 'linear-gradient(135deg, #7c3aed, #ec4899)' : 'transparent',
          color:      isToday ? 'white' : isPast ? '#cbd5e1' : showAnim ? (pastel?.text ?? '#374151') : '#64748b',
          boxShadow:  isToday ? '0 2px 10px rgba(124,58,237,0.45)' : undefined,
          outline:    isSelected && !isToday ? `2px solid ${pastel?.ring ?? '#a855f7'}` : undefined,
          transform:  hovered && showAnim ? 'scale(1.15)' : 'scale(1)',
        }}>
          {date.getDate()}
        </div>

        {/* Event info */}
        {showAnim && firstEv && (
          <div className="aec-events-area">
            <div className="aec-first-row"
              style={{ transform: hovered ? 'translateY(-1px)' : 'translateY(0)' }}>
              <span
                className={`${hovered ? 'cal-emoji-bounce' : ''} inline-block flex-shrink-0`}
                style={{
                  fontSize:   hasCover ? 13 : 15,
                  lineHeight: 1,
                  filter:     'drop-shadow(0 1px 2px rgba(0,0,0,0.12))',
                  transition: 'transform 0.3s ease',
                  transform:  hovered ? 'scale(1.25) rotate(-8deg)' : 'scale(1)',
                }}>
                {pastel?.emoji}
              </span>
              <span className="aec-first-title" style={{ color: pastel?.text ?? '#374151' }}>
                {firstEv.title}
              </span>
            </div>

            {upcomingEvents.length >= 2 && (() => {
              const ev2 = upcomingEvents[1];
              const p2  = CAT_PASTEL[getCat(ev2.category).id] ?? CAT_PASTEL.culture;
              return (
                <div className="aec-second-row">
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{p2.emoji}</span>
                  <span className="aec-second-title">{ev2.title}</span>
                </div>
              );
            })()}

            {upcomingEvents.length > 2 && (
              <span className="aec-more-badge"
                style={{ color: pastel?.text, background: pastel?.bg }}>
                +{upcomingEvents.length - 2} autres
              </span>
            )}

            {pc > 0 && (
              <div className="aec-participants">
                <Users style={{ width: 9, height: 9, flexShrink: 0, color: pastel?.ring }} aria-hidden="true" />
                <span style={{ fontSize: 9, fontWeight: 600, color: pastel?.ring }}>{pc}</span>
              </div>
            )}
          </div>
        )}

        {!showAnim && hasEvents && isPast && (
          <div className="aec-past-label">
            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
              {dayEvents.length} passé{dayEvents.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
