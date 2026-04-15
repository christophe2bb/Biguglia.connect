'use client';
/**
 * SearchEmpty — état vide (aucune query) : landing de recherche avec tendances et grille thèmes
 * SearchNoResults — aucun résultat trouvé pour la query
 */

import Link from 'next/link';
import { Search, TrendingUp, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEMES, ThemeKey, getThemeLink, TRENDING_SEARCHES } from '../_config';

// ─── Landing (pas de query) ───────────────────────────────────────────────────
export function SearchEmpty({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 bg-brand-50 rounded-full flex items-center justify-center">
        <Search className="w-7 h-7 text-brand-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Recherche globale</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Trouvez artisans, annonces, événements, promenades, matériel, entraide, forum et associations en une seule recherche.
      </p>

      {/* Tendances */}
      <div className="max-w-lg mx-auto mb-8">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3 h-3" /> Tendances
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {TRENDING_SEARCHES.map(t => (
            <button
              key={t}
              onClick={() => onSearch(t)}
              className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-colors shadow-sm"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grille thèmes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, cfg]) => (
          <Link
            key={key}
            href={getThemeLink(key)}
            className={cn('flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:shadow-md group', cfg.bg, cfg.border)}
          >
            <span className={cn('w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform', cfg.color)}>
              <span className="scale-125">{cfg.icon}</span>
            </span>
            <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Aucun résultat ───────────────────────────────────────────────────────────
export function SearchNoResults({
  query,
  activeThemes,
  onClearThemes,
  onSearch,
}: {
  query: string;
  activeThemes: ThemeKey[];
  onClearThemes: () => void;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun résultat trouvé</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Aucun contenu ne correspond à « <strong>{query}</strong> » dans{' '}
        {activeThemes.length > 0 ? 'les thèmes sélectionnés' : 'nos rubriques'}.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {activeThemes.length > 0 && (
          <button
            onClick={onClearThemes}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-50 text-brand-700 text-sm font-semibold hover:bg-brand-100 transition-colors"
          >
            <X className="w-4 h-4" /> Supprimer les filtres
          </button>
        )}
        <button
          onClick={() => onSearch(query.split(' ')[0])}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
        >
          <Search className="w-4 h-4" /> Essayer « {query.split(' ')[0]} »
        </button>
      </div>

      {/* Explorer les rubriques */}
      <div className="mt-8 max-w-md mx-auto">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Explorer les rubriques</p>
        <div className="grid grid-cols-4 gap-2">
          {(Object.entries(THEMES) as [ThemeKey, typeof THEMES[ThemeKey]][]).map(([key, cfg]) => (
            <Link
              key={key}
              href={getThemeLink(key)}
              className={cn('flex flex-col items-center gap-1 p-3 rounded-xl transition-colors hover:opacity-80', cfg.bg)}
            >
              <span className={cfg.color}>{cfg.icon}</span>
              <span className={cn('text-[10px] font-semibold', cfg.color)}>{cfg.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
