'use client';

import { cn } from '@/lib/utils';
import type { CollectionCategory } from '@/lib/collectionneurs-config';
import { getCatClasses } from '../_constants';

interface Props {
  categories: CollectionCategory[];
  selectedCat: string;
  total: number;
  onSelect: (catId: string) => void;
}

// ── Desktop sticky sidebar ────────────────────────────────────────────────────
export function CategorySidebar({ categories, selectedCat, total, onSelect }: Props) {
  return (
    <div className="hidden lg:block w-56 flex-shrink-0">
      <div className="sticky top-20">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Catégories</h3>
        <div className="space-y-0.5">
          {/* All */}
          <button
            onClick={() => onSelect('all')}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
              selectedCat === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <span>🏆</span>
            <span className="flex-1">Toutes catégories</span>
            <span className="text-xs opacity-60">{total}</span>
          </button>

          {categories.map(cat => {
            const cls = getCatClasses(cat.color);
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(selectedCat === cat.id ? 'all' : cat.id)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
                  selectedCat === cat.id ? cn(cls.bg, cls.text) : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span>{cat.icon}</span>
                <span className="flex-1 truncate">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Mobile horizontal scroll bar ─────────────────────────────────────────────
export function CategoryScrollBar({ categories, selectedCat, onSelect }: Omit<Props, 'total'>) {
  return (
    <div className="lg:hidden mb-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2">
        <button
          onClick={() => onSelect('all')}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border',
            selectedCat === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
          )}
        >
          🏆 Tout
        </button>
        {categories.slice(0, 12).map(cat => {
          const cls = getCatClasses(cat.color);
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(selectedCat === cat.id ? 'all' : cat.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 border',
                selectedCat === cat.id
                  ? cn(cls.bg, cls.text, cls.border)
                  : 'bg-white text-gray-600 border-gray-200'
              )}
            >
              {cat.icon} {cat.name.split('&')[0].trim()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
