'use client';

/**
 * StepPreview — Étape 5 : aperçu de l'annonce + checklist + raccourcis édition.
 */

import { Check, AlertCircle, ArrowLeftRight, MapPin, Truck, Eye, Pencil } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectorBadge } from '@/components/ui/SectorFilter';
import {
  MODE_CONFIG,
  CONDITION_CONFIG,
  RARITY_CONFIG,
} from '@/lib/collectionneurs-config';
import { STEPS, MAX_PHOTOS } from '../_config';
import type { CollectionneurFormData, CollectionCategory } from '../_types';

interface Props {
  form: CollectionneurFormData;
  categories: CollectionCategory[];
  onJumpToStep: (step: number) => void;
}

export default function StepPreview({ form, categories, onJumpToStep }: Props) {
  const modeCfg  = MODE_CONFIG[form.mode];
  const ModeIcon = modeCfg.icon;
  const coverSrc = form.photos.find(p => p.is_cover)?.preview ?? form.photos[0]?.preview;
  const cat      = categories.find(c => c.id === form.category_id);

  const checklist = [
    { label: 'Mode choisi',                    ok: !!form.mode },
    { label: 'Catégorie sélectionnée',         ok: !!form.category_id },
    { label: 'Titre renseigné (5+ car.)',       ok: form.title.length >= 5 },
    { label: 'Description (20+ car.)',          ok: form.description.length >= 20 },
    { label: `Photos ajoutées (${form.photos.length}/${MAX_PHOTOS})`, ok: form.photos.length > 0 },
    { label: 'Ville renseignée',               ok: !!form.city.trim() },
    { label: 'Prix renseigné',                 ok: form.mode !== 'vente' || !!form.price, optional: form.mode !== 'vente' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Aperçu &amp; publication</h2>
      <p className="text-gray-500 text-sm mb-6">Vérifiez les informations avant de publier votre annonce.</p>

      {/* Aperçu carte */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-6">
        {/* Photo couverture */}
        <div className="aspect-video bg-gray-100 overflow-hidden">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverSrc} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-300" />
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          {/* Badges mode / catégorie / rareté */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border',
              modeCfg.bg, modeCfg.color, modeCfg.border,
            )}>
              <ModeIcon className="w-3.5 h-3.5" /> {modeCfg.label}
            </span>
            {cat && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {cat.icon} {cat.name}
              </span>
            )}
            {form.rarity_level && form.rarity_level !== 'commun' && (
              <span className="text-sm font-medium">
                {RARITY_CONFIG[form.rarity_level].icon} {RARITY_CONFIG[form.rarity_level].label}
              </span>
            )}
          </div>

          {/* Titre */}
          <h3 className="text-xl font-bold text-gray-900">
            {form.title || <em className="text-gray-400">Sans titre</em>}
          </h3>

          {/* Prix / échange / don */}
          {form.mode === 'vente' && form.price && (
            <p className="text-2xl font-bold text-blue-700">
              {Number(form.price).toLocaleString('fr-FR')} €
            </p>
          )}
          {form.mode === 'echange' && form.exchange_expected && (
            <p className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
              <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" />
              Cherche : {form.exchange_expected}
            </p>
          )}
          {form.mode === 'don' && (
            <p className="text-sm text-emerald-700 font-semibold">Gratuit 🎁</p>
          )}

          {/* Description (extrait) */}
          <p className="text-sm text-gray-600 line-clamp-3">{form.description}</p>

          {/* Méta */}
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {form.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />{form.city}
              </span>
            )}
            {form.condition && (
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', CONDITION_CONFIG[form.condition]?.color)}>
                {CONDITION_CONFIG[form.condition]?.label}
              </span>
            )}
            {form.shipping_available && (
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Envoi possible
              </span>
            )}
            {form.sector_id && form.sector_id !== 'ville' && (
              <SectorBadge sectorId={form.sector_id} />
            )}
          </div>

          {/* Tags */}
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats photos + authenticité */}
          <div className="text-xs text-gray-400 pt-1 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {form.photos.length} photo{form.photos.length > 1 ? 's' : ''}
            {form.authenticity_declared && (
              <span className="ml-2 text-emerald-600 font-medium">✓ Authenticité déclarée</span>
            )}
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2 mb-6">
        <h3 className="font-semibold text-gray-800 mb-2">Checklist avant publication</h3>
        {checklist.map((item, i) => (
          <div key={i} className={cn('flex items-center gap-2 text-sm', item.optional ? 'opacity-60' : '')}>
            {item.ok
              ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            }
            <span className={item.ok ? 'text-gray-700' : 'text-amber-700'}>{item.label}</span>
            {item.optional && <span className="text-xs text-gray-400">(optionnel)</span>}
          </div>
        ))}
      </div>

      {/* Raccourcis édition par étape */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {STEPS.slice(0, 4).map(s => (
          <button
            key={s.id}
            onClick={() => onJumpToStep(s.id)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition"
          >
            <Pencil className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
