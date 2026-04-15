'use client';

import {
  AlertTriangle, Calendar, CheckCircle2, Gem, Info,
  Layers, Palette, Ruler, Shield, Tag,
} from 'lucide-react';
import {
  RARITY_CONFIG, CONDITION_CONFIG,
  type CollectionItem,
} from '@/lib/collectionneurs-config';
import { cn } from '@/lib/utils';

interface Props {
  item: CollectionItem;
}

export function ItemDetails({ item }: Props) {
  const rarityCfg = item.rarity_level ? RARITY_CONFIG[item.rarity_level] : null;
  const condCfg   = CONDITION_CONFIG[item.condition];

  const details = [
    { icon: CheckCircle2, label: 'État',              value: condCfg.label,                           color: condCfg.color },
    rarityCfg ? { icon: Gem,   label: 'Rareté',       value: `${rarityCfg.icon} ${rarityCfg.label}`, color: rarityCfg.color } : null,
    item.year_period       ? { icon: Calendar, label: 'Période / année',   value: item.year_period,   color: '' } : null,
    item.brand             ? { icon: Tag,      label: 'Marque / éditeur',  value: item.brand,         color: '' } : null,
    item.series_name       ? { icon: Layers,   label: 'Série / collection', value: item.series_name,  color: '' } : null,
    item.dimensions        ? { icon: Ruler,    label: 'Dimensions',        value: item.dimensions,    color: '' } : null,
    item.material          ? { icon: Palette,  label: 'Matière',           value: item.material,      color: '' } : null,
    item.authenticity_declared
      ? { icon: Shield, label: 'Authenticité', value: '✅ Déclarée authentique', color: 'text-emerald-600' }
      : null,
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string; color: string }[];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h2 className="text-sm font-black text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <Info className="w-4 h-4 text-gray-400" /> Détails de l&apos;objet
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {details.map((d, i) => {
          const Icon = d.icon;
          return (
            <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
              <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{d.label}</p>
                <p className={cn('text-sm font-semibold text-gray-800', d.color)}>{d.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Défauts honnêtes */}
      {item.defects_noted && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-700 mb-1">Défauts signalés par le vendeur</p>
              <p className="text-sm text-amber-800">{item.defects_noted}</p>
            </div>
          </div>
        </div>
      )}

      {/* Provenance */}
      {item.provenance && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-xs font-bold text-blue-700 mb-1">Provenance / historique</p>
          <p className="text-sm text-blue-800">{item.provenance}</p>
        </div>
      )}
    </div>
  );
}
