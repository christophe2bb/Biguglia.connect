'use client';

import { computeTrustScore } from '@/lib/moderation';
import { useState } from 'react';

interface TrustBadgeProps {
  profile: {
    created_at: string;
    role: string;
    avatar_url?: string | null;
    phone?: string | null;
    publication_count?: number;
    reports_received?: number;
    trust_level?: string;
  };
  /** 'badge' = badge compact, 'card' = carte détaillée */
  variant?: 'badge' | 'card' | 'mini';
  showDetails?: boolean;
}

// Mapping des niveaux de confiance → couleurs CSS
const LEVEL_STROKE: Record<string, string> = {
  de_confiance: '#7c3aed',
  fiable:       '#10b981',
  nouveau:      '#9ca3af',
  surveille:    '#f97316',
};

const LEVEL_BAR: Record<string, string> = {
  de_confiance: 'bg-purple-500',
  fiable:       'bg-emerald-500',
  nouveau:      'bg-gray-400',
  surveille:    'bg-orange-500',
};

export default function TrustBadge({ profile, variant = 'badge', showDetails = false }: TrustBadgeProps) {
  const trust = computeTrustScore(profile);
  const [open, setOpen] = useState(false);
  const strokeColor = LEVEL_STROKE[trust.level] || '#9ca3af';
  const barColor = LEVEL_BAR[trust.level] || 'bg-gray-400';

  if (variant === 'mini') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trust.bg} ${trust.color}`}>
        {trust.emoji} {trust.label}
      </span>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-2xl border p-4 ${trust.bg}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{trust.emoji}</span>
            <div>
              <p className={`text-sm font-black ${trust.color}`}>{trust.label}</p>
              <p className="text-xs text-gray-500">Score de confiance : {trust.score}/100</p>
            </div>
          </div>
          {/* Barre circulaire */}
          <div className="w-16 h-16 relative flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={strokeColor}
                strokeWidth="3"
                strokeDasharray={`${trust.score} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`absolute text-sm font-black ${trust.color}`}>{trust.score}</span>
          </div>
        </div>
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {trust.badges.map((b, i) => (
            <span key={i} className="text-xs bg-white/70 text-gray-700 px-2 py-0.5 rounded-full border border-white">
              {b}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Variant 'badge' avec tooltip optionnel
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => showDetails && setOpen(v => !v)}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${trust.bg} ${trust.color} border-current/20 ${showDetails ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
      >
        <span>{trust.emoji}</span>
        <span>{trust.label}</span>
        {trust.score >= 70 && (
          <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
        )}
      </button>

      {/* Tooltip détaillé */}
      {showDetails && open && (
        <div className="absolute left-0 top-8 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in fade-in duration-150">
          <p className={`text-sm font-black mb-1 ${trust.color}`}>{trust.emoji} {trust.label}</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${trust.score}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-600">{trust.score}/100</span>
          </div>
          <div className="space-y-1">
            {trust.badges.map((b, i) => (
              <p key={i} className="text-xs text-gray-600">{b}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
