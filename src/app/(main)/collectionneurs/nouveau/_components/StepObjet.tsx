'use client';

/**
 * StepObjet — Étape 3 : description de l'objet, état, rareté, infos,
 *             localisation, livraison, tags.
 */

import { Info, MapPin, Package, Truck, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectorFilter from '@/components/ui/SectorFilter';
import {
  CONDITION_CONFIG,
  RARITY_CONFIG,
  type ConditionLevel,
  type RarityLevel,
  type CollectionMode,
} from '@/lib/collectionneurs-config';
import { MAX_TAGS } from '../_config';
import type { CollectionneurFormData } from '../_types';

// Champs de base pour l'édition du formulaire
type Update = <K extends keyof CollectionneurFormData>(key: K, value: CollectionneurFormData[K]) => void;

interface Props {
  form: CollectionneurFormData;
  update: Update;
  tagInput: string;
  onTagInputChange: (v: string) => void;
}

const INPUT_CLS = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm';
const LABEL_CLS = 'block text-xs font-medium text-gray-600 mb-1';

export default function StepObjet({ form, update, tagInput, onTagInputChange }: Props) {
  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t) && form.tags.length < MAX_TAGS) {
      update('tags', [...form.tags, t]);
      onTagInputChange('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Décrivez votre objet</h2>
        <p className="text-gray-500 text-sm">Plus vous êtes précis, plus vous attirerez les bons acheteurs.</p>
      </div>

      {/* Titre */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Titre <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => update('title', e.target.value)}
          maxLength={120}
          placeholder="Ex : Montre Lip T18 dorée 1950 — excellent état"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <p className="text-xs text-gray-400 mt-1">{form.title.length}/120 caractères</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Description détaillée <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={e => update('description', e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Décrivez l'objet, son histoire, son état exact, ses défauts éventuels…"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000 caractères</p>
      </div>

      {/* État + Rareté */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            État <span className="text-red-500">*</span>
          </label>
          <select
            value={form.condition}
            onChange={e => update('condition', e.target.value as ConditionLevel)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
          >
            {(Object.entries(CONDITION_CONFIG) as [ConditionLevel, { label: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rareté</label>
          <select
            value={form.rarity_level}
            onChange={e => update('rarity_level', e.target.value as RarityLevel)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white"
          >
            {(Object.entries(RARITY_CONFIG) as [RarityLevel, { label: string; icon: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Informations sur l'objet */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Info className="w-4 h-4" /> Informations sur l&apos;objet
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'year_period'  as const, label: 'Époque / Période',   placeholder: 'Ex: 1950–1960' },
            { key: 'brand'        as const, label: 'Marque / Fabricant',  placeholder: 'Ex: LIP, Dinky Toys…' },
            { key: 'series_name'  as const, label: 'Série / Collection',  placeholder: 'Ex: Collection Tintin' },
            { key: 'dimensions'   as const, label: 'Dimensions',           placeholder: 'Ex: 12 × 8 × 5 cm' },
            { key: 'material'     as const, label: 'Matière',              placeholder: 'Ex: Métal, Bois, Porcelaine' },
            { key: 'provenance'   as const, label: 'Provenance',           placeholder: 'Ex: Grenier familial, Vente Maîtres' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className={LABEL_CLS}>{label}</label>
              <input
                type="text"
                value={form[key] as string}
                onChange={e => update(key, e.target.value)}
                placeholder={placeholder}
                className={INPUT_CLS}
              />
            </div>
          ))}
        </div>
        <div>
          <label className={LABEL_CLS}>Défauts / Usures à signaler</label>
          <input
            type="text"
            value={form.defects_noted}
            onChange={e => update('defects_noted', e.target.value)}
            placeholder="Ex: Petite éraflure sur le cadran, couleur légèrement passée"
            className={INPUT_CLS}
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.authenticity_declared}
            onChange={e => update('authenticity_declared', e.target.checked)}
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-sm text-gray-700">Je déclare l&apos;authenticité de cet objet (sur l&apos;honneur)</span>
        </label>
      </div>

      {/* Prix (vente) */}
      {form.mode === 'vente' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Prix (€) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">€</span>
            <input
              type="number" min={0} step={0.01}
              value={form.price}
              onChange={e => update('price', e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      {/* Échange attendu */}
      {(form.mode as CollectionMode) === 'echange' && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Objet(s) souhaité(s) en échange
          </label>
          <textarea
            value={form.exchange_expected}
            onChange={e => update('exchange_expected', e.target.value)}
            rows={2}
            placeholder="Ex : Cherche figurines Tintin, cartes Pokémon 1ère gen, montre ancienne…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-sm"
          />
        </div>
      )}

      {/* Localisation & livraison */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Localisation &amp; remise
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={cn(LABEL_CLS)}>Ville <span className="text-red-500">*</span></label>
            <input
              type="text" value={form.city}
              onChange={e => update('city', e.target.value)}
              placeholder="Ex: Biguglia"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Code postal</label>
            <input
              type="text" value={form.postal_code}
              onChange={e => update('postal_code', e.target.value)}
              placeholder="Ex: 20620"
              className={INPUT_CLS}
            />
          </div>
        </div>
        <div>
          <label className={cn(LABEL_CLS)}>Secteur <span className="text-gray-400">(fortement recommandé)</span></label>
          <SectorFilter
            value={form.sector_id || null}
            onChange={id => update('sector_id', id || '')}
            compact
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox" checked={form.local_meetup_available}
              onChange={e => update('local_meetup_available', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Remise en main propre possible</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox" checked={form.shipping_available}
              onChange={e => update('shipping_available', e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <Truck className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Envoi postal possible (frais à négocier)</span>
          </label>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Tags <span className="text-gray-400">(optionnel, max {MAX_TAGS})</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
              {tag}
              <button
                onClick={() => update('tags', form.tags.filter((_, j) => j !== i))}
                className="hover:text-red-500 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {form.tags.length < MAX_TAGS && (
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => onTagInputChange(e.target.value)}
              onKeyDown={e => {
                if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Ajouter un tag…"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
            <button
              onClick={addTag}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-sm transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
