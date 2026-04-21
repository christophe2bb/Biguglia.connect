'use client';

/**
 * StepCategorie — Étape 2 : choisir la catégorie + sous-catégorie optionnelle.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CollectionCategory } from '../_types';

interface Props {
  categories: CollectionCategory[];
  categoryId: string;
  subcategory: string;
  onCategoryChange: (id: string) => void;
  onSubcategoryChange: (v: string) => void;
}

export default function StepCategorie({
  categories,
  categoryId,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
}: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        Catégorie de l&apos;objet
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        Une bonne catégorie aide les collectionneurs à trouver votre annonce.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'p-4 rounded-2xl border-2 text-left transition-all',
              categoryId === cat.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300',
            )}
          >
            <span className="text-2xl block mb-2">{cat.icon}</span>
            <span className="text-sm font-medium text-gray-800 leading-tight">{cat.name}</span>
            {categoryId === cat.id && (
              <Check className="w-4 h-4 text-blue-500 mt-1" />
            )}
          </button>
        ))}
      </div>

      {categoryId && (
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">
            Sous-catégorie <span className="text-gray-400">(optionnel)</span>
          </p>
          <input
            type="text"
            value={subcategory}
            onChange={e => onSubcategoryChange(e.target.value)}
            placeholder="Ex : Figurines Star Wars, Timbres France 1900–1950…"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
      )}
    </div>
  );
}
