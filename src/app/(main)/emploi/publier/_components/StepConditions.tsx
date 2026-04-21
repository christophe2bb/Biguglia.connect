// ─── Étape 3 : Conditions du poste ────────────────────────────────────────────

import { Euro, Clock, GraduationCap, Star, Home, Car, Utensils } from 'lucide-react';
import { SALARY_PERIOD_LABELS, BENEFIT_OPTIONS, COLOR_CLASSES } from '../_config';
import type { FormData, SetField } from '../_types';

type Props = {
  form: FormData;
  set: SetField;
  toggleBenefit: (id: string) => void;
};

const INPUT  = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white';
const CARD   = 'bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4';
const TITLE  = 'text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2';

export default function StepConditions({ form, set, toggleBenefit }: Props) {
  const showEndDate = ['cdd', 'saisonnier', 'interim'].includes(form.contract_type);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Euro className="w-5 h-5 text-brand-500" /> Conditions du poste
      </h2>

      {/* ── Rémunération ──────────────────────────────────────────────────── */}
      <div className={CARD}>
        <h3 className={TITLE}>
          <Euro className="w-4 h-4 text-green-600" /> Rémunération
        </h3>

        {/* Salary range */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[100px]">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="number" placeholder="Min" min="0" step="1"
              value={form.salary_min} onChange={e => set('salary_min', e.target.value)}
              className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
          </div>
          <span className="text-gray-400 font-bold">–</span>
          <div className="relative flex-1 min-w-[100px]">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="number" placeholder="Max" min="0" step="1"
              value={form.salary_max} onChange={e => set('salary_max', e.target.value)}
              className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
          </div>
          <select value={form.salary_period} onChange={e => set('salary_period', e.target.value)}
            className="px-3 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white">
            {Object.entries(SALARY_PERIOD_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Net / Brut / NSP */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Le salaire indiqué est :</p>
          <div className="flex gap-3">
            {[
              { v: 'net',  label: '💵 Net',  desc: 'Ce que le salarié reçoit' },
              { v: 'brut', label: '📄 Brut', desc: 'Avant déductions sociales' },
            ].map(opt => (
              <label key={opt.v} className={`flex-1 flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${
                form.salary_type === opt.v ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input type="radio" name="salary_type" value={opt.v}
                  checked={form.salary_type === opt.v}
                  onChange={e => set('salary_type', e.target.value)}
                  className="sr-only" />
                <span className="text-sm font-bold text-gray-900">{opt.label}</span>
                <span className="text-xs text-gray-500 mt-0.5">{opt.desc}</span>
              </label>
            ))}
            <label className={`flex-1 flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${
              form.salary_type === '' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="radio" name="salary_type" value=""
                checked={form.salary_type === ''}
                onChange={e => set('salary_type', e.target.value)}
                className="sr-only" />
              <span className="text-sm font-bold text-gray-900">❓ NSP</span>
              <span className="text-xs text-gray-500 mt-0.5">Non précisé</span>
            </label>
          </div>
        </div>

        {/* Negotiable */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.salary_is_negotiable}
            onChange={e => set('salary_is_negotiable', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600" />
          <span className="text-sm text-gray-700">
            Salaire <span className="font-semibold">négociable</span> selon profil
          </span>
        </label>

        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          💡 Les offres avec salaire visible reçoivent <strong>3× plus</strong> de candidatures.
        </p>
      </div>

      {/* ── Horaires & Durée ──────────────────────────────────────────────── */}
      <div className={CARD}>
        <h3 className={TITLE}>
          <Clock className="w-4 h-4 text-blue-600" /> Horaires &amp; Durée
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">Heures / semaine</p>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="number" placeholder="Ex : 35, 39, 25…"
                value={form.weekly_hours} onChange={e => set('weekly_hours', e.target.value)}
                className="w-full pl-9 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 bg-white" />
            </div>
          </div>
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">Date de début</p>
            <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
              className={INPUT} />
          </div>
        </div>

        {showEndDate && (
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-1.5">Date de fin (si connue)</p>
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
              className={INPUT} />
          </div>
        )}

        <div>
          <p className="block text-xs font-semibold text-gray-600 mb-1.5">
            Précisions horaires <span className="text-gray-400 font-normal">(optionnel)</span>
          </p>
          <input type="text"
            placeholder="Ex : Du lundi au vendredi, service du midi uniquement, week-ends inclus…"
            value={form.schedule_details} onChange={e => set('schedule_details', e.target.value)}
            className={INPUT} />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.is_flexible_schedule}
            onChange={e => set('is_flexible_schedule', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600" />
          <span className="text-sm text-gray-700">⚡ <span className="font-semibold">Horaires flexibles</span> / à définir ensemble</span>
        </label>
      </div>

      {/* ── Expérience ────────────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
        <h3 className={`${TITLE} mb-3`}>
          <GraduationCap className="w-4 h-4 text-indigo-600" /> Expérience requise
        </h3>
        <select value={form.experience_level} onChange={e => set('experience_level', e.target.value)}
          className={INPUT}>
          <option value="">Non spécifié / Peu importe</option>
          <option value="debutant">🟢 Débutant accepté – Aucune expérience requise</option>
          <option value="junior">🔵 Junior – 0 à 2 ans d&apos;expérience</option>
          <option value="confirme">🟠 Confirmé – 2 à 5 ans d&apos;expérience</option>
          <option value="senior">🔴 Senior – 5 ans et plus</option>
          <option value="expert">⭐ Expert – Profil très spécialisé</option>
        </select>
      </div>

      {/* ── Avantages ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <h3 className={TITLE}>
          <Star className="w-4 h-4 text-amber-500" /> Avantages proposés
        </h3>
        <p className="text-xs text-gray-500">Cochez tous les avantages inclus dans ce poste</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BENEFIT_OPTIONS.map(b => {
            const Icon   = b.icon;
            const active = form.other_benefits.includes(b.id);
            const cls    = COLOR_CLASSES[b.color] ?? COLOR_CLASSES.blue;
            return (
              <label key={b.id} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                active ? cls : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <input type="checkbox" checked={active} onChange={() => toggleBenefit(b.id)} className="sr-only" />
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                  active ? 'border-current bg-current' : 'border-gray-300'
                }`}>
                  {active && <span className="text-white text-xs">✓</span>}
                </div>
                <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
                <span className="text-sm font-medium">{b.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Hébergement & Repas ───────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
        <h3 className={TITLE}>
          <Home className="w-4 h-4 text-indigo-600" /> Hébergement &amp; Repas
        </h3>

        <label aria-label="Logement fourni" className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer">
          <input type="checkbox" checked={form.provides_housing}
            onChange={e => set('provides_housing', e.target.checked)}
            className="w-5 h-5 text-indigo-500 rounded border-gray-300" />
          <div>
            <span className="text-sm font-bold text-indigo-800">🏠 Logement fourni</span>
            <p className="text-xs text-indigo-600">Badge visible sur votre offre</p>
          </div>
        </label>

        {form.provides_housing && (
          <input type="text"
            placeholder="Précisions : chambre individuelle, studio, maison partagée…"
            value={form.housing_details} onChange={e => set('housing_details', e.target.value)}
            className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white" />
        )}

        <label aria-label="Repas fournis" className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer">
          <input type="checkbox" checked={form.provides_meals}
            onChange={e => set('provides_meals', e.target.checked)}
            className="w-5 h-5 text-green-500 rounded border-gray-300" />
          <div>
            <span className="text-sm font-bold text-green-800">
              <Utensils className="inline w-4 h-4 mr-1" />Repas fournis
            </span>
            <p className="text-xs text-green-600">Repas de service inclus</p>
          </div>
        </label>
      </div>

      {/* ── Prérequis mobilité ────────────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
        <h3 className={TITLE}>
          <Car className="w-4 h-4 text-gray-600" /> Prérequis de mobilité
        </h3>

        <label className="flex items-center gap-3 p-3 border border-gray-200 bg-white rounded-xl cursor-pointer">
          <input type="checkbox" checked={form.has_driving_license}
            onChange={e => set('has_driving_license', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600" />
          <span className="text-sm text-gray-700">🪪 <span className="font-semibold">Permis de conduire</span> requis</span>
        </label>

        <label className="flex items-center gap-3 p-3 border border-gray-200 bg-white rounded-xl cursor-pointer">
          <input type="checkbox" checked={form.requires_vehicle}
            onChange={e => set('requires_vehicle', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-brand-600" />
          <span className="text-sm text-gray-700">🚗 <span className="font-semibold">Véhicule personnel</span> requis</span>
        </label>
      </div>
    </div>
  );
}
