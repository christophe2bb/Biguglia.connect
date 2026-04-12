'use client';

import { Shield } from 'lucide-react';
import {
  AVAILABILITY_MODE_CONFIG, PICKUP_MODE_CONFIG, LEND_DURATION_HINTS, CONDITION_CONFIG,
} from '@/lib/equipment';
import type {
  EquipmentItemFull, AvailabilityMode, PickupMode, LendDurationHint, ConditionLabel,
} from '@/lib/equipment';

type Props = { item: EquipmentItemFull };

export default function EquipmentContent({ item }: Props) {
  const avMode  = item.availability_mode as AvailabilityMode | undefined;
  const pkMode  = item.pickup_mode       as PickupMode        | undefined;
  const durHint = item.lend_duration_hint as LendDurationHint | undefined;
  const hasAvailabilityBlock = avMode || pkMode || durHint || item.included_accessories || item.usage_instructions || item.requires_explanation;

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
      </div>

      {/* Conditions & disponibilité */}
      {hasAvailabilityBlock && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Conditions & disponibilité</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {avMode && (
              <InfoTile icon={AVAILABILITY_MODE_CONFIG[avMode].icon} label="Disponibilité" value={AVAILABILITY_MODE_CONFIG[avMode].label} />
            )}
            {pkMode && (
              <InfoTile icon={PICKUP_MODE_CONFIG[pkMode].icon} label="Remise" value={PICKUP_MODE_CONFIG[pkMode].label} />
            )}
            {durHint && (
              <InfoTile icon="⏱️" label="Durée conseillée" value={LEND_DURATION_HINTS[durHint].label} />
            )}
            {item.condition && (
              <InfoTile
                icon={CONDITION_CONFIG[item.condition as ConditionLabel]?.icon ?? ''}
                label="État"
                value={CONDITION_CONFIG[item.condition as ConditionLabel]?.label || item.condition}
              />
            )}
          </div>

          {item.requires_explanation && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-amber-600">⚠️</span>
              <span className="text-sm text-amber-800 font-medium">
                Nécessite une explication à la remise — prévoyez un moment avec le prêteur
              </span>
            </div>
          )}
          {item.included_accessories && (
            <div className="p-3 bg-emerald-50 rounded-xl">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Accessoires inclus</div>
              <p className="text-sm text-emerald-800">{item.included_accessories}</p>
            </div>
          )}
          {item.usage_instructions && (
            <div className="p-3 bg-blue-50 rounded-xl">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">📋 Instructions d&apos;utilisation</div>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{item.usage_instructions}</p>
            </div>
          )}
        </div>
      )}

      {/* Règles */}
      {item.rules && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-amber-800 mb-1">📋 Règles d&apos;utilisation</h3>
          <p className="text-sm text-amber-700">{item.rules}</p>
        </div>
      )}

      {/* Caution */}
      {item.deposit_amount && item.deposit_amount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Caution : {item.deposit_amount}€ (remboursable)</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper interne ─────────────────────────────────────────────────────────────
function InfoTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
      <span className="text-lg mt-0.5">{icon}</span>
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium text-gray-800">{value}</div>
      </div>
    </div>
  );
}
