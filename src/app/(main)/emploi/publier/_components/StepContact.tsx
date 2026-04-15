// ─── Étape 4 : Contact & Récapitulatif ────────────────────────────────────────

import { Phone } from 'lucide-react';
import {
  CONTRACT_TYPE_LABELS,
} from '@/types/jobs/constants';
import { SECTORS, SALARY_PERIOD_LABELS, BENEFIT_OPTIONS } from '../_config';
import type { FormData, SetField } from '../_types';

type Props = { form: FormData; set: SetField };

const INPUT = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 transition-colors';

export default function StepContact({ form, set }: Props) {
  // ── Recap helpers ──────────────────────────────────────────────────────────
  const sectorEntry  = SECTORS.find(s => s.id === form.sector_id);
  const sectorLabel  = sectorEntry
    ? (sectorEntry.emoji ? `${sectorEntry.emoji} ${sectorEntry.label}` : sectorEntry.label)
    : 'Non précisé';

  const salaryStr = form.salary_min
    ? `${form.salary_min}€${form.salary_max ? ` – ${form.salary_max}€` : ''} ${SALARY_PERIOD_LABELS[form.salary_period] ?? ''}${form.salary_type ? ` (${form.salary_type})` : ''}`
    : 'Non renseigné';

  const hoursStr = form.weekly_hours
    ? `${form.weekly_hours}h/sem${form.is_flexible_schedule ? ' · Flexible' : ''}`
    : (form.is_flexible_schedule ? 'Flexibles' : '–');

  const benefitsStr = form.other_benefits.length > 0
    ? form.other_benefits.map(id => BENEFIT_OPTIONS.find(b => b.id === id)?.label ?? id).join(', ')
    : 'Aucun coché';

  const recapRows: [string, string][] = [
    ['Poste',     form.title       || '–'],
    ['Contrat',   form.contract_type
                    ? CONTRACT_TYPE_LABELS[form.contract_type as keyof typeof CONTRACT_TYPE_LABELS]
                    : '–'],
    ['Employeur', form.employer_name || '–'],
    ['Ville',     form.location_city || '–'],
    ['Secteur',   sectorLabel],
    ['Salaire',   salaryStr],
    ['Horaires',  hoursStr],
    ['Avantages', benefitsStr],
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Phone className="w-5 h-5 text-brand-500" /> Coordonnées de contact
      </h2>

      {/* Application mode */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Mode de candidature <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'email', label: '📧 Email'     },
            { value: 'phone', label: '📞 Téléphone' },
            { value: 'mixed', label: '🔀 Les deux'  },
          ].map(opt => (
            <label key={opt.value} className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer text-sm font-medium transition-colors ${
              form.application_mode === opt.value
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
              <input type="radio" name="mode" value={opt.value}
                checked={form.application_mode === opt.value}
                onChange={e => set('application_mode', e.target.value)}
                className="sr-only" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Email */}
      {(form.application_mode === 'email' || form.application_mode === 'mixed') && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Email de contact <span className="text-red-500">*</span>
          </label>
          <input type="email" placeholder="recrutement@example.fr"
            value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
            className={INPUT} />
        </div>
      )}

      {/* Phone */}
      {(form.application_mode === 'phone' || form.application_mode === 'mixed') && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Téléphone <span className="text-red-500">*</span>
          </label>
          <input type="tel" placeholder="06 XX XX XX XX"
            value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
            className={INPUT} />
        </div>
      )}

      {/* Additional instructions */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Instructions complémentaires{' '}
          <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea rows={3}
          placeholder="Ex : Mentionner la référence de l'annonce, joindre un CV…"
          value={form.contact_instructions} onChange={e => set('contact_instructions', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 resize-none" />
      </div>

      {/* ── Recap ──────────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
        <p className="font-bold text-gray-900 mb-3">✅ Récapitulatif de votre offre</p>
        {recapRows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-gray-600 gap-2">
            <span className="flex-shrink-0">{k}</span>
            <span className="font-semibold text-gray-900 text-right max-w-[220px] truncate">{v}</span>
          </div>
        ))}
        {/* Badge strip */}
        <div className="flex flex-wrap gap-2 pt-2">
          {form.is_urgent         && <span className="text-xs bg-red-100    text-red-700    px-2 py-0.5 rounded-full font-semibold">🔥 Urgent</span>}
          {form.provides_housing  && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">🏠 Logement</span>}
          {form.provides_meals    && <span className="text-xs bg-green-100  text-green-700  px-2 py-0.5 rounded-full font-semibold">🍽️ Repas</span>}
          {form.has_driving_license && <span className="text-xs bg-blue-100 text-blue-700   px-2 py-0.5 rounded-full font-semibold">🪪 Permis requis</span>}
          {form.requires_vehicle  && <span className="text-xs bg-gray-100  text-gray-700   px-2 py-0.5 rounded-full font-semibold">🚗 Véhicule requis</span>}
        </div>
      </div>
    </div>
  );
}
