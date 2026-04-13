'use client';

import { History } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import { Section } from './Section';
import type { ModerationHistoryEntry } from '../_types';

interface Props {
  history: ModerationHistoryEntry[];
}

export function HistoryPanel({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <Section title="Historique de modération" icon={History}>
      <div className="space-y-3">
        {history.map(entry => (
          <div
            key={entry.id}
            className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0"
          >
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <History className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {entry.moderator?.full_name || 'Système'}
                </span>
                <span>·</span>
                <span>{formatRelative(entry.created_at)}</span>
              </div>
              <p className="text-sm text-gray-800 mt-0.5">
                {entry.old_status && entry.new_status
                  ? `Statut : ${entry.old_status} → ${entry.new_status}`
                  : entry.action}
              </p>
              {entry.reason && (
                <p className="text-xs text-gray-500 mt-0.5">Motif : {entry.reason}</p>
              )}
              {entry.moderator_note && (
                <p className="text-xs text-gray-400 italic mt-0.5">{entry.moderator_note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
