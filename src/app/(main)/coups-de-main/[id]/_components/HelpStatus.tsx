

import { CheckCircle2 } from 'lucide-react';
import { formatRelative } from '@/lib/utils';
import type { HelpRequest } from '../_types';

type StatusStep = {
  status: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  done: boolean;
};

type Props = {
  item: HelpRequest;
};

export default function HelpStatus({ item }: Props) {
  const steps: StatusStep[] = [
    {
      status: 'active',
      label: 'Annonce publiée',
      icon: '📢',
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      done: true,
    },
    {
      status: 'in_progress',
      label: 'En cours de traitement',
      icon: '⚡',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      done: ['in_progress', 'paused', 'resolved', 'closed', 'archived'].includes(item.status),
    },
    {
      status: 'resolved',
      label: 'Aide accomplie !',
      icon: '✅',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      done: ['resolved', 'closed', 'archived'].includes(item.status),
    },
    {
      status: 'archived',
      label: 'Archivée',
      icon: '📦',
      color: 'text-gray-500',
      bg: 'bg-gray-100',
      done: item.status === 'archived',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Progression de l&apos;annonce
      </h2>
      <div className="relative">
        {/* Ligne verticale */}
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-200" />
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={step.status} className="flex items-start gap-4 relative">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 z-10 ${step.done ? step.bg : 'bg-gray-100'}`}>
                {step.done ? step.icon : <span className="text-gray-300">{i + 1}</span>}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className={`text-sm font-bold ${step.done ? step.color : 'text-gray-400'}`}>{step.label}</p>
                {step.status === 'active' && (
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelative(item.created_at)}</p>
                )}
                {/* resolved_at n'existe pas → status_changed_at mis à jour par trigger */}
                {step.status === 'resolved' && item.status === 'resolved' && item.status_changed_at && (
                  <p className="text-xs text-emerald-500 mt-0.5">
                    {new Date(item.status_changed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </p>
                )}
                {step.status === 'in_progress' && item.status === 'in_progress' && (
                  <p className="text-xs text-indigo-400 mt-0.5 animate-pulse">En cours…</p>
                )}
              </div>
            </div>
          ))}

          {/* États spéciaux */}
          {item.status === 'paused' && (
            <div className="ml-11 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-700 font-semibold">⏸ Annonce temporairement en pause</p>
            </div>
          )}
          {item.status === 'closed' && (
            <div className="ml-11 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-600 font-semibold">✖ Annonce fermée par l&apos;auteur</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
