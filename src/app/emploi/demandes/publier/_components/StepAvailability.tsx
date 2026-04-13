'use client';

import { Clock, Euro, MapPin } from 'lucide-react';
import { AVAILABILITY_LABELS, SALARY_PERIOD_LABELS, SECTORS } from '../_config';
import type { FormData } from '../_types';

interface Props {
  form: FormData;
  set: (field: keyof FormData, value: string | boolean | string[]) => void;
}

export function StepAvailability({ form, set }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Clock className="w-5 h-5 text-purple-500" />
        Disponibilité &amp; Localisation
      </h2>

      {/* Disponibilité */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Disponibilité <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
            <label
              key={value}
              className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-all ${
                form.availability_type === value
                  ? 'border-purple-500 bg-purple-50 text-purple-800 font-semibold'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="availability"
                value={value}
                checked={form.availability_type === value}
                onChange={e => set('availability_type', e.target.value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Date de disponibilité */}
      {form.availability_type === 'date' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Date de disponibilité
          </label>
          <input
            type="date"
            value={form.available_from}
            onChange={e => set('available_from', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
          />
        </div>
      )}

      {/* Ville + Secteur */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Ville <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Biguglia, Bastia…"
              value={form.location_city}
              onChange={e => set('location_city', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Secteur préféré
          </label>
          <select
            value={form.sector_id}
            onChange={e => set('sector_id', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
          >
            {SECTORS.map(s => (
              <option key={s.id} value={s.id}>
                {s.emoji ? `${s.emoji} ${s.label}` : s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rayon de mobilité */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Rayon de mobilité :{' '}
          <span className="text-purple-600 font-bold">{form.mobility_radius} km</span>
        </label>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={form.mobility_radius}
          onChange={e => set('mobility_radius', e.target.value)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>5 km</span>
          <span>100 km</span>
        </div>
      </div>

      {/* Prétentions salariales */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <Euro className="w-4 h-4 text-green-600" />
          Prétentions salariales
        </h3>

        {/* Fourchette */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[100px]">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number" placeholder="Min" min="0" step="1"
              value={form.salary_min}
              onChange={e => set('salary_min', e.target.value)}
              className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
            />
          </div>
          <span className="text-gray-400 font-bold">–</span>
          <div className="relative flex-1 min-w-[100px]">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number" placeholder="Max" min="0" step="1"
              value={form.salary_max}
              onChange={e => set('salary_max', e.target.value)}
              className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
            />
          </div>
          <select
            value={form.salary_period}
            onChange={e => set('salary_period', e.target.value)}
            className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
          >
            {Object.entries(SALARY_PERIOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Net ou Brut */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Le salaire indiqué est :</p>
          <div className="flex gap-3">
            {[
              { v: 'net',  label: '💵 Net',  desc: 'Ce que vous percevez' },
              { v: 'brut', label: '📄 Brut', desc: 'Avant déductions'     },
            ].map(opt => (
              <label
                key={opt.v}
                className={`flex-1 flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${
                  form.salary_type === opt.v
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio" name="salary_type" value={opt.v}
                  checked={form.salary_type === opt.v}
                  onChange={e => set('salary_type', e.target.value as 'net' | 'brut' | '')}
                  className="sr-only"
                />
                <span className="text-sm font-bold text-gray-900">{opt.label}</span>
                <span className="text-xs text-gray-500 mt-0.5">{opt.desc}</span>
              </label>
            ))}
            <label
              className={`flex-1 flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${
                form.salary_type === ''
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio" name="salary_type" value=""
                checked={form.salary_type === ''}
                onChange={() => set('salary_type', '')}
                className="sr-only"
              />
              <span className="text-sm font-bold text-gray-900">❓ NSP</span>
              <span className="text-xs text-gray-500 mt-0.5">Non précisé</span>
            </label>
          </div>
        </div>
      </div>

      {/* Horaires souhaités */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Horaires souhaités
        </h3>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="number" placeholder="Ex : 35, 39, 25, 20…"
            value={form.weekly_hours}
            onChange={e => set('weekly_hours', e.target.value)}
            className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
          />
        </div>
        <p className="text-xs text-gray-400">Nombre d&apos;heures par semaine souhaité</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_flexible_schedule}
            onChange={e => set('is_flexible_schedule', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-purple-600"
          />
          <span className="text-sm text-gray-700">
            ⚡ <span className="font-semibold">Horaires flexibles</span> / à définir
          </span>
        </label>
      </div>
    </div>
  );
}
