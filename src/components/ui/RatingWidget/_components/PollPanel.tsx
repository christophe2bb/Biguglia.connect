'use client';

import { ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POLL_CONFIG } from '../_config';
import type { RatingTargetType } from '../_types';

interface PollPanelProps {
  targetType: RatingTargetType;
  pollVotes: number[];
  myVote: number | null;
  votingPoll: boolean;
  onVote: (idx: number) => void;
}

export default function PollPanel({
  targetType, pollVotes, myVote, votingPoll, onVote,
}: PollPanelProps) {
  const pollConf = POLL_CONFIG[targetType];
  if (!pollConf) return null;

  const totalPollVotes = pollVotes.reduce((a, b) => a + b, 0);
  const hasVoted       = myVote !== null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
        <ThumbsUp className="w-4 h-4 text-blue-500" />
        {pollConf.question}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {pollConf.options.map((opt, idx) => {
          const votes    = pollVotes[idx] || 0;
          const pct      = totalPollVotes > 0 ? Math.round((votes / totalPollVotes) * 100) : 0;
          const isMyVote = myVote === idx;

          return (
            <button
              key={idx}
              onClick={() => !hasVoted && onVote(idx)}
              disabled={(hasVoted && !isMyVote) || votingPoll}
              className={cn(
                'relative overflow-hidden flex items-center gap-2 p-3 rounded-xl border text-sm transition-colors text-left',
                isMyVote
                  ? 'border-blue-400 bg-blue-50 text-blue-700 font-bold'
                  : hasVoted
                    ? 'border-gray-100 bg-gray-50 text-gray-500'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 cursor-pointer',
              )}
            >
              {hasVoted && (
                <div
                  className={cn('absolute inset-y-0 left-0 rounded-xl transition-colors', isMyVote ? 'bg-blue-100' : 'bg-gray-100')}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative text-base">{opt.emoji}</span>
              <span className="relative flex-1 text-xs font-medium leading-tight">{opt.label}</span>
              {hasVoted && (
                <span className={cn('relative text-xs font-black ml-auto', isMyVote ? 'text-blue-600' : 'text-gray-400')}>
                  {pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {totalPollVotes > 0 && (
        <p className="text-xs text-gray-400 text-right mt-2">
          {totalPollVotes} vote{totalPollVotes > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
