'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type RefObject } from 'react';
import {
  CheckCircle2, Zap, Tag, Camera, Upload, Trash2,
  Search, AlertCircle, X, ExternalLink,
} from 'lucide-react';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import {
  POST_TYPES, URGENCY_LEVELS, SECTOR_COLORS,
} from '../_config';
import type {
  Step, FormState, ForumSector, ForumCategory,
  SimilarTopic, UrgencyValue,
} from '../_types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ForumComposerFormProps {
  step: Step;
  sectors: ForumSector[];
  categories: ForumCategory[];
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  setStep: (s: Step) => void;
  // anti-doublon
  similarTopics: SimilarTopic[];
  searchingDuplicates: boolean;
  showSimilar: boolean;
  setShowSimilar: (v: boolean) => void;
  // photos
  photos: File[];
  photoPreviews: string[];
  fileInputRef: RefObject<HTMLInputElement>;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (i: number) => void;
  // tags
  tagInput: string;
  setTagInput: (v: string) => void;
  onAddTag: (t: string) => void;
  onRemoveTag: (t: string) => void;
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ─── Step 1 : Secteur ─────────────────────────────────────────────────────────

function StepSector({
  sectors, form, setForm, setStep,
}: Pick<ForumComposerFormProps, 'sectors' | 'form' | 'setForm' | 'setStep'>) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-base">📍</div>
        <div>
          <h2 className="font-black text-gray-900">Dans quel secteur ?</h2>
          <p className="text-xs text-gray-400">Choisissez le secteur de Biguglia concerné</p>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-5 mt-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
        💡 Le secteur permet aux voisins du même quartier de trouver facilement votre sujet.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {sectors.map(sector => {
          const colors     = SECTOR_COLORS[sector.color || 'gray'];
          const isSelected = form.sector_id === sector.id || form.sector_id === sector.slug;
          return (
            <button
              key={sector.id}
              onClick={() => setForm(f => ({ ...f, sector_id: sector.id || sector.slug }))}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors text-center',
                isSelected
                  ? cn(colors, 'ring-2 ring-offset-1 ring-violet-400 shadow-md scale-[1.02]')
                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm',
              )}
            >
              <span className="text-3xl">{sector.icon}</span>
              <div>
                <p className="text-xs font-bold text-gray-800 leading-tight">{sector.name}</p>
                {sector.description && (
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{sector.description}</p>
                )}
              </div>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => { setForm(f => ({ ...f, sector_id: '' })); setStep(2); }}
          className="w-full py-2.5 text-sm text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
        >
          <span>🗺️</span>
          <span>Mon sujet concerne toute la commune (pas de secteur spécifique)</span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 : Catégorie + Type de post ────────────────────────────────────────

function StepTheme({
  categories, form, setForm,
}: Pick<ForumComposerFormProps, 'categories' | 'form' | 'setForm'>) {
  return (
    <div className="space-y-4">
      {/* Catégorie */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-base">🏷️</div>
          <div>
            <h2 className="font-black text-gray-900">Quel sujet ?</h2>
            <p className="text-xs text-gray-400">Choisissez la catégorie la plus proche</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map(cat => {
            const isSelected = form.category_id === cat.id || form.category_id === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setForm(f => ({ ...f, category_id: cat.id || cat.slug }))}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-colors text-left',
                  isSelected
                    ? 'bg-violet-50 border-violet-400 text-violet-800 shadow-sm'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700',
                )}
              >
                <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight">{cat.name}</p>
                  {cat.description && (
                    <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>
                  )}
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600 ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Type de post (optionnel) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-gray-800 text-sm">
            Type de post <span className="text-gray-400 font-normal">(optionnel)</span>
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POST_TYPES.map(pt => {
            const I          = pt.icon;
            const isSelected = form.post_type === pt.value;
            return (
              <button
                key={pt.value}
                onClick={() => setForm(f => ({ ...f, post_type: isSelected ? '' : pt.value }))}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors text-center text-xs',
                  isSelected
                    ? cn(pt.bg, pt.border, pt.color, 'shadow-sm')
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white',
                )}
              >
                <I className="w-4 h-4" />
                <span className="font-bold leading-tight">{pt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 : Rédaction ───────────────────────────────────────────────────────

function StepWrite({
  form, setForm,
  similarTopics, searchingDuplicates, showSimilar, setShowSimilar,
  photos, photoPreviews, fileInputRef, onPhotoSelect, onRemovePhoto,
  tagInput, setTagInput, onAddTag, onRemoveTag, onTagKeyDown,
}: Omit<ForumComposerFormProps, 'step' | 'sectors' | 'categories' | 'setStep'>) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-base">✍️</div>
          <div>
            <h2 className="font-black text-gray-900">Rédigez votre sujet</h2>
            <p className="text-xs text-gray-400">Soyez précis pour obtenir de meilleures réponses</p>
          </div>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Titre <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">({form.title.length}/120)</span>
          </label>
          <Input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Un titre clair et précis…"
            maxLength={120}
          />

          {/* Anti-doublon */}
          {form.title.trim().length >= 4 && showSimilar && (
            <div className="mt-2">
              {searchingDuplicates && (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <Search className="w-3 h-3 animate-pulse" /> Recherche de sujets similaires…
                </p>
              )}
              {!searchingDuplicates && similarTopics.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Sujets similaires déjà publiés
                    </p>
                    <button onClick={() => setShowSimilar(false)} className="text-amber-400 hover:text-amber-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {similarTopics.map(t => (
                      <Link key={t.id} href={`/forum/${t.id}`} target="_blank"
                        className="flex items-center gap-2 text-xs text-amber-800 hover:text-amber-900 font-medium group">
                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                        <span className="line-clamp-1">{t.title}</span>
                      </Link>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-600 mt-2">Si votre sujet est différent, continuez quand même ✓</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Urgence */}
        <div>
          <p className="block text-sm font-bold text-gray-700 mb-2">Niveau d&apos;urgence</p>
          <div className="flex gap-2">
            {URGENCY_LEVELS.map(u => (
              <button
                key={u.value}
                onClick={() => setForm(f => ({ ...f, urgency: u.value as UrgencyValue }))}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-colors',
                  form.urgency === u.value
                    ? 'bg-gray-800 border-gray-700 text-white shadow-md scale-[1.02]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                <span className="text-lg">{u.emoji}</span>
                <span className="text-xs font-bold">{u.label}</span>
                <span className="text-[10px] opacity-70 leading-tight">{u.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">
            Description <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">({form.content.length} caractères)</span>
          </label>
          <Textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Décrivez votre sujet en détail. Plus vous êtes précis, plus les réponses seront utiles…"
            className="min-h-[160px]"
          />
        </div>

        {/* Photos */}
        <div>
          <p className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-gray-400" />
            Photos <span className="text-gray-400 font-normal">(optionnel — max 5, 8 Mo)</span>
          </p>

          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-violet-300 hover:bg-violet-50 transition-colors group"
            >
              <Upload className="w-6 h-6 text-gray-300 group-hover:text-violet-400 mx-auto mb-2 transition-colors" />
              <p className="text-sm text-gray-500 group-hover:text-violet-600 transition-colors">
                Cliquer pour ajouter des photos
              </p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP • max 8 Mo par photo</p>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            className="hidden"
            onChange={onPhotoSelect}
          />

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative group aspect-square w-full overflow-hidden rounded-xl">
                  <Image src={src} alt="" fill sizes="(max-width: 640px) 33vw, 20vw" className="object-cover rounded-xl border border-gray-200" />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 bg-violet-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                      Couverture
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-violet-300 hover:bg-violet-50 transition-colors"
                >
                  <span className="text-2xl text-gray-300">+</span>
                </button>
              )}
            </div>
          )}
          {photos.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{photos.length}/5 photo{photos.length > 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <p className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Mots-clés <span className="text-gray-400 font-normal">(optionnel — max 5)</span>
          </p>
          <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-xl bg-gray-50 min-h-[44px]">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-violet-100 text-violet-700 text-xs px-2 py-1 rounded-lg">
                #{tag}
                <button type="button" onClick={() => onRemoveTag(tag)} className="text-violet-400 hover:text-violet-700 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {form.tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => tagInput && onAddTag(tagInput)}
                placeholder={form.tags.length === 0 ? 'Ex : eau, route, bruit… (Entrée pour valider)' : ''}
                className="flex-1 min-w-32 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
              />
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">Entrée ou virgule pour valider un mot-clé</p>
        </div>
      </div>
    </div>
  );
}

// ─── Exported orchestrator ────────────────────────────────────────────────────

export default function ForumComposerForm(props: ForumComposerFormProps) {
  if (props.step === 1) return <StepSector sectors={props.sectors} form={props.form} setForm={props.setForm} setStep={props.setStep} />;
  if (props.step === 2) return <StepTheme categories={props.categories} form={props.form} setForm={props.setForm} />;
  if (props.step === 3) return <StepWrite {...props} />;
  return null;
}
