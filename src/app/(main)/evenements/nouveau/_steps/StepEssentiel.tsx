'use client';

import { EVENT_CATEGORIES_LIST } from '@/lib/events';
import type { EventForm } from '../_config';

// ── Shared input class ────────────────────────────────────────────────────────
const INPUT = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  form: EventForm;
  setField: <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;
  organizerPlaceholder: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StepEssentiel({ form, setField, organizerPlaceholder }: Props) {
  return (
    <>
      <h2 className="font-black text-gray-900 text-lg">Informations essentielles</h2>

      {/* Title */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre *</label>
        <input
          type="text" required placeholder="Ex: Tournoi de pétanque inter-quartiers"
          value={form.title} onChange={e => setField('title', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Sous-titre <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <input
          type="text" placeholder="Courte accroche ou précision"
          value={form.subtitle} onChange={e => setField('subtitle', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Category grid */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Catégorie *</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {EVENT_CATEGORIES_LIST.map(c => (
            <button
              type="button" key={c.id} onClick={() => setField('category', c.id)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                form.category === c.id
                  ? `${c.bg} ${c.color} ${c.border}`
                  : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-center leading-tight">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Organizer */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Organisateur</label>
        <input
          type="text" placeholder={organizerPlaceholder}
          value={form.organizer_name} onChange={e => setField('organizer_name', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
        <textarea
          placeholder="Décrivez l'événement, le programme, les informations pratiques..."
          rows={5} value={form.description} onChange={e => setField('description', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
        />
      </div>
    </>
  );
}
