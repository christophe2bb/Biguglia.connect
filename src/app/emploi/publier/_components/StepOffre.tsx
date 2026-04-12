// ─── Étape 1 : L'offre ────────────────────────────────────────────────────────

import { FileText, GraduationCap } from 'lucide-react';
import {
  CONTRACT_TYPES, CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES, JOB_CATEGORY_LABELS,
} from '@/types/jobs/constants';
import type { FormData, SetField } from '../_types';

type Props = { form: FormData; set: SetField };

const INPUT = 'w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-400 transition-colors';
const TEXTAREA = `${INPUT} resize-none`;

export default function StepOffre({ form, set }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <FileText className="w-5 h-5 text-brand-500" /> Décrivez le poste
      </h2>

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Intitulé du poste <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Ex : Serveur(se), Maçon, Aide à domicile…"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          className={INPUT}
        />
        <p className="text-xs text-gray-400 mt-1">{form.title.length}/100 caractères (min. 5)</p>
      </div>

      {/* Category + Contract type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Catégorie <span className="text-red-500">*</span>
          </label>
          <select
            value={form.job_category}
            onChange={e => set('job_category', e.target.value)}
            className={`${INPUT} bg-white`}
          >
            <option value="">Choisir…</option>
            {JOB_CATEGORIES.map(c => (
              <option key={c} value={c}>
                {JOB_CATEGORY_LABELS[c as keyof typeof JOB_CATEGORY_LABELS]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Type de contrat <span className="text-red-500">*</span>
          </label>
          <select
            value={form.contract_type}
            onChange={e => set('contract_type', e.target.value)}
            className={`${INPUT} bg-white`}
          >
            <option value="">Choisir…</option>
            {CONTRACT_TYPES.map(c => (
              <option key={c} value={c}>
                {CONTRACT_TYPE_LABELS[c as keyof typeof CONTRACT_TYPE_LABELS]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Description du poste <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={6}
          placeholder="Missions principales, responsabilités, profil recherché, ambiance de travail…"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          className={TEXTAREA}
        />
        <p className="text-xs text-gray-400 mt-1">{form.description.length} caractères (min. 20)</p>
      </div>

      {/* Skills block */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600" /> Compétences
        </h3>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            ✅ Compétences requises{' '}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Ex : Permis B, connaissance du FIFO, maîtrise du pack Office…"
            value={form.required_skills}
            onChange={e => set('required_skills', e.target.value)}
            className={`${TEXTAREA} bg-white`}
          />
          <p className="text-xs text-gray-400 mt-1">Séparez par des virgules ou décrivez librement.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            ⭐ Compétences appréciées{' '}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Ex : Bilinguisme, HACCP, anglais professionnel, connaissance du bâtiment corse…"
            value={form.nice_to_have_skills}
            onChange={e => set('nice_to_have_skills', e.target.value)}
            className={`${TEXTAREA} bg-white`}
          />
        </div>
      </div>
    </div>
  );
}
