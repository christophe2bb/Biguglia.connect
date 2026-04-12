'use client';

import { Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_CONFIG, THEME_HREFS, POPULAR_SEARCHES, type ThemeKey } from '../_config';

interface SearchSuggestionsProps {
  recent: string[];
  selectedIdx: number;
  onSearchTerm: (term: string) => void;
  onClearRecent: () => void;
  onNavigateTo: (href: string) => void;
}

/**
 * Shown when the input is focused but the query is shorter than 2 characters.
 * Three sections: recent searches | popular chips | explore theme grid.
 */
export default function SearchSuggestions({
  recent,
  selectedIdx,
  onSearchTerm,
  onClearRecent,
  onNavigateTo,
}: SearchSuggestionsProps) {
  return (
    <>
      {/* ── Recent searches ─────────────────────────────────────────────── */}
      {recent.length > 0 && (
        <div className="p-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Récentes
            </span>
            <button
              onClick={onClearRecent}
              className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              Effacer
            </button>
          </div>

          {recent.map((r, idx) => (
            <button
              key={r}
              onClick={() => onSearchTerm(r)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                selectedIdx === idx ? 'bg-gray-100' : 'hover:bg-gray-50',
              )}
            >
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700">{r}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Popular searches ─────────────────────────────────────────────── */}
      <div className={cn('p-3', recent.length > 0 && 'border-t border-gray-100')}>
        <div className="flex items-center gap-1.5 px-2 mb-2">
          <TrendingUp className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Populaires
          </span>
        </div>
        <div className="flex flex-wrap gap-2 px-2">
          {POPULAR_SEARCHES.map((s) => (
            <button
              key={s.label}
              onClick={() => onSearchTerm(s.label)}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Explore theme grid ───────────────────────────────────────────── */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        <div className="px-2 mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Explorer
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.entries(THEME_CONFIG) as [ThemeKey, (typeof THEME_CONFIG)[ThemeKey]][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                onClick={() => onNavigateTo(THEME_HREFS[key])}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl transition-colors hover:opacity-80',
                  cfg.bg,
                )}
              >
                <span className={cfg.color}>{cfg.icon}</span>
                <span
                  className={cn(
                    'text-[10px] font-semibold leading-tight text-center',
                    cfg.color,
                  )}
                >
                  {cfg.label}
                </span>
              </button>
            ),
          )}
        </div>
      </div>
    </>
  );
}
