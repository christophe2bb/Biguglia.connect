'use client';

/**
 * StepMode — Étape 1 : choisir le mode (vente / échange / don / recherche).
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODE_CONFIG, type CollectionMode } from '@/lib/collectionneurs-config';

interface Props {
  value: CollectionMode;
  onChange: (mode: CollectionMode) => void;
}

const MODE_DESCRIPTIONS: Record<CollectionMode, string> = {
  vente:     'Définissez un prix et vendez votre objet à un autre collectionneur.',
  echange:   'Proposez un échange contre un objet de valeur similaire.',
  don:       "Offrez gratuitement votre objet à quelqu'un qui l'appréciera.",
  recherche: 'Signalez ce que vous cherchez — la communauté vous aidera.',
};

export default function StepMode({ value, onChange }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        Quel est le mode de votre annonce ?
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Choisissez comment vous souhaitez partager cet objet avec la communauté.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.entries(MODE_CONFIG) as [CollectionMode, typeof MODE_CONFIG.vente][]).map(([mode, cfg]) => {
          const Icon       = cfg.icon;
          const isSelected = value === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className={cn(
                'relative p-5 rounded-2xl border-2 text-left transition-all duration-200',
                isSelected
                  ? `border-blue-500 ${cfg.bg} shadow-md`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-3', cfg.bg, cfg.border, 'border')}>
                <Icon className={cn('w-6 h-6', cfg.color)} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{cfg.label}</h3>
              <p className="text-sm text-gray-500">{MODE_DESCRIPTIONS[mode]}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
