// ─── Étape 2 : Employeur ──────────────────────────────────────────────────────

import { Building2, MapPin } from 'lucide-react';
import { SECTORS } from '../_config';
import type { FormData, SetField } from '../_types';

type Props = { form: FormData; set: SetField };

const INPUT = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 transition-colors';

export default function StepEmployeur({ form, set }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-brand-500" /> L&apos;employeur
      </h2>

      {/* Employer name */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          Nom de l&apos;entreprise / employeur <span className="text-red-500">*</span>
        </p>
        <input
          type="text"
          placeholder="Restaurant Le Maquis, SARL BTP Corse…"
          value={form.employer_name}
          onChange={e => set('employer_name', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* City + Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="block text-sm font-semibold text-gray-700 mb-1.5">
            Ville <span className="text-red-500">*</span>
          </p>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Biguglia, Bastia…"
              value={form.location_city}
              onChange={e => set('location_city', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 transition-colors"
            />
          </div>
        </div>
        <div>
          <p className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse (optionnel)</p>
          <input
            type="text"
            placeholder="Zone Lido, route nationale…"
            value={form.location_address}
            onChange={e => set('location_address', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {/* Sector grid */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📍 Secteur / Quartier{' '}
          <span className="text-gray-400 font-normal text-xs ml-1">(utilisé dans la recherche par zone)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SECTORS.filter(s => s.id !== '').map(s => (
            <label
              key={s.id}
              className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-colors ${
                form.sector_id === s.id
                  ? 'border-brand-500 bg-brand-50 text-brand-800 font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="radio" name="sector" value={s.id}
                checked={form.sector_id === s.id}
                onChange={e => set('sector_id', e.target.value)}
                className="sr-only"
              />
              <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                form.sector_id === s.id ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
              }`} />
              <span>{s.emoji} {s.label}</span>
            </label>
          ))}
          {/* «Non précisé» option */}
          <label className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-colors ${
            form.sector_id === ''
              ? 'border-gray-400 bg-gray-50 text-gray-700 font-semibold'
              : 'border-gray-200 text-gray-400 hover:border-gray-300'
          }`}>
            <input
              type="radio" name="sector" value=""
              checked={form.sector_id === ''}
              onChange={() => set('sector_id', '')}
              className="sr-only"
            />
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
              form.sector_id === '' ? 'border-gray-500 bg-gray-500' : 'border-gray-300'
            }`} />
            Non précisé
          </label>
        </div>
      </div>

      {/* Urgent toggle */}
      <label aria-label="Recrutement urgent" className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_urgent}
          onChange={e => set('is_urgent', e.target.checked)}
          className="w-5 h-5 text-red-500 rounded border-gray-300"
        />
        <div>
          <span className="text-sm font-bold text-red-800">🔥 Recrutement urgent</span>
          <p className="text-xs text-red-600">Badge &quot;Urgent&quot; visible sur votre offre</p>
        </div>
      </label>
    </div>
  );
}
