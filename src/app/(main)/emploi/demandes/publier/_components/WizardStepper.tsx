'use client';

import { CheckCircle } from 'lucide-react';
import { STEPS } from '../_config';
import type { Step } from '../_types';

interface Props {
  step: Step;
}

export function WizardStepper({ step }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const Icon      = s.icon;
          const active    = step === s.id;
          const completed = step > s.id;

          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                    completed
                      ? 'bg-green-500 text-white'
                      : active
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-200'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {completed
                    ? <CheckCircle className="w-5 h-5" />
                    : <Icon className="w-5 h-5" />
                  }
                </div>
                <span
                  className={`text-xs mt-1 font-medium hidden sm:block ${
                    active ? 'text-purple-600' : completed ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    completed ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
