'use client';

import { Phone } from 'lucide-react';
import {
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
} from '@/types/jobs/constants';
import { AVAILABILITY_LABELS, SALARY_PERIOD_LABELS } from '../_config';
import type { FormData } from '../_types';

interface Props {
  form: FormData;
  set: (field: keyof FormData, value: string | boolean | string[]) => void;
}

/** Ligne du récapitulatif */
function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-600 gap-2">
      <span className="flex-shrink-0">{label}</span>
      <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">{value}</span>
    </div>
  );
}

export function StepContact({ form, set }: Props) {
  /* Salaire récap */
  const salaryRecap = form.salary_min
    ? `${form.salary_min}€${form.salary_max ? ` – ${form.salary_max}€` : ''} ${
        SALARY_PERIOD_LABELS[form.salary_period] ?? ''
      }${form.salary_type ? ` (${form.salary_type})` : ''}`
    : 'Non renseigné';

  const hoursRecap = form.weekly_hours
    ? `${form.weekly_hours}h${form.is_flexible_schedule ? ' · Flexible' : ''}`
    : form.is_flexible_schedule
      ? 'Flexibles'
      : '–';

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Phone className="w-5 h-5 text-purple-500" />
        Comment vous contacter
      </h2>

      {/* Mode de contact */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-2">
          Mode de contact préféré <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'email', label: '📧 Email'       },
            { value: 'phone', label: '📞 Téléphone'   },
            { value: 'mixed', label: '🔀 Les deux'    },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer text-sm font-medium transition-colors ${
                form.contact_mode === opt.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="radio" name="mode" value={opt.value}
                checked={form.contact_mode === opt.value}
                onChange={e => set('contact_mode', e.target.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Email */}
      {(form.contact_mode === 'email' || form.contact_mode === 'mixed') && (
        <div>
          <p className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email de contact <span className="text-red-500">*</span>
          </p>
          <input
            type="email" placeholder="votre@email.fr"
            value={form.contact_email}
            onChange={e => set('contact_email', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
          />
        </div>
      )}

      {/* Téléphone */}
      {(form.contact_mode === 'phone' || form.contact_mode === 'mixed') && (
        <div>
          <p className="block text-sm font-semibold text-gray-700 mb-1.5">
            Téléphone <span className="text-red-500">*</span>
          </p>
          <input
            type="tel" placeholder="06 XX XX XX XX"
            value={form.contact_phone}
            onChange={e => set('contact_phone', e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
          />
        </div>
      )}

      {/* Informations complémentaires */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Message / Informations complémentaires{' '}
          <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Ex : Disponible rapidement, références disponibles sur demande, cherche temps partiel matin uniquement…"
          value={form.contact_instructions}
          onChange={e => set('contact_instructions', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 resize-none"
        />
      </div>

      {/* Récapitulatif */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
        <p className="font-bold text-gray-900 mb-3">✅ Récapitulatif de votre demande</p>
        <RecapRow label="Métier recherché" value={form.title || '–'} />
        <RecapRow
          label="Catégorie"
          value={
            form.job_category
              ? JOB_CATEGORY_LABELS[form.job_category as keyof typeof JOB_CATEGORY_LABELS]
              : '–'
          }
        />
        <RecapRow
          label="Contrats"
          value={
            form.contract_types
              .map(c => CONTRACT_TYPE_LABELS[c as keyof typeof CONTRACT_TYPE_LABELS])
              .join(', ') || '–'
          }
        />
        <RecapRow label="Ville"          value={form.location_city || '–'} />
        <RecapRow label="Disponibilité"  value={AVAILABILITY_LABELS[form.availability_type] || '–'} />
        <RecapRow label="Salaire souhaité" value={salaryRecap} />
        <RecapRow label="Heures / semaine" value={hoursRecap} />

        {/* Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          {form.has_driving_license && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              🪪 Permis
            </span>
          )}
          {form.has_vehicle && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              🚗 Véhicule
            </span>
          )}
          {form.is_flexible_schedule && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
              ⚡ Flexible
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
