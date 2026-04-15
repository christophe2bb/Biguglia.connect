'use client';

import { cn } from '@/lib/utils';
import type { Step } from '../_types';

const STEP_LABELS = ['Localisation', 'Thème', 'Rédaction', 'Finaliser'];
const STEP_ICONS  = ['📍', '🏷️', '✍️', '🚀'];

interface StepIndicatorProps {
  current: Step;
  total?: number;
}

export default function StepIndicator({ current, total = 4 }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const step     = (i + 1) as Step;
        const isDone   = step < current;
        const isActive = step === current;

        return (
          <div key={i} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm',
                  isDone   ? 'bg-emerald-500 text-white scale-95'                  :
                  isActive ? 'bg-violet-600 text-white ring-4 ring-violet-200'    :
                             'bg-gray-100 text-gray-400',
                )}
              >
                {isDone ? '✓' : STEP_ICONS[i]}
              </div>
              <span
                className={cn(
                  'text-[11px] hidden sm:block font-semibold mt-0.5',
                  isActive ? 'text-violet-600' :
                  isDone   ? 'text-emerald-600' :
                             'text-gray-400',
                )}
              >
                {STEP_LABELS[i]}
              </span>
            </div>

            {i < total - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 mb-3.5 transition-colors rounded-full',
                  isDone ? 'bg-emerald-400' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
