'use client';

import { MapPin, Tag, Accessibility, Phone, Globe } from 'lucide-react';
import SectorFilter from '@/components/ui/SectorFilter';
import type { EventForm } from '../_config';

const INPUT = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300';

interface Props {
  form: EventForm;
  setField: <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;
}

export function StepPratique({ form, setField }: Props) {
  return (
    <>
      <h2 className="font-black text-gray-900 text-lg">Informations pratiques</h2>

      {/* Location */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          <MapPin className="inline w-3.5 h-3.5 mr-1" />Lieu *
        </p>
        <input
          type="text" placeholder="Ex: Place du village, Salle des fêtes..."
          value={form.location} onChange={e => setField('location', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Sector */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          Secteur concerné
          <span className="ml-1 text-xs font-normal text-gray-400">(facultatif — ou « Toute la ville »)</span>
        </p>
        <SectorFilter
          value={form.sector_id || null}
          onChange={id => setField('sector_id', id || '')}
          allowCitywide compact
        />
      </div>

      {/* Location area + detail */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <p className="block text-sm font-semibold text-gray-700 mb-1.5">Zone / Quartier (précision libre)</p>
          <input
            type="text" placeholder="Ex: Centre-ville, Nord..."
            value={form.location_area} onChange={e => setField('location_area', e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <p className="block text-sm font-semibold text-gray-700 mb-1.5">Détails lieu</p>
          <input
            type="text" placeholder="Ex: Entrée rue de la Paix, 1er étage..."
            value={form.location_detail} onChange={e => setField('location_detail', e.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {/* Target audience */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          <Tag className="inline w-3.5 h-3.5 mr-1" />Public cible
        </p>
        <input
          type="text" placeholder="Ex: Tout public, Familles, 18+, Enfants 6-12 ans..."
          value={form.target_audience} onChange={e => setField('target_audience', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Accessibility */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          <Accessibility className="inline w-3.5 h-3.5 mr-1" />Accessibilité
        </p>
        <input
          type="text" placeholder="Ex: PMR, interprète LSF, rampe d'accès..."
          value={form.accessibility} onChange={e => setField('accessibility', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Contact */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          <Phone className="inline w-3.5 h-3.5 mr-1" />Contact
        </p>
        <input
          type="text" placeholder="Téléphone, email, WhatsApp..."
          value={form.contact_info} onChange={e => setField('contact_info', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* External link */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          <Globe className="inline w-3.5 h-3.5 mr-1" />Lien externe{' '}
          <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <input
          type="url" placeholder="https://..."
          value={form.external_link} onChange={e => setField('external_link', e.target.value)}
          className={INPUT}
        />
      </div>

      {/* Tags */}
      <div>
        <p className="block text-sm font-semibold text-gray-700 mb-1.5">
          Mots-clés <span className="text-gray-400 font-normal">(séparés par des virgules)</span>
        </p>
        <input
          type="text" placeholder="Ex: musique, famille, gratuit, été..."
          value={form.tags} onChange={e => setField('tags', e.target.value)}
          className={INPUT}
        />
      </div>
    </>
  );
}
