'use client';

import { MapPin, Clock, Calendar, Users, Heart } from 'lucide-react';
import { SectorBadge } from '@/components/ui/SectorFilter';
import { DURATION_OPTIONS, COMPENSATION_CONFIG } from '../../_constants';
import type { HelpRequest } from '../_types';

type Props = { item: HelpRequest };

export default function HelpPracticalInfo({ item }: Props) {
  const durationLabel = DURATION_OPTIONS.find(o => o.value === item.duration)?.label ?? item.duration;
  const compConf = COMPENSATION_CONFIG[item.compensation];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-black text-gray-800 mb-4">Informations pratiques</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Lieu</p>
          <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" /> {item.location_area}
          </p>
          {item.location_detail && <p className="text-xs text-gray-500">{item.location_detail}</p>}
          {item.sector_id && <div className="mt-1"><SectorBadge sectorId={item.sector_id} size="sm" /></div>}
        </div>

        {item.help_date && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Date souhaitée</p>
            <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
              {new Date(item.help_date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {item.help_time && <span className="text-gray-500"> · {item.help_time}</span>}
            </p>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Durée estimée</p>
          <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" /> {durationLabel}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Personnes</p>
          <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {item.persons_needed} personne{item.persons_needed > 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Contrepartie</p>
          <p className="text-sm font-bold text-gray-700">{compConf?.emoji} {compConf?.label}</p>
          {item.compensation_detail && <p className="text-xs text-gray-500">{item.compensation_detail}</p>}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Pour qui</p>
          <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-400 flex-shrink-0" /> {item.for_who}
          </p>
        </div>
      </div>

      {item.equipment?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Matériel nécessaire</p>
          <div className="flex flex-wrap gap-2">
            {item.equipment.map(e => (
              <span key={e} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-semibold">🔧 {e}</span>
            ))}
          </div>
        </div>
      )}

      {item.conditions?.length > 0 && item.conditions[0] !== 'Rien de particulier' && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Conditions / précautions</p>
          <div className="flex flex-wrap gap-2">
            {item.conditions.map(c => (
              <span key={c} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
