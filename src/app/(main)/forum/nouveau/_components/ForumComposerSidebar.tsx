'use client';

import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VISIBILITY_OPTIONS, URGENCY_LEVELS, POST_TYPES } from '../_config';
import type {
  FormState, ForumSector, ForumCategory,
  PostTypeOption, UrgencyLevel, VisibilityValue,
} from '../_types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ForumComposerSidebarProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  selectedSector:   ForumSector   | undefined;
  selectedCategory: ForumCategory | undefined;
  photoPreviews: string[];
  authorInitial: string;
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

function getSelectedPostType(form: FormState): PostTypeOption | undefined {
  return POST_TYPES.find(t => t.value === form.post_type);
}

function getSelectedUrgency(form: FormState): UrgencyLevel | undefined {
  return URGENCY_LEVELS.find(u => u.value === form.urgency);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ForumComposerSidebar({
  form,
  setForm,
  selectedSector,
  selectedCategory,
  photoPreviews,
  authorInitial,
}: ForumComposerSidebarProps) {
  const selectedPostType = getSelectedPostType(form);
  const selectedUrgency  = getSelectedUrgency(form);

  return (
    <div className="space-y-4">
      {/* ── Visibilité ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center text-base">🚀</div>
          <div>
            <h2 className="font-black text-gray-900">Qui peut voir ce sujet ?</h2>
            <p className="text-xs text-gray-400">Choisissez la visibilité de votre publication</p>
          </div>
        </div>

        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, visibility: opt.value as VisibilityValue }))}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                form.visibility === opt.value
                  ? 'bg-violet-50 border-violet-400 shadow-sm'
                  : 'bg-white border-gray-200 hover:bg-gray-50',
              )}
            >
              <opt.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0',
                  form.visibility === opt.value ? 'text-violet-600' : 'text-gray-400',
                )}
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-800">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.description}</div>
              </div>
              {form.visibility === opt.value && (
                <CheckCircle2 className="w-5 h-5 text-violet-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Récapitulatif ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-black text-gray-900 mb-5 flex items-center gap-2">
          📋 Récapitulatif avant publication
        </h2>

        {/* Prévisualisation du post */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-violet-200 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-violet-700">
              {authorInitial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedPostType && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold border', selectedPostType.bg, selectedPostType.color, selectedPostType.border)}>
                    {selectedPostType.label}
                  </span>
                )}
                {selectedSector && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                    {selectedSector.icon} {selectedSector.name}
                  </span>
                )}
                {form.urgency !== 'basse' && (
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-bold',
                    form.urgency === 'haute' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                  )}>
                    {selectedUrgency?.emoji} {selectedUrgency?.label}
                  </span>
                )}
              </div>
              <p className="font-bold text-gray-900 text-sm">{form.title || 'Titre de votre sujet'}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.content || 'Description…'}</p>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.tags.map(t => (
                    <span key={t} className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Détails du récap */}
        <dl className="space-y-2.5 text-sm">
          <RecapRow label="Secteur">
            {selectedSector ? `${selectedSector.icon} ${selectedSector.name}` : '🗺️ Général'}
          </RecapRow>
          <RecapRow label="Catégorie">
            {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : '—'}
          </RecapRow>
          {selectedPostType && (
            <RecapRow label="Type">{selectedPostType.label}</RecapRow>
          )}
          <RecapRow label="Urgence">
            {selectedUrgency?.emoji} {selectedUrgency?.label}
          </RecapRow>
          {photoPreviews.length > 0 && (
            <div className="flex gap-2">
              <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">Photos</dt>
              <dd className="flex gap-1.5 flex-wrap">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative w-10 h-10 flex-shrink-0">
                    <Image src={src} alt="" fill className="rounded-lg object-cover border border-gray-200" />
                  </div>
                ))}
              </dd>
            </div>
          )}
          <RecapRow label="Visibilité">
            {VISIBILITY_OPTIONS.find(o => o.value === form.visibility)?.label}
          </RecapRow>
        </dl>
      </div>
    </div>
  );
}

// ─── Petit helper interne ─────────────────────────────────────────────────────

function RecapRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-gray-400 w-28 flex-shrink-0 text-xs mt-0.5">{label}</dt>
      <dd className="text-gray-800 font-medium text-xs">{children}</dd>
    </div>
  );
}
