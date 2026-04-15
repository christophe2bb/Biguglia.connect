'use client';

import { Calendar, Clock, Users, Euro } from 'lucide-react';
import type { EventForm } from '../_config';

const INPUT = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300';

interface Props {
  form: EventForm;
  setField: <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;
}

export function StepDetails({ form, setField }: Props) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <h2 className="font-black text-gray-900 text-lg">Date, heure &amp; capacité</h2>

      {/* Dates */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Calendar className="inline w-3.5 h-3.5 mr-1" />Date de début *
          </label>
          <input
            type="date" required min={today}
            value={form.event_date} onChange={e => setField('event_date', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Calendar className="inline w-3.5 h-3.5 mr-1" />Date de fin{' '}
            <span className="text-gray-400 font-normal">(si multi-jours)</span>
          </label>
          <input
            type="date" min={form.event_date || today}
            value={form.event_end_date} onChange={e => setField('event_end_date', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {/* Times */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Clock className="inline w-3.5 h-3.5 mr-1" />Heure de début
          </label>
          <input
            type="time" value={form.start_time} onChange={e => setField('start_time', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            <Clock className="inline w-3.5 h-3.5 mr-1" />Heure de fin{' '}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <input
            type="time" value={form.end_time} onChange={e => setField('end_time', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Users className="inline w-3.5 h-3.5 mr-1" />Capacité
        </label>
        <div className="flex items-center gap-3 mb-3">
          {([true, false] as const).map(unlimited => (
            <label key={String(unlimited)} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" checked={form.is_unlimited === unlimited}
                onChange={() => setField('is_unlimited', unlimited)}
                className="accent-purple-600"
              />
              <span className="text-sm font-medium">{unlimited ? 'Illimitée' : 'Limitée'}</span>
            </label>
          ))}
        </div>
        {!form.is_unlimited && (
          <input
            type="number" placeholder="Nombre max de participants" min="1"
            value={form.capacity} onChange={e => setField('capacity', e.target.value)}
            className={INPUT}
          />
        )}
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <Euro className="inline w-3.5 h-3.5 mr-1" />Tarif
        </label>
        <div className="flex gap-3 flex-wrap mb-2">
          {(['gratuit', 'libre', 'payant'] as const).map(pt => (
            <label key={pt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" checked={form.price_type === pt}
                onChange={() => setField('price_type', pt)}
                className="accent-purple-600"
              />
              <span className="text-sm capitalize">{pt === 'libre' ? 'Prix libre' : pt}</span>
            </label>
          ))}
        </div>
        {form.price_type === 'payant' && (
          <input
            type="number" placeholder="Montant (€)" min="0" step="0.50"
            value={form.price_amount} onChange={e => setField('price_amount', e.target.value)}
            className={INPUT}
          />
        )}
      </div>

      {/* Registrations */}
      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
        <input
          type="checkbox" id="reg-open" checked={form.registration_open}
          onChange={e => setField('registration_open', e.target.checked)}
          className="w-4 h-4 accent-purple-600 rounded"
        />
        <label htmlFor="reg-open" className="text-sm font-semibold text-purple-800 cursor-pointer">
          Inscriptions ouvertes dès la publication
        </label>
      </div>
    </>
  );
}
