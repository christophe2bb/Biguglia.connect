import { CheckCircle2 } from 'lucide-react';
import type { TimelineStep } from '../_config';

type Props = { steps: TimelineStep[] };

export function StatusTimeline({ steps }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="font-bold text-gray-900 mb-4">Progression de l&apos;annonce</h2>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.status} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm border-2 transition-all ${
                step.current
                  ? 'bg-blue-600 border-blue-600 text-white scale-110'
                  : step.done
                  ? 'bg-green-50 border-green-400 text-green-600'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}>
                {step.done && !step.current
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <span>{step.icon}</span>}
              </div>
              <p className={`text-[10px] mt-1 font-semibold text-center leading-tight ${
                step.current ? 'text-blue-600' : step.done ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
