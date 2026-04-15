'use client';

import { FileText, Upload, User, X } from 'lucide-react';
import type { FormData } from '../_types';

interface Props {
  form: FormData;
  set: (field: keyof FormData, value: string | boolean | string[]) => void;
  setCvFile: (file: File | null) => void;
}

export function StepExperience({ form, set, setCvFile }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <User className="w-5 h-5 text-purple-500" />
        Votre expérience
      </h2>

      {/* Niveau d'expérience */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Niveau d&apos;expérience
        </label>
        <select
          value={form.experience_level}
          onChange={e => set('experience_level', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-white"
        >
          <option value="">Non spécifié</option>
          <option value="debutant">Débutant / Premier emploi</option>
          <option value="junior">Junior (0–2 ans)</option>
          <option value="confirme">Confirmé (2–5 ans)</option>
          <option value="senior">Senior (5+ ans)</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Résumé de l'expérience */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Résumé de votre expérience <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          rows={4}
          placeholder="Listez vos expériences passées, formations, compétences clés…"
          value={form.experience_summary}
          onChange={e => set('experience_summary', e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 resize-none"
        />
      </div>

      {/* Badges permis / véhicule */}
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={form.has_driving_license}
            onChange={e => set('has_driving_license', e.target.checked)}
            className="w-5 h-5 text-blue-500 rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-bold text-blue-800">🪪 Permis de conduire</span>
            <p className="text-xs text-blue-600">Badge visible sur votre profil</p>
          </div>
        </label>

        <label className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={form.has_vehicle}
            onChange={e => set('has_vehicle', e.target.checked)}
            className="w-5 h-5 text-green-500 rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-bold text-green-800">🚗 Véhicule personnel</span>
            <p className="text-xs text-green-600">Badge visible sur votre profil</p>
          </div>
        </label>
      </div>

      {/* Upload CV */}
      <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <Upload className="w-4 h-4 text-purple-600" />
          Joindre un CV
          <span className="text-gray-400 font-normal text-xs normal-case">(optionnel)</span>
        </h3>

        {form.cv_file ? (
          <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <FileText className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-purple-900 truncate">
                {form.cv_file.name}
              </p>
              <p className="text-xs text-purple-600">
                {(form.cv_file.size / 1024).toFixed(0)} Ko
              </p>
            </div>
            <button
              onClick={() => setCvFile(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all">
            <Upload className="w-8 h-8 text-purple-400" />
            <span className="text-sm font-semibold text-purple-700">
              Cliquer pour sélectionner votre CV
            </span>
            <span className="text-xs text-gray-400">PDF, DOC, DOCX · Max 5 Mo</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file && file.size <= 5 * 1024 * 1024) {
                  setCvFile(file);
                }
              }}
              className="sr-only"
            />
          </label>
        )}

        <p className="text-xs text-gray-500">
          Votre CV sera stocké de façon sécurisée et partagé uniquement aux employeurs qui vous
          contactent.
        </p>
      </div>
    </div>
  );
}
