'use client';

import { CheckCircle, Star } from 'lucide-react';
import { TRUST_LEVEL_CONFIG } from '@/lib/moderation';
import { Section } from './Section';
import type { QueueDetail, TrustLevel } from '../_types';

interface Props {
  item: QueueDetail;
  onTrustChange: (level: TrustLevel) => void;
}

const TRUST_LEVELS: TrustLevel[] = ['nouveau', 'surveille', 'fiable', 'de_confiance'];

export function TrustPanel({ item, onTrustChange }: Props) {
  const currentLevel = (item.author?.trust_level || 'nouveau') as TrustLevel;

  return (
    <Section title="Niveau de confiance" icon={Star}>
      <div className="space-y-2">
        <p className="text-xs text-gray-500 mb-3">
          Modifier le niveau influence la modération future de cet auteur.
        </p>
        {TRUST_LEVELS.map(level => {
          const cfg       = TRUST_LEVEL_CONFIG[level];
          const isCurrent = currentLevel === level;
          return (
            <button
              key={level}
              onClick={() => onTrustChange(level)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors ${
                isCurrent
                  ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-brand-300`
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isCurrent ? cfg.color : 'text-gray-700'}`}>
                  {cfg.label}
                </p>
                <p className="text-[10px] text-gray-400 line-clamp-1">{cfg.description}</p>
              </div>
              {isCurrent && <CheckCircle className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}
