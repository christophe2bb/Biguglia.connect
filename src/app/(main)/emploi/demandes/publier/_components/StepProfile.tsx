'use client';

import { FileText } from 'lucide-react';
import {
  CONTRACT_TYPES,
  CONTRACT_TYPE_LABELS,
  JOB_CATEGORIES,
  JOB_CATEGORY_LABELS,
} from '@/types/jobs/constants';
import type { FormData } from '../_types';

interface Props {
  form: FormData;
  set: (field: keyof FormData, value: string | boolean | string[]) => void;
  toggleContractType: (type: string) => void;
}

export function StepProfile({ form, set, toggleContractType }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <FileText className="w-5 h-5 text-purple-500" />
        Décrivez votre recherche
      </h2>

      {/* Titre */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          Titre de votre recherche <span className="text-red-500">*</span>
        </p>
        <input
          type="text"
          placeholder="Ex : Serveur(se), Aide-soignant(e), Maçon qualifié…"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">
          {form.title.length}/100 caractères (min. 5)
        </p>
      </div>

      {/* Catégorie de métier */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          Catégorie de métier <span className="text-red-500">*</span>
        </p>
        <select
          value={form.job_category}
          onChange={e => set('job_category', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
        >
          <option value="">Choisir une catégorie…</option>
          {JOB_CATEGORIES.map(c => (
            <option key={c} value={c}>
              {JOB_CATEGORY_LABELS[c as keyof typeof JOB_CATEGORY_LABELS]}
            </option>
          ))}
        </select>
      </div>

      {/* Types de contrat */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-2">
          Types de contrat recherchés <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-1">(plusieurs choix possibles)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CONTRACT_TYPES.map(type => {
            const checked = form.contract_types.includes(type);
            return (
              <label
                key={type}
                className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer text-sm transition-all ${
                  checked
                    ? 'border-purple-500 bg-purple-50 text-purple-800 font-semibold'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleContractType(type)}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    checked ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}
                >
                  {checked && <span className="text-white text-xs">✓</span>}
                </span>
                {CONTRACT_TYPE_LABELS[type as keyof typeof CONTRACT_TYPE_LABELS]}
              </label>
            );
          })}
        </div>
      </div>

      {/* Description / Motivations */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          Présentation / Motivations <span className="text-red-500">*</span>
        </p>
        <textarea
          rows={5}
          placeholder="Présentez-vous, vos motivations, le type de poste que vous recherchez…"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          {form.description.length} caractères (min. 20)
        </p>
      </div>
    </div>
  );
}
